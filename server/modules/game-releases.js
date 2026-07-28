'use strict';

/* ============================================================
   Game Releases — Spiele-Neuerscheinungen (IGDB)
   ------------------------------------------------------------
   Zeigt die Releases eines Tages. Quelle ist IGDB (Twitch), weil
   RAWG.io fuer den laufenden Tag praktisch nichts liefert: ueber
   42 Tage gemessen 0-3 Eintraege taeglich gegenueber 54 bei IGDB.

   Zugang laeuft ueber eine Twitch-App (Client-ID + Secret) und
   ein Client-Credentials-Token, das ~56 Tage gilt. Ohne beide
   Werte meldet configured() false — dann geht kein einziger
   Request nach draussen.

   Deutsche Beschreibungen holt der Server in dieser Reihenfolge:
   Steam-Store (l=german) ueber die AppID aus external_games,
   sonst deutsche Wikipedia, sonst bleibt der englische
   IGDB-Text stehen und wird als solcher markiert. Metadaten
   (Genres, Plattformen, Spielmodi, Altersfreigaben) uebersetzen
   die Tabellen weiter unten.

   Bilder laufen ueber den Proxy am Ende der Datei, damit der
   Browser weiterhin ausschliesslich mit dem Dashboard spricht.

   ACHTUNG bei Aenderungen an den Abfragen: IGDB hat Felder
   umbenannt (category -> date_format, region -> release_region,
   age_ratings.category -> rating_category + organization,
   websites.category -> websites.type). Die alten Namen werfen
   keinen Fehler, sie liefern still null.
   ============================================================ */

const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_URL = 'https://api.igdb.com/v4';
const IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload';
const STEAM_URL = 'https://store.steampowered.com/api/appdetails';
const WIKI_URL = 'https://de.wikipedia.org/api/rest_v1/page/summary';

const UA = 'DashSharp/1.0 (+homelab dashboard)';

const IGDB_TIMEOUT_MS = 10000;
const DESC_TIMEOUT_MS = 8000;
const IMG_TIMEOUT_MS = 8000;
const IMG_MAX_BYTES = 3 * 1024 * 1024;

// IGDB erlaubt 4 Anfragen pro Sekunde. 260 ms Abstand laesst Luft.
const MIN_REQUEST_GAP_MS = 260;

// Ein Tag hat gemessen ~55 Termine; 400 faengt auch Ausreisser ab.
const DAY_LIMIT = 400;
const SEARCH_LIMIT = 8;
const UPCOMING_LIMIT = 12;
const SUMMARY_CHARS = 600;

// Das Dashboard steht in Deutschland — der "heutige Tag" ist der hiesige.
const TIMEZONE = 'Europe/Berlin';

/* ---------- Was als eigenstaendiges Release zaehlt ----------
   0 Main Game, 4 Standalone Expansion, 8 Remake, 9 Remaster,
   10 Expanded Game, 11 Port. Bewusst NICHT dabei: DLC (1),
   Expansion (2), Bundle (3), Mod (5), Episode (6), Season (7),
   Pack (13), Update (14) — das sind keine Neuerscheinungen.

   Der Filter kostete beim Bauen einen Anlauf: mit `game_type = 0`
   fehlten "Halo: Campaign Evolved" (Remake) und "Gothic Classic"
   (Port), also ausgerechnet die beiden Titel des Testtags. */
const GAME_TYPES = [0, 4, 8, 9, 10, 11];

/* In der Tagesliste kommen nur die Typen aus GAME_TYPES vor. DLC, Erweiterung,
   Episode und Season stehen trotzdem hier, weil die Lupe sie mitliefert — dann
   soll das Ergebnis auch sagen, was es ist. */
const GAME_TYPE_DE = {
  1: 'DLC',
  2: 'Erweiterung',
  4: 'Standalone-Addon',
  6: 'Episode',
  7: 'Season',
  8: 'Remake',
  9: 'Remaster',
  10: 'Erweiterte Fassung',
  11: 'Portierung',
};

// release_dates.status — nur die Faelle, die auf einer Kachel etwas aussagen.
const STATUS_DE = {
  1: 'Alpha',
  2: 'Beta',
  3: 'Early Access',
  5: 'Abgesagt',
  34: 'Vorabzugang',
};

/* ---------- Uebersetzungstabellen ----------
   Schluessel sind IGDB-Ids, nicht Namen: Ids sind stabil, Namen
   nicht. Faellt eine Id durch, bleibt der englische Originalname
   stehen — lieber englisch als leer. */

const GENRES_DE = {
  2: 'Point-and-Click',
  4: 'Kampfspiel',
  5: 'Shooter',
  7: 'Musik',
  8: 'Jump ’n’ Run',
  9: 'Rätsel',
  10: 'Rennspiel',
  11: 'Echtzeit-Strategie',
  12: 'Rollenspiel',
  13: 'Simulation',
  14: 'Sport',
  15: 'Strategie',
  16: 'Rundenstrategie',
  24: 'Taktik',
  25: 'Hack & Slash',
  26: 'Quiz',
  30: 'Flipper',
  31: 'Adventure',
  32: 'Indie',
  33: 'Arcade',
  34: 'Visual Novel',
  35: 'Karten- & Brettspiel',
  36: 'MOBA',
};

// Plattformen: kurzes Label fuer die Chips + Familie fuer den Filter.
// Abgedeckt ist, was in 28 Tagen tatsaechlich vorkam, plus die
// naheliegenden Nachbarn.
const PLATFORMS = {
  6:   { label: 'PC',          family: 'pc' },
  3:   { label: 'Linux',       family: 'pc' },
  14:  { label: 'Mac',         family: 'pc' },
  163: { label: 'SteamVR',     family: 'pc' },
  130: { label: 'Switch',      family: 'nintendo' },
  508: { label: 'Switch 2',    family: 'nintendo' },
  167: { label: 'PS5',         family: 'playstation' },
  48:  { label: 'PS4',         family: 'playstation' },
  390: { label: 'PS VR2',      family: 'playstation' },
  165: { label: 'PS VR',       family: 'playstation' },
  169: { label: 'Xbox Series', family: 'xbox' },
  49:  { label: 'Xbox One',    family: 'xbox' },
  34:  { label: 'Android',     family: 'mobile' },
  39:  { label: 'iOS',         family: 'mobile' },
  472: { label: 'visionOS',    family: 'mobile' },
  82:  { label: 'Browser',     family: 'browser' },
  386: { label: 'Quest 2',     family: 'vr' },
  471: { label: 'Quest 3',     family: 'vr' },
  52:  { label: 'Arcade',      family: 'other' },
  381: { label: 'Playdate',    family: 'other' },
};

