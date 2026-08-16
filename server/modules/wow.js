'use strict';

/* ============================================================================
   WoW-Charaktere — Blizzard Battle.net API (World of Warcraft Profile-/Game-Data)
   ----------------------------------------------------------------------------
   Die Kachel zeigt eine vom Nutzer gepflegte Liste von WoW-Charakteren mit
   Avatar, Name in Klassenfarbe, Level/Spec und Item-Level. Ein Klick oeffnet
   ein Detailfenster (Render, Stammdaten, Ausruestung, Mythic+, Raids, Berufe),
   dessen Daten erst beim Oeffnen ueber /api/wow/detail geholt werden.

   Zwei Arten von Zustand, bewusst getrennt:
   - Zugangsdaten (Client-ID/Secret/Region) liegen in den Secrets. Ohne sie
     meldet configured() false — dann geht KEIN einziger Request nach draussen,
     auch nicht das Holen eines OAuth-Tokens.
   - Die Charakterliste ist KEIN Secret, sondern Inhalt. Sie liegt in
     config/wow.json (Muster wie config/news.json: mtime-Cache, atomarer Write
     ueber tmp+rename), damit sie im Browser verwaltet werden kann.

   Auth ist der OAuth-Client-Credentials-Flow: ein serverseitig gecachtes
   Bearer-Token, region-agnostisch bei oauth.battle.net geholt. Der Browser
   sieht weder Token noch Secret — er spricht ausschliesslich mit Dash#.

   Avatare/Renders holt der Server ueber einen Bild-Proxy (siehe unten), dessen
   Ziel-Host per exakter Gleichheit gegen die Blizzard-Render-Domains geprueft
   wird — kein freier URL-Parameter, kein Suffix-Trick (SSRF-Schutz).
   ============================================================================ */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'wow.json');

const UA = 'DashSharp/1.0 (+homelab dashboard; wow tile)';

const TOKEN_URL = 'https://oauth.battle.net/token';
const TOKEN_TIMEOUT_MS = 8000;
const API_TIMEOUT_MS = 8000;
const IMG_TIMEOUT_MS = 8000;
const IMG_MAX_BYTES = 4 * 1024 * 1024;

const LOCALE = 'de_DE';
const FETCH_CONCURRENCY = 4;   // wenige Charaktere, Blizzards Quota ist grosszuegig
const MAX_CHARACTERS = 30;
const NAME_MAX = 24;           // WoW-Namen sind kurz; grosszuegiger Deckel gegen Missbrauch
const REALMS_TTL_MS = 24 * 60 * 60 * 1000; // Realms aendern sich fast nie

// Erlaubte Regionen. Die CN-Region laeuft ueber eine eigene Gateway-Domain und
// ist hier bewusst nicht dabei.
const REGIONS = new Set(['eu', 'us', 'kr', 'tw']);

/* ---------- Klassenfarben (RAID_CLASS_COLORS, Klassen-ID -> Hex) ----------
   Die Farbe steht nicht in der API. Das Matching laeuft ueber die Klassen-ID,
   nicht ueber den lokalisierten Klassennamen (bei locale=de_DE z.B. „Paladin",
   „Todesritter"). Quelle: warcraft.wiki.gg „Class colors" (Stand ab Patch 10.x,
   inkl. Rufer/Evoker). */
const CLASS_COLORS = {
  1: '#C69B6D',  // Krieger
  2: '#F48CBA',  // Paladin
  3: '#AAD372',  // Jaeger
  4: '#FFF468',  // Schurke
  5: '#FFFFFF',  // Priester
  6: '#C41E3A',  // Todesritter
  7: '#0070DD',  // Schamane
  8: '#3FC7EB',  // Magier
  9: '#8788EE',  // Hexenmeister
  10: '#00FF98', // Moench
  11: '#FF7C0A', // Druide
  12: '#A330C9', // Daemonenjaeger
  13: '#33937F', // Rufer
};
function classColorById(id) {
  return CLASS_COLORS[Number(id)] || null;
}

