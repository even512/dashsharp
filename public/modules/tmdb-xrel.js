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

/* ============================================================================
   CSS-Injektion — das Modul liefert die NEUEN Klassen selbst
   ----------------------------------------------------------------------------
   Die bestehenden tx-*-Klassen (tx-row, tx-dot, tx-found, tx-list, tx-rel …)
   liegen in der Kern-Datei styles.css und bleiben unangetastet. Nur was mit
   dieser Aenderung dazukommt — Reiter (Tabs), der dezente Zeilen-Puls, der
   Detail-Steckbrief (Cover, Beschreibung, Tabelle) — haengt das Modul beim
   Laden EINMAL selbst in den <head> (idempotent ueber die feste id, mit
   Node-Guard). Durchgaengig ueber die Theme-Variablen aus styles.css, damit
   Hell-/Dunkel-/Win9x-Theme mittragen. Der bluestichige rgba-Ton fuer Hover/
   Puls ist derselbe wie in styles.css/wow.js — bewusst theme-neutral.
   ============================================================================ */
(function injectTxStyles() {
  const ID = 'tmdb-xrel-module-styles';
  if (typeof document === 'undefined' || document.getElementById(ID)) return;
  const style = document.createElement('style');
  style.id = ID;
  style.textContent = `
/* ---- Reiter (Tabs): schlichte Tab-Leiste ueber der Liste ---- */
.tx-tabs { display: flex; gap: 4px; margin: 0 0 8px; border-bottom: 1px solid var(--border-3); }
.tx-tabs:empty { display: none; }
.tx-tab {
  appearance: none; background: none; border: none;
  padding: 6px 10px; margin-bottom: -1px;
  font: 600 11.5px 'JetBrains Mono', monospace;
  color: var(--text-3); cursor: pointer;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
}
.tx-tab:hover { color: var(--text-15); background: rgba(120,150,200,0.06); }
.tx-tab:focus-visible { outline: 1px solid var(--accent-border); outline-offset: 1px; }
.tx-tab.tx-tab-active { color: var(--text-1); border-bottom-color: var(--accent-border); }

/* ---- Zeilen-Puls: ein einziger, ruhiger Farb-Puls beim Erscheinen ---- */
@keyframes tx-pulse {
  0%   { background: rgba(120,150,200,0.00); }
  22%  { background: rgba(120,150,200,0.20); }
  100% { background: rgba(120,150,200,0.00); }
}
.tx-row.tx-pulse { animation: tx-pulse 1.5s ease-out 1; border-radius: 8px; }

/* ---- Detail-Steckbrief: Cover links, Beschreibung + Tabelle daneben ---- */
.tx-steckbrief { display: flex; gap: 14px; margin-bottom: 14px; align-items: flex-start; }
.tx-steckbrief:empty { display: none; }
.tx-cover {
  flex-shrink: 0; width: 120px; border-radius: 8px; display: block;
  border: 1px solid var(--border-1); background: rgba(120,150,200,0.10);
}
.tx-steck-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.tx-steck-desc {
  font: 500 11.5px/1.5 'JetBrains Mono', monospace; color: var(--text-2);
  display: -webkit-box; -webkit-line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden;
}
.tx-steck-table { display: flex; flex-direction: column; gap: 4px; }
.tx-steck-row { display: flex; gap: 8px; font: 500 11px 'JetBrains Mono', monospace; }
.tx-steck-key { flex-shrink: 0; width: 88px; color: var(--text-3); }
.tx-steck-val { flex: 1; min-width: 0; color: var(--text-15); }
`;
  document.head.appendChild(style);
})();

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

let _txData = null;      // letzte Payload vom Server
let _txDetail = null;    // id des gerade geoeffneten Films (Race-Guard)
let _txLastFocus = null;
let _txActiveTab = 'popular'; // ephemer: aktiver Reiter (nicht als Option gespeichert)
let _txPulseSet = null;  // ids, die im aktuellen Render einmal pulsen sollen

