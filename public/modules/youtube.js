'use strict';

/* ============================================================================
   YouTube — Abos, Benachrichtigungen & Anti-Bubble
   ----------------------------------------------------------------------------
   Zeigt die neuesten Videos der in den Einstellungen gewaehlten Kanaele,
   benachrichtigt bei neuen Uploads (Badge + optional Browser-Notification) und
   bricht die Empfehlungs-Blase mit einer Discovery-Sektion auf (kuratierter
   Pool + eigene Themen).

   Alle Inhalte sind Fremddaten und gehen ausschliesslich per textContent in die
   Seite. Thumbnails/Avatare kommen vom Server-Proxy. Einzige Ausnahme ist der
   opt-in youtube-nocookie-Player im Detailfenster.
   ============================================================================ */

let _ytData = null;        // letzte Payload
let _ytVideo = null;       // gerade geoeffnetes Video
let _ytLastFocus = null;
const _ytNotified = new Set(); // schon als Notification gezeigte Video-Ids (pro Sitzung)
let _ytNotifyPrimed = false;   // erster Render nach Laden loest keine Flut aus

/* ---------- Formatierung ---------- */

function ytWhen(iso) {
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

function ytDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function ytWatchUrl(id) { return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`; }

/* ---------- Haupt-Feed (diffList) ---------- */

function _ytFeedItems(data) {
  const group = String(_cfgVal('youtube', 'group') || '');
  let items = data.items || [];
  if (group === '__unseen') items = items.filter((v) => v.isNew);
  else if (group) items = items.filter((v) => v.group === group);
  return _cfgLimit('youtube', 'maxRows', items);
}

function _ytCreateRow() {
  const row = document.createElement('div');
  row.className = 'yt-row';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  row.innerHTML =
    '<div class="yt-thumb"><img alt="" loading="lazy"><span class="yt-dur"></span><span class="yt-live-dot"></span></div>'
    + '<div class="yt-main">'
    + '<div class="yt-title"></div>'
    + '<div class="yt-meta"><span class="yt-new">NEU</span><span class="yt-chan"></span><span class="yt-time"></span></div>'
    + '</div>';
  row._img = row.querySelector('img');
  row._dur = row.querySelector('.yt-dur');
  row._liveDot = row.querySelector('.yt-live-dot');
  row._title = row.querySelector('.yt-title');
  row._new = row.querySelector('.yt-new');
  row._chan = row.querySelector('.yt-chan');
  row._time = row.querySelector('.yt-time');
  row._img.addEventListener('error', () => { row._img.style.visibility = 'hidden'; });
  const open = () => { if (row._item) openYtVideo(row._item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return row;
}

function _ytUpdateRow(row, v, prev) {
  row._item = v;
  if (!prev || prev.title !== v.title) { row._title.textContent = v.title; row.title = v.title; }
  if (!prev || prev.channel !== v.channel) row._chan.textContent = v.channel;
  const when = ytWhen(v.published);
  if (row._time.textContent !== when) row._time.textContent = when;
  if (!prev || prev.isNew !== v.isNew) row._new.style.display = v.isNew ? '' : 'none';
  const dur = v.live === 'live' ? 'LIVE' : v.live === 'upcoming' ? 'PREMIERE' : ytDuration(v.durationSec);
  if (row._dur.textContent !== dur) {
    row._dur.textContent = dur;
    row._dur.classList.toggle('yt-dur-live', v.live === 'live' || v.live === 'upcoming');
  }
  if (!prev || prev.videoId !== v.videoId) {
    row._img.style.visibility = '';
    row._img.src = v.thumb;
  }
}

/* ---------- Sektionen (Live / Discovery / Watch-Later) ---------- */

function _ytMiniCard(v, opts) {
  const card = document.createElement('div');
  card.className = 'yt-card';
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  const img = document.createElement('img');
  img.className = 'yt-card-thumb'; img.alt = ''; img.loading = 'lazy'; img.src = v.thumb;
  img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  const body = document.createElement('div');
  body.className = 'yt-card-body';
  const title = document.createElement('div');
  title.className = 'yt-card-title'; title.textContent = v.title; title.title = v.title;
  const meta = document.createElement('div');
  meta.className = 'yt-card-meta';
  meta.textContent = [v.channel, opts && opts.topic ? `#${v.topic}` : ytWhen(v.published)].filter(Boolean).join(' · ');
  body.append(title, meta);
  card.append(img, body);
  const open = () => openYtVideo(v);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return card;
}

function _ytSection(el, label, videos, opts) {
  if (!el) return;
  const on = opts.show && videos.length;
  el.style.display = on ? '' : 'none';
  if (!on) { el.innerHTML = ''; return; }
  const head = `<div class="yt-sec-head">${esc(label)}</div>`;
  // Kopf statisch, Karten per DOM (textContent) — daher Kopf getrennt halten.
  if (el._lastHead !== head) { el.innerHTML = head + '<div class="yt-sec-body"></div>'; el._lastHead = head; }
  const body = el.querySelector('.yt-sec-body');
  body.innerHTML = '';
  for (const v of videos.slice(0, opts.max || 12)) body.appendChild(_ytMiniCard(v, opts));
}

function _ytWatchSection(el, list, show) {
  if (!el) return;
  const on = show && list.length;
  el.style.display = on ? '' : 'none';
  if (!on) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="yt-sec-head">Merkliste</div><div class="yt-watch-body"></div>';
  const body = el.querySelector('.yt-watch-body');
  for (const w of list) {
    const row = document.createElement('div');
    row.className = 'yt-watch-row' + (w.done ? ' yt-watch-done' : '');
    const done = document.createElement('button');
    done.className = 'yt-watch-check'; done.textContent = w.done ? '✓' : '○';
    done.title = w.done ? 'Als ungesehen markieren' : 'Als gesehen markieren';
    done.addEventListener('click', (e) => { e.stopPropagation(); ytWatchLater('toggle', w); });
    const t = document.createElement('span');
    t.className = 'yt-watch-title'; t.textContent = w.title || w.videoId; t.title = w.title || '';
    t.addEventListener('click', () => openYtVideo({ videoId: w.videoId, title: w.title, channel: w.channel, channelId: w.channelId, thumb: `/api/youtube/thumb/${w.videoId}`, published: '' }));
    const del = document.createElement('button');
    del.className = 'yt-watch-del'; del.textContent = '×'; del.title = 'Aus der Merkliste entfernen';
    del.addEventListener('click', (e) => { e.stopPropagation(); ytWatchLater('remove', w); });
    row.append(done, t, del);
    body.appendChild(row);
  }
}

/* ---------- Render ---------- */

function setYtEmpty(text) {
  const el = $('ytEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

function renderYoutube(d) {
  _ytData = d || _ytData;
  const data = _ytData;
  const badge = $('ytBadge');
  const list = $('ytList');

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : 'offline';
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg ? 'Einstellungen → Module → YouTube' : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.videoId, _ytCreateRow, _ytUpdateRow);
    _ytSection($('ytLive'), 'Live & Premieren', [], { show: false });
    _ytSection($('ytDiscovery'), '', [], { show: false });
    _ytWatchSection($('ytWatch'), [], false);
    setYtEmpty(notCfg ? 'Noch kein Kanal gewählt — Einstellungen → Module → YouTube.' : 'YouTube ist gerade nicht erreichbar.');
    return;
  }

  const items = _ytFeedItems(data);
  if (list) diffList(list, items, (i) => i.videoId, _ytCreateRow, _ytUpdateRow);
  setYtEmpty(items.length ? '' : ((data.items || []).length ? 'Kein Video passt zu Filter/Gruppe.' : 'Die Kanäle liefern gerade keine Videos.'));

  // Live & Premieren
  _ytSection($('ytLive'), 'Live & Premieren', data.live || [],
    { show: _cfgVal('youtube', 'live') !== false, max: 8 });
  // Anti-Bubble-Discovery
  _ytSection($('ytDiscovery'), 'Raus aus der Blase', data.discovery || [],
    { show: _cfgVal('youtube', 'discovery') !== false, topic: true, max: 12 });
  // Merkliste
  _ytWatchSection($('ytWatch'), data.watchLater || [], _cfgVal('youtube', 'watchlater') === true);

  if (badge) {
    const n = data.unseenCount || 0;
    badge.textContent = data._stale ? 'stale' : (n ? `${n} neu` : `${items.length} Videos`);
    badge.style.color = data._stale ? '#ffb454' : (n ? '#ff4d4d' : 'var(--text-3)');
    badge.title = `Stand: ${data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('de-DE') : '–'}`;
  }

  ytMaybeNotify(data);
}

// Browser-Benachrichtigung bei neuen Videos — opt-in (Kachel-Option „Benachrichtigen").
// Grenze: funktioniert nur bei geoeffnetem Tab (Dash# hat keinen Service-Worker).
function ytMaybeNotify(data) {
  if (_cfgVal('youtube', 'notify') !== true) return;
  if (typeof Notification === 'undefined') return;
  const fresh = (data.items || []).filter((v) => v.isNew && !_ytNotified.has(v.videoId));
  for (const v of fresh) _ytNotified.add(v.videoId);
  // Erster Durchlauf nach dem Laden: nur merken, nicht benachrichtigen — sonst
  // ploppt beim Öffnen des Dashboards der ganze Rückstand auf.
  if (!_ytNotifyPrimed) { _ytNotifyPrimed = true; return; }
  if (!fresh.length) return;
  const fire = () => {
    for (const v of fresh.slice(0, 5)) {
      try {
        const note = new Notification(v.channel || 'YouTube', { body: v.title, tag: v.videoId });
        note.onclick = () => { window.focus(); openYtVideo(v); note.close(); };
      } catch { /* egal */ }
    }
  };
  if (Notification.permission === 'granted') fire();
  else if (Notification.permission === 'default') Notification.requestPermission().then((p) => { if (p === 'granted') fire(); });
}

async function pollYoutube() {
  if (!state.liveOn || !widgetOnActivePage('youtube')) return;
  try { renderYoutube(await fetch('/api/youtube', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

async function ytMarkSeen(channelId) {
  try {
    await fetch('/api/youtube/seen', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channelId ? { channelId } : {}),
    });
    pollYoutube();
  } catch { /* egal */ }
}

async function ytWatchLater(action, video) {
  try {
    const r = await fetch('/api/youtube/watchlater', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, videoId: video.videoId, video }),
    });
    const d = await r.json();
    if (d && d.ok && _ytData) { _ytData.watchLater = d.watchLater; renderYoutube(null); }
    // Detailfenster ggf. aktualisieren.
    if (_ytVideo && _ytVideo.videoId === video.videoId) ytUpdateWatchBtn(d.watchLater || []);
  } catch { /* egal */ }
}