const GAME_MODES_DE = {
  1: 'Einzelspieler',
  2: 'Mehrspieler',
  3: 'Koop',
  4: 'Splitscreen',
  5: 'MMO',
  6: 'Battle Royale',
};

const PERSPECTIVES_DE = {
  1: 'Ego-Perspektive',
  2: 'Third Person',
  3: 'Iso-/Vogelperspektive',
  4: 'Seitenansicht',
  5: 'Text',
  6: 'Audio',
  7: 'Virtual Reality',
};

/* Altersfreigaben: age_ratings.organization + age_ratings.rating_category.
   USK ist Organisation 4 — fuer ein deutsches Dashboard die
   interessanteste, deshalb steht sie vor PEGI. */
const AGE_ORGS = { 1: 'ESRB', 2: 'PEGI', 3: 'CERO', 4: 'USK', 5: 'GRAC', 6: 'CLASS_IND', 7: 'ACB' };
const AGE_ORG_ORDER = [4, 2, 1, 3, 5, 6, 7];
const AGE_CATEGORIES = {
  1: 'RP', 2: 'EC', 3: 'E', 4: 'E10+', 5: 'T', 6: 'M', 7: 'AO',
  8: '3', 9: '7', 10: '12', 11: '16', 12: '18',
  13: 'A', 14: 'B', 15: 'C', 16: 'D', 17: 'Z',
  18: '0', 19: '6', 20: '12', 21: '16', 22: '18',
  23: 'ALL', 24: '12+', 25: '15+', 26: '19+', 27: 'TESTING', 40: '18+',
  28: 'L', 29: '10', 30: '12', 31: '14', 32: '16', 33: '18',
  34: 'G', 35: 'PG', 36: 'M', 37: 'MA 15+', 38: 'R 18+', 39: 'RC',
};

// websites.type -> Store-Label. Nur Kaufquellen und die offizielle Seite;
// Social-Media-Links haben auf der Kachel nichts verloren.
const WEBSITE_DE = {
  1: 'Website',
  13: 'Steam',
  15: 'itch.io',
  16: 'Epic Games',
  17: 'GOG',
  22: 'Xbox',
  23: 'PlayStation',
  24: 'Nintendo',
};

// external_games.external_game_source
const SOURCE_STEAM = 1;

/* ---------- Token ----------
   Client-Credentials-Token, gemessen ~56 Tage gueltig. Im Speicher
   halten und nur erneuern, wenn er ablaeuft oder IGDB 401 meldet;
   ein Neustart holt sich ohnehin einen frischen. */

let _token = null; // { value, expires }

async function getToken(get, ctx, force = false) {
  if (!force && _token && Date.now() < _token.expires) return _token.value;
  const id = get('IGDB_CLIENT_ID');
  const secret = get('IGDB_CLIENT_SECRET');
  const url = `${TOKEN_URL}?client_id=${encodeURIComponent(id)}`
    + `&client_secret=${encodeURIComponent(secret)}`
    + '&grant_type=client_credentials';
  const data = await ctx.httpJson(url, { method: 'POST', timeoutMs: IGDB_TIMEOUT_MS });
  if (!data || !data.access_token) throw new Error('kein Token von Twitch erhalten');
  _token = {
    value: data.access_token,
    // 60 s Sicherheitsabstand, damit kein Abruf in den Ablauf hineinlaeuft.
    expires: Date.now() + Math.max(0, (Number(data.expires_in) || 3600) - 60) * 1000,
  };
  return _token.value;
}

/* ---------- Abfrage ----------
   IGDB deckelt bei 4 Anfragen/Sekunde und antwortet sonst mit 429.
   Eine serielle Kette mit Mindestabstand ist hier genug: die Kachel
   feuert nie mehr als eine Handvoll Abfragen auf einmal. */

let _queue = Promise.resolve();
let _lastCall = 0;

