'use strict';

/* ============================================================
   YouTube — Abos, Benachrichtigungen & Anti-Bubble
   ------------------------------------------------------------
   Bewusst ohne Google-Login: Dash# ist login-los. Kanäle werden
   in config/youtube.json abgelegt (Inhalte, keine Zugangsdaten),
   die neuen Videos holt der Server über die öffentlichen
   RSS-Feeds von YouTube — das kostet keine API-Quota und braucht
   keinen Key.

   Der YouTube-Data-API-Key (YOUTUBE_API_KEY, optional) schaltet
   frei, was RSS nicht kann: Kanalsuche/-Auflösung nach Name,
   Metadaten (Dauer, Live-Status) für die Filter und die
   Themen-Rotation der Anti-Bubble-Discovery.

   Anti-Bubble: bewusst außerhalb der Abos. Zwei Quellen:
   - ein kuratierter Pool diverser Themenkanäle (RSS, ohne Key),
   - Themen-Rotation über eigene Suchbegriffe (search.list, Key).
   Discovery hat einen eigenen, langen Cache — search.list kostet
   100 Quota-Einheiten, deshalb wird langsam rotiert und die
   Auswahl nur bei jedem Tick neu gemischt.

   Bilder holt der Server (Thumbnail-/Avatar-Proxy), damit der
   Browser weiterhin nur mit dem Dashboard spricht. Einzige
   Ausnahme ist der optionale, eingebettete youtube-nocookie-
   Player — der lebt im Frontend und ist dort opt-in.
   ============================================================ */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'youtube.json');

const UA = 'DashSharp/1.0 (+homelab dashboard; youtube tile)';
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const RSS_BASE = 'https://www.youtube.com/feeds/videos.xml?channel_id=';
const SPONSORBLOCK_BASE = 'https://sponsor.ajay.app/api/skipSegments';

// Bild-Hosts von YouTube. Der Proxy laesst nur diese zu — die URLs stammen
// entweder aus der API-Antwort oder werden aus einer Video-Id gebaut, ein
// fremdes Ziel laesst sich darueber nicht unterschieben.
const IMG_HOSTS = /(^|\.)(ytimg\.com|ggpht\.com|googleusercontent\.com|youtube\.com)$/i;

const RSS_TIMEOUT_MS = 8000;
const RSS_MAX_BYTES = 1.5 * 1024 * 1024;
const IMG_TIMEOUT_MS = 8000;
const IMG_MAX_BYTES = 2 * 1024 * 1024;
const API_TIMEOUT_MS = 8000;

const FETCH_CONCURRENCY = 6;
const PER_CHANNEL_ITEMS = 15;   // so viele liefert der RSS-Feed maximal
const TOTAL_ITEMS = 120;
const SHORT_MAX_SECONDS = 60;   // Heuristik: <= 60 s gilt als Short

// Discovery-Caches getrennt vom Haupt-TTL — search.list ist teuer, Pool-RSS
// soll nicht bei jedem Tick 15 Fremdserver treffen.
const DISCOVERY_TTL_MS = 3 * 60 * 60 * 1000; // Themen-Rotation: alle 3 h ein Suchlauf
const POOL_TTL_MS = 60 * 60 * 1000;          // Pool-RSS: stündlich frisch
const META_TTL_MS = 6 * 60 * 60 * 1000;      // Dauer/Live-Status je Video

const MAX_CHANNELS = 100;
const MAX_GROUPS = 30;
const MAX_TOPICS = 20;
const MAX_WATCHLATER = 200;
const MAX_WATCHED = 500;        // gedeckelte „schon geschaut"-Historie (Video-Ids)
const MAX_KEYWORDS = 40;

/* Kuratierter Anti-Bubble-Pool: absichtlich breit gestreute Themen, damit die
   Vorschlaege NICHT in der gewohnten Blase landen. Bewusst durchweg
   deutschsprachig — die Discovery soll ausserhalb der Abos liegen, aber nicht
   ausserhalb der Sprache. Best effort — ein Kanal, der nicht (mehr) erreichbar
   ist, wird beim Abruf einfach uebersprungen. Die eigenen Themen des Nutzers
   ergaenzen diese Liste. */