/* ---------- Detailfenster + Player ---------- */

function _buildYtModal() {
  const modal = document.createElement('div');
  modal.id = 'ytModal';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(720px,100%)">'
    + '<div class="picker-head"><span class="picker-title" id="ytModalChan">YouTube</span>'
    + '<button class="picker-close" title="Schließen">✕</button></div>'
    + '<div class="yt-modal-body">'
    + '<div id="ytModalPlayer" class="yt-modal-player"><img id="ytModalThumb" class="yt-modal-thumb" alt="">'
    + '<button id="ytModalPlay" class="yt-play-btn" title="Im Dashboard abspielen">▶</button></div>'
    + '<h3 id="ytModalTitle" class="yt-modal-title"></h3>'
    + '<div id="ytModalMeta" class="yt-modal-meta"></div>'
    + '<div id="ytModalSponsor" class="yt-modal-sponsor"></div>'
    + '<p id="ytModalDesc" class="yt-modal-desc"></p>'
    + '</div>'
    + '<div class="yt-modal-foot">'
    + '<button id="ytModalWatch" class="cfg-btn">＋ Merkliste</button>'
    + '<a id="ytModalLink" class="cfg-btn" target="_blank" rel="noopener noreferrer">Auf YouTube öffnen ↗</a>'
    + '</div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeYtVideo(); });
  modal.querySelector('.picker-close').addEventListener('click', closeYtVideo);
  const thumb = modal.querySelector('#ytModalThumb');
  thumb.addEventListener('error', () => { thumb.style.visibility = 'hidden'; });
  modal.querySelector('#ytModalPlay').addEventListener('click', ytPlayEmbedded);
  modal.querySelector('#ytModalWatch').addEventListener('click', () => {
    if (!_ytVideo) return;
    const inList = (_ytData && _ytData.watchLater || []).some((w) => w.videoId === _ytVideo.videoId);
    ytWatchLater(inList ? 'remove' : 'add', _ytVideo);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && _ytVideo) closeYtVideo(); });
  document.body.appendChild(modal);
  return modal;
}

