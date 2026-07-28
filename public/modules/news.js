'use strict';

/* ============================================================================
   News — Feed-Aggregation
   ----------------------------------------------------------------------------
   Zeigt die Meldungen der in den Einstellungen gewaehlten Quellen als
   zeitlich sortierte Liste. Ein Klick oeffnet ein Detailfenster mit Kurztext,
   Aufmacherbild und Link zum Original.

   Alle Inhalte sind Fremddaten: sie gehen ausschliesslich ueber textContent
   in die Seite, nie ueber innerHTML. Bilder kommen vom Server-Proxy
   (/api/news/image/<id>), damit der Browser weiterhin nur mit dem Dashboard
   spricht.
   ============================================================================ */

const NEWS_LANGS = [
  { v: '', l: 'Alle Sprachen' },
  { v: 'de', l: 'Deutschsprachig' },
  { v: 'en', l: 'Englischsprachig' },
];

/* Darstellungs-Optionen. Jede Achse setzt genau eine Klasse auf #newsList;
   die Klasse schreibt in styles.css nur CSS-Variablen um (Schriftgroessen,
   Bildmasse, Abstaende). Die Meldungen selbst muessen dafuer nicht neu
   gebaut werden. */
const NEWS_SIZES = [
  { v: 's',  l: 'Klein' },
  { v: 'm',  l: 'Normal' },
  { v: 'l',  l: 'Groß' },
  { v: 'xl', l: 'Sehr groß' },
];
const NEWS_SPACINGS = [
  { v: 'tight',  l: 'Eng' },
  { v: 'normal', l: 'Normal' },
  { v: 'wide',   l: 'Weit' },
];
const NEWS_SEPARATORS = [
  { v: 'none',  l: 'Ohne' },
  { v: 'line',  l: 'Trennlinie' },
  { v: 'card',  l: 'Karten' },
  { v: 'zebra', l: 'Abwechselnd getönt' },
];

// „Vollständig" heisst: nicht abschneiden. -webkit-line-clamp braucht dafuer
// trotzdem eine Zahl — 99 Zeilen erreicht keine Ueberschrift.
const NEWS_NO_CLAMP = '99';
function _newsLineOptions(max) {
  const out = [];
  for (let n = 1; n <= max; n++) out.push({ v: String(n), l: n === 1 ? '1 Zeile' : `${n} Zeilen` });
  out.push({ v: '0', l: 'Vollständig' });
  return out;
}

let _newsData = null;      // letzte Payload (fuer Re-Render nach Options-Aenderung)
let _newsArticle = null;   // gerade geoeffneter Artikel
let _newsLastFocus = null; // Fokus vor dem Oeffnen des Detailfensters

/* ---------- Formatierung ---------- */

