'use strict';

/* ============================================================================
   TMDB Beliebt × xrel — Kachel
   ----------------------------------------------------------------------------
   Eine schlichte Textliste: pro Zeile ein Filmtitel aus TMDBs „Beliebt"-Liste,
   eingefaerbt nach seinem xrel-Status:

     gruen  auf xrel gibt es schon ein Release (Scene ODER P2P)
     rot    xrel geprueft, nichts gefunden
     grau   noch nicht geprueft (xrel nicht eingerichtet, Rate-Limit, Ausfall)

   Grau ist bewusst ein eigener Zustand: rot bedeutet „geprueft, nichts da" und
   soll ehrlich bleiben. Ist der Film gruen, oeffnet ein Klick ein Fenster mit
   den gefundenen Releases (Dirname, Gruppe, Datum, Typ, Groesse, Link zu xrel).

   Alle Inhalte sind Fremddaten und gehen ausschliesslich ueber textContent in
   die Seite. Die Zugangsdaten baut das Settings-Panel (unten) selbst — wie die
   Game-Releases-Kachel, ueber /api/secrets.
   ============================================================================ */

const TX_SIZES = [
  { v: 's', l: 'Klein' },
  { v: 'm', l: 'Normal' },
  { v: 'l', l: 'Groß' },
  { v: 'xl', l: 'Sehr groß' },
];
const TX_SPACINGS = [
  { v: 'tight', l: 'Eng' },
  { v: 'normal', l: 'Normal' },
  { v: 'wide', l: 'Weit' },
];

let _txData = null;    // letzte Payload vom Server
let _txDetail = null;  // gerade geoeffnete xrel-Id
let _txLastFocus = null;

/* ---------- Formatierung ---------- */

function txDateLabel(unix) {
  if (!unix) return '';
  const t = Number(unix) * 1000;
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : '';
}