/* ---------- Gegenstands-Qualitaetsfarben (quality.type -> Hex) ----------
   Fuer die Ausruestungsliste im Detailfenster. Standard-WoW-Qualitaetsfarben. */
const QUALITY_COLORS = {
  POOR: '#9d9d9d',
  COMMON: '#ffffff',
  UNCOMMON: '#1eff00',
  RARE: '#0070dd',
  EPIC: '#a335ee',
  LEGENDARY: '#ff8000',
  ARTIFACT: '#e6cc80',
  HEIRLOOM: '#00ccff',
};
function qualityColor(type) {
  return QUALITY_COLORS[String(type || '').toUpperCase()] || null;
}

/* ---------- Render-Host-Allowlist (Bild-Proxy) ----------
   Media-`value`-URLs kommen von den regionalen Static-Render-Domains; aeltere
   Antworten nutz(t)en zusaetzlich die region-lose Domain (Region steckt dann im
   Pfad). Geprueft wird per EXAKTER Gleichheit gegen diese Menge — bewusst kein
   endsWith/Suffix-Trick, sonst faenge „render.worldofwarcraft.com.evil.example"
   durch. */
const RENDER_HOSTS = new Set([
  'render.worldofwarcraft.com',
  'render-eu.worldofwarcraft.com',
  'render-us.worldofwarcraft.com',
  'render-kr.worldofwarcraft.com',
  'render-tw.worldofwarcraft.com',
]);

// Gibt die gepruefte Render-URL zurueck oder null. null bedeutet: kein Proxy-
// Eintrag, kein Abrufversuch. Nur https:, nur exakt erlaubte Hosts.
function allowedRenderUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (!RENDER_HOSTS.has(u.hostname)) return null;
  return u.toString();
}

/* ---------- kleine Helfer ---------- */

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

// Lokalisierte Felder kommen mit locale=de_DE als String zurueck; defensiv wird
// aber auch ein {name}-Objekt akzeptiert, falls ein Endpunkt es anders liefert.
function locName(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && typeof v.name === 'string') return v.name;
  return '';
}

// Realm-Slug: Blizzard-Slugs sind kleingeschrieben, nur a-z0-9 und Bindestrich.
function isRealmSlug(s) {
  return typeof s === 'string' && /^[a-z0-9-]+$/.test(s) && s.length <= 64;
}

// Charaktername: WoW-Namen sind ein einzelnes Wort aus (auch akzentuierten)
// Buchstaben. \p{L} deckt „Álaïs" ab, schliesst aber Slashes, Query-Zeichen,
// Whitespace und Steuerzeichen aus — damit kann kein Fremdwert roh in den
// API-Pfad geraten (zusaetzlich immer encodeURIComponent beim Bauen der URL).
function isCharName(s) {
  return typeof s === 'string' && new RegExp(`^\\p{L}{1,${NAME_MAX}}$`, 'u').test(s);
}

// Ein Charakter wird eindeutig ueber Realm-Slug + kleingeschriebenen Namen
// identifiziert (der API-Schluessel). Das ist zugleich der Kachel-`key`.
function keyOf(realmSlug, name) {
  return `${realmSlug}/${String(name).toLowerCase()}`;
}

/* ---------- Region & API-Pfade ---------- */

function regionOf(get) {
  const r = String(get('BLIZZARD_REGION') || '').trim().toLowerCase();
  return REGIONS.has(r) ? r : 'eu';
}

// Pfad zu einem Charakter-(Unter-)Endpunkt. `name` wird kleingeschrieben und
// URL-enkodiert; `slug` ist bereits per isRealmSlug() validiert.
function charPath(region, slug, name, sub) {
  const n = encodeURIComponent(String(name).toLowerCase());
  const tail = sub ? `/${sub}` : '';
  return `/profile/wow/character/${slug}/${n}${tail}`
    + `?namespace=profile-${region}&locale=${LOCALE}`;
}