// Merkzettel fuer die Zeilen-Animation: pro Film-id das zuletzt gesehene total.
// Persistent im localStorage, damit ein neuer/gewachsener Film auch nach einem
// Reload noch als solcher erkannt wird.
const TX_SEEN_KEY = 'dash.tmdb-xrel.seen';

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

// Titel mit Erscheinungsjahr — „Titel (JJJJ)", sonst nur der Titel. Geht immer
// ueber textContent, nie ins innerHTML.
function txTitleWithYear(item) {
  const t = item.title || '';
  return item.year ? `${t} (${item.year})` : t;
}

// Cover-URL aus fest verdrahteter TMDB-Basis + validiertem Roh-Pfad. Der Pfad
// muss mit „/" beginnen und auf ein Bildformat enden; alles andere -> null
// (kein Bild, kein Bruch). Wird ausschliesslich ueber img.src gesetzt.
const TX_POSTER_BASE = 'https://image.tmdb.org/t/p/w185';
function txPosterUrl(poster) {
  const p = String(poster || '');
  if (!/^\/[\w./-]+\.(jpg|jpeg|png|webp)$/i.test(p)) return null;
  return TX_POSTER_BASE + p;
}

/* ---------- Animations-Merkzettel (localStorage) ----------
   Defekter/voller localStorage darf die Kachel nie kippen — alles in try/catch.
   _txLoadSeen liefert null beim Erstbesuch (kein Schluessel) → dann pulst
   bewusst nichts. */