function newsWhen(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min`;
  if (mins < 60 * 24) return `vor ${Math.round(mins / 60)} Std`;
  if (mins < 60 * 24 * 7) return `vor ${Math.round(mins / (60 * 24))} Tg`;
  return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function newsFullDate(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ---------- Kachel ---------- */

function _newsFilter(items) {
  const lang = String(_cfgVal('news', 'lang') || '');
  const topic = String(_cfgVal('news', 'topic') || '');
  const source = String(_cfgVal('news', 'source') || '');
  const keyword = String(_cfgVal('news', 'keyword') || '').trim().toLowerCase();
  return items.filter((it) => {
    if (lang && it.lang !== lang) return false;
    if (topic && it.category !== topic) return false;
    if (source && it.sourceId !== source) return false;
    if (keyword && !(`${it.title} ${it.summary}`.toLowerCase().includes(keyword))) return false;
    return true;
  });
}

function _newsCreateRow() {
  const row = document.createElement('div');
  row.className = 'news-row';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  // Statisches Markup — die Feed-Inhalte kommen ausschliesslich per textContent.
  row.innerHTML =
    '<div class="news-thumb"><img alt="" loading="lazy"><span class="news-thumb-fallback"></span></div>'
    + '<div class="news-main">'
    + '<div class="news-title"></div>'
    + '<div class="news-teaser"></div>'
    + '<div class="news-meta"><span class="news-src"></span><span class="news-time"></span></div>'
    + '</div>';
  row._thumb = row.querySelector('.news-thumb');
  row._img = row.querySelector('.news-thumb img');
  row._fallback = row.querySelector('.news-thumb-fallback');
  row._title = row.querySelector('.news-title');
  row._teaser = row.querySelector('.news-teaser');
  row._src = row.querySelector('.news-src');
  row._time = row.querySelector('.news-time');
  // Ein Bild, das der Proxy nicht liefern kann, faellt auf das Kuerzel zurueck —
  // die Bildspalte bleibt so ueber alle Zeilen hinweg gleich breit.
  row._img.addEventListener('error', () => { row._img.style.display = 'none'; });
  const open = () => { if (row._item) openNewsArticle(row._item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _newsUpdateRow(row, item, prev) {
  row._item = item;
  if (!prev || prev.title !== item.title) {
    row._title.textContent = item.title;
    row.title = item.title;
  }
  if (!prev || prev.summary !== item.summary) row._teaser.textContent = item.summary || '';
  if (!prev || prev.source !== item.source) row._src.textContent = item.source;
  const when = newsWhen(item.published);
  if (row._time.textContent !== when) row._time.textContent = when;
  if (!prev || prev.source !== item.source) {
    row._fallback.textContent = (item.source || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
  }
  if (!prev || prev.image !== item.image) {
    if (item.image) {
      row._img.style.display = '';
      row._img.src = item.image;
    } else {
      row._img.style.display = 'none';
      row._img.removeAttribute('src');
    }
  }
}

// Darstellung aus der Kachel-Config auf die Liste uebertragen. Laeuft bei
// jedem Render mit: Klassen zu setzen, die schon stehen, kostet nichts, und
// so greift eine Aenderung auch ohne frische Daten sofort.
function applyNewsLayout() {
  const list = $('newsList');
  if (!list) return;
  const pick = (prefix, key, options) => {
    const cur = String(_cfgVal('news', key));
    for (const o of options) list.classList.toggle(prefix + o.v, o.v === cur);
  };
  pick('news-text-', 'textSize', NEWS_SIZES);
  pick('news-img-', 'thumbSize', NEWS_SIZES);
  pick('news-space-', 'spacing', NEWS_SPACINGS);
  pick('news-sep-', 'separator', NEWS_SEPARATORS);

  const lines = (key) => {
    const n = Math.floor(+_cfgVal('news', key)) || 0;
    return n > 0 ? String(n) : NEWS_NO_CLAMP;
  };
  list.style.setProperty('--news-title-lines', lines('titleLines'));
  list.style.setProperty('--news-teaser-lines', lines('teaserLines'));
}

function setNewsEmpty(text) {
  const el = $('newsEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

function renderNews(d) {
  _newsData = d || _newsData;
  applyNewsLayout();
  const badge = $('newsBadge');
  const list = $('newsList');
  const data = _newsData;

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'keine Quellen gewählt' : 'offline';
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg ? 'Einstellungen → Module → News' : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.id, _newsCreateRow, _newsUpdateRow);
    setNewsEmpty(notCfg
      ? 'Noch keine Quelle gewählt — Einstellungen → Module → News.'
      : 'Die Feeds sind gerade nicht erreichbar.');
    return;
  }

  const items = _cfgLimit('news', 'maxRows', _newsFilter(data.items || []));
  if (list) diffList(list, items, (i) => i.id, _newsCreateRow, _newsUpdateRow);
  setNewsEmpty(items.length ? '' : ((data.items || []).length
    ? 'Keine Meldung passt zu den gewählten Filtern.'
    : 'Die gewählten Quellen liefern gerade keine Meldungen.'));

  if (badge) {
    const broken = (data.sources || []).filter((s) => !s.ok);
    badge.textContent = data._stale ? 'stale' : `${items.length} Meldungen`;
    badge.style.color = data._stale || broken.length ? '#ffb454' : 'var(--text-3)';
    badge.title = broken.length
      ? `Nicht erreichbar: ${broken.map((s) => s.name).join(', ')}`
      : `Stand: ${newsFetchedAt(data)}`;
  }
}

function newsFetchedAt(data) {
  return data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('de-DE') : '–';
}

// REST-Fallback: greift, wenn kein SSE-Stream verfuegbar ist, und nach einer
// Aenderung der Kachel-Optionen bzw. der Quellenauswahl.
async function pollNews() {
  if (!state.liveOn || !widgetOnActivePage('news')) return;
  try { renderNews(await fetch('/api/news', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

/* ---------- Detailfenster ---------- */

function _buildNewsArticleModal() {
  const modal = document.createElement('div');
  modal.id = 'newsArticle';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(600px,100%)">'
    + '<div class="picker-head"><span class="picker-title" id="newsArticleSource">News</span>'
    + '<button class="picker-close" title="Schließen">✕</button></div>'
    + '<div class="news-article-body">'
    + '<img id="newsArticleImage" class="news-article-image" alt="">'
    + '<h3 id="newsArticleTitle" class="news-article-title"></h3>'
    + '<div id="newsArticleMeta" class="news-article-meta"></div>'
    + '<p id="newsArticleText" class="news-article-text"></p>'
    + '</div>'
    + '<div class="news-article-foot">'
    + '<a id="newsArticleLink" class="cfg-btn" target="_blank" rel="noopener noreferrer">Zum Original-Artikel ↗</a>'
    + '</div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeNewsArticle(); });
  modal.querySelector('.picker-close').addEventListener('click', closeNewsArticle);
  const img = modal.querySelector('#newsArticleImage');
  img.addEventListener('error', () => { img.style.display = 'none'; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _newsArticle) closeNewsArticle();
  });
  document.body.appendChild(modal);
  return modal;
}

function openNewsArticle(item) {
  const modal = $('newsArticle') || _buildNewsArticleModal();
  _newsArticle = item;
  _newsLastFocus = document.activeElement;

  setText('newsArticleSource', item.source || 'News');
  setText('newsArticleTitle', item.title || '');
  setText('newsArticleText', item.summary || 'Der Feed liefert zu dieser Meldung keinen Kurztext.');
  const meta = [newsFullDate(item.published), item.source].filter(Boolean).join(' · ');
  setText('newsArticleMeta', meta);

  const img = $('newsArticleImage');
  if (item.image) { img.style.display = ''; img.src = item.image; }
  else { img.style.display = 'none'; img.removeAttribute('src'); }

  const link = $('newsArticleLink');
  link.href = item.link || '#';

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });
}

function closeNewsArticle() {
  const modal = $('newsArticle');
  _newsArticle = null;
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_newsLastFocus && typeof _newsLastFocus.focus === 'function') _newsLastFocus.focus();
  _newsLastFocus = null;
}

/* ---------- Einstellungen (Settings → Module → News) ---------- */

let _newsCfg = null; // { categories, langs, catalog, custom, enabled }

function setNewsStatus(text, color) {
  const el = $('newsSettingsStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

async function loadNewsSettings() {
  const body = $('newsSettingsBody');
  if (!body) return;
  try {
    _newsCfg = await fetch('/api/news/config', { cache: 'no-store' }).then((r) => r.json());
  } catch (err) {
    body.textContent = 'Quellen konnten nicht geladen werden.';
    setNewsStatus('● Fehler', '#f43f5e');
    return;
  }
  renderNewsSettings();
}

function _newsAllSources() {
  return (_newsCfg.catalog || []).concat(_newsCfg.custom || []);
}

function _newsCatLabel(id) {
  return ((_newsCfg.categories || []).find((c) => c.id === id) || {}).label || id;
}
function _newsLangLabel(id) {
  return ((_newsCfg.langs || []).find((l) => l.id === id) || {}).label || id;
}

// Reihenfolge in Liste und Auswahlfeld: erst Sprache, dann Thema, dann Name.
// Die Katalog-Reihenfolge des Servers gibt Sprache und Thema vor, damit die
// Gruppen ueberall gleich sortiert stehen — unabhaengig davon, in welcher
// Reihenfolge der Nutzer seine Quellen zusammengeklickt hat.
function _newsCompare(a, b) {
  const langs = (_newsCfg.langs || []).map((l) => l.id);
  const cats = (_newsCfg.categories || []).map((c) => c.id);
  return (langs.indexOf(a.lang) - langs.indexOf(b.lang))
    || (cats.indexOf(a.category) - cats.indexOf(b.category))
    || a.name.localeCompare(b.name, 'de');
}

/* Die Einstellungen zeigen nur, was tatsaechlich laeuft: eine Liste der
   aktiven Quellen. Der Katalog steckt dahinter im „Neu"-Auswahlfeld — 29
   Schalter, von denen die meisten aus sind, waren als Uebersicht wertlos.
   Jede Aenderung geht sofort an den Server; es gibt nichts, was man zu
   speichern vergessen koennte. */
function renderNewsSettings() {
  const body = $('newsSettingsBody');
  if (!body || !_newsCfg) return;
  const enabled = new Set(_newsCfg.enabled || []);
  const byId = new Map(_newsAllSources().map((s) => [s.id, s]));
  body.innerHTML = '';

  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Aktive Quellen';
  body.appendChild(head);

  const active = [...enabled].map((id) => byId.get(id)).filter(Boolean).sort(_newsCompare);
  if (!active.length) {
    const hint = document.createElement('div');
    hint.className = 'news-cfg-empty';
    hint.textContent = 'Noch keine Quelle aktiv — unten unter „Neu“ eine aus dem Katalog wählen.';
    body.appendChild(hint);
  }
  for (const s of active) body.appendChild(_newsActiveRow(s));

  body.appendChild(_newsCatalogPicker(enabled));
  body.appendChild(_newsCustomEditor());

  const foot = document.createElement('div');
  foot.className = 'news-cfg-foot';
  const count = document.createElement('span');
  count.className = 'tile-settings-hint';
  count.textContent = (active.length === 1 ? '1 Quelle aktiv' : `${active.length} Quellen aktiv`)
    + ' · Änderungen wirken sofort';
  foot.appendChild(count);
  body.appendChild(foot);

  setNewsStatus(
    active.length ? `● ${active.length === 1 ? '1 Quelle' : `${active.length} Quellen`}` : '● keine Quelle',
    active.length ? '#3ddc97' : '#ffb454',
  );
}

function _newsActiveRow(s) {
  const row = document.createElement('div');
  row.className = 'news-cfg-row';

  const info = document.createElement('div');
  info.className = 'news-cfg-info';
  const name = document.createElement('div');
  name.className = 'news-cfg-name';
  name.textContent = s.name;
  const tag = document.createElement('span');
  tag.className = 'news-cfg-tag';
  tag.textContent = [_newsCatLabel(s.category), _newsLangLabel(s.lang), s.custom ? 'eigen' : '']
    .filter(Boolean).join(' · ');
  name.appendChild(tag);
  const url = document.createElement('div');
  url.className = 'news-cfg-url';
  url.textContent = s.url;
  url.title = s.url;
  info.append(name, url);

  const actions = document.createElement('div');
  actions.className = 'news-cfg-actions';
  const del = document.createElement('button');
  del.className = 'cfg-btn cfg-btn-del';
  del.textContent = '×';
  del.title = s.custom ? 'Eigene Quelle entfernen' : 'Quelle deaktivieren';
  del.addEventListener('click', () => {
    _newsCfg.enabled = (_newsCfg.enabled || []).filter((id) => id !== s.id);
    // Eine eigene Quelle steht in keinem Katalog. Bliebe sie nur deaktiviert
    // liegen, waere sie ueber die Oberflaeche nie wieder erreichbar — also
    // raus damit, sichtbar ist ohnehin nur noch, was laeuft.
    if (s.custom) _newsCfg.custom = (_newsCfg.custom || []).filter((c) => c.id !== s.id);
    saveNewsSettings();
  });
  actions.appendChild(del);

  row.append(info, actions);
  return row;
}

// „Neu": alles aus dem Katalog, was gerade nicht laeuft — nach Sprache und
// Thema gruppiert, weil eine flache Liste mit 29 Eintraegen niemandem hilft.
function _newsCatalogPicker(enabled) {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Neu';
  wrap.appendChild(head);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';

  const sel = document.createElement('select');
  sel.className = 'cfg-input news-cfg-pick';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Quelle aus dem Katalog wählen …';
  sel.appendChild(first);

  const rest = _newsAllSources().filter((s) => !enabled.has(s.id)).sort(_newsCompare);
  let group = null;
  let groupKey = '';
  for (const s of rest) {
    const key = `${s.lang}|${s.category}`;
    if (key !== groupKey) {
      groupKey = key;
      group = document.createElement('optgroup');
      group.label = `${_newsLangLabel(s.lang)} · ${_newsCatLabel(s.category)}`;
      sel.appendChild(group);
    }
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.name + (s.custom ? ' · eigen' : '');
    group.appendChild(o);
  }

  const add = document.createElement('button');
  add.className = 'cfg-btn';
  add.textContent = '＋ Hinzufügen';
  add.title = 'Gewählte Quelle aktivieren';
  // Bewusst ein Knopf und kein change-Handler: mit den Pfeiltasten durch ein
  // <select> zu gehen loest in manchen Browsern bei jedem Schritt change aus.
  add.addEventListener('click', () => {
    if (!sel.value) return;
    _newsCfg.enabled = (_newsCfg.enabled || []).concat(sel.value);
    saveNewsSettings();
  });

  if (!rest.length) {
    first.textContent = 'Alle Quellen des Katalogs sind aktiv';
    sel.disabled = true;
    add.disabled = true;
  }

  row.append(sel, add);
  wrap.appendChild(row);
  return wrap;
}

// Eigene Feeds: Name, URL, Sprache, Kategorie — im Stil des Quicklinks-Editors.
function _newsCustomEditor() {
  const wrap = document.createElement('div');
  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Eigene Quelle hinzufügen';
  wrap.appendChild(head);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';

  const name = document.createElement('input');
  name.className = 'cfg-input';
  name.placeholder = 'Name';
  const url = document.createElement('input');
  url.className = 'cfg-input';
  url.placeholder = 'https://…/feed';

  const lang = document.createElement('select');
  lang.className = 'cfg-input';
  for (const l of _newsCfg.langs) {
    const o = document.createElement('option');
    o.value = l.id; o.textContent = l.label;
    lang.appendChild(o);
  }
  const cat = document.createElement('select');
  cat.className = 'cfg-input';
  for (const c of _newsCfg.categories) {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.label;
    cat.appendChild(o);
  }

  const add = document.createElement('button');
  add.className = 'cfg-btn';
  add.textContent = '＋';
  add.title = 'Quelle hinzufügen';
  add.addEventListener('click', () => {
    const u = url.value.trim();
    if (!/^https?:\/\/.+/i.test(u)) {
      setNewsStatus('● URL ungültig', '#f43f5e');
      return;
    }
    // Die endgueltige Id vergibt der Server (aus der URL) — hier reicht ein
    // Platzhalter, damit die Zeile sofort erscheint und aktiv ist.
    const id = `c-neu-${Date.now().toString(36)}`;
    _newsCfg.custom = (_newsCfg.custom || []).concat({
      id, name: name.value.trim() || u, url: u, lang: lang.value, category: cat.value, custom: true,
    });
    _newsCfg.enabled = (_newsCfg.enabled || []).concat(id);
    saveNewsSettings();
  });

  row.append(name, url, lang, cat, add);
  wrap.appendChild(row);
  return wrap;
}

async function saveNewsSettings() {
  if (!_newsCfg) return;
  const payload = { enabled: _newsCfg.enabled || [], custom: _newsCfg.custom || [] };
  try {
    const r = await fetch('/api/news/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const saved = await r.json();
    // Der Server hat Ids normalisiert und Ungueltiges verworfen — mit seiner
    // Antwort weiterarbeiten, nicht mit der optimistischen Eingabe.
    _newsCfg.enabled = saved.enabled || [];
    _newsCfg.custom = saved.custom || [];
    renderNewsSettings();
    setNewsStatus('● gespeichert', '#3ddc97');
    pollNews();
  } catch (err) {
    console.error('News-Quellen konnten nicht gespeichert werden:', err.message);
    setNewsStatus('● Fehler', '#f43f5e');
  }
}

/* ---------- Registrierung ---------- */

// Kategorien und Quellen fuer die Kachel-Auswahlfelder kommen aus der zuletzt
// gelieferten Payload — so tauchen auch eigene Feeds dort auf.
function _newsTopicOptions() {
  const out = [{ v: '', l: 'Alle Themen' }];
  const labels = (_newsData && _newsData.categories) || (_newsCfg && _newsCfg.categories) || [];
  const seen = new Set();
  for (const s of ((_newsData && _newsData.sources) || [])) {
    if (seen.has(s.category)) continue;
    seen.add(s.category);
    const hit = labels.find((c) => c.id === s.category);
    out.push({ v: s.category, l: hit ? hit.label : s.category });
  }
  return out;
}

function _newsSourceOptions() {
  const out = [{ v: '', l: 'Alle Quellen' }];
  for (const s of ((_newsData && _newsData.sources) || [])) out.push({ v: s.id, l: s.name });
  return out;
}

Dash.registerModule({
  id: 'news',
  label: 'News',
  section: 'media',
  defaultSize: { w: 4, h: 7 },
  minSize: { w: 3, h: 4 },

  event: 'news',
  handler: renderNews,
  // renderNews() traegt die Darstellungs-Optionen mit auf die Liste — eine
  // reine Design-Aenderung wirkt damit sofort, auch ohne frische Daten.
  refresh: () => { renderNews(null); pollNews(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>News</span>
        <span id="newsBadge" class="tile-badge"></span>
      </div>
      <div id="newsList" class="tile-list news-list" data-cfg="list"></div>
      <div id="newsEmpty" class="news-empty" style="display:none"></div>
    </div>`,

  options: [
    { key: 'lang',    label: 'Sprache',        type: 'select', default: '',   options: NEWS_LANGS,        group: 'Auswahl' },
    { key: 'topic',   label: 'Thema',          type: 'select', default: '',   options: _newsTopicOptions, group: 'Auswahl' },
    { key: 'source',  label: 'Quelle',         type: 'select', default: '',   options: _newsSourceOptions, group: 'Auswahl' },
    { key: 'keyword', label: 'Stichwort',      type: 'text',   default: '',   group: 'Auswahl' },
    { key: 'maxRows', label: 'Max. Meldungen', type: 'count',  default: 0,    group: 'Auswahl' },
    { key: 'list',    label: 'Meldungsliste',  type: 'toggle', default: true, group: 'Anzeige' },
    { key: 'thumbs',  label: 'Vorschaubilder', type: 'toggle', default: true, cls: 'cfg-hide-news-thumbs', group: 'Anzeige' },
    { key: 'teaser',  label: 'Kurztext',       type: 'toggle', default: false, cls: 'cfg-hide-news-teaser', group: 'Anzeige' },
    { key: 'stamps',  label: 'Zeitstempel',    type: 'toggle', default: true, cls: 'cfg-hide-news-time', group: 'Anzeige' },

    { key: 'textSize',    label: 'Schriftgröße',       type: 'select', default: 'm',      options: NEWS_SIZES,          group: 'Darstellung' },
    { key: 'titleLines',  label: 'Zeilen Überschrift', type: 'select', default: '2',      options: _newsLineOptions(3), group: 'Darstellung' },
    { key: 'teaserLines', label: 'Zeilen Kurztext',    type: 'select', default: '2',      options: _newsLineOptions(5), group: 'Darstellung' },
    { key: 'thumbSize',   label: 'Bildgröße',          type: 'select', default: 'm',      options: NEWS_SIZES,          group: 'Darstellung' },
    { key: 'spacing',     label: 'Abstand',            type: 'select', default: 'normal', options: NEWS_SPACINGS,       group: 'Darstellung' },
    { key: 'separator',   label: 'Trennung',           type: 'select', default: 'line',   options: NEWS_SEPARATORS,     group: 'Darstellung' },
  ],

  settings: {
    badge: 'NW', color: '#5b9dff',
    statusEl: 'newsSettingsStatus',
    load: loadNewsSettings,
  },
});