function throttled(fn) {
  const run = _queue.then(async () => {
    const wait = MIN_REQUEST_GAP_MS - (Date.now() - _lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _lastCall = Date.now();
    return fn();
  });
  // Die Kette darf nicht an einem Fehler haengenbleiben.
  _queue = run.then(() => {}, () => {});
  return run;
}

async function igdb(get, ctx, endpoint, query) {
  const call = async (token) => ctx.httpJson(`${IGDB_URL}/${endpoint}`, {
    method: 'POST',
    body: query,
    timeoutMs: IGDB_TIMEOUT_MS,
    headers: {
      'Client-ID': get('IGDB_CLIENT_ID'),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
      'User-Agent': UA,
    },
  });
  return throttled(async () => {
    try {
      return await call(await getToken(get, ctx));
    } catch (err) {
      // Ein abgelaufener oder zurueckgezogener Token faellt nur hier auf.
      if (!/HTTP 401/.test(err.message)) throw err;
      return call(await getToken(get, ctx, true));
    }
  });
}

/* ---------- Datum ----------
   IGDB legt `date` auf 00:00 UTC des Kalendertags. Der Nutzer meint
   aber den hiesigen Kalendertag, deshalb wird der erst in
   Europe/Berlin bestimmt und dann als UTC-Mitternacht gerechnet —
   sonst zeigt die Kachel abends schon den Folgetag. */

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function isValidIso(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  // Faengt den 31.02. ab: Date normalisiert still auf den 03.03.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function dayBounds(iso) {
  const start = Date.parse(`${iso}T00:00:00Z`) / 1000;
  return { start, end: start + 86400 };
}

function isoOf(unixSeconds) {
  return Number.isFinite(unixSeconds)
    ? new Date(unixSeconds * 1000).toISOString().slice(0, 10)
    : null;
}

/* ---------- Apicalypse ----------
   Alles, was aus einem Request stammt, geht nur ueber diese beiden
   Funktionen in eine Query. */

function quote(s) {
  // Anfuehrungszeichen und Backslash entwerten, Steuerzeichen raus.
  return String(s).replace(/[\\"]/g, '\\$&').replace(/[\u0000-\u001f]/g, ' ');
}

function toId(v) {
  const n = Number(String(v));
  return Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER ? n : null;
}

/* ---------- Felder ---------- */

const LIST_FIELDS = [
  'date', 'release_region', 'status',
  'platform.id', 'platform.name', 'platform.abbreviation',
  'game.id', 'game.name', 'game.slug', 'game.summary', 'game.hypes',
  'game.total_rating', 'game.total_rating_count', 'game.aggregated_rating',
  'game.game_type', 'game.cover.image_id', 'game.genres.id', 'game.genres.name',
  // Fuer die deutschen Kurztexte der obersten Karten (siehe translateTop).
  'game.external_games.uid', 'game.external_games.external_game_source',
].join(', ');

const DETAIL_FIELDS = [
  'id', 'name', 'slug', 'summary', 'storyline', 'url', 'game_type',
  'first_release_date', 'hypes',
  'total_rating', 'total_rating_count', 'aggregated_rating', 'aggregated_rating_count',
  'cover.image_id', 'artworks.image_id', 'screenshots.image_id',
  'genres.id', 'genres.name', 'themes.name',
  'game_modes.id', 'game_modes.name',
  'player_perspectives.id', 'player_perspectives.name',
  'game_engines.name',
  'involved_companies.company.name', 'involved_companies.developer',
  'involved_companies.publisher',
  'age_ratings.organization', 'age_ratings.rating_category',
  'websites.url', 'websites.type',
  'external_games.uid', 'external_games.external_game_source',
  'release_dates.date', 'release_dates.status',
  'release_dates.platform.id', 'release_dates.platform.name',
  'release_dates.platform.abbreviation',
].join(', ');

/* ---------- Normalisieren ---------- */

function imageUrl(imageId, size) {
  return imageId ? proxyUrl(`${IMAGE_BASE}/${size}/${imageId}.jpg`) : null;
}

function platformOf(p) {
  if (!p || !p.id) return null;
  const known = PLATFORMS[p.id];
  return {
    id: p.id,
    label: known ? known.label : (p.abbreviation || p.name || '?'),
    family: known ? known.family : 'other',
  };
}

function genresOf(game) {
  return (game.genres || []).map((g) => GENRES_DE[g.id] || g.name).filter(Boolean);
}

function clip(text, max = SUMMARY_CHARS) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function ratingOf(game) {
  const n = Number(game.total_rating);
  // Unter drei Stimmen ist der Wert Rauschen, nicht Bewertung.
  return Number.isFinite(n) && (game.total_rating_count || 0) >= 3 ? Math.round(n) : null;
}

function criticOf(game) {
  const n = Number(game.aggregated_rating);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* Mehrere Termine desselben Spiels am selben Tag (PC + PS5 + Switch)
   werden zu einem Eintrag zusammengefasst; die Plattformen landen als
   Chips in der Meta-Zeile.

   Region wird bewusst NICHT in der Query gefiltert: gemessen sind
   praktisch alle Termine `8` (weltweit), ein Filter wuerde nur die
   seltenen regionalen Eintraege verlieren. Stattdessen gewinnt beim
   Zusammenfassen Europa (1) bzw. weltweit (8). */
const REGION_RANK = { 1: 0, 8: 1 };

function groupReleases(rows) {
  const byGame = new Map();
  for (const row of rows) {
    const game = row.game;
    if (!game || !game.id || !game.name) continue;
    let entry = byGame.get(game.id);
    if (!entry) {
      entry = { game, platforms: new Map(), status: null, region: null };
      byGame.set(game.id, entry);
    }
    const platform = platformOf(row.platform);
    if (platform) entry.platforms.set(platform.id, platform);

    const rank = REGION_RANK[row.release_region];
    const best = REGION_RANK[entry.region];
    if (entry.region == null || (rank != null && (best == null || rank < best))) {
      entry.region = row.release_region;
    }
    // Early Access / Alpha soll sichtbar bleiben, auch wenn nur eine
    // der Plattformen so ausgeliefert wird.
    if (row.status && STATUS_DE[row.status] && !entry.status) entry.status = row.status;
  }
  return [...byGame.values()];
}

function normalizeEntry(entry, iso) {
  const game = entry.game;
  const platforms = [...entry.platforms.values()];
  return {
    id: game.id,
    name: game.name,
    slug: game.slug || null,
    date: iso,
    platforms: platforms.map((p) => ({ label: p.label, family: p.family })),
    families: [...new Set(platforms.map((p) => p.family))],
    genres: genresOf(game),
    hypes: Number(game.hypes) || 0,
    rating: ratingOf(game),
    criticRating: criticOf(game),
    cover: imageUrl(game.cover && game.cover.image_id, 't_cover_big_2x'),
    teaser: clip(game.summary),
    teaserLang: 'en', // wird fuer die obersten Karten nachtraeglich gesetzt
    _game: game,      // nur modulintern, faellt vor der Antwort weg
    kind: GAME_TYPE_DE[game.game_type] || null,
    status: entry.status ? STATUS_DE[entry.status] : null,
  };
}

function sortByRelevance(items) {
  return items.sort((a, b) => (b.hypes - a.hypes)
    || ((b.criticRating || 0) - (a.criticRating || 0))
    || a.name.localeCompare(b.name, 'de'));
}

/* Die obersten Karten bekommen einen deutschen Kurztext.
   Bewusst nicht alle: an einem Tag stehen ~50 Spiele in der Liste, davon
   ueberstehen ~8 den Relevanzfilter der Kachel. Fuer die restlichen 40 einen
   Fremdabruf zu machen, waere Text, den nie jemand liest. TEASER_TRANSLATE
   liegt darum knapp ueber dem, was die Kachel typischerweise zeigt. */
const TEASER_TRANSLATE = 12;
const TEASER_CONCURRENCY = 3;
const teaserCache = makeCache(400, 24 * 3600 * 1000);

async function translateTop(ctx, items) {
  const todo = items.slice(0, TEASER_TRANSLATE);
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const item = todo[next++];
      const key = `teaser:${item.id}`;
      let hit = teaserCache.get(key);
      if (hit === null) {
        try {
          hit = (await germanSummary(ctx, item._game)) || { text: '', source: '' };
        } catch (err) {
          // Ein deutscher Kurztext ist Kuer — der englische steht schon da.
          ctx.warn(`Kurztext (${item.name}): ${err.message}`);
          hit = { text: '', source: '' };
        }
        teaserCache.put(key, hit);
      }
      if (hit.text) { item.teaser = hit.text; item.teaserLang = 'de'; }
    }
  };
  await Promise.all(Array.from({ length: TEASER_CONCURRENCY }, worker));
}

async function releasesForDay(get, ctx, iso) {
  const { start, end } = dayBounds(iso);
  const rows = await igdb(get, ctx, 'release_dates',
    `fields ${LIST_FIELDS};`
    + ` where date >= ${start} & date < ${end} & date_format = 0`
    + ` & game.game_type = (${GAME_TYPES.join(',')});`
    + ` sort date asc; limit ${DAY_LIMIT};`);
  const items = sortByRelevance(
    groupReleases(Array.isArray(rows) ? rows : []).map((e) => normalizeEntry(e, iso)),
  );
  await translateTop(ctx, items);
  // Der IGDB-Rohdatensatz war nur fuer die Uebersetzung noetig und hat in
  // der Antwort an den Browser nichts verloren.
  for (const item of items) delete item._game;
  return items;
}

/* Was als Naechstes ansteht — der Fallback fuer Tage, an denen
   nichts erscheint. Bewusst nur Titel mit Vorab-Interesse: eine
   Liste unbekannter Titel hilft niemandem weiter. */
async function upcoming(get, ctx) {
  const from = Math.floor(Date.now() / 1000);
  const rows = await igdb(get, ctx, 'release_dates',
    `fields ${LIST_FIELDS};`
    + ` where date > ${from} & date_format = 0 & game.hypes >= 5`
    + ` & game.game_type = (${GAME_TYPES.join(',')});`
    + ` sort date asc; limit ${DAY_LIMIT};`);
  const byGame = new Map();
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const id = row.game && row.game.id;
    // Pro Spiel zaehlt der frueheste kommende Termin.
    if (id && !byGame.has(id)) byGame.set(id, row.date);
  }
  const items = groupReleases(Array.isArray(rows) ? rows : [])
    .map((e) => normalizeEntry(e, isoOf(byGame.get(e.game.id))))
    .filter((it) => it.date)
    .sort((a, b) => a.date.localeCompare(b.date) || (b.hypes - a.hypes))
    .slice(0, UPCOMING_LIMIT);
  await translateTop(ctx, items);
  for (const item of items) delete item._game;
  return items;
}

/* ---------- Deutsche Beschreibung ----------
   Reihenfolge: Steam-Store auf Deutsch, sonst deutsche Wikipedia,
   sonst bleibt der englische IGDB-Text stehen. Der Client zeigt
   dann einen EN-Marker, statt so zu tun, als waere es Deutsch. */

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

const PREORDER_RE = /\b(vorab|vorbestell|pre-?order)/i;

/* Steam antwortet auf l=german auch dann mit success:true, wenn es gar keine
   deutsche Store-Seite gibt — dann steht dort einfach der englische Text.
   Ohne diese Pruefung landet er mit einem "deutsch"-Etikett auf der Kachel.
   Zwei kleine Wortlisten reichen: die Funktionswoerter beider Sprachen
   ueberschneiden sich nicht. */
const DE_WORDS = /\b(und|ist|sind|ein|eine|einen|einem|der|die|das|den|dem|mit|für|von|im|auf|sich|als|wird|werden|nicht|dich|dir|deine|deinen|durch|über|zwischen)\b/gi;
const EN_WORDS = /\b(and|is|are|the|with|for|from|your|you|this|that|will|not|through|between|into|their)\b/gi;

function looksGerman(text) {
  const s = String(text || '');
  if (s.length < 25) return false;
  const de = (s.match(DE_WORDS) || []).length;
  const en = (s.match(EN_WORDS) || []).length;
  return de > en;
}

/* Vorbesteller-Seiten fuehren mit dem Bonus-Paket statt mit dem Spiel
   ("Kauf X vorab und hol dir das Ruestungs-Pack ..."). Der beschreibende
   Teil steht dahinter in about_the_game und beginnt fast immer mit
   "<Titel> ist ein ...". Findet sich der nicht, bleibt der Kurztext —
   deutsches Marketing ist immer noch besser als englischer Fliesstext. */
function steamDescription(data, name) {
  const short = clip(stripHtml(data.short_description));
  if (short && !PREORDER_RE.test(short)) return short;

  const about = stripHtml(data.about_the_game);
  const head = String(name).split(/[:–-]/)[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = head ? about.search(new RegExp(`${head}[^.!?]{0,80}?\\bist\\b`, 'i')) : -1;
  if (start >= 0) return clip(about.slice(start));
  return short || null;
}

async function steamGerman(ctx, appId, name) {
  const data = await ctx.httpJson(
    `${STEAM_URL}?appids=${encodeURIComponent(appId)}&l=german`,
    { timeoutMs: DESC_TIMEOUT_MS, headers: { 'User-Agent': UA } },
  );
  const entry = data && data[String(appId)];
  if (!entry || !entry.success || !entry.data) return null;
  const text = steamDescription(entry.data, name);
  // Kein deutscher Store-Text? Dann lieber weiter zur Wikipedia, statt
  // englischen Text als deutsch auszuzeichnen.
  return text && looksGerman(text) ? { text, source: 'Steam' } : null;
}

async function wikipediaGerman(ctx, title) {
  const data = await ctx.httpJson(
    `${WIKI_URL}/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { timeoutMs: DESC_TIMEOUT_MS, headers: { 'User-Agent': UA } },
  );
  const extract = data && data.extract;
  if (!extract || data.type === 'disambiguation') return null;
  // Ohne diese Pruefung landet bei mehrdeutigen Titeln ("Control",
  // "Prey") ein Artikel ueber etwas voellig anderes in der Kachel.
  const haystack = extract.toLowerCase();
  const looksLikeGame = /\b(spiel|videospiel|computerspiel)\b/.test(haystack)
    || haystack.includes(title.toLowerCase());
  if (!looksLikeGame) return null;
  return { text: clip(extract), source: 'Wikipedia' };
}

async function germanSummary(ctx, game) {
  const steamId = (game.external_games || [])
    .filter((e) => e.external_game_source === SOURCE_STEAM && /^\d+$/.test(String(e.uid || '')))
    .map((e) => e.uid)[0];

  if (steamId) {
    try {
      const hit = await steamGerman(ctx, steamId, game.name);
      if (hit) return hit;
    } catch (err) { ctx.warn(`Steam-Beschreibung (${game.name}): ${err.message}`); }
  }
  try {
    const hit = await wikipediaGerman(ctx, game.name);
    if (hit) return hit;
  } catch { /* Kein Artikel ist der Normalfall, kein Fehler */ }
  return null;
}

/* ---------- Detail ---------- */

function companiesOf(game, role) {
  return [...new Set((game.involved_companies || [])
    .filter((c) => c[role] && c.company && c.company.name)
    .map((c) => c.company.name))];
}

function ageRatingsOf(game) {
  const out = [];
  for (const org of AGE_ORG_ORDER) {
    const hit = (game.age_ratings || []).find((a) => a.organization === org);
    const value = hit && AGE_CATEGORIES[hit.rating_category];
    if (value) out.push({ org: AGE_ORGS[org], value });
  }
  return out;
}

function storesOf(game) {
  const seen = new Set();
  const out = [];
  for (const site of (game.websites || [])) {
    const label = WEBSITE_DE[site.type];
    if (!label || seen.has(label) || !/^https:\/\//i.test(site.url || '')) continue;
    seen.add(label);
    out.push({ label, url: site.url });
  }
  return out;
}

function releaseDatesOf(game) {
  const out = [];
  for (const rd of (game.release_dates || [])) {
    const platform = platformOf(rd.platform);
    const iso = isoOf(rd.date);
    if (!platform || !iso) continue;
    out.push({ platform: platform.label, date: iso, status: STATUS_DE[rd.status] || null });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform));
}

async function gameDetail(get, ctx, id) {
  const rows = await igdb(get, ctx, 'games',
    `fields ${DETAIL_FIELDS}; where id = ${id}; limit 1;`);
  const game = Array.isArray(rows) && rows[0];
  if (!game) return null;

  const german = await germanSummary(ctx, game);
  const platforms = [...new Map(
    (game.release_dates || [])
      .map((rd) => platformOf(rd.platform))
      .filter(Boolean)
      .map((p) => [p.id, p]),
  ).values()];

  return {
    id: game.id,
    name: game.name,
    date: isoOf(game.first_release_date),
    kind: GAME_TYPE_DE[game.game_type] || null,
    cover: imageUrl(game.cover && game.cover.image_id, 't_cover_big_2x'),
    artwork: imageUrl(
      (game.artworks || [])[0] && game.artworks[0].image_id,
      't_720p',
    ),
    // Zwei Groessen: der Streifen zeigt 104px hohe Vorschauen, die Lightbox
    // darf gross werden. t_screenshot_huge liefert dieselben Bytes wie
    // t_720p — t_1080p ist die einzige Stufe, die wirklich mehr bringt.
    screenshots: (game.screenshots || []).slice(0, 6)
      .filter((s) => s.image_id)
      .map((s) => ({ thumb: imageUrl(s.image_id, 't_720p'), full: imageUrl(s.image_id, 't_1080p') })),
    summary: german ? german.text : clip(game.summary),
    summaryLang: german ? 'de' : 'en',
    summarySource: german ? german.source : 'IGDB',
    genres: genresOf(game),
    platforms: platforms.map((p) => ({ label: p.label, family: p.family })),
    developers: companiesOf(game, 'developer'),
    publishers: companiesOf(game, 'publisher'),
    modes: (game.game_modes || []).map((m) => GAME_MODES_DE[m.id] || m.name),
    perspectives: (game.player_perspectives || [])
      .map((p) => PERSPECTIVES_DE[p.id] || p.name),
    engines: (game.game_engines || []).map((e) => e.name).filter(Boolean),
    ageRatings: ageRatingsOf(game),
    rating: ratingOf(game),
    ratingCount: Number(game.total_rating_count) || 0,
    criticRating: criticOf(game),
    criticCount: Number(game.aggregated_rating_count) || 0,
    hypes: Number(game.hypes) || 0,
    stores: storesOf(game),
    releaseDates: releaseDatesOf(game),
    igdbUrl: /^https:\/\//i.test(game.url || '') ? game.url : null,
  };
}

/* ---------- Suche ---------- */

/* ---------- Suche ----------
   Die Lupe soll auch dann treffen, wenn man den Titel nicht exakt tippt.
   IGDBs eigene Suche reicht dafuer nicht, an echten Abfragen gemessen:

     search "world of war"  -> World War Z, World War Armies, World War I …
                               (kein World of Warcraft; "of" wird ignoriert
                               und die Tokens frei kombiniert)
     search "wracraft"      -> 0 Treffer
     search "cyberpank"     -> 0 Treffer   (keinerlei Tippfehlertoleranz)

   Dazu kam ein handfester Fehler: `search` und `where` zusammen ergeben
   KEINE gefilterte Suche — IGDB rankt zuerst und filtert danach. Mit
   `where game_type = (…)` und `limit 8` lieferte "world of war" deshalb
   gar nichts, waehrend "world" und "world of warcraft" funktionierten.

   Also: Kandidaten aus mehreren Abfragen einsammeln und die Rangfolge
   selbst bilden. Die Wildcard-Abfragen sind dabei der eigentliche Gewinn —
   `name ~ *"world"* & name ~ *"war"*` findet World of Warcraft unabhaengig
   von Wortstellung und Fuellwoertern. */

const SEARCH_SKIP = new Set([3, 5, 12, 13, 14]); // Bundle, Mod, Fork, Pack, Update
const SEARCH_FETCH = 40;
const SEARCH_FIELDS = 'fields id, name, first_release_date, hypes, cover.image_id,'
  + ' game_type, total_rating_count, alternative_names.name,'
  + ' platforms.id, platforms.name, platforms.abbreviation;';

// Fuellwoerter tragen nichts zur Unterscheidung bei und stehen in Titeln
// mal da, mal nicht ("World of Warcraft" vs. "World War").
const STOPWORDS = new Set(['of', 'the', 'a', 'an', 'and', 'der', 'die', 'das', 'und', 'fuer', 'for']);

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Diakritika weg: pokemon == pokémon
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function searchTokens(s) {
  const all = normalizeText(s).split(' ').filter(Boolean);
  const words = all.filter((t) => !STOPWORDS.has(t));
  // Wer nur "the" tippt, soll nicht ins Leere laufen.
  return words.length ? words : all;
}

/* Ein Token gilt als getroffen, wenn irgendein Wort des Titels damit
   anfaengt — "war" trifft "warcraft", "zelda breath" trifft
   "The Legend of Zelda: Breath of the Wild".

   Kurze Tokens muessen dagegen ein ganzes Wort treffen: als Praefix passt
   "v" auf jedes Wort mit V, und so stand bei "gta v" ploetzlich "Vigtafl"
   in der Liste. Kuerzel wie GTA oder WoW kommen ohnehin ueber
   alternative_names herein, nicht ueber diesen Weg. */
const MIN_PREFIX_TOKEN = 4;

function tokenHit(nameTokens, token) {
  return token.length < MIN_PREFIX_TOKEN
    ? nameTokens.includes(token)
    : nameTokens.some((w) => w.startsWith(token));
}

function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

function scoreHit(game, q, tokens) {
  const name = normalizeText(game.name);
  const nameTokens = name.split(' ').filter(Boolean);
  let score = 0;

  if (name === q) score = 1000;
  else if (name.startsWith(q)) score = 700;
  else if (name.includes(q)) score = 500;
  else {
    const treffer = tokens.filter((t) => tokenHit(nameTokens, t)).length;
    score = tokens.length ? Math.round(350 * (treffer / tokens.length)) : 0;
    // Nichts passt sauber? Dann zaehlt der gemeinsame Wortanfang. Das ist
    // die einzige Stelle, an der ein Vertipper noch aufgefangen wird:
    // "cyberpank" und "cyberpunk" teilen sechs Zeichen.
    if (!treffer) {
      let beste = 0;
      for (const t of tokens) {
        for (const w of nameTokens) {
          const gleich = commonPrefix(t, w);
          // Absolute Mindestlaenge zusaetzlich zum Anteil: bei einem
          // Ein-Buchstaben-Token waere der Anteil sonst rechnerisch 100 %,
          // und "v" haette "Vigtafl" als Treffer fuer "gta v" durchgelassen.
          if (gleich >= MIN_PREFIX_TOKEN) beste = Math.max(beste, gleich / t.length);
        }
      }
      if (beste >= 0.6) score = Math.round(250 * beste);
    }
  }

  // Kuerzel und Zweitnamen ("WoW", "BotW", "GTA V") stehen bei IGDB in
  // alternative_names — ohne die findet man ein Spiel nur ueber den
  // vollen Titel.
  for (const alt of (game.alternative_names || [])) {
    const a = normalizeText(alt.name);
    if (!a) continue;
    if (a === q) score = Math.max(score, 900);
    else if (a.startsWith(q) || q.startsWith(a)) score = Math.max(score, 620);
  }

  // Ohne jede Namensuebereinstimmung gibt es keine Punkte. Sonst schwemmen
  // Bekanntheits- und Typ-Bonus Titel nach oben, die nur zufaellig in einer
  // der Wildcard-Abfragen mitgekommen sind — im Test standen so "Vigtafl"
  // bei "gta v" und "Wowo Island" bei "wow" in der Liste.
  if (score <= 0) return 0;

  // Bekanntheit entscheidet, welcher von mehreren passenden Titeln gemeint
  // ist: bei "world war" hat World of Warcraft 893 Wertungen, die
  // namensaehnliche Konkurrenz eine Handvoll.
  score += Math.min(Number(game.total_rating_count) || 0, 1000) / 5;
  score += Math.min(Number(game.hypes) || 0, 100) / 2;

  if (game.game_type === 0) score += 40;
  else if (game.game_type === 1 || game.game_type === 2) score -= 40; // DLC/Erweiterung nach hinten
  return score;
}

async function searchQuery(get, ctx, body) {
  try {
    const rows = await igdb(get, ctx, 'games', body);
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    // Eine erfolglose Teilabfrage darf die Suche nicht insgesamt kippen.
    ctx.warn(`Suchabfrage fehlgeschlagen: ${err.message}`);
    return [];
  }
}

function tokenWildcardWhere(tokens) {
  return tokens.map((t) => `name ~ *"${quote(t)}"*`).join(' & ');
}

async function searchGames(get, ctx, q) {
  const norm = normalizeText(q);
  const tokens = searchTokens(q);
  if (!norm) return [];

  const pool = new Map();
  const add = (rows) => { for (const g of rows) if (g && g.id && g.name) pool.set(g.id, g); };

  // 1. IGDBs Relevanzsuche — stark bei vollstaendigen Titeln.
  add(await searchQuery(get, ctx, `search "${quote(q)}"; ${SEARCH_FIELDS} limit ${SEARCH_FETCH};`));
  // 2. Alle Woerter irgendwo im Titel, Reihenfolge egal. Das ist der Teil,
  //    der "world of war" -> World of Warcraft ueberhaupt erst findet.
  add(await searchQuery(get, ctx,
    `${SEARCH_FIELDS} where ${tokenWildcardWhere(tokens)};`
    + ` sort total_rating_count desc; limit ${SEARCH_FETCH};`));

  // 3. Kuerzel wie "wow" oder "botw" stehen nur in den Zweitnamen.
  if (pool.size < 5) {
    add(await searchQuery(get, ctx,
      `${SEARCH_FIELDS} where alternative_names.name ~ *"${quote(q)}"*;`
      + ` sort total_rating_count desc; limit 20;`));
  }

  // 4. Letzter Versuch bei Vertippern: jedes Wort auf einen Wortstamm
  //    kuerzen. Faengt Fehler am Wortende ("cyberpank" -> "cyberp",
  //    "warcaft" -> "warc"); ein Dreher im zweiten Buchstaben bleibt
  //    ausserhalb dessen, was ohne echten Fuzzy-Index geht.
  if (!pool.size) {
    // 60 % des Wortes: bei "cyberpank" bleibt "cyberp" und trifft Cyberpunk.
    // Ein Stamm von t.length-2 waere zu lang gewesen — der Vertipper sass
    // noch drin.
    const staemme = tokens.map((t) => t.slice(0, Math.max(4, Math.ceil(t.length * 0.6))))
      .filter((t) => t.length >= 4);
    if (staemme.length) {
      add(await searchQuery(get, ctx,
        `${SEARCH_FIELDS} where ${tokenWildcardWhere(staemme)};`
        + ` sort total_rating_count desc; limit ${SEARCH_FETCH};`));
    }
  }

  const heute = todayIso();
  return [...pool.values()]
    .filter((g) => !SEARCH_SKIP.has(g.game_type))
    .map((g) => ({ g, score: scoreHit(g, norm, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score)
      // Bei gleichem Rang zaehlt, was noch aussteht — danach gefragt wird.
      || (pendingRank(a.g, heute) - pendingRank(b.g, heute))
      || ((b.g.first_release_date || 0) - (a.g.first_release_date || 0)))
    .slice(0, SEARCH_LIMIT)
    .map(({ g }) => searchHit(g));
}

function pendingRank(g, heute) {
  const iso = isoOf(g.first_release_date);
  return iso && iso >= heute ? 0 : 1;
}

function searchHit(g) {
  return {
    id: g.id,
    name: g.name,
    date: isoOf(g.first_release_date),
    hypes: Number(g.hypes) || 0,
    kind: GAME_TYPE_DE[g.game_type] || null,
    // Die Trefferliste zeigt 30x40 px — dafuer reicht t_cover_small (4 KB
    // statt 87 KB). Bei acht Treffern pro Tastendruck ist das der
    // Unterschied zwischen 34 KB und 700 KB.
    cover: imageUrl(g.cover && g.cover.image_id, 't_cover_small'),
    platforms: (g.platforms || []).map(platformOf).filter(Boolean)
      .map((p) => ({ label: p.label, family: p.family })),
  };
}

/* ---------- Caches ----------
   Die Registry cacht nur den Modul-Slot (= heutiger Tag). Datums-
   spruenge, Suche und Detailfenster brauchen eigene Toepfe mit
   eigenen Laufzeiten. */

function makeCache(max, ttl) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.ts > ttl) { map.delete(key); return null; }
      map.delete(key); map.set(key, hit); // als zuletzt benutzt markieren
      return hit.data;
    },
    put(key, data) {
      map.delete(key);
      map.set(key, { ts: Date.now(), data });
      while (map.size > max) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        map.delete(oldest);
      }
    },
    clear() { map.clear(); },
  };
}

const dayCache = makeCache(60, 6 * 3600 * 1000);
const searchCache = makeCache(100, 3600 * 1000);
const detailCache = makeCache(200, 24 * 3600 * 1000);
const upcomingCache = makeCache(1, 3600 * 1000);

// Parallele Anfragen auf denselben Schluessel teilen sich einen Abruf —
// dasselbe, was die Registry mit withInflight fuer den Modul-Slot macht.
const _inflight = new Map();
function once(key, fn) {
  const running = _inflight.get(key);
  if (running) return running;
  const p = fn().finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p;
}

async function cached(cache, key, fn) {
  const hit = cache.get(key);
  if (hit) return hit;
  return once(key, async () => {
    const data = await fn();
    cache.put(key, data);
    return data;
  });
}

/* ---------- Bild-Proxy ----------
   Anders als bei den News stehen die Bildhosts hier von vornherein
   fest, deshalb genuegt eine statische Allowlist — es gibt keinen
   Parameter, ueber den sich ein fremdes Ziel unterschieben liesse.
   Der Rest (Byte-Deckel, Magic-Byte-Pruefung, LRU) folgt
   server/modules/news.js. */

/* Steam liefert dieselben Bilder ueber wechselnde CDN-Hosts aus
   (shared.akamai., cdn.cloudflare., shared.fastly. …), deshalb dort
   beliebig viele Labels. Verankert bleibt es trotzdem am Domain-Ende —
   "steamstatic.com.evil.example" faellt durch. */
const IMAGE_HOSTS = [
  /^images\.igdb\.com$/,
  /^([a-z0-9-]+\.)*steamstatic\.com$/,
  /^upload\.wikimedia\.org$/,
];

function proxyUrl(url) {
  return `/api/game-releases/image?u=${encodeURIComponent(url)}`;
}

function allowedImageUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (!IMAGE_HOSTS.some((re) => re.test(u.hostname))) return null;
  return u.toString();
}

function imageTypeOf(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null; // insbesondere SVG: wuerde same-origin ausgeliefert und koennte Skript ausfuehren
}

async function readCapped(res, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error('zu gross');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const IMG_CACHE_MAX = 60;
const IMG_CACHE_BYTES = 24 * 1024 * 1024;
const _imgCache = new Map();
let _imgBytes = 0;

function imgGet(url) {
  const hit = _imgCache.get(url);
  if (!hit) return null;
  _imgCache.delete(url); _imgCache.set(url, hit);
  return hit;
}

function imgPut(url, entry) {
  if (_imgCache.has(url)) _imgBytes -= _imgCache.get(url).buf.length;
  _imgCache.set(url, entry);
  _imgBytes += entry.buf.length;
  while (_imgCache.size > IMG_CACHE_MAX || _imgBytes > IMG_CACHE_BYTES) {
    const oldest = _imgCache.keys().next().value;
    if (oldest === undefined) break;
    _imgBytes -= _imgCache.get(oldest).buf.length;
    _imgCache.delete(oldest);
  }
}

async function fetchImage(url) {
  const res = await fetch(url, {
    // Keine Weiterleitung: das Ziel waere nicht mehr von der Allowlist gedeckt.
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

/* ---------- Modul ---------- */

module.exports = {
  id: 'game-releases',
  label: 'Game Releases',
  // 10 min wie die News-Kachel. Die Listen aendern sich im Tagesverlauf kaum;
  // entscheidend ist, dass die ttl zugleich das Push-Intervall ist — ein
  // Tick, der ins Leere lief, darf die Kachel nicht eine halbe Stunde lang
  // auf dem Fehlerstand festhalten.
  ttl: 600000,

  secrets: [
    { key: 'IGDB_CLIENT_ID', label: 'Twitch Client-ID' },
    { key: 'IGDB_CLIENT_SECRET', label: 'Twitch Client-Secret', masked: true },
  ],
  configured: (get) => !!(get('IGDB_CLIENT_ID') && get('IGDB_CLIENT_SECRET')),
  notConfigured: { ok: false, error: 'not_configured', items: [] },
  errorFields: { items: [] },

  async fetch(get, ctx) {
    const date = todayIso();
    const items = await releasesForDay(get, ctx, date);
    return { ok: true, fetchedAt: new Date().toISOString(), date, items };
  },

  routes(app, { get, ctx }) {
    const guard = (res) => {
      if (module.exports.configured(get)) return false;
      res.status(503).json({ ok: false, error: 'not_configured' });
      return true;
    };
    const fail = (res, err) => {
      console.error('[game-releases]', err.message);
      res.status(502).json({ ok: false, error: 'fetch_failed', message: err.message });
    };

    // Datumssprung. Der heutige Tag geht bewusst NICHT hierueber, sondern
    // ueber /api/game-releases — sonst laegen dieselben Daten in zwei Toepfen.
    app.get('/api/game-releases/day', async (req, res) => {
      const date = String(req.query.date || '');
      if (!isValidIso(date)) return res.status(400).json({ ok: false, error: 'bad_date' });
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        const items = await cached(dayCache, `day:${date}`, () => releasesForDay(get, ctx, date));
        res.json({ ok: true, date, items });
      } catch (err) { fail(res, err); }
    });

    app.get('/api/game-releases/upcoming', async (req, res) => {
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        res.json({ ok: true, items: await cached(upcomingCache, 'upcoming', () => upcoming(get, ctx)) });
      } catch (err) { fail(res, err); }
    });

    app.get('/api/game-releases/search', async (req, res) => {
      const q = String(req.query.q || '').trim().slice(0, 80);
      if (q.length < 2) return res.status(400).json({ ok: false, error: 'query_too_short' });
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        const items = await cached(searchCache, `q:${q.toLowerCase()}`, () => searchGames(get, ctx, q));
        res.json({ ok: true, q, items });
      } catch (err) { fail(res, err); }
    });

    app.get('/api/game-releases/game/:id', async (req, res) => {
      const id = toId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'bad_id' });
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        const game = await cached(detailCache, `game:${id}`, () => gameDetail(get, ctx, id));
        if (!game) return res.status(404).json({ ok: false, error: 'unknown_game' });
        res.json({ ok: true, game });
      } catch (err) { fail(res, err); }
    });

    app.get('/api/game-releases/image', async (req, res) => {
      const url = allowedImageUrl(req.query.u);
      if (!url) return res.status(400).json({ ok: false, error: 'bad_url' });

      const send = (img) => {
        res.set('Content-Type', img.type);
        // Cover und Screenshots sind unveraenderlich — ein Tag ist konservativ.
        res.set('Cache-Control', 'public, max-age=86400');
        res.set('X-Content-Type-Options', 'nosniff');
        res.end(img.buf);
      };
      const hit = imgGet(url);
      if (hit) return send(hit);

      try {
        const img = await fetchImage(url);
        imgPut(url, img);
        send(img);
      } catch (err) {
        // Die Kachel blendet fehlgeschlagene Bilder aus (img.onerror) —
        // ein 404 ist hier der ruhige Weg, kein 500.
        res.status(404).json({ ok: false, error: 'unavailable', message: err.message });
      }
    });
  },

  // Fuer den Smoke-Test und scripts/igdb-check.mjs.
  _internals: {
    GAME_TYPES, GENRES_DE, PLATFORMS, GAME_MODES_DE, PERSPECTIVES_DE,
    AGE_ORGS, AGE_CATEGORIES, GAME_TYPE_DE, STATUS_DE, WEBSITE_DE,
    isValidIso, dayBounds, todayIso, quote, toId, allowedImageUrl, looksGerman,
    SEARCH_SKIP, SEARCH_FETCH, normalizeText, searchTokens, scoreHit, tokenWildcardWhere,
    commonPrefix,
    imageTypeOf, groupReleases, sortByRelevance, clip,
    releasesForDay, searchGames, gameDetail, upcoming, getToken,
  },
};