/* ---------- OAuth-Token (Client-Credentials, serverseitig gecacht) ----------
   Token region-agnostisch bei oauth.battle.net holen: Form-Body
   grant_type=client_credentials, HTTP-Basic (ID:Secret). Antwort liefert
   access_token + expires_in (Sekunden, ~24 h). Im Speicher halten und mit
   Sicherheitspuffer vor Ablauf erneuern; bei einem 401 der API einmal
   erzwungen nachziehen. Kein Grund, das Token auf die Platte zu schreiben — ein
   Neustart holt sich ein frisches. Gecacht wird je Client-ID, damit ein
   Secret-Wechsel nicht mit einem alten Token weiterlaeuft. */

let _token = null; // { value, expires, id }

async function getToken(get, ctx, force = false) {
  const id = get('BLIZZARD_CLIENT_ID');
  const secret = get('BLIZZARD_CLIENT_SECRET');
  if (!force && _token && _token.id === id && Date.now() < _token.expires) return _token.value;

  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const data = await ctx.httpJson(TOKEN_URL, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
    },
    timeoutMs: TOKEN_TIMEOUT_MS,
  });
  if (!data || !data.access_token) throw new Error('kein Token von Battle.net erhalten');
  _token = {
    value: data.access_token,
    id,
    // 60 s Sicherheitsabstand, damit kein Abruf in den Ablauf hineinlaeuft.
    expires: Date.now() + Math.max(0, (Number(data.expires_in) || 86399) - 60) * 1000,
  };
  return _token.value;
}