// Suchtaugliche Fassung eines Filmtitels: Sonderzeichen raus, Woerter bleiben.
// "Spider-Man: No Way Home" -> "Spider Man No Way Home". Die ddl-warez-Suche
// (und die meisten Release-Suchen) mag Leerzeichen statt Doppelpunkten/
// Bindestrichen/Apostrophen. Diakritika bleiben, weil deutsche Titel sie im
// Suchindex tragen.
function txSimpleTitle(title) {
  return String(title || '')
    .replace(/&/g, ' und ')
    .replace(/['’`]/g, '')            // Apostroph entfernen: Devil's -> Devils
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // alles Nicht-Buchstabe/-Ziffer -> Leerzeichen
    .replace(/\s+/g, ' ')
    .trim();
}

const TX_DDL_BASE = 'https://ddl-warez.cc/?s=';

/* Baut die ddl-warez-Suche. Das Jahr ist wichtig: an echten Suchen gemessen
   grenzt es die Liste stark ein und holt den gesuchten Film nach oben — „Die
   Odyssee" landet sonst auf #7 zwischen anderen Odyssee-Filmen, „Die Odyssee
   2021" auf #1. Deutsche Releases tragen das Original-Erscheinungsjahr im Namen
   (Die.Odyssee.2021.GERMAN…), also passt TMDBs Jahr. Ohne Jahr faellt es
   automatisch auf nur den Titel zurueck. */
function txDdlUrl(title, year) {
  const base = txSimpleTitle(title);
  if (!base) return null;
  const y = /^\d{4}$/.test(String(year || '')) ? ` ${year}` : '';
  return `${TX_DDL_BASE}${encodeURIComponent(base + y)}&cat=0`;
}

/* ---------- Layout ----------
   Wie bei den anderen Kacheln: jede Achse setzt eine Klasse auf #txList, die in
   styles.css nur CSS-Variablen umschreibt. */
function applyTxLayout() {
  const list = $('txList');
  if (!list) return;
  const pick = (prefix, key, options) => {
    const cur = String(_cfgVal('tmdb-xrel', key));
    for (const o of options) list.classList.toggle(prefix + o.v, o.v === cur);
  };
  pick('tx-text-', 'textSize', TX_SIZES);
  pick('tx-space-', 'spacing', TX_SPACINGS);
}

/* ---------- Effektiver Zustand ----------
   Das Backend liefert zwei Zahlen: releaseCount (echte Releases, ohne
   Kino-Abfilmung) und camCount (CAM/TS). Bei aktivem CAM-Filter (Standard)
   zaehlt nur releaseCount — ein Film mit ausschliesslich CAMs wird dann rot,
   nicht gruen. So schaltet der Toggle ohne neuen Serverabruf um. `unknown`
   (xrel nicht erreichbar) bleibt in jedem Fall grau. */
function _txHideCam() {
  return _cfgVal('tmdb-xrel', 'hideCam') !== false; // Standard AN
}

function _txEffective(item) {
  if (item.status === 'unknown') return { status: 'unknown', count: 0 };
  const good = Number(item.releaseCount) || 0;
  const cam = Number(item.camCount) || 0;
  const count = _txHideCam() ? good : good + cam;
  return { status: count > 0 ? 'found' : 'none', count };
}

/* ---------- Filter ---------- */
function _txFilter(movies) {
  const onlyFound = _cfgVal('tmdb-xrel', 'onlyFound') === true;
  return (movies || []).filter((m) => !onlyFound || _txEffective(m).status === 'found');
}

/* ---------- Zeilen ---------- */

function _txCreateRow() {
  const row = document.createElement('div');
  row.className = 'tx-row';
  row.innerHTML =
    '<span class="tx-dot"></span>'
    + '<span class="tx-title"></span>'
    + '<span class="tx-count"></span>';
  row._dot = row.querySelector('.tx-dot');
  row._title = row.querySelector('.tx-title');
  row._count = row.querySelector('.tx-count');

  const open = () => {
    const it = row._item;
    // Nur gruene Filme (nach CAM-Filter) haben etwas zu zeigen.
    if (it && it.xrelId && _txEffective(it).status === 'found') openTxDetail(it.xrelId, it);
  };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _txUpdateRow(row, item, prev) {
  row._item = item;

  if (!prev || prev.title !== item.title) {
    row._title.textContent = item.title;
    // Originaltitel als Tooltip, falls er vom Anzeigetitel abweicht.
    row.title = item.originalTitle ? `${item.title} — ${item.originalTitle}` : item.title;
  }

  // Der effektive Zustand haengt am CAM-Filter, nicht nur an item — deshalb
  // immer neu berechnen (der Toggle aendert item selbst nicht).
  const eff = _txEffective(item);
  const key = `${eff.status}:${eff.count}`;
  if (row._effKey !== key) {
    row._effKey = key;
    row.classList.toggle('tx-found', eff.status === 'found');
    row.classList.toggle('tx-none', eff.status === 'none');
    row.classList.toggle('tx-unknown', eff.status === 'unknown');

    // Nur gruene Zeilen sind anklickbar.
    const clickable = eff.status === 'found' && !!item.xrelId;
    row.setAttribute('role', clickable ? 'button' : 'presentation');
    if (clickable) row.tabIndex = 0; else row.removeAttribute('tabindex');
    row.classList.toggle('tx-clickable', clickable);

    row._count.textContent = eff.status === 'found'
      ? (eff.count === 1 ? '1 Release' : `${eff.count} Releases`)
      : eff.status === 'unknown' ? 'ungeprüft' : '';
  }
}

/* ---------- Rendern ---------- */

function renderTmdbXrel(d) {
  // Der Push liefert immer die aktuelle Liste. Fehler-Payloads (ok:false) nicht
  // ueber gute Daten schreiben, sonst blinkt die Kachel bei einem Fehl-Tick.
  if (d && (d.ok || d.error === 'not_configured')) _txData = d;
  else if (d && !_txData) _txData = d;

  applyTxLayout();

  const badge = $('txBadge');
  const list = $('txList');
  const data = _txData;

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : (data ? 'offline' : '…');
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg ? 'Einstellungen → Module → TMDB × xrel' : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.id, _txCreateRow, _txUpdateRow);
    setTxEmpty(notCfg
      ? 'Noch nicht eingerichtet — Einstellungen → Module → TMDB × xrel.'
      : data ? 'TMDB ist gerade nicht erreichbar.' : 'Wird geladen …');
    return;
  }

  const all = data.movies || [];
  const items = _cfgLimit('tmdb-xrel', 'maxRows', _txFilter(all));
  if (list) diffList(list, items, (i) => i.id, _txCreateRow, _txUpdateRow);
  setTxEmpty(items.length ? '' : (all.length ? 'Kein Film passt zum Filter.' : 'Keine Filme geladen.'));

  if (badge) {
    const found = all.filter((m) => _txEffective(m).status === 'found').length;
    const unknown = all.filter((m) => m.status === 'unknown').length;
    const stale = data._stale;
    badge.textContent = stale ? 'stale' : `${found}/${all.length} auf xrel`;
    badge.style.color = stale ? '#ffb454' : 'var(--text-3)';
    // Ungepruefte Filme (xrel gerade nicht erreichbar) im Tooltip nennen, statt
    // sie stillschweigend als „nicht gefunden" mitzuzaehlen.
    badge.title = stale
      ? 'Letzter bekannter Stand — xrel/TMDB gerade nicht erreichbar.'
      : unknown ? `${unknown} noch ungeprüft (xrel nicht erreichbar)` : '';
  }
}

function setTxEmpty(text) {
  const el = $('txEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

// REST-Fallback: greift ohne SSE-Stream und nach Options-Aenderungen.
async function pollTmdbXrel() {
  if (!state.liveOn || !widgetOnActivePage('tmdb-xrel')) return;
  try {
    renderTmdbXrel(await fetch('/api/tmdb-xrel', { cache: 'no-store' }).then((r) => r.json()));
  } catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

/* ---------- Detailfenster ---------- */

function _buildTxDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'txDetailModal';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(640px,100%)">'
    + '<div class="picker-head">'
    + '<span class="picker-title" id="txDetailTitle">Releases</span>'
    + '<button class="picker-close" title="Schließen" aria-label="Schließen">✕</button>'
    + '</div>'
    + '<div class="tx-detail-body">'
    + '<div id="txDetailList" class="tx-detail-list"></div>'
    + '<div id="txDetailEmpty" class="tx-detail-empty"></div>'
    + '</div>'
    + '<div class="tx-detail-foot">'
    + '<a id="txDetailDdl" class="cfg-btn" target="_blank" rel="noopener noreferrer">DDL-Suche ↗</a>'
    + '<a id="txDetailXrel" class="cfg-btn" target="_blank" rel="noopener noreferrer">Auf xrel ansehen ↗</a>'
    + '</div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeTxDetail(); });
  modal.querySelector('.picker-close').addEventListener('click', closeTxDetail);
  document.addEventListener('keydown', (e) => {
    if (_txDetail && e.key === 'Escape') closeTxDetail();
  });
  document.body.appendChild(modal);
  return modal;
}

async function openTxDetail(xrelId, seed) {
  const modal = $('txDetailModal') || _buildTxDetailModal();
  _txDetail = xrelId;
  _txLastFocus = document.activeElement;

  setText('txDetailTitle', (seed && seed.title) || 'Releases');
  const xrelLink = $('txDetailXrel');
  if (xrelLink) {
    if (seed && seed.xrelUrl) { xrelLink.href = seed.xrelUrl; xrelLink.style.display = ''; }
    else xrelLink.style.display = 'none';
  }
  // DDL-Suche mit dem bereinigten deutschen Titel — unabhaengig davon, ob es
  // einen xrel-Link gibt.
  const ddlLink = $('txDetailDdl');
  if (ddlLink) {
    const url = seed && txDdlUrl(seed.title, seed.year);
    if (url) { ddlLink.href = url; ddlLink.style.display = ''; }
    else ddlLink.style.display = 'none';
  }
  const listEl = $('txDetailList');
  if (listEl) listEl.textContent = '';
  setText('txDetailEmpty', 'Wird geladen …');

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });

  try {
    // CAMs im Modal nur zeigen, wenn der Filter aus ist — passend zur Zahl in
    // der Zeile, damit beides dieselbe Wahrheit erzaehlt.
    const cam = _txHideCam() ? '' : '&cam=1';
    const d = await fetch(`/api/tmdb-xrel/releases?id=${encodeURIComponent(xrelId)}${cam}`, { cache: 'no-store' })
      .then((r) => r.json());
    // Zwischenzeitlich geschlossen oder ein anderer Film geoeffnet.
    if (_txDetail !== xrelId) return;
    txFillDetail(d);
  } catch {
    if (_txDetail === xrelId) setText('txDetailEmpty', 'Die Releases konnten nicht geladen werden.');
  }
}

function _txReleaseRow(rel) {
  const row = document.createElement('div');
  row.className = 'tx-rel';
  row.innerHTML =
    '<div class="tx-rel-main">'
    + '<span class="tx-rel-name"></span>'
    + '<span class="tx-rel-badge"></span>'
    + '</div>'
    + '<div class="tx-rel-meta"></div>';
  row.querySelector('.tx-rel-name').textContent = rel.dirname || '(ohne Namen)';
  const badge = row.querySelector('.tx-rel-badge');
  badge.textContent = rel.scene ? 'Scene' : 'P2P';
  badge.classList.add(rel.scene ? 'tx-rel-scene' : 'tx-rel-p2p');
  row.querySelector('.tx-rel-meta').textContent = [
    txDateLabel(rel.time), rel.group, rel.video, rel.audio, rel.size,
  ].filter(Boolean).join(' · ');

  if (rel.url) {
    row.classList.add('tx-clickable');
    row.setAttribute('role', 'link');
    row.tabIndex = 0;
    const open = () => window.open(rel.url, '_blank', 'noopener,noreferrer');
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }
  return row;
}

function txFillDetail(d) {
  const listEl = $('txDetailList');
  if (!listEl) return;
  listEl.textContent = '';

  if (!d || !d.ok) {
    setText('txDetailEmpty', d && d.error === 'rate_limited'
      ? 'xrel-Limit erreicht — bitte später erneut.'
      : 'Die Releases konnten nicht geladen werden.');
    return;
  }
  const releases = d.releases || [];
  if (!releases.length) {
    setText('txDetailEmpty', 'Keine Releases gefunden.');
    return;
  }
  setText('txDetailEmpty', '');
  for (const rel of releases) listEl.appendChild(_txReleaseRow(rel));
}

function closeTxDetail() {
  const modal = $('txDetailModal');
  _txDetail = null;
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_txLastFocus && typeof _txLastFocus.focus === 'function') _txLastFocus.focus();
  _txLastFocus = null;
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'tmdb-xrel',
  label: 'TMDB × xrel',
  section: 'media',
  defaultSize: { w: 4, h: 8 },
  minSize: { w: 3, h: 4 },

  event: 'tmdbXrel',
  handler: renderTmdbXrel,
  refresh: () => { renderTmdbXrel(null); pollTmdbXrel(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>TMDB × xrel</span>
        <span id="txBadge" class="tile-badge"></span>
      </div>
      <div id="txList" class="tile-list tx-list" data-cfg="list"></div>
      <div id="txEmpty" class="tx-empty" style="display:none"></div>
    </div>`,

  options: [
    // Standard AN: CAM/TS zaehlen nicht mit und tauchen im Modal nicht auf.
    // filter:true -> wirkt nur im Renderer, kein neuer Serverabruf.
    { key: 'hideCam', label: 'CAM/TS ausblenden', type: 'toggle', default: true, filter: true, group: 'Auswahl' },
    { key: 'onlyFound', label: 'Nur auf xrel gefundene', type: 'toggle', default: false, filter: true, group: 'Auswahl' },
    { key: 'maxRows', label: 'Max. Filme', type: 'count', default: 0, group: 'Auswahl' },

    { key: 'list', label: 'Filmliste', type: 'toggle', default: true, group: 'Anzeige' },

    { key: 'textSize', label: 'Schriftgröße', type: 'select', default: 'm', options: TX_SIZES, group: 'Darstellung' },
    { key: 'spacing', label: 'Abstand', type: 'select', default: 'normal', options: TX_SPACINGS, group: 'Darstellung' },
  ],

  settings: {
    badge: 'TX', color: '#22d3ee',
    statusEl: 'txSettingsStatus',
    load: loadTmdbXrelSettings,
  },
});

/* ============================================================================
   Einstellungen (Settings → Module → TMDB × xrel)
   ----------------------------------------------------------------------------
   Das Panel baut sein Token-Feld selbst, wie die Game-Releases-Kachel.
   /api/secrets ist generisch: es kennt die Keys aus dem Backend-Manifest,
   liefert maskierte Werte als '***' und ignoriert '***' beim Speichern.

   Nur EIN Feld: der TMDB-Token. Die xrel-Lesezugriffe sind oeffentlich und
   brauchen weder Token noch registrierte App.
   ============================================================================ */

const TX_SECRETS = [
  { key: 'TMDB_TOKEN', label: 'TMDB Read Access Token', type: 'password' },
];

function setTxStatus(text, color) {
  const el = $('txSettingsStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

async function loadTmdbXrelSettings() {
  const body = $('txSettingsBody');
  if (!body) return;
  let secrets = {};
  try {
    secrets = await fetch('/api/secrets', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    body.textContent = 'Zugangsdaten konnten nicht geladen werden.';
    setTxStatus('● Fehler', '#f43f5e');
    return;
  }
  renderTmdbXrelSettings(secrets);
  txRefreshStatus();
}

function renderTmdbXrelSettings(secrets) {
  const body = $('txSettingsBody');
  if (!body) return;
  const fromEnv = new Set(secrets._env || []);
  body.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Zugangsdaten';
  body.appendChild(head);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';
  const inputs = [];
  for (const s of TX_SECRETS) {
    const input = document.createElement('input');
    input.className = 'cfg-input';
    input.type = s.type;
    input.placeholder = s.label;
    input.autocomplete = 'off';
    input.value = secrets[s.key] || '';
    // Per Umgebungsvariable gesetzte Werte haben Vorrang — das Feld sagt es.
    if (fromEnv.has(s.key)) {
      input.readOnly = true;
      input.title = `${s.key} kommt aus der Umgebung und hat Vorrang`;
      input.style.opacity = '.6';
    }
    inputs.push({ ...s, input });
    row.appendChild(input);
  }

  const save = document.createElement('button');
  save.className = 'cfg-btn';
  save.textContent = '↵ Speichern';
  save.addEventListener('click', async () => {
    const payload = {};
    for (const s of inputs) if (!s.input.readOnly) payload[s.key] = s.input.value.trim();
    setTxStatus('● speichert …', 'var(--text-3)');
    try {
      const r = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Der Server leert dabei alle Caches; die Kachel holt frische Daten.
      await txRefreshStatus();
      pollTmdbXrel();
    } catch (err) {
      console.error('TMDB/xrel-Zugangsdaten konnten nicht gespeichert werden:', err.message);
      setTxStatus('● Fehler', '#f43f5e');
    }
  });
  row.appendChild(save);
  body.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'tile-settings-hint';
  hint.style.lineHeight = '1.7';
  // Statischer Text, keine Fremddaten im Spiel.
  hint.innerHTML = '<b>TMDB</b>: kostenloses Konto auf '
    + '<a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">'
    + 'themoviedb.org</a>, dort den <i>API Read Access Token</i> (v4) kopieren — '
    + 'das ist das einzige Feld hier.<br>'
    + '<b>xrel</b> braucht keine Zugangsdaten: die Suche und die Release-Listen '
    + 'sind öffentlich. Die Kachel gleicht alle 6 Stunden ab und bleibt damit '
    + 'weit unter dem Anfragelimit.';
  body.appendChild(hint);
}

// Sagt, ob die Zugangsdaten tatsaechlich tragen — „gespeichert" allein hilft
// nicht, wenn TMDB sie ablehnt.
async function txRefreshStatus() {
  try {
    const d = await fetch('/api/tmdb-xrel', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok) {
      const n = (d.movies || []).length;
      const found = (d.movies || []).filter((m) => m.status === 'found').length;
      setTxStatus(`● ${found}/${n} auf xrel`, '#3ddc97');
    } else if (d && d.error === 'not_configured') {
      setTxStatus('● nicht eingerichtet', '#ffb454');
    } else {
      setTxStatus('● TMDB antwortet nicht', '#f43f5e');
    }
  } catch {
    setTxStatus('● Fehler', '#f43f5e');
  }
}