function ytUpdateWatchBtn(list) {
  const btn = $('ytModalWatch');
  if (!btn || !_ytVideo) return;
  const inList = (list || []).some((w) => w.videoId === _ytVideo.videoId);
  btn.textContent = inList ? '✓ In Merkliste' : '＋ Merkliste';
}

function openYtVideo(v) {
  const modal = $('ytModal') || _buildYtModal();
  _ytVideo = v;
  _ytLastFocus = document.activeElement;

  // Player auf das Vorschaubild zurücksetzen (falls vorher ein iFrame lief).
  const player = $('ytModalPlayer');
  player.innerHTML = '<img id="ytModalThumb" class="yt-modal-thumb" alt="">'
    + '<button id="ytModalPlay" class="yt-play-btn" title="Im Dashboard abspielen">▶</button>';
  const thumb = $('ytModalThumb');
  thumb.addEventListener('error', () => { thumb.style.visibility = 'hidden'; });
  thumb.src = v.thumb || `/api/youtube/thumb/${v.videoId}`;
  const playBtn = $('ytModalPlay');
  // Der Player kontaktiert youtube-nocookie.com direkt — deshalb opt-in.
  playBtn.style.display = _cfgVal('youtube', 'player') === true ? '' : 'none';
  playBtn.addEventListener('click', ytPlayEmbedded);

  setText('ytModalChan', v.channel || 'YouTube');
  setText('ytModalTitle', v.title || '');
  setText('ytModalMeta', [v.published ? ytWhen(v.published) : '', ytDuration(v.durationSec)].filter(Boolean).join(' · '));
  setText('ytModalDesc', v.description || '');
  setText('ytModalSponsor', '');
  $('ytModalLink').href = ytWatchUrl(v.videoId);
  ytUpdateWatchBtn(_ytData && _ytData.watchLater || []);

  modal.style.display = 'flex';
  requestAnimationFrame(() => { modal.classList.add('open'); const c = modal.querySelector('.picker-close'); if (c) c.focus(); });

  ytLoadSponsor(v.videoId);
}