const POOL = [
  { id: 'UC1Y7onDsPyfP-lu--SXF-ew', name: 'Quarks',                        topic: 'Wissenschaft' },
  { id: 'UCwSJO-6HBrxyVtJyK897TyQ', name: 'Terra X',                        topic: 'Natur & Doku' },
  { id: 'UC5E9-r42JlymhLPnDv2wHuA', name: 'Terra X Lesch & Co',            topic: 'Physik' },
  { id: 'UClDnGiwSyTyu7gxO8X5U18g', name: 'Urknall, Weltall und das Leben', topic: 'Astrophysik' },
  { id: 'UCEJDM_70A2EiRqZ41l6bZlg', name: '100SekundenPhysik',              topic: 'Physik' },
  { id: 'UCesjlAoEgN_Sz_cKTvKEmmw', name: 'Doktor Whatson',                 topic: 'Zukunft' },
  { id: 'UCE2hJ9CYR57BYhk3TjGVG6w', name: 'Breaking Lab',                   topic: 'Technik' },
  { id: 'UCKGMHVipEvuZudhHD05FOYA', name: 'Simplicissimus',                 topic: 'Recherche' },
  { id: 'UCZHpIFMfoJJ_1QxNGLJTzyA', name: 'MrWissen2go',                     topic: 'Politik' },
  { id: 'UCsVWpmoRsNAWZb59b6Pt9Kg', name: 'MrWissen2go Geschichte',         topic: 'Geschichte' },
  { id: 'UCLoWcRy-ZjA-Erh0p_VDLjQ', name: 'Y-Kollektiv',                    topic: 'Reportage' },
  { id: 'UCfa7jJFYnn3P5LdJXsFkrjw', name: 'STRG_F',                         topic: 'Reportage' },
  { id: 'UC_cCcxd8yUwIu1-rt5dpBdw', name: 'Die Merkhilfe',                  topic: 'Wirtschaft' },
  { id: 'UCLLibJTCy3sXjHLVaDimnpQ', name: 'ARTE',                           topic: 'Kultur' },
  { id: 'UCRwMtNziueImGTt_ihnGYpg', name: 'WELT Doku',                      topic: 'Doku' },
];

/* ---------- kleine Helfer ---------- */

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/;

// Nur die XML-Entities, die YouTube in Titeln/Beschreibungen benutzt.
function decodeEntities(s) {
  return String(s || '')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// ISO-8601-Dauer (PT#H#M#S) -> Sekunden.
function iso8601ToSeconds(iso) {
  const m = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!m) return null;
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

// Nebenlaeufigkeit begrenzen, damit N Kanaele nicht N gleichzeitige Requests
// ausloesen.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function readCapped(res, maxBytes) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) { try { await reader.cancel(); } catch { /* egal */ } throw new Error('too_large'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

async function httpText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: 'application/atom+xml, application/xml;q=0.9, */*;q=0.8' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await readCapped(res, RSS_MAX_BYTES);
  return buf.toString('utf8');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Konfiguration (config/youtube.json) ---------- */

const EMPTY_CFG = () => ({
  channels: [], groups: [], seen: {}, watchLater: [], watched: {},
  filters: { hideShorts: false, minDurationSec: 0, maxDurationSec: 0, keywordBlock: [], keywordAllow: [], includeLive: true },
  discovery: { pool: false, topics: [] },
});

let _cfg = EMPTY_CFG();
let _cfgMtime = -1;

function readCfg() {
  let mtime = 0;
  try { mtime = fs.statSync(CONFIG_PATH).mtimeMs; } catch { mtime = 0; }
  if (mtime === _cfgMtime) return _cfg;
  _cfgMtime = mtime;
  if (!mtime) { _cfg = EMPTY_CFG(); return _cfg; }
  try { _cfg = sanitizeCfg(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (err) {
    console.error('[youtube] config/youtube.json ist unlesbar:', err.message);
    _cfg = EMPTY_CFG();
  }
  return _cfg;
}

function writeCfg(cfg) {
  const clean = sanitizeCfg(cfg);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, CONFIG_PATH);
  _cfgMtime = -1; // naechster readCfg() liest frisch
  return clean;
}

function sanitizeGroups(raw) {
  const out = [];
  for (const g of (Array.isArray(raw) ? raw : [])) {
    if (!g || typeof g !== 'object') continue;
    const id = String(g.id || '').trim().slice(0, 40).replace(/[^a-z0-9-]/gi, '').toLowerCase();
    if (!id || out.some((x) => x.id === id)) continue;
    const label = String(g.label || id).trim().slice(0, 40) || id;
    out.push({ id, label });
    if (out.length >= MAX_GROUPS) break;
  }
  return out;
}

function sanitizeChannel(raw, groupIds) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!CHANNEL_ID_RE.test(id)) return null;
  const title = String(raw.title || '').trim().slice(0, 120) || id;
  const handle = String(raw.handle || '').trim().slice(0, 60);
  const avatar = /^https:\/\//.test(raw.avatar || '') ? String(raw.avatar).slice(0, 500) : '';
  const group = groupIds.has(raw.group) ? String(raw.group) : '';
  return { id, title, handle, avatar, group };
}

