'use strict';

/* ============================================================================
   Game Releases — Spiele-Neuerscheinungen
   ----------------------------------------------------------------------------
   Zeigt die Releases eines Tages als Kartenliste: hochkantes Cover links,
   Titel, Plattform-Chips und Kurztext rechts. Ein Klick oeffnet ein
   Detailfenster mit deutscher Beschreibung, Wertungen, Faktentafel und
   Screenshots.

   Ueber der Liste sitzt eine Leiste: einen Tag zurueck/vor, Datumsfeld fuer
   den Sprung auf ein beliebiges Datum, "Heute" und eine Lupe, hinter der
   sich ein Suchfeld aufklappt ("wann kommt eigentlich X raus?").

   Alle Inhalte sind Fremddaten: sie gehen ausschliesslich ueber textContent
   in die Seite, nie ueber innerHTML. Bilder kommen vom Server-Proxy
   (/api/game-releases/image), damit der Browser weiterhin nur mit dem
   Dashboard spricht.
   ============================================================================ */

/* Relevanz-Stufen. Die Schwellen sind an echten Daten kalibriert (28 Tage,
   1524 Spiele): hypes>=1 laesst ~8,5 Spiele/Tag durch und nur 1 von 28 Tagen
   bleibt leer, hypes>=3 waeren schon 10 leere Tage. */
const GR_RELEVANCE = [
  { v: 'all',      l: 'Alles anzeigen' },
  { v: 'balanced', l: 'Ausgewogen' },
  { v: 'notable',  l: 'Nur Namhaftes' },
];

const GR_FAMILIES = [
  { v: '',           l: 'Alle Plattformen' },
  { v: 'pc',         l: 'PC' },
  { v: 'playstation', l: 'PlayStation' },
  { v: 'xbox',       l: 'Xbox' },
  { v: 'nintendo',   l: 'Nintendo' },
  { v: 'mobile',     l: 'Mobil' },
  { v: 'vr',         l: 'VR' },
];

const GR_SIZES = [
  { v: 's',  l: 'Klein' },
  { v: 'm',  l: 'Normal' },
  { v: 'l',  l: 'Groß' },
  { v: 'xl', l: 'Sehr groß' },
];
const GR_SPACINGS = [
  { v: 'tight',  l: 'Eng' },
  { v: 'normal', l: 'Normal' },
  { v: 'wide',   l: 'Weit' },
];
const GR_SEPARATORS = [
  { v: 'none',  l: 'Ohne' },
  { v: 'line',  l: 'Trennlinie' },
  { v: 'card',  l: 'Karten' },
  { v: 'zebra', l: 'Abwechselnd getönt' },
];

// Wie bei News: -webkit-line-clamp braucht eine Zahl, "Vollständig" ist 99.
const GR_NO_CLAMP = '99';
function _grLineOptions(max) {
  const out = [];
  for (let n = 1; n <= max; n++) out.push({ v: String(n), l: n === 1 ? '1 Zeile' : `${n} Zeilen` });
  out.push({ v: '0', l: 'Vollständig' });
  return out;
}

let _grToday = null;    // Payload des heutigen Tages (kommt per Push)
let _grDate = null;     // aktuell angezeigtes Datum, null = heute
let _grOther = null;    // Payload eines angesprungenen Datums
let _grUpcoming = null; // Fallback-Liste fuer leere Tage
let _grDetail = null;   // gerade geoeffnetes Spiel
let _grLastFocus = null;
let _grShots = [];      // grosse Fassungen der Screenshots (Lightbox)
let _grShotIndex = 0;
let _grLightboxFocus = null;
let _grSearchTimer = null;
let _grSearchSeq = 0;

/* ---------- Formatierung ---------- */

function grIsoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function grShiftIso(iso, days) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return new Date(t + days * 86400000).toISOString().slice(0, 10);
}

function grDateLabel(iso) {
  if (!iso) return '';
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(t)) return iso;
  const today = grIsoToday();
  if (iso === today) return 'Heute';
  if (iso === grShiftIso(today, 1)) return 'Morgen';
  if (iso === grShiftIso(today, -1)) return 'Gestern';
  return new Date(t).toLocaleDateString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  });
}

function grShortDate(iso) {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t)
    ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })
    : '';
}

function grInitials(name) {
  return String(name || '?').replace(/[^\p{L}\p{N} ]/gu, '').trim()
    .split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
}

/* ---------- Filter ----------
   Der Server liefert immer alle Spiele des Tages; gefiltert wird hier, damit
   eine Umstellung sofort wirkt statt einen neuen Abruf auszuloesen. */

function _grRelevant(item, mode) {
  if (mode === 'all') return true;
  if (mode === 'notable') return item.hypes >= 5 || item.criticRating != null;
  return item.hypes >= 1 || item.rating != null || item.criticRating != null;
}