function ytPlayEmbedded() {
  if (!_ytVideo) return;
  const player = $('ytModalPlayer');
  if (!player) return;
  const frame = document.createElement('iframe');
  frame.className = 'yt-embed';
  frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture');
  frame.setAttribute('allowfullscreen', '');
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(_ytVideo.videoId)}?autoplay=1&rel=0`;
  player.innerHTML = '';
  player.appendChild(frame);
}

async function ytLoadSponsor(videoId) {
  const el = $('ytModalSponsor');
  if (!el) return;
  try {
    const d = await fetch(`/api/youtube/sponsorblock?videoId=${encodeURIComponent(videoId)}`, { cache: 'no-store' }).then((r) => r.json());
    if (!_ytVideo || _ytVideo.videoId !== videoId) return;
    const segs = (d && d.segments) || [];
    if (!segs.length) { el.textContent = ''; el.style.display = 'none'; return; }
    const total = Math.round(segs.reduce((a, s) => a + (s.end - s.start), 0));
    el.style.display = '';
    el.textContent = `SponsorBlock: ${segs.length} Segment(e), ~${ytDuration(total)} überspringbar`;
  } catch { el.textContent = ''; el.style.display = 'none'; }
}

function closeYtVideo() {
  const modal = $('ytModal');
  _ytVideo = null;
  if (!modal) return;
  const player = $('ytModalPlayer');
  if (player) player.innerHTML = ''; // iFrame stoppen
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_ytLastFocus && typeof _ytLastFocus.focus === 'function') _ytLastFocus.focus();
  _ytLastFocus = null;
}

/* ---------- Einstellungen (Settings → Module → YouTube) ---------- */

let _ytCfg = null; // { channels, groups, filters, discovery, watchLater, pool, hasKey }

function setYtStatus(text, color) {
  const el = $('youtubeSettingsStatus');
  if (!el) return;
  el.textContent = text; el.style.color = color;
}

async function loadYoutubeSettings() {
  const body = $('youtubeSettingsBody');
  if (!body) return;
  try {
    _ytCfg = await fetch('/api/youtube/config', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    body.textContent = 'Einstellungen konnten nicht geladen werden.';
    setYtStatus('● Fehler', '#f43f5e');
    return;
  }
  renderYoutubeSettings();
}

function _ytSel(label) {
  const s = document.createElement('div');
  s.className = 'cfg-section'; s.textContent = label;
  return s;
}

function saveYtConfig(patch) {
  Object.assign(_ytCfg, patch || {});
  const payload = {
    channels: _ytCfg.channels || [],
    groups: _ytCfg.groups || [],
    filters: _ytCfg.filters || {},
    discovery: _ytCfg.discovery || {},
  };
  fetch('/api/youtube/config', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }).then((r) => r.json()).then((d) => {
    if (d && d.ok) {
      _ytCfg.channels = d.channels; _ytCfg.groups = d.groups; _ytCfg.filters = d.filters; _ytCfg.discovery = d.discovery;
      setYtStatus('● gespeichert', '#3ddc97');
      renderYoutubeSettings();
      pollYoutube();
    } else { setYtStatus('● Fehler', '#f43f5e'); }
  }).catch(() => setYtStatus('● Fehler', '#f43f5e'));
}

function renderYoutubeSettings() {
  const body = $('youtubeSettingsBody');
  if (!body || !_ytCfg) return;
  body.innerHTML = '';

  body.appendChild(_ytApiKeySection());
  body.appendChild(_ytChannelSection());
  body.appendChild(_ytGroupSection());
  body.appendChild(_ytFilterSection());
  body.appendChild(_ytDiscoverySection());

  const n = (_ytCfg.channels || []).length;
  setYtStatus(n ? `● ${n === 1 ? '1 Kanal' : `${n} Kanäle`}` : '● kein Kanal', n ? '#3ddc97' : '#ffb454');
}

// --- API-Key ---
function _ytApiKeySection() {
  const wrap = document.createElement('div');
  wrap.appendChild(_ytSel('YouTube-Data-API-Key (optional)'));
  const row = document.createElement('div');
  row.className = 'news-cfg-add';
  const input = document.createElement('input');
  input.className = 'cfg-input'; input.type = 'password'; input.placeholder = 'API-Key'; input.autocomplete = 'off';
  fetch('/api/secrets', { cache: 'no-store' }).then((r) => r.json()).then((s) => {
    input.value = s.YOUTUBE_API_KEY && s.YOUTUBE_API_KEY !== '***' ? s.YOUTUBE_API_KEY : (s.YOUTUBE_API_KEY === '***' ? '' : '');
    if ((s._env || []).includes('YOUTUBE_API_KEY')) { input.readOnly = true; input.title = 'Kommt aus der Umgebung und hat Vorrang'; input.style.opacity = '.6'; }
    if (s.YOUTUBE_API_KEY === '***') input.placeholder = 'gespeichert — neu eingeben zum Ändern';
  }).catch(() => {});
  const save = document.createElement('button');
  save.className = 'cfg-btn'; save.textContent = '↵ Speichern';
  save.addEventListener('click', async () => {
    if (input.readOnly) return;
    setYtStatus('● speichert …', 'var(--text-3)');
    try {
      const r = await fetch('/api/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ YOUTUBE_API_KEY: input.value.trim() }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _ytCfg.hasKey = !!input.value.trim();
      setYtStatus('● gespeichert', '#3ddc97');
      renderYoutubeSettings();
      pollYoutube();
    } catch { setYtStatus('● Fehler', '#f43f5e'); }
  });
  row.append(input, save);
  wrap.appendChild(row);
  const hint = document.createElement('div');
  hint.className = 'tile-settings-hint'; hint.style.lineHeight = '1.7';
  hint.innerHTML = 'Für Kanalsuche nach Name, Shorts-/Dauer-Filter und die Themen-Rotation. '
    + 'Kostenlos in der <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> '
    + '(„YouTube Data API v3“ aktivieren → Anmeldedaten → API-Schlüssel). Ohne Key funktionieren Abo-Benachrichtigungen per RSS und der kuratierte Pool.';
  wrap.appendChild(hint);
  return wrap;
}

// --- Kanäle ---
function _ytChannelSection() {
  const wrap = document.createElement('div');
  wrap.appendChild(_ytSel('Kanäle'));

  // aktive Kanäle
  const groups = _ytCfg.groups || [];
  for (const c of (_ytCfg.channels || [])) {
    const row = document.createElement('div');
    row.className = 'news-cfg-row';
    const info = document.createElement('div');
    info.className = 'news-cfg-info';
    const name = document.createElement('div');
    name.className = 'news-cfg-name'; name.textContent = c.title;
    if (c.handle) { const tag = document.createElement('span'); tag.className = 'news-cfg-tag'; tag.textContent = c.handle; name.appendChild(tag); }
    info.appendChild(name);
    // Gruppen-Zuordnung
    const gsel = document.createElement('select');
    gsel.className = 'cfg-input yt-group-pick';
    const none = document.createElement('option'); none.value = ''; none.textContent = 'ohne Gruppe'; gsel.appendChild(none);
    for (const g of groups) { const o = document.createElement('option'); o.value = g.id; o.textContent = g.label; if (g.id === c.group) o.selected = true; gsel.appendChild(o); }
    gsel.addEventListener('change', () => { c.group = gsel.value; saveYtConfig(); });
    info.appendChild(gsel);

    const actions = document.createElement('div');
    actions.className = 'news-cfg-actions';
    const del = document.createElement('button');
    del.className = 'cfg-btn cfg-btn-del'; del.textContent = '×'; del.title = 'Kanal entfernen';
    del.addEventListener('click', () => { _ytCfg.channels = (_ytCfg.channels || []).filter((x) => x.id !== c.id); saveYtConfig(); });
    actions.appendChild(del);
    row.append(info, actions);
    wrap.appendChild(row);
  }
  if (!(_ytCfg.channels || []).length) {
    const hint = document.createElement('div'); hint.className = 'news-cfg-empty';
    hint.textContent = 'Noch kein Kanal — unten suchen oder per URL/@Handle/ID hinzufügen.';
    wrap.appendChild(hint);
  }

  // Suche nach Name (Key)
  const searchWrap = document.createElement('div');
  searchWrap.appendChild(_ytSel('Kanal suchen'));
  const srow = document.createElement('div');
  srow.className = 'news-cfg-add';
  const sinput = document.createElement('input');
  sinput.className = 'cfg-input'; sinput.placeholder = _ytCfg.hasKey ? 'Kanalname …' : 'Kanalsuche braucht einen API-Key';
  sinput.disabled = !_ytCfg.hasKey;
  const sbtn = document.createElement('button');
  sbtn.className = 'cfg-btn'; sbtn.textContent = '🔍 Suchen'; sbtn.disabled = !_ytCfg.hasKey;
  const results = document.createElement('div');
  results.className = 'yt-search-results';
  const doSearch = async () => {
    const q = sinput.value.trim();
    if (!q) return;
    results.textContent = 'Suche …';
    try {
      const d = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' }).then((r) => r.json());
      results.innerHTML = '';
      if (!d.ok || !(d.results || []).length) { results.textContent = 'Keine Kanäle gefunden.'; return; }
      for (const c of d.results) results.appendChild(_ytSearchResult(c));
    } catch { results.textContent = 'Suche fehlgeschlagen.'; }
  };
  sbtn.addEventListener('click', doSearch);
  sinput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  srow.append(sinput, sbtn);
  searchWrap.append(srow, results);
  wrap.appendChild(searchWrap);

  // Per URL/Handle/ID
  const addWrap = document.createElement('div');
  addWrap.appendChild(_ytSel('Per URL, @Handle oder Kanal-ID'));
  const arow = document.createElement('div');
  arow.className = 'news-cfg-add';
  const ainput = document.createElement('input');
  ainput.className = 'cfg-input'; ainput.placeholder = 'youtube.com/@handle · /channel/UC… · UC…';
  const abtn = document.createElement('button');
  abtn.className = 'cfg-btn'; abtn.textContent = '＋ Hinzufügen';
  const addByUrl = async () => {
    const val = ainput.value.trim();
    if (!val) return;
    setYtStatus('● löse auf …', 'var(--text-3)');
    try {
      const d = await fetch(`/api/youtube/resolve?url=${encodeURIComponent(val)}`, { cache: 'no-store' }).then((r) => r.json());
      if (!d.ok || !d.channel) throw new Error();
      _ytAddChannel(d.channel);
      ainput.value = '';
    } catch { setYtStatus('● nicht gefunden', '#f43f5e'); }
  };
  abtn.addEventListener('click', addByUrl);
  ainput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addByUrl(); } });
  arow.append(ainput, abtn);
  addWrap.appendChild(arow);
  wrap.appendChild(addWrap);

  return wrap;
}

function _ytSearchResult(c) {
  const row = document.createElement('div');
  row.className = 'yt-search-row';
  if (c.avatarRef) { const img = document.createElement('img'); img.className = 'yt-search-avatar'; img.alt = ''; img.src = c.avatarRef; img.addEventListener('error', () => { img.style.visibility = 'hidden'; }); row.appendChild(img); }
  const info = document.createElement('div'); info.className = 'yt-search-info';
  const nm = document.createElement('div'); nm.className = 'yt-search-name'; nm.textContent = c.title;
  const ds = document.createElement('div'); ds.className = 'yt-search-desc'; ds.textContent = c.description || '';
  info.append(nm, ds);
  const add = document.createElement('button');
  const already = (_ytCfg.channels || []).some((x) => x.id === c.id);
  add.className = 'cfg-btn'; add.textContent = already ? '✓' : '＋'; add.disabled = already; add.title = already ? 'Bereits hinzugefügt' : 'Hinzufügen';
  add.addEventListener('click', () => { _ytAddChannel({ id: c.id, title: c.title, handle: '', avatar: '' }); add.textContent = '✓'; add.disabled = true; });
  row.append(info, add);
  return row;
}

function _ytAddChannel(ch) {
  if (!ch || !ch.id) return;
  _ytCfg.channels = _ytCfg.channels || [];
  if (_ytCfg.channels.some((x) => x.id === ch.id)) return;
  _ytCfg.channels.push({ id: ch.id, title: ch.title || ch.id, handle: ch.handle || '', avatar: ch.avatar || '', group: '' });
  saveYtConfig();
}

// --- Gruppen ---
function _ytGroupSection() {
  const wrap = document.createElement('div');
  wrap.appendChild(_ytSel('Gruppen'));
  for (const g of (_ytCfg.groups || [])) {
    const row = document.createElement('div');
    row.className = 'news-cfg-row';
    const info = document.createElement('div'); info.className = 'news-cfg-info';
    const name = document.createElement('div'); name.className = 'news-cfg-name'; name.textContent = g.label; info.appendChild(name);
    const actions = document.createElement('div'); actions.className = 'news-cfg-actions';
    const del = document.createElement('button'); del.className = 'cfg-btn cfg-btn-del'; del.textContent = '×'; del.title = 'Gruppe entfernen';
    del.addEventListener('click', () => {
      _ytCfg.groups = (_ytCfg.groups || []).filter((x) => x.id !== g.id);
      for (const c of (_ytCfg.channels || [])) if (c.group === g.id) c.group = '';
      saveYtConfig();
    });
    actions.appendChild(del);
    row.append(info, actions);
    wrap.appendChild(row);
  }
  const row = document.createElement('div'); row.className = 'news-cfg-add';
  const input = document.createElement('input'); input.className = 'cfg-input'; input.placeholder = 'Neue Gruppe (z. B. Tech)';
  const add = document.createElement('button'); add.className = 'cfg-btn'; add.textContent = '＋';
  const addGroup = () => {
    const label = input.value.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `g${Date.now().toString(36)}`;
    _ytCfg.groups = _ytCfg.groups || [];
    if (!_ytCfg.groups.some((x) => x.id === id)) _ytCfg.groups.push({ id, label });
    input.value = '';
    saveYtConfig();
  };
  add.addEventListener('click', addGroup);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addGroup(); } });
  row.append(input, add);
  wrap.appendChild(row);
  return wrap;
}

// --- Filter ---
function _ytFilterSection() {
  const f = _ytCfg.filters || {};
  const wrap = document.createElement('div');
  wrap.appendChild(_ytSel('Smart-Filter (für Feed & Benachrichtigung)'));

  const mkToggle = (label, key, hint) => {
    const row = document.createElement('label'); row.className = 'yt-filter-row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!f[key];
    cb.addEventListener('change', () => { f[key] = cb.checked; saveYtConfig({ filters: f }); });
    const span = document.createElement('span'); span.textContent = label; span.title = hint || '';
    row.append(cb, span);
    return row;
  };
  wrap.appendChild(mkToggle('Shorts ausblenden (≤ 60 s, braucht Key)', 'hideShorts'));

  const liveRow = document.createElement('label'); liveRow.className = 'yt-filter-row';
  const liveCb = document.createElement('input'); liveCb.type = 'checkbox'; liveCb.checked = f.includeLive !== false;
  liveCb.addEventListener('change', () => { f.includeLive = liveCb.checked; saveYtConfig({ filters: f }); });
  const liveSpan = document.createElement('span'); liveSpan.textContent = 'Live-Streams & Premieren einschließen';
  liveRow.append(liveCb, liveSpan);
  wrap.appendChild(liveRow);

  // Dauer
  const durRow = document.createElement('div'); durRow.className = 'news-cfg-add';
  const minI = document.createElement('input'); minI.className = 'cfg-input'; minI.type = 'number'; minI.min = '0'; minI.placeholder = 'Min. Minuten'; minI.value = f.minDurationSec ? Math.round(f.minDurationSec / 60) : '';
  const maxI = document.createElement('input'); maxI.className = 'cfg-input'; maxI.type = 'number'; maxI.min = '0'; maxI.placeholder = 'Max. Minuten'; maxI.value = f.maxDurationSec ? Math.round(f.maxDurationSec / 60) : '';
  const durBtn = document.createElement('button'); durBtn.className = 'cfg-btn'; durBtn.textContent = '↵';
  durBtn.title = 'Dauerfilter braucht einen API-Key';
  durBtn.addEventListener('click', () => { f.minDurationSec = (Math.max(0, +minI.value) || 0) * 60; f.maxDurationSec = (Math.max(0, +maxI.value) || 0) * 60; saveYtConfig({ filters: f }); });
  durRow.append(minI, maxI, durBtn);
  wrap.appendChild(durRow);

  // Keywords
  const kwRow = document.createElement('div'); kwRow.className = 'news-cfg-add';
  const allowI = document.createElement('input'); allowI.className = 'cfg-input'; allowI.placeholder = 'nur mit (Komma-getrennt)'; allowI.value = (f.keywordAllow || []).join(', ');
  const blockI = document.createElement('input'); blockI.className = 'cfg-input'; blockI.placeholder = 'ausblenden (Komma-getrennt)'; blockI.value = (f.keywordBlock || []).join(', ');
  const kwBtn = document.createElement('button'); kwBtn.className = 'cfg-btn'; kwBtn.textContent = '↵';
  const splitKw = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  kwBtn.addEventListener('click', () => { f.keywordAllow = splitKw(allowI.value); f.keywordBlock = splitKw(blockI.value); saveYtConfig({ filters: f }); });
  kwRow.append(allowI, blockI, kwBtn);
  wrap.appendChild(kwRow);

  return wrap;
}

// --- Anti-Bubble ---
function _ytDiscoverySection() {
  const d = _ytCfg.discovery || { pool: false, topics: [] };
  const wrap = document.createElement('div');
  wrap.appendChild(_ytSel('Anti-Bubble (Discovery)'));

  const poolRow = document.createElement('label'); poolRow.className = 'yt-filter-row';
  const poolCb = document.createElement('input'); poolCb.type = 'checkbox'; poolCb.checked = !!d.pool;
  poolCb.addEventListener('change', () => { d.pool = poolCb.checked; saveYtConfig({ discovery: d }); });
  const poolSpan = document.createElement('span'); poolSpan.textContent = `Kuratierter Themen-Pool (${(_ytCfg.pool || []).length} Kanäle, ohne Key)`;
  poolRow.append(poolCb, poolSpan);
  wrap.appendChild(poolRow);

  // Themen-Chips
  const chips = document.createElement('div'); chips.className = 'yt-chips';
  for (const t of (d.topics || [])) {
    const chip = document.createElement('span'); chip.className = 'yt-chip'; chip.textContent = t;
    const x = document.createElement('button'); x.className = 'yt-chip-x'; x.textContent = '×';
    x.addEventListener('click', () => { d.topics = (d.topics || []).filter((y) => y !== t); saveYtConfig({ discovery: d }); });
    chip.appendChild(x); chips.appendChild(chip);
  }
  wrap.appendChild(chips);

  const row = document.createElement('div'); row.className = 'news-cfg-add';
  const input = document.createElement('input'); input.className = 'cfg-input'; input.placeholder = _ytCfg.hasKey ? 'Thema/Suchbegriff (bewusst abseits deiner Gewohnheiten)' : 'Themen-Rotation braucht einen API-Key';
  input.disabled = !_ytCfg.hasKey;
  const add = document.createElement('button'); add.className = 'cfg-btn'; add.textContent = '＋'; add.disabled = !_ytCfg.hasKey;
  const addTopic = () => {
    const t = input.value.trim();
    if (!t) return;
    d.topics = d.topics || [];
    if (!d.topics.includes(t)) d.topics.push(t);
    input.value = '';
    saveYtConfig({ discovery: d });
  };
  add.addEventListener('click', addTopic);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } });
  row.append(input, add);
  wrap.appendChild(row);
  return wrap;
}

/* ---------- Optionen (⋯-Menü) ---------- */

function _ytGroupOptions() {
  const out = [{ v: '', l: 'Alle Kanäle' }, { v: '__unseen', l: 'Nur ungesehene' }];
  const groups = (_ytData && _ytData.groups) || (_ytCfg && _ytCfg.groups) || [];
  for (const g of groups) out.push({ v: g.id, l: g.label });
  return out;
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'youtube',
  label: 'YouTube',
  section: 'media',
  defaultSize: { w: 4, h: 8 },
  minSize: { w: 3, h: 4 },

  event: 'youtube',
  handler: renderYoutube,
  refresh: () => { renderYoutube(null); pollYoutube(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>YouTube</span>
        <span id="ytBadge" class="tile-badge"></span>
      </div>
      <div id="ytLive" class="yt-live" style="display:none"></div>
      <div id="ytList" class="tile-list yt-list" data-cfg="list"></div>
      <div id="ytDiscovery" class="yt-discovery" style="display:none"></div>
      <div id="ytWatch" class="yt-watch" style="display:none"></div>
      <div id="ytEmpty" class="yt-empty" style="display:none"></div>
    </div>`,

  options: [
    { key: 'group', label: 'Ansicht', type: 'select', default: '', options: _ytGroupOptions, group: 'Auswahl' },
    { key: 'maxRows', label: 'Max. Videos', type: 'count', default: 0, group: 'Auswahl' },
    { key: 'list', label: 'Video-Liste', type: 'toggle', default: true, group: 'Anzeige' },
    { key: 'live', label: 'Live & Premieren', type: 'toggle', default: true, filter: true, group: 'Anzeige' },
    { key: 'discovery', label: 'Anti-Bubble', type: 'toggle', default: true, filter: true, group: 'Anzeige' },
    { key: 'watchlater', label: 'Merkliste', type: 'toggle', default: false, filter: true, group: 'Anzeige' },
    { key: 'notify', label: 'Benachrichtigen', type: 'toggle', default: false, filter: true, group: 'Benachrichtigung' },
    { key: 'player', label: 'Player im Fenster', type: 'toggle', default: false, filter: true, group: 'Wiedergabe' },
  ],

  settings: {
    badge: 'YT', color: '#ff4d4d',
    statusEl: 'youtubeSettingsStatus',
    load: loadYoutubeSettings,
  },
});
