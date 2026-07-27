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

function setNewsEmpty(text) {
  const el = $('newsEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

function renderNews(d) {
  _newsData = d || _newsData;
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

function _newsSourcesByLang(lang) {
  const all = (_newsCfg.catalog || []).concat(_newsCfg.custom || []);
  return all.filter((s) => s.lang === lang);
}

function _newsSwitch(on, onChange) {
  const sw = document.createElement('div');
  sw.className = 'switch' + (on ? ' on' : '');
  sw.appendChild(document.createElement('span'));
  sw.addEventListener('click', () => {
    const next = !sw.classList.contains('on');
    sw.classList.toggle('on', next);
    onChange(next);
  });
  return sw;
}

function renderNewsSettings() {
  const body = $('newsSettingsBody');
  if (!body || !_newsCfg) return;
  const enabled = new Set(_newsCfg.enabled || []);
  const catLabel = (id) => (_newsCfg.categories.find((c) => c.id === id) || {}).label || id;
  body.innerHTML = '';

  for (const lang of _newsCfg.langs) {
    const sources = _newsSourcesByLang(lang.id);
    if (!sources.length) continue;
    const head = document.createElement('div');
    head.className = 'cfg-section';
    head.textContent = lang.label;
    body.appendChild(head);

    for (const cat of _newsCfg.categories) {
      const inCat = sources.filter((s) => s.category === cat.id);
      if (!inCat.length) continue;

      const catRow = document.createElement('div');
      catRow.className = 'news-cfg-cat';
      const catName = document.createElement('span');
      catName.textContent = catLabel(cat.id);
      const allBtn = document.createElement('button');
      allBtn.className = 'cfg-btn';
      const allOn = inCat.every((s) => enabled.has(s.id));
      allBtn.textContent = allOn ? 'Alle aus' : 'Alle an';
      // Ein Thema mit einem Klick abonnieren, statt acht Schalter zu treffen.
      allBtn.addEventListener('click', () => {
        for (const s of inCat) {
          if (allOn) enabled.delete(s.id); else enabled.add(s.id);
        }
        _newsCfg.enabled = [...enabled];
        renderNewsSettings();
      });
      catRow.append(catName, allBtn);
      body.appendChild(catRow);

      for (const s of inCat) {
        const row = document.createElement('div');
        row.className = 'news-cfg-row';

        const info = document.createElement('div');
        info.className = 'news-cfg-info';
        const name = document.createElement('div');
        name.className = 'news-cfg-name';
        name.textContent = s.name + (s.custom ? ' · eigen' : '');
        const url = document.createElement('div');
        url.className = 'news-cfg-url';
        url.textContent = s.url;
        info.append(name, url);

        const right = document.createElement('div');
        right.className = 'news-cfg-actions';
        right.appendChild(_newsSwitch(enabled.has(s.id), (on) => {
          if (on) enabled.add(s.id); else enabled.delete(s.id);
          _newsCfg.enabled = [...enabled];
        }));
        if (s.custom) {
          const del = document.createElement('button');
          del.className = 'cfg-btn cfg-btn-del';
          del.textContent = '×';
          del.title = 'Quelle entfernen';
          del.addEventListener('click', () => {
            _newsCfg.custom = _newsCfg.custom.filter((c) => c.id !== s.id);
            enabled.delete(s.id);
            _newsCfg.enabled = [...enabled];
            renderNewsSettings();
          });
          right.appendChild(del);
        }
        row.append(info, right);
        body.appendChild(row);
      }
    }
  }

  body.appendChild(_newsCustomEditor());

  const foot = document.createElement('div');
  foot.className = 'news-cfg-foot';
  const active = (_newsCfg.enabled || []).length;
  const count = document.createElement('span');
  count.className = 'tile-settings-hint';
  count.textContent = active === 1 ? '1 Quelle aktiv' : `${active} Quellen aktiv`;
  const save = document.createElement('button');
  save.className = 'cfg-btn';
  save.textContent = '↵ Speichern';
  save.addEventListener('click', () => saveNewsSettings());
  foot.append(count, save);
  body.appendChild(foot);

  setNewsStatus(
    active ? `● ${active === 1 ? '1 Quelle' : `${active} Quellen`}` : '● keine Quelle',
    active ? '#3ddc97' : '#ffb454',
  );
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
  ],

  settings: {
    badge: 'NW', color: '#5b9dff',
    statusEl: 'newsSettingsStatus',
    load: loadNewsSettings,
  },
});