function _grFilter(items) {
  const mode = String(_cfgVal('game-releases', 'relevance') || 'balanced');
  const family = String(_cfgVal('game-releases', 'platforms') || '');
  const needCover = _cfgVal('game-releases', 'needCover') !== false;
  return (items || []).filter((it) => {
    if (!_grRelevant(it, mode)) return false;
    if (family && !(it.families || []).includes(family)) return false;
    if (needCover && !it.cover) return false;
    return true;
  });
}

/* ---------- Zeilen ---------- */

function _grCreateRow() {
  const row = document.createElement('div');
  row.className = 'gr-row';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  // Statisches Markup — die Spieldaten kommen ausschliesslich per textContent.
  row.innerHTML =
    '<div class="gr-cover"><img alt="" loading="lazy"><span class="gr-cover-fallback"></span></div>'
    + '<div class="gr-main">'
    + '<div class="gr-title"></div>'
    + '<div class="gr-chips"></div>'
    + '<div class="gr-teaser"></div>'
    + '<div class="gr-meta"><span class="gr-genres"></span><span class="gr-score"></span></div>'
    + '</div>';
  row._img = row.querySelector('.gr-cover img');
  row._fallback = row.querySelector('.gr-cover-fallback');
  row._title = row.querySelector('.gr-title');
  row._chips = row.querySelector('.gr-chips');
  row._teaser = row.querySelector('.gr-teaser');
  row._genres = row.querySelector('.gr-genres');
  row._score = row.querySelector('.gr-score');
  // Ein Cover, das der Proxy nicht liefern kann, faellt auf die Initialen
  // zurueck — die Bildspalte bleibt so ueber alle Zeilen gleich breit.
  row._img.addEventListener('error', () => { row._img.style.display = 'none'; });
  const open = () => { if (row._item) openGameDetail(row._item.id, row._item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _grChip(text, cls) {
  const el = document.createElement('span');
  el.className = cls || 'gr-chip';
  el.textContent = text;
  return el;
}

function _grUpdateRow(row, item, prev) {
  row._item = item;
  if (!prev || prev.name !== item.name) {
    row._title.textContent = item.name;
    row.title = item.name;
    row._fallback.textContent = grInitials(item.name);
  }
  if (!prev || prev.teaser !== item.teaser) {
    row._teaser.textContent = item.teaser || '';
  }
  if (!prev || prev.genres !== item.genres) {
    row._genres.textContent = (item.genres || []).slice(0, 3).join(' · ');
  }

  const score = item.criticRating || item.rating;
  const scoreText = score ? `${score}` : '';
  if (row._score.textContent !== scoreText) {
    row._score.textContent = scoreText;
    row._score.style.display = scoreText ? '' : 'none';
    // Gruen ab 75, gelb ab 60, sonst rot — wie man es von Wertungsseiten kennt.
    row._score.style.color = !score ? ''
      : score >= 75 ? 'var(--green, #3ddc97)'
      : score >= 60 ? '#ffb454' : '#f43f5e';
  }

  if (!prev || prev !== item) {
    row._chips.textContent = '';
    // Auf der Kachel ist Platz fuer eine Handvoll; der Rest steht im Detail.
    for (const p of (item.platforms || []).slice(0, 4)) row._chips.appendChild(_grChip(p.label));
    if ((item.platforms || []).length > 4) {
      row._chips.appendChild(_grChip(`+${item.platforms.length - 4}`));
    }
    if (item.status) row._chips.appendChild(_grChip(item.status, 'gr-chip gr-chip-flag'));
    else if (item.kind) row._chips.appendChild(_grChip(item.kind, 'gr-chip gr-chip-flag'));
    // Im Fallback "was kommt als Naechstes" steht pro Zeile ein anderes Datum.
    if (item._showDate) row._chips.appendChild(_grChip(grShortDate(item.date), 'gr-chip gr-chip-date'));
  }

  if (!prev || prev.cover !== item.cover) {
    if (item.cover) {
      row._img.style.display = '';
      row._img.src = item.cover;
    } else {
      row._img.style.display = 'none';
      row._img.removeAttribute('src');
    }
  }
}

/* ---------- Darstellung ----------
   Wie bei News: jede Achse setzt genau eine Klasse auf #grList, die in
   styles.css ausschliesslich CSS-Variablen umschreibt. Die Zeilen selbst
   kennen die Optionen nicht. */

function applyGrLayout() {
  const list = $('grList');
  if (!list) return;
  const pick = (prefix, key, options) => {
    const cur = String(_cfgVal('game-releases', key));
    for (const o of options) list.classList.toggle(prefix + o.v, o.v === cur);
  };
  pick('gr-text-', 'textSize', GR_SIZES);
  pick('gr-img-', 'coverSize', GR_SIZES);
  pick('gr-space-', 'spacing', GR_SPACINGS);
  pick('gr-sep-', 'separator', GR_SEPARATORS);

  const lines = (key) => {
    const n = Math.floor(+_cfgVal('game-releases', key)) || 0;
    return n > 0 ? String(n) : GR_NO_CLAMP;
  };
  list.style.setProperty('--gr-title-lines', lines('titleLines'));
  list.style.setProperty('--gr-teaser-lines', lines('teaserLines'));
}

function setGrEmpty(text) {
  const el = $('grEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

/* ---------- Rendern ---------- */

function grCurrentDate() { return _grDate || grIsoToday(); }

function grCurrentData() {
  return _grDate && _grDate !== grIsoToday() ? _grOther : _grToday;
}

function renderGameReleases(d) {
  // Der Push liefert immer den heutigen Tag; ein angesprungenes Datum darf
  // er nicht ueberschreiben.
  if (d) _grToday = d;
  // Die Kachel-Shell entsteht erst beim ersten Anzeigen, und der erste Render
  // kommt je nach Situation aus dem SSE-Push statt aus refresh() — deshalb
  // hier verdrahten. grWireBar() ist idempotent.
  grWireBar();
  applyGrLayout();

  const date = grCurrentDate();
  const dateEl = $('grDate');
  if (dateEl && dateEl.value !== date) dateEl.value = date;
  setText('grDateLabel', grDateLabel(date));

  const badge = $('grBadge');
  const list = $('grList');
  const data = grCurrentData();

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : (data ? 'offline' : '…');
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg
        ? 'Einstellungen → Module → Game Releases'
        : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.id, _grCreateRow, _grUpdateRow);
    setGrEmpty(notCfg
      ? 'Noch nicht eingerichtet — Einstellungen → Module → Game Releases.'
      : data ? 'IGDB ist gerade nicht erreichbar.' : 'Wird geladen …');
    return;
  }

  const all = data.items || [];
  let items = _cfgLimit('game-releases', 'maxRows', _grFilter(all));
  let fallback = false;

  // Leerer Tag: statt einer leeren Kachel zeigen, was als Naechstes ansteht.
  if (!items.length && _grUpcoming && _grUpcoming.length) {
    fallback = true;
    items = _cfgLimit('game-releases', 'maxRows',
      _grUpcoming.map((it) => ({ ...it, _showDate: true })));
  }

  if (list) {
    list.classList.toggle('gr-list-upcoming', fallback);
    diffList(list, items, (i) => i.id, _grCreateRow, _grUpdateRow);
  }

  if (!items.length) {
    setGrEmpty(all.length
      ? 'Keine Neuerscheinung passt zu den gewählten Filtern.'
      : 'An diesem Tag erscheint nichts.');
  } else if (fallback) {
    setGrEmpty('');
    setText('grHint', `Am ${grShortDate(date)} erscheint nichts Relevantes — das kommt als Nächstes:`);
  } else {
    setGrEmpty('');
  }
  const hint = $('grHint');
  if (hint) hint.style.display = fallback ? '' : 'none';

  if (badge) {
    const n = fallback ? 0 : items.length;
    badge.textContent = data._stale ? 'stale' : (n === 1 ? '1 Spiel' : `${n} Spiele`);
    badge.style.color = data._stale ? '#ffb454' : 'var(--text-3)';
    badge.title = all.length !== n ? `${all.length} insgesamt an diesem Tag` : '';
  }
}

// REST-Fallback: greift ohne SSE-Stream und nach Options-Aenderungen.
async function pollGameReleases() {
  if (!state.liveOn || !widgetOnActivePage('game-releases')) return;
  try {
    renderGameReleases(await fetch('/api/game-releases', { cache: 'no-store' }).then((r) => r.json()));
  } catch { /* Anzeige bleibt auf dem letzten Stand */ }
  grLoadUpcoming();
}

async function grLoadUpcoming() {
  if (_grUpcoming) return;
  try {
    const d = await fetch('/api/game-releases/upcoming', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok) { _grUpcoming = d.items || []; renderGameReleases(null); }
  } catch { /* Der Fallback ist Kuer, kein Muss */ }
}

/* ---------- Datumssprung ---------- */

async function grGoto(iso) {
  const today = grIsoToday();
  _grDate = iso === today ? null : iso;
  if (!_grDate) { renderGameReleases(null); return; }

  _grOther = null;
  renderGameReleases(null);
  setGrEmpty('Wird geladen …');
  try {
    const d = await fetch(`/api/game-releases/day?date=${encodeURIComponent(iso)}`, { cache: 'no-store' })
      .then((r) => r.json());
    // Zwischenzeitlich weitergeblaettert? Dann ist diese Antwort veraltet.
    if (_grDate !== iso) return;
    _grOther = d;
  } catch {
    if (_grDate === iso) _grOther = { ok: false, message: 'Abruf fehlgeschlagen' };
  }
  renderGameReleases(null);
}

function grStep(days) { grGoto(grShiftIso(grCurrentDate(), days)); }

/* ---------- Suche ---------- */

function grToggleSearch(open) {
  const wrap = $('grSearchWrap');
  const input = $('grSearchInput');
  if (!wrap || !input) return;
  const show = open === undefined ? !wrap.classList.contains('open') : open;
  wrap.classList.toggle('open', show);
  if (show) { input.focus(); input.select(); }
  else { input.value = ''; grCloseResults(); }
}

function grCloseResults() {
  const box = $('grResults');
  if (box) { box.style.display = 'none'; box.textContent = ''; }
}

function grSearchInput() {
  clearTimeout(_grSearchTimer);
  const q = String($('grSearchInput').value || '').trim();
  if (q.length < 2) { grCloseResults(); return; }
  // Entprellt, damit nicht jeder Tastendruck eine IGDB-Abfrage ausloest.
  _grSearchTimer = setTimeout(() => grRunSearch(q), 300);
}

async function grRunSearch(q) {
  const box = $('grResults');
  if (!box) return;
  const seq = ++_grSearchSeq;
  box.style.display = '';
  box.textContent = '';
  const loading = document.createElement('div');
  loading.className = 'gr-result-empty';
  loading.textContent = 'Wird gesucht …';
  box.appendChild(loading);

  let data = null;
  try {
    data = await fetch(`/api/game-releases/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      .then((r) => r.json());
  } catch { /* unten als Fehlzustand behandelt */ }
  // Eine langsamere aeltere Antwort darf die neuere nicht ueberschreiben.
  if (seq !== _grSearchSeq) return;

  box.textContent = '';
  const items = (data && data.ok && data.items) || [];
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'gr-result-empty';
    empty.textContent = data && data.ok ? 'Nichts gefunden.' : 'Suche gerade nicht möglich.';
    box.appendChild(empty);
    return;
  }
  for (const item of items) box.appendChild(_grResultRow(item));
}

function _grResultRow(item) {
  const row = document.createElement('div');
  row.className = 'gr-result';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.innerHTML = '<div class="gr-result-cover"><img alt="" loading="lazy"></div>'
    + '<div class="gr-result-main"><div class="gr-result-name"></div>'
    + '<div class="gr-result-date"></div></div>';

  const img = row.querySelector('img');
  if (item.cover) { img.src = item.cover; img.addEventListener('error', () => { img.style.display = 'none'; }); }
  else img.style.display = 'none';

  row.querySelector('.gr-result-name').textContent = item.name;
  const when = item.date
    ? `${grShortDate(item.date)}${item.date >= grIsoToday() ? ' · erscheint noch' : ''}`
    : 'Termin offen';
  row.querySelector('.gr-result-date').textContent
    = [when, item.kind, (item.platforms || []).slice(0, 3).map((p) => p.label).join(', ')]
      .filter(Boolean).join(' · ');

  const open = () => { grToggleSearch(false); openGameDetail(item.id, item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

/* ---------- Detailfenster ---------- */

function _buildGrDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'grDetailModal';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(680px,100%)">'
    + '<div class="picker-head"><span class="picker-title" id="grDetailKicker">Spiel</span>'
    + '<button class="picker-close" title="Schließen">✕</button></div>'
    + '<div class="gr-detail-body">'
    + '<div class="gr-detail-hero"><img id="grDetailArt" class="gr-detail-art" alt="">'
    + '<img id="grDetailCover" class="gr-detail-cover" alt=""></div>'
    + '<h3 id="grDetailTitle" class="gr-detail-title"></h3>'
    + '<div id="grDetailChips" class="gr-chips gr-detail-chips"></div>'
    + '<div id="grDetailScores" class="gr-detail-scores"></div>'
    + '<p id="grDetailText" class="gr-detail-text"></p>'
    + '<div id="grDetailFacts" class="gr-detail-facts"></div>'
    + '<div id="grDetailShots" class="gr-detail-shots"></div>'
    + '</div>'
    + '<div class="gr-detail-foot"><div id="grDetailStores" class="gr-detail-stores"></div></div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeGameDetail(); });
  modal.querySelector('.picker-close').addEventListener('click', closeGameDetail);
  for (const id of ['grDetailArt', 'grDetailCover']) {
    const img = modal.querySelector(`#${id}`);
    img.addEventListener('error', () => { img.style.display = 'none'; });
  }
  document.addEventListener('keydown', (e) => {
    if (!_grDetail) return;
    // Ist die Lightbox offen, gehoeren Escape und die Pfeiltasten ihr —
    // sonst schliesst der erste Escape gleich Bild UND Detailfenster.
    if (grLightboxOpen()) {
      if (e.key === 'Escape') { e.preventDefault(); closeGrLightbox(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); grLightboxStep(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); grLightboxStep(1); }
      return;
    }
    if (e.key === 'Escape') closeGameDetail();
  });
  document.body.appendChild(modal);
  return modal;
}

// `seed` sind die Daten, die schon in der Liste stehen — damit steht sofort
// etwas da, statt eines leeren Fensters, waehrend das Detail nachgeladen wird.
async function openGameDetail(id, seed) {
  const modal = $('grDetailModal') || _buildGrDetailModal();
  _grDetail = id;
  _grLastFocus = document.activeElement;

  grFillDetail(seed ? {
    name: seed.name, date: seed.date, cover: seed.cover, kind: seed.kind,
    genres: seed.genres, platforms: seed.platforms,
    summary: seed.teaser, summaryLang: seed.teaserLang, summarySource: null,
  } : { name: '…' }, true);

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });

  try {
    const d = await fetch(`/api/game-releases/game/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then((r) => r.json());
    // Zwischenzeitlich geschlossen oder ein anderes Spiel geoeffnet.
    if (_grDetail !== id) return;
    if (d && d.ok && d.game) grFillDetail(d.game, false);
    else grFillDetail({ name: (seed && seed.name) || 'Unbekannt', summary: 'Zu diesem Spiel liegen keine weiteren Angaben vor.' }, false);
  } catch {
    if (_grDetail === id) setText('grDetailText', 'Die Details konnten nicht geladen werden.');
  }
}

function _grFactRow(label, value) {
  const row = document.createElement('div');
  row.className = 'gr-fact';
  const k = document.createElement('span');
  k.className = 'gr-fact-key';
  k.textContent = label;
  const v = document.createElement('span');
  v.className = 'gr-fact-val';
  v.textContent = value;
  row.append(k, v);
  return row;
}

function grFillDetail(g, loading) {
  // „Heute" allein liest sich als Fenstertitel seltsam — „Erscheint heute"
  // sagt, worauf sich das Datum bezieht.
  const when = g.date ? grDateLabel(g.date) : '';
  setText('grDetailKicker', !when ? 'Spiel'
    : /^(Heute|Morgen|Gestern)$/.test(when) ? `Erscheint ${when.toLowerCase()}`
    : `Erscheint ${when}`);
  setText('grDetailTitle', g.name || '');

  const art = $('grDetailArt');
  if (g.artwork) { art.style.display = ''; art.src = g.artwork; }
  else { art.style.display = 'none'; art.removeAttribute('src'); }
  const cover = $('grDetailCover');
  if (g.cover) { cover.style.display = ''; cover.src = g.cover; }
  else { cover.style.display = 'none'; cover.removeAttribute('src'); }

  const chips = $('grDetailChips');
  chips.textContent = '';
  for (const p of (g.platforms || [])) chips.appendChild(_grChip(p.label));
  if (g.kind) chips.appendChild(_grChip(g.kind, 'gr-chip gr-chip-flag'));
  for (const genre of (g.genres || [])) chips.appendChild(_grChip(genre, 'gr-chip gr-chip-genre'));

  const scores = $('grDetailScores');
  scores.textContent = '';
  const addScore = (label, value, suffix) => {
    if (value == null) return;
    const el = document.createElement('span');
    el.className = 'gr-score-pill';
    el.textContent = `${label} ${value}${suffix || ''}`;
    el.style.borderColor = value >= 75 ? 'var(--green, #3ddc97)' : value >= 60 ? '#ffb454' : '#f43f5e';
    scores.appendChild(el);
  };
  addScore('Kritiker', g.criticRating);
  addScore('IGDB', g.rating);
  for (const r of (g.ageRatings || [])) {
    const el = document.createElement('span');
    el.className = 'gr-score-pill gr-score-age';
    el.textContent = `${r.org} ${r.value}`;
    scores.appendChild(el);
  }
  scores.style.display = scores.childNodes.length ? '' : 'none';

  const text = $('grDetailText');
  text.textContent = g.summary
    || (loading ? 'Wird geladen …' : 'Zu diesem Spiel liegt keine Beschreibung vor.');
  // Ehrlich kennzeichnen, statt englischen Text als deutsch auszugeben.
  text.classList.toggle('gr-text-en', g.summaryLang === 'en' && !!g.summary);
  text.title = g.summarySource ? `Beschreibung: ${g.summarySource}` : '';

  const facts = $('grDetailFacts');
  facts.textContent = '';
  const pairs = [
    ['Erscheint', g.date ? grShortDate(g.date) : ''],
    ['Entwickler', (g.developers || []).join(', ')],
    ['Publisher', (g.publishers || []).join(', ')],
    ['Spielmodi', (g.modes || []).join(', ')],
    ['Perspektive', (g.perspectives || []).join(', ')],
    ['Engine', (g.engines || []).join(', ')],
  ];
  for (const [k, v] of pairs) if (v) facts.appendChild(_grFactRow(k, v));
  // Erscheint ein Titel gestaffelt, ist genau das die interessante Information.
  const staggered = [...new Set((g.releaseDates || []).map((r) => r.date))];
  if (staggered.length > 1) {
    for (const r of g.releaseDates) {
      facts.appendChild(_grFactRow(r.platform, `${grShortDate(r.date)}${r.status ? ` · ${r.status}` : ''}`));
    }
  }

  const shots = $('grDetailShots');
  shots.textContent = '';
  _grShots = (g.screenshots || []).map((s) => s.full).filter(Boolean);
  (g.screenshots || []).forEach((shot, i) => {
    if (!shot.thumb) return;
    const img = document.createElement('img');
    img.className = 'gr-shot';
    img.loading = 'lazy';
    img.alt = '';
    img.src = shot.thumb;
    img.setAttribute('role', 'button');
    img.tabIndex = 0;
    img.title = 'Größer anzeigen';
    // Faellt ein Bild aus, verschwindet auch die Sichtbarkeit des Streifens
    // wieder — sonst bleibt ein leerer Container mit Innenabstand stehen.
    img.addEventListener('error', () => { img.remove(); grSyncShotStrip(); });
    const open = () => openGrLightbox(i);
    img.addEventListener('click', open);
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
    shots.appendChild(img);
  });
  grSyncShotStrip();

  const stores = $('grDetailStores');
  stores.textContent = '';
  for (const s of (g.stores || [])) {
    const a = document.createElement('a');
    a.className = 'cfg-btn';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = s.url;
    a.textContent = `${s.label} ↗`;
    stores.appendChild(a);
  }
  if (g.igdbUrl) {
    const a = document.createElement('a');
    a.className = 'cfg-btn';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = g.igdbUrl;
    a.textContent = 'IGDB ↗';
    stores.appendChild(a);
  }
}

function grSyncShotStrip() {
  const shots = $('grDetailShots');
  if (shots) shots.style.display = shots.childNodes.length ? '' : 'none';
}

/* ---------- Lightbox ----------
   Liegt ueber dem Detailfenster: Escape und der Zurueck-Weg muessen deshalb
   zuerst hier landen, sonst schliesst der erste Escape gleich beides. */

function _buildGrLightbox() {
  const box = document.createElement('div');
  box.id = 'grLightbox';
  box.className = 'gr-lightbox';
  box.innerHTML =
    '<button class="gr-lb-nav gr-lb-prev" title="Vorheriges Bild" aria-label="Vorheriges Bild">‹</button>'
    + '<img id="grLightboxImg" class="gr-lb-img" alt="">'
    + '<button class="gr-lb-nav gr-lb-next" title="Nächstes Bild" aria-label="Nächstes Bild">›</button>'
    + '<div id="grLightboxCount" class="gr-lb-count"></div>'
    + '<button class="gr-lb-close" title="Schließen" aria-label="Schließen">✕</button>';
  // Klick auf das Bild selbst soll nicht schliessen — sonst trifft man beim
  // Weiterblaettern staendig daneben.
  box.addEventListener('click', (e) => { if (e.target === box) closeGrLightbox(); });
  box.querySelector('.gr-lb-close').addEventListener('click', closeGrLightbox);
  box.querySelector('.gr-lb-prev').addEventListener('click', () => grLightboxStep(-1));
  box.querySelector('.gr-lb-next').addEventListener('click', () => grLightboxStep(1));
  document.body.appendChild(box);
  return box;
}

function openGrLightbox(index) {
  if (!_grShots.length) return;
  const box = $('grLightbox') || _buildGrLightbox();
  _grShotIndex = ((index % _grShots.length) + _grShots.length) % _grShots.length;
  _grLightboxFocus = document.activeElement;
  grRenderLightbox();
  box.style.display = 'flex';
  requestAnimationFrame(() => {
    box.classList.add('open');
    const close = box.querySelector('.gr-lb-close');
    if (close) close.focus();
  });
}

function grRenderLightbox() {
  const img = $('grLightboxImg');
  if (img) img.src = _grShots[_grShotIndex];
  setText('grLightboxCount', `${_grShotIndex + 1} / ${_grShots.length}`);
  const box = $('grLightbox');
  if (box) box.classList.toggle('gr-lb-single', _grShots.length < 2);
}

function grLightboxStep(delta) {
  if (!_grShots.length) return;
  _grShotIndex = ((_grShotIndex + delta) % _grShots.length + _grShots.length) % _grShots.length;
  grRenderLightbox();
}

function closeGrLightbox() {
  const box = $('grLightbox');
  if (!box || box.style.display === 'none') return;
  box.classList.remove('open');
  setTimeout(() => { box.style.display = 'none'; }, 160);
  if (_grLightboxFocus && typeof _grLightboxFocus.focus === 'function') _grLightboxFocus.focus();
  _grLightboxFocus = null;
}

function grLightboxOpen() {
  const box = $('grLightbox');
  return !!(box && box.style.display !== 'none' && box.style.display);
}

function closeGameDetail() {
  const modal = $('grDetailModal');
  // Ein offenes Bild darf nicht ueber dem geschlossenen Fenster stehenbleiben.
  if (grLightboxOpen()) closeGrLightbox();
  _grDetail = null;
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_grLastFocus && typeof _grLastFocus.focus === 'function') _grLastFocus.focus();
  _grLastFocus = null;
}

/* ---------- Leiste verdrahten ----------
   Die Kachel-Shell entsteht erst beim ersten Anzeigen, deshalb werden die
   Handler beim ersten Render gesetzt und nicht beim Laden der Datei. */

function grWireBar() {
  const bar = $('grBar');
  if (!bar || bar._wired) return;
  bar._wired = true;

  bar.querySelectorAll('.gr-nav').forEach((btn) => {
    btn.addEventListener('click', () => grStep(Number(btn.dataset.d) || 0));
  });
  const today = $('grTodayBtn');
  if (today) today.addEventListener('click', () => grGoto(grIsoToday()));
  const date = $('grDate');
  if (date) date.addEventListener('change', () => { if (date.value) grGoto(date.value); });

  const btn = $('grSearchBtn');
  if (btn) btn.addEventListener('click', () => grToggleSearch());
  const input = $('grSearchInput');
  if (input) {
    input.addEventListener('input', grSearchInput);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); grToggleSearch(false); }
    });
  }
  // Klick ausserhalb schliesst die Trefferliste, nicht aber das Suchfeld.
  document.addEventListener('click', (e) => {
    const wrap = $('grSearchWrap');
    if (wrap && !wrap.contains(e.target)) grCloseResults();
  });
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'game-releases',
  label: 'Game Releases',
  section: 'media',
  defaultSize: { w: 4, h: 8 },
  minSize: { w: 3, h: 5 },

  event: 'gameReleases',
  handler: renderGameReleases,
  refresh: () => { grWireBar(); renderGameReleases(null); pollGameReleases(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>Game Releases</span>
        <span id="grBadge" class="tile-badge"></span>
      </div>
      <div id="grBar" class="gr-bar" data-cfg="bar">
        <button class="gr-nav" data-d="-1" title="Ein Tag zurück">‹</button>
        <span class="gr-date-wrap">
          <span id="grDateLabel" class="gr-date-label"></span>
          <input id="grDate" class="gr-date" type="date" aria-label="Datum wählen">
        </span>
        <button class="gr-nav" data-d="1" title="Ein Tag vor">›</button>
        <button id="grTodayBtn" class="gr-today" title="Zurück zu heute">Heute</button>
        <span id="grSearchWrap" class="gr-search-wrap">
          <button id="grSearchBtn" class="gr-search-btn" title="Spiel suchen" aria-label="Spiel suchen">⌕</button>
          <input id="grSearchInput" class="gr-search-input" type="search"
                 placeholder="Spiel suchen …" aria-label="Spiel suchen">
          <div id="grResults" class="gr-results" style="display:none"></div>
        </span>
      </div>
      <div id="grHint" class="gr-hint" style="display:none"></div>
      <div id="grList" class="tile-list gr-list" data-cfg="list"></div>
      <div id="grEmpty" class="gr-empty" style="display:none"></div>
    </div>`,

  options: [
    { key: 'relevance', label: 'Relevanz',      type: 'select', default: 'balanced', options: GR_RELEVANCE, group: 'Auswahl' },
    { key: 'platforms', label: 'Plattform',     type: 'select', default: '',   options: GR_FAMILIES, group: 'Auswahl' },
    { key: 'needCover', label: 'Nur mit Cover', type: 'toggle', default: true, filter: true, group: 'Auswahl' },
    { key: 'maxRows',   label: 'Max. Spiele',   type: 'count',  default: 0,    group: 'Auswahl' },

    { key: 'list',   label: 'Spieleliste',   type: 'toggle', default: true, group: 'Anzeige' },
    { key: 'bar',    label: 'Datumsleiste',  type: 'toggle', default: true, group: 'Anzeige' },
    { key: 'chips',  label: 'Plattform-Chips', type: 'toggle', default: true, cls: 'cfg-hide-gr-chips', group: 'Anzeige' },
    { key: 'teaser', label: 'Kurztext',      type: 'toggle', default: true, cls: 'cfg-hide-gr-teaser', group: 'Anzeige' },

    { key: 'textSize',    label: 'Schriftgröße',       type: 'select', default: 'm',      options: GR_SIZES,          group: 'Darstellung' },
    { key: 'titleLines',  label: 'Zeilen Titel',       type: 'select', default: '2',      options: _grLineOptions(3), group: 'Darstellung' },
    { key: 'teaserLines', label: 'Zeilen Kurztext',    type: 'select', default: '2',      options: _grLineOptions(5), group: 'Darstellung' },
    { key: 'coverSize',   label: 'Covergröße',         type: 'select', default: 'm',      options: GR_SIZES,          group: 'Darstellung' },
    { key: 'spacing',     label: 'Abstand',            type: 'select', default: 'normal', options: GR_SPACINGS,       group: 'Darstellung' },
    { key: 'separator',   label: 'Trennung',           type: 'select', default: 'card',   options: GR_SEPARATORS,     group: 'Darstellung' },
  ],

  settings: {
    badge: 'GR', color: '#a78bfa',
    statusEl: 'grSettingsStatus',
    load: loadGameReleasesSettings,
  },
});

/* ---------- Einstellungen (Settings → Module → Game Releases) ----------
   Das Panel baut seine Zugangsdaten-Felder selbst, wie die News-Kachel ihre
   Quellenliste. Die Alternative waere gewesen, sie wie bei den aelteren
   Integrationen an drei Stellen im Kern zu verdrahten (Markup in index.html,
   eine Zeile in loadSecrets(), ein Zweig in saveSecrets()) — genau die
   verteilten Eintraege, die die Modul-Registry loswerden wollte.

   /api/secrets ist generisch: es kennt die Keys aus dem Backend-Manifest
   bereits, liefert maskierte Werte als '***' und ignoriert '***' beim
   Speichern. */

const GR_SECRETS = [
  { key: 'IGDB_CLIENT_ID', label: 'Client-ID', type: 'text' },
  { key: 'IGDB_CLIENT_SECRET', label: 'Client-Secret', type: 'password' },
];

function setGrStatus(text, color) {
  const el = $('grSettingsStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

async function loadGameReleasesSettings() {
  const body = $('grSettingsBody');
  if (!body) return;
  let secrets = {};
  try {
    secrets = await fetch('/api/secrets', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    body.textContent = 'Zugangsdaten konnten nicht geladen werden.';
    setGrStatus('● Fehler', '#f43f5e');
    return;
  }
  renderGameReleasesSettings(secrets);
  grRefreshStatus();
}

function renderGameReleasesSettings(secrets) {
  const body = $('grSettingsBody');
  if (!body) return;
  const fromEnv = new Set(secrets._env || []);
  body.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Zugangsdaten (Twitch)';
  body.appendChild(head);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';
  const inputs = [];
  for (const s of GR_SECRETS) {
    const input = document.createElement('input');
    input.className = 'cfg-input';
    input.type = s.type;
    input.placeholder = s.label;
    input.autocomplete = 'off';
    input.value = secrets[s.key] || '';
    // Per Umgebungsvariable gesetzte Werte haben Vorrang — ein Eintrag hier
    // waere wirkungslos, das Feld sagt es statt es stumm zu schlucken.
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
    setGrStatus('● speichert …', 'var(--text-3)');
    try {
      const r = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Der Server leert dabei alle Caches; die Kachel holt also frische Daten.
      await grRefreshStatus();
      pollGameReleases();
    } catch (err) {
      console.error('IGDB-Zugangsdaten konnten nicht gespeichert werden:', err.message);
      setGrStatus('● Fehler', '#f43f5e');
    }
  });
  row.appendChild(save);
  body.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'tile-settings-hint';
  hint.style.lineHeight = '1.7';
  // Fremddaten sind hier keine im Spiel — der Text ist statisch.
  hint.innerHTML = 'IGDB läuft über Twitch, beide Werte sind kostenlos: unter '
    + '<a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer">'
    + 'dev.twitch.tv/console/apps</a> auf „Register Your Application“, als '
    + 'OAuth-Redirect <code>http://localhost</code> und als Kategorie '
    + '„Application Integration“ wählen. Danach Client-ID übernehmen und das '
    + 'Client-Secret einmal erzeugen lassen. Kein Monatslimit.';
  body.appendChild(hint);
}

// Sagt, ob die Zugangsdaten tatsaechlich tragen — „gespeichert" allein hilft
// nicht, wenn Twitch sie ablehnt.
async function grRefreshStatus() {
  try {
    const d = await fetch('/api/game-releases', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok) {
      const n = (d.items || []).length;
      setGrStatus(`● ${n === 1 ? '1 Spiel' : `${n} Spiele`} heute`, '#3ddc97');
    } else if (d && d.error === 'not_configured') {
      setGrStatus('● nicht eingerichtet', '#ffb454');
    } else {
      setGrStatus('● IGDB antwortet nicht', '#f43f5e');
    }
  } catch {
    setGrStatus('● Fehler', '#f43f5e');
  }
}