function sanitizeKeywords(raw) {
  const out = [];
  for (const k of (Array.isArray(raw) ? raw : [])) {
    const s = String(k || '').trim().slice(0, 60).toLowerCase();
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

function sanitizeFilters(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const clampSec = (v) => Math.max(0, Math.min(24 * 3600, Math.floor(+v) || 0));
  return {
    hideShorts: !!f.hideShorts,
    minDurationSec: clampSec(f.minDurationSec),
    maxDurationSec: clampSec(f.maxDurationSec),
    keywordBlock: sanitizeKeywords(f.keywordBlock),
    keywordAllow: sanitizeKeywords(f.keywordAllow),
    includeLive: f.includeLive !== false,
  };
}

function sanitizeDiscovery(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const topics = [];
  for (const t of (Array.isArray(d.topics) ? d.topics : [])) {
    const s = String(t || '').trim().slice(0, 80);
    if (s && !topics.includes(s)) topics.push(s);
    if (topics.length >= MAX_TOPICS) break;
  }
  return { pool: !!d.pool, topics };
}

function sanitizeWatchLater(raw) {
  const out = [];
  for (const w of (Array.isArray(raw) ? raw : [])) {
    if (!w || typeof w !== 'object') continue;
    const videoId = String(w.videoId || '').trim();
    if (!VIDEO_ID_RE.test(videoId)) continue;
    if (out.some((x) => x.videoId === videoId)) continue;
    out.push({
      videoId,
      title: String(w.title || '').slice(0, 200),
      channel: String(w.channel || '').slice(0, 120),
      channelId: CHANNEL_ID_RE.test(w.channelId) ? w.channelId : '',
      added: Number.isFinite(+w.added) ? +w.added : Date.now(),
      done: !!w.done,
    });
    if (out.length >= MAX_WATCHLATER) break;
  }
  return out;
}

// „Geschaut"-Historie: Map videoId -> Zeitstempel (ms). Auf die neuesten
// MAX_WATCHED gedeckelt, damit die Datei nicht unbegrenzt waechst.
function sanitizeWatched(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const pairs = [];
  for (const [id, ts] of Object.entries(src)) {
    if (!VIDEO_ID_RE.test(id)) continue;
    const t = Number.isFinite(+ts) ? +ts : 0;
    pairs.push([id, t]);
  }
  pairs.sort((a, b) => b[1] - a[1]); // neueste zuerst
  const out = {};
  for (const [id, t] of pairs.slice(0, MAX_WATCHED)) out[id] = t;
  return out;
}

function sanitizeCfg(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const groups = sanitizeGroups(obj.groups);
  const groupIds = new Set(groups.map((g) => g.id));
  const channels = [];
  for (const c of (Array.isArray(obj.channels) ? obj.channels : [])) {
    const clean = sanitizeChannel(c, groupIds);
    if (clean && !channels.some((x) => x.id === clean.id)) channels.push(clean);
    if (channels.length >= MAX_CHANNELS) break;
  }
  // seen nur fuer bekannte Kanaele behalten; neue Kanaele bekommen eine
  // Basislinie (jetzt), damit nicht der ganze Backlog als „neu" gilt.
  const known = new Set(channels.map((c) => c.id));
  const rawSeen = obj.seen && typeof obj.seen === 'object' ? obj.seen : {};
  const seen = {};
  const nowIso = new Date().toISOString();
  for (const c of channels) {
    const v = rawSeen[c.id];
    seen[c.id] = (typeof v === 'string' && !Number.isNaN(Date.parse(v))) ? v : nowIso;
  }
  void known;
  return {
    channels, groups, seen,
    watchLater: sanitizeWatchLater(obj.watchLater),
    watched: sanitizeWatched(obj.watched),
    filters: sanitizeFilters(obj.filters),
    discovery: sanitizeDiscovery(obj.discovery),
  };
}

/* ---------- Bild-Proxy ----------
   Video-Thumbnails werden aus der 11-stelligen Video-Id gebaut
   (/api/youtube/thumb/<id>), Avatare kommen über eine Ref-Zuordnung
   (/api/youtube/img/<ref>), die aus dem letzten Abruf und aus Suchen entsteht.
   Der Client sieht nie die Original-URL. */

let _imgCur = new Map();
let _imgPrev = new Map();

function imgRef(url) {
  if (!/^https:\/\//.test(url || '')) return '';
  const id = sha1(url).slice(0, 16);
  _imgCur.set(id, url);
  return `/api/youtube/img/${id}`;
}
function imgUrlFor(id) { return _imgCur.get(id) || _imgPrev.get(id) || null; }

const IMG_CACHE_MAX = 120;
const IMG_CACHE_BYTES = 24 * 1024 * 1024;
const _imgCache = new Map();
let _imgCacheBytes = 0;
function imgCacheGet(id) {
  const hit = _imgCache.get(id);
  if (!hit) return null;
  _imgCache.delete(id); _imgCache.set(id, hit);
  return hit;
}
function imgCachePut(id, entry) {
  if (_imgCache.has(id)) _imgCacheBytes -= _imgCache.get(id).buf.length;
  _imgCache.set(id, entry);
  _imgCacheBytes += entry.buf.length;
  while (_imgCache.size > IMG_CACHE_MAX || _imgCacheBytes > IMG_CACHE_BYTES) {
    const oldest = _imgCache.keys().next().value;
    if (oldest === undefined) break;
    _imgCacheBytes -= _imgCache.get(oldest).buf.length;
    _imgCache.delete(oldest);
  }
}

function imageTypeOf(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function fetchImage(startUrl) {
  const u = new URL(startUrl);
  if (u.protocol !== 'https:') throw new Error('bad_protocol');
  if (!IMG_HOSTS.test(u.hostname)) throw new Error('host_not_allowed');
  const res = await fetch(startUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(IMG_TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: 'image/*' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await readCapped(res, IMG_MAX_BYTES);
  const type = imageTypeOf(buf);
  if (!type) throw new Error('not_an_image');
  return { type, buf };
}

function sendImage(res, img) {
  res.set('Content-Type', img.type);
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('X-Content-Type-Options', 'nosniff');
  res.end(img.buf);
}

/* ---------- RSS: neue Videos je Kanal (ohne Key) ---------- */

function parseChannelFeed(xml) {
  const channelTitle = decodeEntities((/<title>([^<]*)<\/title>/.exec(xml) || [])[1] || '');
  const videos = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) && videos.length < PER_CHANNEL_ITEMS) {
    const e = m[1];
    const videoId = (/<yt:videoId>([^<]+)<\/yt:videoId>/.exec(e) || [])[1] || '';
    if (!VIDEO_ID_RE.test(videoId)) continue;
    const channelId = (/<yt:channelId>([^<]+)<\/yt:channelId>/.exec(e) || [])[1] || '';
    const title = decodeEntities((/<title>([^<]*)<\/title>/.exec(e) || [])[1] || '');
    const published = (/<published>([^<]+)<\/published>/.exec(e) || [])[1] || '';
    const author = decodeEntities((/<name>([^<]*)<\/name>/.exec(e) || [])[1] || '');
    const desc = decodeEntities((/<media:description>([\s\S]*?)<\/media:description>/.exec(e) || [])[1] || '');
    videos.push({ videoId, channelId, title, published, author, description: desc.slice(0, 500) });
  }
  return { channelTitle, videos };
}

async function fetchChannelFeed(channelId) {
  const xml = await httpText(RSS_BASE + encodeURIComponent(channelId));
  return parseChannelFeed(xml);
}

/* ---------- YouTube Data API (mit Key) ---------- */

// Serielle Drossel: die API mag keine Bursts, und wir wollen Quota sparen.
let _apiQueue = Promise.resolve();
let _apiLast = 0;
const API_MIN_GAP_MS = 120;
function throttled(fn) {
  const run = _apiQueue.then(async () => {
    const wait = API_MIN_GAP_MS - (Date.now() - _apiLast);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _apiLast = Date.now();
    return fn();
  });
  _apiQueue = run.then(() => {}, () => {});
  return run;
}

async function apiGet(get, ctx, endpoint, params) {
  const key = get('YOUTUBE_API_KEY');
  if (!key) throw new Error('no_api_key');
  const qs = new URLSearchParams({ ...params, key }).toString();
  return throttled(() => ctx.httpJson(`${API_BASE}/${endpoint}?${qs}`, { timeoutMs: API_TIMEOUT_MS }));
}

function bestThumb(thumbs) {
  if (!thumbs) return '';
  return (thumbs.medium || thumbs.high || thumbs.default || {}).url || '';
}

// Kanalsuche nach Name — fuer das „Kanal hinzufuegen"-Feld.
async function searchChannels(get, ctx, q) {
  const data = await apiGet(get, ctx, 'search', {
    part: 'snippet', type: 'channel', q, maxResults: '8',
  });
  return (data.items || []).map((it) => ({
    id: it.snippet.channelId || (it.id && it.id.channelId) || '',
    title: it.snippet.channelTitle || it.snippet.title || '',
    description: (it.snippet.description || '').slice(0, 160),
    avatarRef: imgRef(bestThumb(it.snippet.thumbnails)),
  })).filter((c) => CHANNEL_ID_RE.test(c.id));
}

// Kanal aufloesen: direkte /channel/UC…-Links gehen ohne Key (Titel via RSS),
// Handles/Custom-URLs brauchen den Key.
async function resolveChannel(get, ctx, input) {
  const raw = String(input || '').trim();
  let channelId = '';
  let handle = '';
  const chMatch = /channel\/(UC[A-Za-z0-9_-]{22})/.exec(raw);
  if (CHANNEL_ID_RE.test(raw)) channelId = raw;
  else if (chMatch) channelId = chMatch[1];
  else {
    const hMatch = /(?:youtube\.com\/)?@([A-Za-z0-9._-]+)/.exec(raw) || (/^@?([A-Za-z0-9._-]+)$/.exec(raw));
    if (hMatch) handle = hMatch[1];
  }

  if (channelId) {
    // Titel + Avatar ohne Key aus dem RSS-Feed; mit Key holen wir zusaetzlich
    // den Avatar in guter Aufloesung.
    let title = channelId;
    let avatar = '';
    try { title = (await fetchChannelFeed(channelId)).channelTitle || channelId; } catch { /* egal */ }
    if (get('YOUTUBE_API_KEY')) {
      try {
        const d = await apiGet(get, ctx, 'channels', { part: 'snippet', id: channelId });
        const sn = d.items && d.items[0] && d.items[0].snippet;
        if (sn) { title = sn.title || title; avatar = bestThumb(sn.thumbnails); handle = (sn.customUrl || '').replace(/^@?/, ''); }
      } catch { /* RSS-Titel reicht */ }
    }
    return { id: channelId, title, handle: handle ? `@${handle}` : '', avatar, avatarRef: avatar ? imgRef(avatar) : '' };
  }

  if (handle) {
    const d = await apiGet(get, ctx, 'channels', { part: 'snippet', forHandle: `@${handle}` });
    const item = d.items && d.items[0];
    if (!item) throw new Error('not_found');
    const sn = item.snippet || {};
    const avatar = bestThumb(sn.thumbnails);
    return { id: item.id, title: sn.title || handle, handle: `@${handle}`, avatar, avatarRef: avatar ? imgRef(avatar) : '' };
  }
  throw new Error('unresolvable');
}

// Dauer + Live-Status fuer die Filter (1 Quota-Einheit je 50 Videos), gecacht.
const _metaCache = new Map(); // videoId -> { at, durationSec, live }
async function enrichVideos(get, ctx, videoIds) {
  const out = new Map();
  const now = Date.now();
  const missing = [];
  for (const id of videoIds) {
    const hit = _metaCache.get(id);
    if (hit && now - hit.at < META_TTL_MS) out.set(id, hit);
    else missing.push(id);
  }
  if (!get('YOUTUBE_API_KEY') || !missing.length) return out;
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    try {
      const d = await apiGet(get, ctx, 'videos', { part: 'contentDetails,snippet', id: batch.join(',') });
      for (const it of (d.items || [])) {
        const durationSec = iso8601ToSeconds(it.contentDetails && it.contentDetails.duration);
        const live = (it.snippet && it.snippet.liveBroadcastContent) || 'none';
        const entry = { at: now, durationSec, live };
        _metaCache.set(it.id, entry);
        out.set(it.id, entry);
      }
    } catch (err) {
      ctx.warn(`videos.list: ${err.message}`);
      break; // bei Quota-/Key-Fehlern nicht weiter feuern
    }
  }
  return out;
}

/* ---------- Anti-Bubble: Discovery ---------- */

let _poolCache = { at: 0, items: [] };
let _discoCache = { at: 0, topicIndex: -1, items: [] };

async function refreshPool() {
  if (Date.now() - _poolCache.at < POOL_TTL_MS && _poolCache.items.length) return;
  const results = await mapLimit(POOL, FETCH_CONCURRENCY, async (ch) => {
    try {
      const feed = await fetchChannelFeed(ch.id);
      return feed.videos.slice(0, 4).map((v) => ({
        videoId: v.videoId, title: v.title,
        channel: feed.channelTitle || ch.name, channelId: v.channelId || ch.id,
        published: v.published, source: 'pool', topic: ch.topic,
      }));
    } catch { return []; }
  });
  _poolCache = { at: Date.now(), items: results.flat() };
}

async function refreshTopics(get, ctx, topics) {
  if (!get('YOUTUBE_API_KEY') || !topics.length) { _discoCache = { at: Date.now(), topicIndex: -1, items: [] }; return; }
  if (Date.now() - _discoCache.at < DISCOVERY_TTL_MS && _discoCache.items.length) return;
  // Immer nur EIN Thema pro Rotation abfragen — search.list kostet 100 Einheiten.
  const idx = (_discoCache.topicIndex + 1) % topics.length;
  const topic = topics[idx];
  try {
    const d = await apiGet(get, ctx, 'search', {
      part: 'snippet', type: 'video', q: topic, order: 'relevance', maxResults: '10', safeSearch: 'moderate',
      relevanceLanguage: 'de', regionCode: 'DE', // Discovery bleibt deutschsprachig
    });
    const items = (d.items || []).map((it) => ({
      videoId: it.id && it.id.videoId, title: decodeEntities(it.snippet.title || ''),
      channel: it.snippet.channelTitle || '', channelId: it.snippet.channelId || '',
      published: it.snippet.publishedAt || '', source: 'topic', topic,
    })).filter((v) => VIDEO_ID_RE.test(v.videoId));
    _discoCache = { at: Date.now(), topicIndex: idx, items };
  } catch (err) {
    ctx.warn(`discovery „${topic}“: ${err.message}`);
    _discoCache = { at: Date.now(), topicIndex: idx, items: _discoCache.items };
  }
}

/* ---------- Filter ---------- */

function matchesKeywords(title, filters) {
  const t = String(title || '').toLowerCase();
  if (filters.keywordBlock.some((k) => t.includes(k))) return false;
  if (filters.keywordAllow.length && !filters.keywordAllow.some((k) => t.includes(k))) return false;
  return true;
}

function passesFilters(v, filters) {
  if (!matchesKeywords(v.title, filters)) return false;
  if (!filters.includeLive && (v.live === 'live' || v.live === 'upcoming')) return false;
  const dur = v.durationSec;
  if (dur != null) {
    if (filters.hideShorts && dur > 0 && dur <= SHORT_MAX_SECONDS) return false;
    if (filters.minDurationSec && dur < filters.minDurationSec) return false;
    if (filters.maxDurationSec && dur > filters.maxDurationSec) return false;
  }
  return true;
}

/* ---------- Hauptabruf ---------- */

module.exports = {
  id: 'youtube',
  label: 'YouTube',
  ttl: 600000, // 10 min — RSS fuellt sich langsam, der Takt geht an Fremdserver

  secrets: [
    { key: 'YOUTUBE_API_KEY', label: 'API-Key (optional)', masked: true },
  ],

  // Ohne beobachtete Kanaele UND ohne aktive Discovery passiert nichts:
  // kein Abruf, kein Fremd-Request.
  configured: () => {
    const c = readCfg();
    return c.channels.length > 0 || c.discovery.pool || c.discovery.topics.length > 0;
  },
  notConfigured: { ok: false, error: 'not_configured', items: [], discovery: [], live: [], channels: [], groups: [], watchLater: [], unseenCount: 0 },
  errorFields: { items: [], discovery: [], live: [], channels: [], groups: [], watchLater: [], unseenCount: 0 },

  async fetch(get, ctx) {
    const cfg = readCfg();
    _imgPrev = _imgCur;
    _imgCur = new Map();

    // 1) Abo-Feeds je Kanal (RSS, gratis).
    const feeds = await mapLimit(cfg.channels, FETCH_CONCURRENCY, async (ch) => {
      try {
        const feed = await fetchChannelFeed(ch.id);
        return { ch, videos: feed.videos, title: feed.channelTitle || ch.title, error: null };
      } catch (err) {
        ctx.warn(`${ch.title || ch.id}: ${err.message}`);
        return { ch, videos: [], title: ch.title, error: err.message };
      }
    });

    // Kanaltitel/Avatare fuer die Anzeige registrieren.
    for (const f of feeds) if (f.ch.avatar) imgRef(f.ch.avatar);

    // 2) Videos einsammeln, Neuheit über die seen-Wasserlinie bestimmen.
    let items = [];
    const perChannelNew = new Map(); // channelId -> count
    for (const f of feeds) {
      const seenIso = cfg.seen[f.ch.id] || '';
      const seenT = seenIso ? Date.parse(seenIso) : 0;
      for (const v of f.videos) {
        const t = Date.parse(v.published) || 0;
        const isNew = seenT ? t > seenT : false;
        if (isNew && !cfg.watched[v.videoId]) perChannelNew.set(f.ch.id, (perChannelNew.get(f.ch.id) || 0) + 1);
        items.push({
          videoId: v.videoId,
          title: v.title,
          channelId: f.ch.id,
          channel: f.title,
          group: f.ch.group || '',
          published: v.published,
          description: v.description,
          thumb: `/api/youtube/thumb/${v.videoId}`,
          durationSec: null,
          live: 'none',
          isNew,
          watched: !!cfg.watched[v.videoId],
        });
      }
    }

    // 3) Dauer/Live anreichern (mit Key), damit Shorts-/Dauer-/Live-Filter greifen.
    const needMeta = cfg.filters.hideShorts || cfg.filters.minDurationSec || cfg.filters.maxDurationSec || !cfg.filters.includeLive;
    if (needMeta && items.length) {
      const meta = await enrichVideos(get, ctx, items.map((i) => i.videoId).slice(0, 200));
      for (const it of items) {
        const m = meta.get(it.videoId);
        if (m) { it.durationSec = m.durationSec; it.live = m.live; }
      }
    }

    // 4) Filter anwenden, sortieren, deduplizieren.
    const seen = new Set();
    items = items
      .filter((v) => passesFilters(v, cfg.filters))
      .filter((v) => (seen.has(v.videoId) ? false : (seen.add(v.videoId), true)))
      .sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0))
      .slice(0, TOTAL_ITEMS);

    const live = items.filter((v) => v.live === 'live' || v.live === 'upcoming');

    // 5) Anti-Bubble-Discovery (eigene Caches, bewusst außerhalb der Abos).
    let discovery = [];
    if (cfg.discovery.pool) { try { await refreshPool(); } catch { /* egal */ } }
    await refreshTopics(get, ctx, cfg.discovery.topics);
    const ownChannels = new Set(cfg.channels.map((c) => c.id));
    const discRaw = [
      ...(cfg.discovery.pool ? _poolCache.items : []),
      ..._discoCache.items,
    ].filter((v) => v.videoId && !ownChannels.has(v.channelId)); // nie die eigenen Abos vorschlagen
    // Bei jedem Tick neu mischen -> der Vorschlag variiert, ohne neue API-Calls.
    discovery = shuffle(discRaw).slice(0, 30).map((v) => ({ ...v, thumb: `/api/youtube/thumb/${v.videoId}` }));

    // 6) Kanal-/Gruppen-Zusammenfassung (Digest) + Ungesehen-Zaehler.
    const channels = cfg.channels.map((c) => ({
      id: c.id, title: c.title, handle: c.handle, group: c.group || '',
      avatar: c.avatar ? imgRef(c.avatar) : '', unseen: perChannelNew.get(c.id) || 0,
    }));
    // Ein bereits geschautes „neues" Video soll das Badge nicht mehr hochzaehlen.
    const unseenCount = items.filter((v) => v.isNew && !v.watched).length;

    return {
      ok: true,
      fetchedAt: Date.now(),
      hasKey: !!get('YOUTUBE_API_KEY'),
      items,
      discovery,
      live,
      channels,
      groups: cfg.groups,
      watchLater: cfg.watchLater,
      filters: cfg.filters,
      poolOn: cfg.discovery.pool,
      topics: cfg.discovery.topics,
      unseenCount,
    };
  },

  routes(app, { get, ctx, invalidate, refresh }) {
    const reload = () => { invalidate(); refresh().catch(() => { /* Fehler in der naechsten Antwort */ }); };

    // --- Config lesen/schreiben ---
    app.get('/api/youtube/config', (req, res) => {
      const cfg = readCfg();
      res.set('Cache-Control', 'no-store');
      res.json({
        ok: true,
        hasKey: !!get('YOUTUBE_API_KEY'),
        channels: cfg.channels.map((c) => ({ ...c, avatarRef: c.avatar ? imgRef(c.avatar) : '' })),
        groups: cfg.groups,
        filters: cfg.filters,
        discovery: cfg.discovery,
        watchLater: cfg.watchLater,
        pool: POOL.map((p) => ({ name: p.name, topic: p.topic })),
      });
    });

    app.post('/api/youtube/config', (req, res) => {
      try {
        // seen (Benachrichtigungs-Wasserlinie) und watchLater haben eigene
        // Endpunkte — hier nur uebernehmen, was mitkommt, den Rest aus dem
        // Bestand erhalten, damit ein Settings-Save keine Watermarks loescht.
        const cur = readCfg();
        const body = req.body || {};
        const merged = {
          channels: body.channels != null ? body.channels : cur.channels,
          groups: body.groups != null ? body.groups : cur.groups,
          filters: body.filters != null ? body.filters : cur.filters,
          discovery: body.discovery != null ? body.discovery : cur.discovery,
          watchLater: body.watchLater != null ? body.watchLater : cur.watchLater,
          seen: { ...cur.seen, ...(body.seen && typeof body.seen === 'object' ? body.seen : {}) },
          watched: { ...cur.watched, ...(body.watched && typeof body.watched === 'object' ? body.watched : {}) },
        };
        const clean = writeCfg(merged);
        reload();
        res.json({ ok: true, channels: clean.channels, groups: clean.groups, filters: clean.filters, discovery: clean.discovery });
      } catch (err) {
        console.error('[youtube] Konfiguration nicht speicherbar:', err.message);
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    // --- Kanalsuche / -Auflösung (Key) ---
    app.get('/api/youtube/search', async (req, res) => {
      const q = String(req.query.q || '').trim().slice(0, 100);
      if (!q) return res.status(400).json({ ok: false, error: 'missing_query' });
      if (!get('YOUTUBE_API_KEY')) return res.status(400).json({ ok: false, error: 'no_api_key' });
      try {
        res.set('Cache-Control', 'no-store');
        res.json({ ok: true, results: await searchChannels(get, ctx, q) });
      } catch (err) {
        res.status(502).json({ ok: false, error: 'search_failed', message: err.message });
      }
    });

    app.get('/api/youtube/resolve', async (req, res) => {
      const input = String(req.query.url || req.query.q || '').trim().slice(0, 200);
      if (!input) return res.status(400).json({ ok: false, error: 'missing_input' });
      try {
        res.set('Cache-Control', 'no-store');
        res.json({ ok: true, channel: await resolveChannel(get, ctx, input) });
      } catch (err) {
        const code = err.message === 'no_api_key' ? 400 : 404;
        res.status(code).json({ ok: false, error: 'resolve_failed', message: err.message });
      }
    });

    // --- Als gesehen markieren (Benachrichtigungs-Wasserlinie setzen) ---
    app.post('/api/youtube/seen', (req, res) => {
      try {
        const cfg = readCfg();
        const nowIso = new Date().toISOString();
        const only = req.body && CHANNEL_ID_RE.test(req.body.channelId) ? req.body.channelId : null;
        const next = { ...cfg, seen: { ...cfg.seen } };
        for (const c of cfg.channels) {
          if (only && c.id !== only) continue;
          next.seen[c.id] = nowIso;
        }
        writeCfg(next);
        reload();
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ ok: false, error: 'seen_failed', message: err.message });
      }
    });

    // --- „Schon geschaut" pro Video (dashboard-lokal, unabhaengig von YouTube) ---
    app.post('/api/youtube/watched', (req, res) => {
      try {
        const body = req.body || {};
        const action = String(body.action || '');
        const videoId = String(body.videoId || '');
        if (!VIDEO_ID_RE.test(videoId)) return res.status(400).json({ ok: false, error: 'bad_video' });
        const cfg = readCfg();
        const watched = { ...cfg.watched };
        if (action === 'add') {
          watched[videoId] = Date.now();
        } else if (action === 'remove') {
          delete watched[videoId];
        } else if (action === 'toggle') {
          if (watched[videoId]) delete watched[videoId]; else watched[videoId] = Date.now();
        } else {
          return res.status(400).json({ ok: false, error: 'bad_action' });
        }
        writeCfg({ ...cfg, watched });
        reload();
        res.json({ ok: true, watched: !!watched[videoId] });
      } catch (err) {
        res.status(500).json({ ok: false, error: 'watched_failed', message: err.message });
      }
    });

    // --- Watch-Later-Queue (dashboard-lokal) ---
    app.post('/api/youtube/watchlater', (req, res) => {
      try {
        const body = req.body || {};
        const action = String(body.action || '');
        const videoId = String(body.videoId || (body.video && body.video.videoId) || '');
        if (!VIDEO_ID_RE.test(videoId)) return res.status(400).json({ ok: false, error: 'bad_video' });
        const cfg = readCfg();
        let list = cfg.watchLater.slice();
        if (action === 'add') {
          if (!list.some((w) => w.videoId === videoId)) {
            const v = body.video || {};
            list.unshift({ videoId, title: String(v.title || '').slice(0, 200), channel: String(v.channel || '').slice(0, 120), channelId: CHANNEL_ID_RE.test(v.channelId) ? v.channelId : '', added: Date.now(), done: false });
          }
        } else if (action === 'remove') {
          list = list.filter((w) => w.videoId !== videoId);
        } else if (action === 'toggle') {
          list = list.map((w) => (w.videoId === videoId ? { ...w, done: !w.done } : w));
        } else {
          return res.status(400).json({ ok: false, error: 'bad_action' });
        }
        const clean = writeCfg({ ...cfg, watchLater: list });
        reload();
        res.json({ ok: true, watchLater: clean.watchLater });
      } catch (err) {
        res.status(500).json({ ok: false, error: 'watchlater_failed', message: err.message });
      }
    });

    // --- SponsorBlock-Segmente (öffentliche API, server-seitig geproxied) ---
    app.get('/api/youtube/sponsorblock', async (req, res) => {
      const videoId = String(req.query.videoId || '');
      if (!VIDEO_ID_RE.test(videoId)) return res.status(400).json({ ok: false, error: 'bad_video' });
      try {
        const cats = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro'];
        const qs = new URLSearchParams({ videoID: videoId });
        for (const c of cats) qs.append('category', c);
        const r = await fetch(`${SPONSORBLOCK_BASE}?${qs.toString()}`, {
          signal: AbortSignal.timeout(API_TIMEOUT_MS),
          headers: { 'User-Agent': UA, Accept: 'application/json' },
        });
        if (r.status === 404) return res.json({ ok: true, segments: [] });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const segments = (Array.isArray(data) ? data : []).map((s) => ({
          category: s.category, start: s.segment && s.segment[0], end: s.segment && s.segment[1],
        })).filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end));
        res.set('Cache-Control', 'public, max-age=3600');
        res.json({ ok: true, segments });
      } catch (err) {
        res.status(502).json({ ok: false, error: 'sponsorblock_failed', message: err.message });
      }
    });

    // --- Bild-Proxy: Video-Thumbnail aus der Id ---
    app.get('/api/youtube/thumb/:videoId', async (req, res) => {
      const videoId = String(req.params.videoId || '');
      if (!VIDEO_ID_RE.test(videoId)) return res.status(400).json({ ok: false, error: 'bad_id' });
      const cacheId = `t_${videoId}`;
      const hit = imgCacheGet(cacheId);
      if (hit) return sendImage(res, hit);
      // mqdefault existiert praktisch immer; hqdefault als Rückfall.
      for (const name of ['mqdefault.jpg', 'hqdefault.jpg']) {
        try {
          const img = await fetchImage(`https://i.ytimg.com/vi/${videoId}/${name}`);
          imgCachePut(cacheId, img);
          return sendImage(res, img);
        } catch { /* nächstes Format probieren */ }
      }
      res.status(404).json({ ok: false, error: 'unavailable' });
    });

    // --- Bild-Proxy: Avatare u. Ä. über Ref-Zuordnung ---
    app.get('/api/youtube/img/:ref', async (req, res) => {
      const ref = String(req.params.ref || '');
      if (!/^[a-f0-9]{16}$/.test(ref)) return res.status(400).json({ ok: false, error: 'bad_id' });
      const url = imgUrlFor(ref);
      if (!url) return res.status(404).json({ ok: false, error: 'unknown_image' });
      const hit = imgCacheGet(ref);
      if (hit) return sendImage(res, hit);
      try {
        const img = await fetchImage(url);
        imgCachePut(ref, img);
        sendImage(res, img);
      } catch (err) {
        res.status(404).json({ ok: false, error: 'unavailable', message: err.message });
      }
    });
  },

  // Export fuer Smoke-Tests; die Registry ignoriert unbekannte Felder.
  parseChannelFeed,
  iso8601ToSeconds,
  sanitizeCfg,
  passesFilters,
  POOL,
};