function _txLoadSeen() {
  try {
    const raw = localStorage.getItem(TX_SEEN_KEY);
    if (raw == null) return null; // Erstbesuch
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}

function _txSaveSeen(movies) {
  try {
    const store = {};
    for (const m of movies || []) {
      if (m && m.id != null) store[String(m.id)] = Number(m.total) || 0;
    }
    localStorage.setItem(TX_SEEN_KEY, JSON.stringify(store));
  } catch { /* voll/deaktiviert — Animation entfaellt still, Kachel bleibt heil */ }
}

// Welche Filme sollen in diesem Render pulsen: id neu ODER total gewachsen.
// Wird ueber die GESAMTE Payload (beide Tabs) berechnet, damit ein Tab-Wechsel
// nicht faelschlich Filme des anderen Tabs pulsen laesst.
function _txPulseIds(movies, seen) {
  const ids = new Set();
  if (!seen) return ids; // Erstbesuch: nichts animieren
  for (const m of movies || []) {
    if (!m || m.id == null) continue;
    const prev = seen[String(m.id)];
    const total = Number(m.total) || 0;
    if (prev === undefined || total > prev) ids.add(m.id);
  }
  return ids;
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
   Das Backend liefert vier Release-Toepfe: deutsch/nicht-deutsch × echt/CAM
   (germanGood, germanCam, otherGood, otherCam). Aus ihnen rechnet das Frontend
   je nach den beiden Toggles die angezeigte Zahl und die Ampelfarbe — ohne
   neuen Serverabruf:

     germanOnly AN  + hideCam AN  -> germanGood
     germanOnly AN  + hideCam AUS -> germanGood + germanCam
     germanOnly AUS + hideCam AN  -> germanGood + otherGood
     germanOnly AUS + hideCam AUS -> alle vier

   `unknown` (xrel nicht erreichbar) bleibt in jedem Fall grau. */
function _txHideCam() {
  return _cfgVal('tmdb-xrel', 'hideCam') !== false; // Standard AN
}

function _txGermanOnly() {
  return _cfgVal('tmdb-xrel', 'germanOnly') !== false; // Standard AN
}

function _txEffective(item) {
  if (item.status === 'unknown') return { status: 'unknown', count: 0 };
  const gg = Number(item.germanGood) || 0;
  const gc = Number(item.germanCam) || 0;
  const og = Number(item.otherGood) || 0;
  const oc = Number(item.otherCam) || 0;
  const hideCam = _txHideCam();
  let count;
  if (_txGermanOnly()) count = hideCam ? gg : gg + gc;
  else count = hideCam ? gg + og : gg + gc + og + oc;
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
  row.className = 'tx-row tx-clickable';
  row.innerHTML =
    '<span class="tx-dot"></span>'
    + '<span class="tx-title"></span>'
    + '<span class="tx-count"></span>';
  row._dot = row.querySelector('.tx-dot');
  row._title = row.querySelector('.tx-title');
  row._count = row.querySelector('.tx-count');

  // Jede Zeile oeffnet das Detail-Modal — auch rote/graue (dort steht der
  // Steckbrief plus ein passender Release-Hinweis).
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  const open = () => { if (row._item) openTxDetail(row._item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _txUpdateRow(row, item, prev) {
  row._item = item;

  if (!prev || prev.title !== item.title || prev.year !== item.year
      || prev.originalTitle !== item.originalTitle) {
    row._title.textContent = txTitleWithYear(item);
    // Originaltitel als Tooltip, falls er vom Anzeigetitel abweicht.
    row.title = item.originalTitle ? `${item.title} — ${item.originalTitle}` : item.title;
  }

  // Der effektive Zustand haengt an den beiden Toggles, nicht nur an item —
  // deshalb immer neu berechnen (die Toggles aendern item selbst nicht).
  const eff = _txEffective(item);
  const key = `${eff.status}:${eff.count}`;
  if (row._effKey !== key) {
    row._effKey = key;
    row.classList.toggle('tx-found', eff.status === 'found');
    row.classList.toggle('tx-none', eff.status === 'none');
    row.classList.toggle('tx-unknown', eff.status === 'unknown');

    row._count.textContent = eff.status === 'found'
      ? (eff.count === 1 ? '1 Release' : `${eff.count} Releases`)
      : eff.status === 'unknown' ? 'ungeprüft' : '';
  }

  // Zeilen-Puls: nur, wenn diese id im aktuellen Pulse-Set steht. Die Klasse
  // wird vor dem Setzen entfernt und ein Reflow erzwungen, damit die Animation
  // sicher neu startet; nach ~1,5 s wird sie wieder entfernt.
  if (_txPulseSet && _txPulseSet.has(item.id)) {
    row.classList.remove('tx-pulse');
    void row.offsetWidth;
    row.classList.add('tx-pulse');
    clearTimeout(row._pulseT);
    row._pulseT = setTimeout(() => row.classList.remove('tx-pulse'), 1600);
  }
}

/* ---------- Reiter (Tabs) ----------
   Zwei Tabs — „Nicht auf Plex" (Filme NICHT in Plex) und „Auf Plex" (inPlex). Ohne
   Plex (kein Film hat inPlex) bleibt die Leiste leer und wird per CSS (:empty)
   ausgeblendet — dann gibt es genau eine Liste wie frueher. Der aktive Tab ist
   ephemer (Modul-Variable), kein gespeicherter Zustand. */
function renderTxTabs(all, hasPlex, activeTab) {
  const tabsEl = $('txTabs');
  if (!tabsEl) return;
  tabsEl.textContent = '';
  if (!hasPlex) return; // leer -> per CSS ausgeblendet

  const popCount = all.filter((m) => !m.inPlex).length;
  const plexCount = all.filter((m) => m.inPlex).length;
  const defs = [
    { key: 'popular', label: `Nicht auf Plex (${popCount})` },
    { key: 'plex', label: `Auf Plex (${plexCount})` },
  ];
  for (const def of defs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tx-tab' + (def.key === activeTab ? ' tx-tab-active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', def.key === activeTab ? 'true' : 'false');
    btn.textContent = def.label; // statischer Text + Zahl, keine Fremddaten
    btn.addEventListener('click', () => {
      if (_txActiveTab === def.key) return;
      _txActiveTab = def.key;
      renderTmdbXrel(null); // aktuelle Daten mit dem neuen Tab neu rendern
    });
    tabsEl.appendChild(btn);
  }
}

/* ---------- Rendern ---------- */

function renderTmdbXrel(d) {
  // Der Push liefert immer die aktuelle Liste. Fehler-Payloads (ok:false) nicht
  // ueber gute Daten schreiben, sonst blinkt die Kachel bei einem Fehl-Tick.
  if (d && (d.ok || d.error === 'not_configured')) _txData = d;
  else if (d && !_txData) _txData = d;

  applyTxLayout();
  _txPulseSet = null;

  const badge = $('txBadge');
  const list = $('txList');
  const data = _txData;

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : (data ? 'offline' : '…');
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg ? 'Einstellungen → Module → TMDB – Beliebte Filme' : (data && data.message) || '';
    }
    renderTxTabs([], false);
    if (list) diffList(list, [], (i) => i.id, _txCreateRow, _txUpdateRow);
    setTxEmpty(notCfg
      ? 'Noch nicht eingerichtet — Einstellungen → Module → TMDB – Beliebte Filme.'
      : data ? 'TMDB ist gerade nicht erreichbar.' : 'Wird geladen …');
    return;
  }

  const all = data.movies || [];
  const hasPlex = all.some((m) => m && m.inPlex);

  // Animations-Signal aus der GESAMTEN Payload (beide Tabs) berechnen, BEVOR
  // der Store aktualisiert wird — sonst wuerde nie etwas pulsen.
  _txPulseSet = _txPulseIds(all, _txLoadSeen());

  // Ohne Plex gibt es nur „Beliebt"; sonst der ephemere aktive Tab.
  const tab = hasPlex ? _txActiveTab : 'popular';
  renderTxTabs(all, hasPlex, tab);

  const pool = hasPlex
    ? all.filter((m) => (tab === 'plex') === !!m.inPlex)
    : all;

  const items = _cfgLimit('tmdb-xrel', 'maxRows', _txFilter(pool));
  if (list) diffList(list, items, (i) => i.id, _txCreateRow, _txUpdateRow);
  setTxEmpty(items.length ? '' : (
    pool.length ? 'Kein Film passt zum Filter.'
      : (hasPlex && tab === 'plex') ? 'Kein Film in deiner Plex-Bibliothek.'
        : all.length ? 'Kein Film passt zum Filter.' : 'Keine Filme geladen.'));

  // Store ueber die GESAMTE Payload aktualisieren (nicht nur den aktiven Tab),
  // damit ein Tab-Wechsel nicht faelschlich Filme des anderen Tabs pulsen laesst.
  _txSaveSeen(all);

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
    + '<div id="txSteckbrief" class="tx-steckbrief"></div>'
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

/* Fuellt den Steckbrief-Kopf (Cover, Beschreibung, Tabelle). Alle Werte gehen
   ueber textContent, das Cover ausschliesslich ueber img.src aus fest
   verdrahteter Basis + validiertem Pfad — nie via innerHTML. */
function txFillSteckbrief(item) {
  const el = $('txSteckbrief');
  if (!el) return;
  el.textContent = '';
  if (!item) return;

  const src = txPosterUrl(item.poster);
  if (src) {
    const img = document.createElement('img');
    img.className = 'tx-cover';
    img.alt = '';
    img.loading = 'lazy';
    img.src = src;
    // Laedt das Bild nicht, faellt es sauber weg (kein Bruch).
    img.addEventListener('error', () => { img.remove(); });
    el.appendChild(img);
  }

  const info = document.createElement('div');
  info.className = 'tx-steck-info';

  if (item.overview) {
    const desc = document.createElement('div');
    desc.className = 'tx-steck-desc';
    desc.textContent = item.overview;
    info.appendChild(desc);
  }

  const table = document.createElement('div');
  table.className = 'tx-steck-table';
  const addRow = (label, value) => {
    if (!value) return;
    const r = document.createElement('div');
    r.className = 'tx-steck-row';
    const k = document.createElement('span');
    k.className = 'tx-steck-key';
    k.textContent = label;
    const v = document.createElement('span');
    v.className = 'tx-steck-val';
    v.textContent = value;
    r.appendChild(k);
    r.appendChild(v);
    table.appendChild(r);
  };
  if (item.rating != null) addRow('Bewertung', `${String(item.rating).replace('.', ',')} / 10`);
  if (Array.isArray(item.genres) && item.genres.length) addRow('Genres', item.genres.join(', '));
  if (item.originalTitle) addRow('Originaltitel', item.originalTitle);
  if (table.children.length) info.appendChild(table);

  // Nur anhaengen, wenn es ueberhaupt Inhalt gibt (sonst bleibt el leer ->
  // per CSS :empty ausgeblendet).
  if (info.children.length) el.appendChild(info);
}

// Oeffnet das Detail-Modal fuer JEDEN Film (nicht nur gruene). Der Steckbrief
// steht immer; darunter je nach Ampel die Release-Liste, „Kein deutsches
// Release gefunden." (rot) oder „Noch nicht geprüft." (grau).
async function openTxDetail(item) {
  if (!item) return;
  const modal = $('txDetailModal') || _buildTxDetailModal();
  const openId = item.id;
  _txDetail = openId;
  _txLastFocus = document.activeElement;

  setText('txDetailTitle', txTitleWithYear(item) || 'Releases');
  txFillSteckbrief(item);

  const xrelLink = $('txDetailXrel');
  if (xrelLink) {
    if (item.xrelUrl) { xrelLink.href = item.xrelUrl; xrelLink.style.display = ''; }
    else xrelLink.style.display = 'none';
  }
  // DDL-Suche mit dem bereinigten deutschen Titel — unabhaengig davon, ob es
  // einen xrel-Link gibt.
  const ddlLink = $('txDetailDdl');
  if (ddlLink) {
    const url = txDdlUrl(item.title, item.year);
    if (url) { ddlLink.href = url; ddlLink.style.display = ''; }
    else ddlLink.style.display = 'none';
  }
  const listEl = $('txDetailList');
  if (listEl) listEl.textContent = '';

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });

  // Release-Bereich passend zur Ampel (die vom effektiven Zustand kommt).
  const eff = _txEffective(item);
  if (eff.status === 'unknown') {
    setText('txDetailEmpty', 'Noch nicht geprüft.');
    return;
  }
  if (eff.status !== 'found' || !item.xrelId) {
    setText('txDetailEmpty', 'Kein deutsches Release gefunden.');
    return;
  }

  setText('txDetailEmpty', 'Wird geladen …');
  try {
    // CAMs im Modal nur zeigen, wenn der Filter aus ist; und nur deutsche
    // Releases, wenn germanOnly an ist — passend zur Zahl in der Zeile, damit
    // beides dieselbe Wahrheit erzaehlt.
    const cam = _txHideCam() ? '' : '&cam=1';
    const german = _txGermanOnly() ? '&german=1' : '';
    const d = await fetch(`/api/tmdb-xrel/releases?id=${encodeURIComponent(item.xrelId)}${cam}${german}`, { cache: 'no-store' })
      .then((r) => r.json());
    // Zwischenzeitlich geschlossen oder ein anderer Film geoeffnet.
    if (_txDetail !== openId) return;
    txFillDetail(d);
  } catch {
    if (_txDetail === openId) setText('txDetailEmpty', 'Die Releases konnten nicht geladen werden.');
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
  label: 'TMDB – Beliebte Filme',
  section: 'media',
  defaultSize: { w: 4, h: 8 },
  minSize: { w: 3, h: 4 },

  event: 'tmdbXrel',
  handler: renderTmdbXrel,
  refresh: () => { renderTmdbXrel(null); pollTmdbXrel(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>TMDB – Beliebte Filme</span>
        <span id="txBadge" class="tile-badge"></span>
      </div>
      <div id="txTabs" class="tx-tabs" data-cfg="list"></div>
      <div id="txList" class="tile-list tx-list" data-cfg="list"></div>
      <div id="txEmpty" class="tx-empty" style="display:none"></div>
    </div>`,

  options: [
    // Standard AN: CAM/TS zaehlen nicht mit und tauchen im Modal nicht auf.
    // filter:true -> wirkt nur im Renderer, kein neuer Serverabruf.
    { key: 'germanOnly', label: 'Nur deutsche Releases', type: 'toggle', default: true, filter: true, group: 'Auswahl' },
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