// Ein GET gegen die regionale API mit Bearer-Token. Bei 401 (abgelaufenes/
// zurueckgezogenes Token) einmal mit erzwungener Erneuerung nachfassen.
async function apiGet(get, ctx, pathAndQuery) {
  const region = regionOf(get);
  const host = `https://${region}.api.blizzard.com`;
  const call = (token) => ctx.httpJson(`${host}${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA },
    timeoutMs: API_TIMEOUT_MS,
  });
  try {
    return await call(await getToken(get, ctx));
  } catch (err) {
    if (!/HTTP 401/.test(err.message || '')) throw err;
    return await call(await getToken(get, ctx, true));
  }
}

/* ---------- Konfiguration (config/wow.json) ----------
   { "characters": [ { "realm": "<slug>", "name": "<Name>" } ] }
   mtime-Cache wie news.js: bei jedem Abruf gelesen, aber nur bei echter
   Aenderung neu geparst. */

let _cfg = { characters: [] };
let _cfgMtime = -1;

function readCfg() {
  let mtime = 0;
  try { mtime = fs.statSync(CONFIG_PATH).mtimeMs; }
  catch { mtime = 0; }
  if (mtime === _cfgMtime) return _cfg;
  _cfgMtime = mtime;
  if (!mtime) { _cfg = { characters: [] }; return _cfg; }
  try { _cfg = sanitizeCfg(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (err) {
    console.error('[wow] config/wow.json ist unlesbar:', err.message);
    _cfg = { characters: [] };
  }
  return _cfg;
}

function writeCfg(cfg) {
  const clean = sanitizeCfg(cfg);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, CONFIG_PATH); // atomar: kein halb geschriebener Stand
  _cfgMtime = -1; // naechster readCfg() liest frisch
  return clean;
}

// Nur sanierte {realm,name}-Paare, dedupliziert ueber den Schluessel, hart auf
// MAX_CHARACTERS gedeckelt. Alles Ungueltige faellt still heraus.
function sanitizeCfg(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const list = Array.isArray(obj.characters) ? obj.characters : [];
  const out = [];
  const seen = new Set();
  for (const entry of list) {
    const c = sanitizeChar(entry);
    if (!c) continue;
    const k = keyOf(c.realm, c.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
    if (out.length >= MAX_CHARACTERS) break;
  }
  return { characters: out };
}

function sanitizeChar(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const realm = String(raw.realm || '').trim().toLowerCase();
  const name = String(raw.name || '').trim();
  if (!isRealmSlug(realm) || !isCharName(name)) return null;
  return { realm, name };
}

/* ---------- Bild-Proxy ----------
   Der Client bekommt nie die Original-URL, sondern nur /api/wow/image/<id>. Die
   Zuordnung id -> URL entsteht ausschliesslich aus den zuvor selbst geholten
   Blizzard-Media-Daten (Muster news.js `imageRef`). Es gibt keinen Parameter,
   ueber den sich ein fremdes Ziel unterschieben liesse. Registriert werden nur
   Render-URLs, die allowedRenderUrl() passieren; beim Ausliefern wird der Host
   ein zweites Mal geprueft (Defense in Depth).

   Anders als news.js rotiert hier keine Generation: Detail-Bilder entstehen
   ausserhalb von fetch() (nur beim Klick), duerften also nicht beim naechsten
   Kachel-Tick verschwinden. Stattdessen eine nach Anzahl gedeckelte Map mit
   LRU-Verdraengung — bei einer Handvoll Charakteren reicht das mit grossem
   Abstand fuer alle Avatare und offenen Detailfenster. */

const IMG_REF_MAX = 800;
const _imgRefs = new Map(); // id -> url

function imageRef(rawUrl) {
  const url = allowedRenderUrl(rawUrl);
  if (!url) return null;
  const id = sha1(url).slice(0, 16);
  if (_imgRefs.has(id)) _imgRefs.delete(id);
  _imgRefs.set(id, url); // ans Ende: zuletzt benutzt
  while (_imgRefs.size > IMG_REF_MAX) {
    const oldest = _imgRefs.keys().next().value;
    if (oldest === undefined) break;
    _imgRefs.delete(oldest);
  }
  return `/api/wow/image/${id}`;
}

/* Content-Type wird nicht von der Gegenstelle uebernommen, sondern am
   Dateianfang selbst bestimmt. SVG wird bewusst NICHT ausgeliefert (kaeme
   same-origin zurueck und koennte Skript ausfuehren). */
function imageTypeOf(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}

// Nicht res.arrayBuffer(): der laedt erst alles und deckelt dann. Hier bricht
// der Abruf ab, sobald der Deckel gerissen ist.
async function readCapped(res, maxBytes) {
  if (Number(res.headers.get('content-length') || 0) > maxBytes) throw new Error('zu gross');
  if (!res.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('zu gross');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

// Bilder liegen hinter einer festen Render-Id, deshalb ein reiner Byte-Deckel
// per LRU ohne Ablaufzeit.
const IMG_CACHE_MAX = 60;
const IMG_CACHE_BYTES = 24 * 1024 * 1024;
const _imgCache = new Map();
let _imgCacheBytes = 0;
function imgCacheGet(id) {
  const hit = _imgCache.get(id);
  if (!hit) return null;
  _imgCache.delete(id);
  _imgCache.set(id, hit);
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

async function fetchImage(url) {
  // Keine Weiterleitung: das Ziel waere nicht mehr von der Allowlist gedeckt.
  const res = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(IMG_TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: 'image/*' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await readCapped(res, IMG_MAX_BYTES);
  const type = imageTypeOf(buf);
  if (!type) throw new Error('kein Bild');
  return { type, buf };
}

/* ---------- Media-Assets ---------- */

// Media-Antwort hat ein Array assets[] mit { key, value }. Kleiner Zugriff auf
// eine bestimmte Aufloesung.
function assetUrl(media, key) {
  const assets = media && Array.isArray(media.assets) ? media.assets : [];
  const hit = assets.find((a) => a && a.key === key && a.value);
  return hit ? hit.value : '';
}

// Avatar fuer die Kachelzeile; grosser Render fuers Detailfenster mit
// Fallback-Kette main-raw -> main -> avatar.
function avatarFrom(media) {
  return imageRef(assetUrl(media, 'avatar'));
}
function renderFrom(media) {
  return imageRef(assetUrl(media, 'main-raw'))
    || imageRef(assetUrl(media, 'main'))
    || imageRef(assetUrl(media, 'avatar'));
}

/* ---------- parallele Abarbeitung mit Limit (Muster news.js) ---------- */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/* ---------- Normalisierung Kachel-Zeile ----------
   Summary + Media zu genau der schlanken Form aus der Spec verdichten. Die
   Kachel kennt die Blizzard-Struktur nicht. */
function normalizeCharacter(realm, storedName, summary, media) {
  const cls = summary.character_class || {};
  return {
    key: keyOf(realm, summary.name || storedName),
    realm: locName(summary.realm && summary.realm.name) || realm,
    realmSlug: (summary.realm && summary.realm.slug) || realm,
    name: summary.name || storedName,
    level: Number.isFinite(Number(summary.level)) ? Number(summary.level) : null,
    className: locName(cls.name) || null,
    classColor: classColorById(cls.id),
    spec: locName(summary.active_spec && summary.active_spec.name) || null,
    race: locName(summary.race && summary.race.name) || null,
    faction: (summary.faction && summary.faction.type) || null,
    guild: locName(summary.guild && summary.guild.name) || null,
    ilvlEquipped: Number.isFinite(Number(summary.equipped_item_level))
      ? Number(summary.equipped_item_level) : null,
    avatarUrl: avatarFrom(media),
    ok: true,
  };
}

/* ---------- Detail-Normalisierung (nur beim Klick) ---------- */

function normalizeStammdaten(realm, storedName, summary) {
  const cls = summary.character_class || {};
  return {
    name: summary.name || storedName,
    level: Number.isFinite(Number(summary.level)) ? Number(summary.level) : null,
    race: locName(summary.race && summary.race.name) || null,
    className: locName(cls.name) || null,
    classColor: classColorById(cls.id),
    spec: locName(summary.active_spec && summary.active_spec.name) || null,
    faction: (summary.faction && summary.faction.type) || null,
    guild: locName(summary.guild && summary.guild.name) || null,
    title: (summary.active_title && summary.active_title.display_string) || null,
    realm: locName(summary.realm && summary.realm.name) || realm,
    realmSlug: (summary.realm && summary.realm.slug) || realm,
    lastLogin: Number.isFinite(Number(summary.last_login_timestamp))
      ? Number(summary.last_login_timestamp) : null,
    ilvlEquipped: Number.isFinite(Number(summary.equipped_item_level))
      ? Number(summary.equipped_item_level) : null,
    ilvlAverage: Number.isFinite(Number(summary.average_item_level))
      ? Number(summary.average_item_level) : null,
  };
}

function normalizeEquipment(data) {
  const items = data && Array.isArray(data.equipped_items) ? data.equipped_items : [];
  return items.map((it) => ({
    slot: locName(it.slot && it.slot.name) || (it.slot && it.slot.type) || '',
    name: it.name || '',
    ilvl: it.level && Number.isFinite(Number(it.level.value)) ? Number(it.level.value) : null,
    quality: (it.quality && it.quality.type) || '',
    qualityColor: qualityColor(it.quality && it.quality.type),
  })).filter((x) => x.name);
}

function normalizeMythic(data) {
  const r = data && data.current_mythic_rating;
  const rating = r && Number.isFinite(Number(r.rating)) ? Math.round(Number(r.rating) * 10) / 10 : null;
  return { rating };
}

/* Raids: Baum expansions[] -> instances[] -> modes[]. „Aktueller Raid" = die
   Instanzen der neuesten Erweiterung; die API liefert expansions[] chronologisch,
   das letzte Element ist die aktuelle. (Auswahl-Heuristik laut Spec offen —
   letztes Element ist der robuste, wartungsarme Weg.) */
function normalizeRaids(data) {
  const expansions = data && Array.isArray(data.expansions) ? data.expansions : [];
  if (!expansions.length) return { expansion: null, instances: [] };
  const latest = expansions[expansions.length - 1];
  const instances = Array.isArray(latest.instances) ? latest.instances : [];
  return {
    expansion: locName(latest.expansion && latest.expansion.name) || null,
    instances: instances.map((inst) => ({
      name: locName(inst.instance && inst.instance.name) || '',
      modes: (Array.isArray(inst.modes) ? inst.modes : []).map((m) => ({
        difficulty: locName(m.difficulty && m.difficulty.name)
          || (m.difficulty && m.difficulty.type) || '',
        completed: m.progress && Number.isFinite(Number(m.progress.completed_count))
          ? Number(m.progress.completed_count) : 0,
        total: m.progress && Number.isFinite(Number(m.progress.total_count))
          ? Number(m.progress.total_count) : 0,
        status: (m.status && m.status.type) || '',
      })),
    })).filter((i) => i.name),
  };
}

function normalizeProfList(arr) {
  return (Array.isArray(arr) ? arr : []).map((p) => {
    const tiers = Array.isArray(p.tiers) ? p.tiers : [];
    const t = tiers[tiers.length - 1]; // aktuellste Ausbaustufe
    return {
      name: locName(p.profession && p.profession.name) || '',
      tier: t ? (locName(t.tier && t.tier.name) || null) : null,
      skill: t && Number.isFinite(Number(t.skill_points)) ? Number(t.skill_points) : null,
      max: t && Number.isFinite(Number(t.max_skill_points)) ? Number(t.max_skill_points) : null,
    };
  }).filter((x) => x.name);
}

function normalizeProfessions(data) {
  return {
    primaries: normalizeProfList(data && data.primaries),
    secondaries: normalizeProfList(data && data.secondaries),
  };
}

/* ---------- Realm-Index (fuer das Dropdown), lang gecacht ---------- */

let _realms = null; // { ts, list }

async function getRealms(get, ctx) {
  if (_realms && Date.now() - _realms.ts < REALMS_TTL_MS) return _realms.list;
  const region = regionOf(get);
  const data = await apiGet(get, ctx,
    `/data/wow/realm/index?namespace=dynamic-${region}&locale=${LOCALE}`);
  const raw = data && Array.isArray(data.realms) ? data.realms : [];
  const list = raw
    .map((r) => ({ slug: r && r.slug, name: locName(r && r.name) }))
    .filter((r) => isRealmSlug(r.slug) && r.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  _realms = { ts: Date.now(), list };
  return list;
}

/* ---------- Ein Charakter fuer die Kachel (tolerant) ----------
   Summary + Media parallel. Schlaegt einer der beiden Calls fehl, faellt genau
   dieser Charakter als { ok:false, error:'unavailable' } zurueck — die uebrigen
   Zeilen bleiben unberuehrt. */
async function fetchTileCharacter(get, ctx, region, c) {
  try {
    const [summary, media] = await Promise.all([
      apiGet(get, ctx, charPath(region, c.realm, c.name)),
      apiGet(get, ctx, charPath(region, c.realm, c.name, 'character-media')),
    ]);
    return normalizeCharacter(c.realm, c.name, summary, media);
  } catch (err) {
    ctx.warn(`${keyOf(c.realm, c.name)}: ${err.message}`);
    return { key: keyOf(c.realm, c.name), realm: c.realm, name: c.name, ok: false, error: 'unavailable' };
  }
}

/* ============================================================================
   DAS MODUL
   ============================================================================ */

module.exports = {
  id: 'wow',
  label: 'WoW-Charaktere',
  ttl: 600000, // 10 min; frischer Abruf zusaetzlich bei Kachel-Aktivierung (refresh)

  secrets: [
    { key: 'BLIZZARD_CLIENT_ID', label: 'Battle.net Client-ID' },
    { key: 'BLIZZARD_CLIENT_SECRET', label: 'Battle.net Client-Secret', masked: true },
    { key: 'BLIZZARD_REGION', label: 'Region (optional, Default eu)' },
  ],

  // Wahr, wenn ID UND Secret gesetzt sind. Solange nicht, wird fetch() nie
  // gerufen: kein Fremd-Request, insbesondere kein Token-Holen.
  configured: (get) => !!(get('BLIZZARD_CLIENT_ID') && get('BLIZZARD_CLIENT_SECRET')),
  notConfigured: { ok: false, error: 'not_configured', characters: [] },
  errorFields: { characters: [] },

  async fetch(get, ctx) {
    const chars = readCfg().characters;
    // Leere Liste ist ein gueltiger Zustand: die Kachel zeigt „noch keine
    // Charaktere" statt eines Fehlers.
    if (!chars.length) return { ok: true, characters: [] };

    const region = regionOf(get);
    const characters = await mapLimit(chars, FETCH_CONCURRENCY,
      (c) => fetchTileCharacter(get, ctx, region, c));

    return { ok: true, fetchedAt: Date.now(), characters };
  },

  routes(app, { get, ctx, invalidate, refresh }) {
    /* --- Realm-Index fuers Dropdown --- */
    app.get('/api/wow/realms', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      try {
        const realms = await getRealms(get, ctx);
        res.json({ ok: true, realms });
      } catch (err) {
        res.status(502).json({ ok: false, error: 'realms_failed', message: err.message });
      }
    });

    /* --- gespeicherte Charakterliste --- */
    app.get('/api/wow/config', (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, characters: readCfg().characters });
    });

    /* --- Liste ersetzen (nur sanierte {realm,name}) --- */
    app.post('/api/wow/config', (req, res) => {
      try {
        const clean = writeCfg(req.body || {});
        invalidate();
        // Sofort neu holen und pushen statt bis zum naechsten Hub-Tick (10 min)
        // zu warten — sonst zeigen andere Tabs die alte Liste.
        refresh().catch(() => { /* Fehler landen in der naechsten Antwort */ });
        res.json({ ok: true, characters: clean.characters });
      } catch (err) {
        console.error('[wow] Konfiguration konnte nicht gespeichert werden:', err.message);
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    /* --- Charakter pruefen & hinzufuegen ---
       Erst gegen Blizzard verifizieren (Summary abrufen), dann speichern. Ein
       nicht existierender Charakter landet nie in der Liste. */
    app.post('/api/wow/add', async (req, res) => {
      const c = sanitizeChar(req.body || {});
      if (!c) return res.status(400).json({ ok: false, error: 'bad_input' });

      const region = regionOf(get);
      let summary;
      try {
        summary = await apiGet(get, ctx, charPath(region, c.realm, c.name));
      } catch (err) {
        if (/HTTP 404/.test(err.message || '')) {
          return res.status(404).json({ ok: false, error: 'not_found' });
        }
        return res.status(502).json({ ok: false, error: 'verify_failed', message: err.message });
      }
      if (!summary || !summary.name) {
        return res.status(404).json({ ok: false, error: 'not_found' });
      }

      const cfg = readCfg();
      const key = keyOf(c.realm, c.name);
      if (cfg.characters.some((x) => keyOf(x.realm, x.name) === key)) {
        return res.json({ ok: true, characters: cfg.characters, already: true });
      }
      if (cfg.characters.length >= MAX_CHARACTERS) {
        return res.status(400).json({ ok: false, error: 'too_many' });
      }
      const clean = writeCfg({ characters: cfg.characters.concat([c]) });
      invalidate();
      refresh().catch(() => {});
      res.json({ ok: true, characters: clean.characters });
    });

    /* --- Charakter entfernen ({key} oder {realm,name}) --- */
    app.post('/api/wow/remove', (req, res) => {
      const body = req.body || {};
      let key = null;
      if (typeof body.key === 'string' && body.key) {
        key = body.key;
      } else {
        const c = sanitizeChar(body);
        if (c) key = keyOf(c.realm, c.name);
      }
      if (!key) return res.status(400).json({ ok: false, error: 'bad_input' });

      const cfg = readCfg();
      const next = cfg.characters.filter((x) => keyOf(x.realm, x.name) !== key);
      const clean = writeCfg({ characters: next });
      invalidate();
      refresh().catch(() => {});
      res.json({ ok: true, characters: clean.characters });
    });

    /* --- Detaildaten fuer EINEN Charakter (nur beim Oeffnen des Fensters) ---
       Media + Equipment + Mythic+ + Raids + Berufe parallel. Jeder Teil ist
       tolerant: faellt einer aus, bleibt sein Block null, der Rest steht. */
    app.get('/api/wow/detail', async (req, res) => {
      const realm = String(req.query.realm || '').trim().toLowerCase();
      const name = String(req.query.name || '').trim();
      if (!isRealmSlug(realm) || !isCharName(name)) {
        return res.status(400).json({ ok: false, error: 'bad_input' });
      }

      const region = regionOf(get);
      // Summary muss stehen (sonst gibt es den Charakter nicht); die uebrigen
      // Bloecke sind optional und werden per allSettled eingesammelt.
      let summary;
      try {
        summary = await apiGet(get, ctx, charPath(region, realm, name));
      } catch (err) {
        if (/HTTP 404/.test(err.message || '')) {
          return res.status(404).json({ ok: false, error: 'not_found' });
        }
        return res.status(502).json({ ok: false, error: 'detail_failed', message: err.message });
      }

      const [media, equipment, mythic, raids, professions] = await Promise.allSettled([
        apiGet(get, ctx, charPath(region, realm, name, 'character-media')),
        apiGet(get, ctx, charPath(region, realm, name, 'equipment')),
        apiGet(get, ctx, charPath(region, realm, name, 'mythic-keystone-profile')),
        apiGet(get, ctx, charPath(region, realm, name, 'encounters/raids')),
        apiGet(get, ctx, charPath(region, realm, name, 'professions')),
      ]);
      const val = (r) => (r.status === 'fulfilled' ? r.value : null);
      const mediaData = val(media);

      res.set('Cache-Control', 'no-store');
      res.json({
        ok: true,
        character: {
          key: keyOf(realm, summary.name || name),
          renderUrl: mediaData ? renderFrom(mediaData) : null,
          avatarUrl: mediaData ? avatarFrom(mediaData) : null,
          stammdaten: normalizeStammdaten(realm, name, summary),
          equipment: normalizeEquipment(val(equipment)),
          mythic: normalizeMythic(val(mythic)),
          raids: normalizeRaids(val(raids)),
          professions: normalizeProfessions(val(professions)),
        },
      });
    });

    /* --- Bild-Proxy --- */
    app.get('/api/wow/image/:id', async (req, res) => {
      const id = String(req.params.id || '');
      if (!/^[a-f0-9]{16}$/.test(id)) return res.status(400).json({ ok: false, error: 'bad_id' });
      const url = _imgRefs.get(id);
      if (!url) return res.status(404).json({ ok: false, error: 'unknown_image' });
      // Zweite Pruefung des Hosts (Defense in Depth) — nur Render-Domains.
      if (!allowedRenderUrl(url)) return res.status(404).json({ ok: false, error: 'unknown_image' });

      const send = (img) => {
        res.set('Content-Type', img.type);
        res.set('Cache-Control', 'public, max-age=3600');
        res.set('X-Content-Type-Options', 'nosniff');
        res.end(img.buf);
      };
      const hit = imgCacheGet(id);
      if (hit) return send(hit);

      try {
        const img = await fetchImage(url);
        imgCachePut(id, img);
        send(img);
      } catch (err) {
        // Die Kachel blendet fehlgeschlagene Bilder aus (img.onerror) — 404 ist
        // hier der ruhige Weg, kein 500.
        res.status(404).json({ ok: false, error: 'unavailable', message: err.message });
      }
    });
  },
};
