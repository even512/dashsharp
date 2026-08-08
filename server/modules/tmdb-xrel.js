'use strict';

/* ============================================================================
   TMDB Beliebt × xrel — sind die beliebten Filme schon geleakt?
   ============================================================================

   WAS DIE KACHEL BEANTWORTET
   Die „Beliebt"-Liste von TMDB, und pro Film die eine Frage: gibt es dazu auf
   xrel.to schon ein Release? Antwort als Ampel — gruen (ja), rot (geprueft,
   nein), grau (konnte nicht geprueft werden).

   WARUM DAS NICHT „nur zwei APIs" IST
   xrel laesst sich NICHT per Id durchsuchen, nur per Titel-Text
   (/search/ext_info.json?q=…). Ein TMDB-Titel muss also einem xrel-Eintrag
   zugeordnet werden, und der eigentliche Aufwand steckt in dieser Zuordnung:

     1. xrel per Titel suchen (deutscher Titel, sonst Originaltitel).
     2. Kandidaten ueber die IMDb-Id verifizieren — TMDB liefert `imdb_id`, und
        das xrel-Suchergebnis traegt die IMDb-Id gleich mit
        (`uris: ["imdb:tt…"]`). Das ist das verlaessliche Kriterium; ein
        Titelvergleich allein verwechselt Remakes und Namensvettern.
     3. Fallback auf normalisierten Titel (+ Jahr), wenn kein Kandidat eine
        passende IMDb-Id hat.

   xrel OHNE ZUGANGSDATEN
   Die Lesezugriffe der xrel-API (Suche, Release-Listen) brauchen KEINEN Token
   und KEINE registrierte App — anonym sind es sogar 900 Anfragen/Stunde statt
   der 300 mit App. Deshalb hat die Kachel nur EIN Geheimnis: den TMDB-Token.
   Bei knappem Kontingent oder Ausfall wird NICHT geraten — die betroffenen
   Filme bleiben grau statt faelschlich rot.

   DATENFLUSS DES ABRUFS
     Registry ──> fetch() ──> popularMovies()   TMDB: Beliebt-Liste
                               │                 + imdb_id je Film nachholen
                               └─ matchXrel()    pro Film:
                                    findExtInfo()   suchen + per IMDb verifizieren
                                    releaseCount()  Scene + P2P zaehlen

   AUFBAU
     Teil 1  Konstanten
     Teil 2  Werkzeugkasten (Cache, Throttle, Text) — kennt keine der APIs
     Teil 3  TMDB-Zugang
     Teil 4  xrel-Zugang (Rate-Limit + die eine Abfragefunktion)
     Teil 5  Zuordnung TMDB ↔ xrel (der Kern)
     Teil 6  Die Abrufe (Liste + Release-Liste fuers Modal)
     Teil 7  Das Modul-Manifest

   MUSTER (uebernommen aus game-releases.js)
   - Der Abgleich darf die Kachel nie kippen: matchXrel faengt jeden Fehler und
     liefert im Zweifel `unknown`, nie eine Exception nach oben.
   - Jede Frage hat ihren eigenen Cache mit eigener Laufzeit.
   - Fremdtext geht nur normalisiert/gedeckelt weiter.
   ============================================================================ */

/* ============================================================================
   TEIL 1 — KONSTANTEN
   ============================================================================ */

const TMDB_BASE = 'https://api.themoviedb.org/3';
const XREL_BASE = 'https://api.xrel.to/v2';

const UA = 'DashSharp/1.0 (+homelab dashboard)';

const TMDB_TIMEOUT_MS = 8000;
const XREL_TIMEOUT_MS = 8000;

// Das Dashboard steht in Deutschland — deutsche Titel, deutsche Beliebt-Liste.
const LANG = 'de-DE';

// Eine TMDB-Beliebt-Seite hat 20 Filme. Genau die eine Seite.
const MOVIE_LIMIT = 20;

/* xrel hat ZWEI Rate-Limits (anonym gemessen):
     - ein grosszuegiges Gesamtlimit von 900 Anfragen/Stunde
     - ein enges Zusatzlimit NUR fuer /search/* : schon die dritte Suche in
       schneller Folge antwortet mit 429, waehrend das Gesamtlimit kaum sinkt.
       Gemessen erholt es sich nach ~3 s.
   Deshalb zwei getrennte Takte: Release-Abfragen duerfen zuegig hintereinander
   laufen, Suchen brauchen deutlich Abstand. */
const XREL_GAP_MS = 300;         // Release-/Info-Abfragen
const XREL_SEARCH_GAP_MS = 3500; // Suchen: > die gemessene Erholzeit

// Ein 429 auf einer Suche ist erwartbar (enges Zusatzlimit) und wird kurz
// abgewartet und wiederholt, statt den Film aufzugeben.
const SEARCH_RETRY_WAIT_MS = 3500;
const SEARCH_RETRIES = 2;

// Wie viele xrel-Suchtreffer wir je Film ueberhaupt anschauen. Der richtige
// Film steht praktisch immer ganz oben.
const VERIFY_MAX = 5;
const SEARCH_LIMIT = 8;

// So viele Releases holen wir je Quelle (Scene/P2P). 100 ist das xrel-Maximum
// pro Seite und reicht, um zuverlaessig zu zaehlen UND das Modal zu fuellen —
// beides teilt sich denselben Abruf (loadReleases). Mehr als 100 Releases je
// Quelle hat praktisch kein Film; die Zahl ist dann „100+ gefunden", was fuer
// die Ampel voellig genuegt.
const RELEASE_PAGE = 100;
const RELEASE_LIST_LIMIT = 60; // Deckel fuers Modal nach dem Filtern

/* Notbremse fuer das GESAMTlimit (nicht das Suchlimit): sinkt der allgemeine
   X-RateLimit-Remaining zu tief oder kommt ein 429 auf einer NICHT-Such-Route,
   pausieren wir alle xrel-Abrufe — die betroffenen Filme werden dann grau statt
   faelschlich rot. Das Suchlimit hat seine eigene, mildere Behandlung (Retry). */
const XREL_MIN_REMAINING = 30;
const RATE_COOLDOWN_MS = 10 * 60 * 1000;

/* ============================================================================
   TEIL 2 — WERKZEUGKASTEN
   ----------------------------------------------------------------------------
   Allgemeines Handwerkszeug ohne Bezug zu TMDB oder xrel. 1:1 aus dem Muster
   von game-releases.js uebernommen (makeCache/once/cached, throttled).
   ============================================================================ */

/* ---------- 2.1 Caches ----------
   LRU-Map mit Ablaufzeit. get() schiebt den Treffer ans Ende der
   Einfuegereihenfolge, damit `keys().next()` immer den aeltesten Eintrag
   liefert — mehr braucht ein LRU nicht. */
function makeCache(max, ttl) {
  const map = new Map();
  return {
    get(key) {
      const hit = map.get(key);
      if (!hit) return null;
      if (Date.now() - hit.ts > ttl) { map.delete(key); return null; }
      map.delete(key); map.set(key, hit);
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

/* Ein Topf je Frage, damit die Laufzeiten vergleichbar sind:
     imdbCache     24 h  die imdb_id eines Films aendert sich nie
     searchCache    6 h  xrel-Suchtreffer zu einem Titel sind traege
     releaseCache   3 h  die Release-Liste je ext_info — von Zaehlung UND Modal
                         genutzt, damit ein Klick keinen zweiten Abruf kostet */
const imdbCache = makeCache(300, 24 * 3600 * 1000);
const searchCache = makeCache(200, 6 * 3600 * 1000);
const releaseCache = makeCache(200, 3 * 3600 * 1000);

// Parallele Anfragen auf denselben Schluessel teilen sich einen Abruf.
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
  if (hit !== null && hit !== undefined) return hit;
  return once(key, async () => {
    const data = await fn();
    cache.put(key, data);
    return data;
  });
}

/* ---------- 2.2 Throttle ----------
   Serielle Kette mit Mindestabstand — dieselbe Idee wie bei IGDB. Aufrufer
   duerfen bedenkenlos Promise.all() benutzen, serialisiert wird hier.

   Zwei getrennte Ketten, weil xrel Suchen viel enger deckelt als den Rest
   (siehe Konstanten): so blockiert der langsame Such-Takt nicht die zuegigen
   Release-Abfragen und umgekehrt. */
function makeThrottle(gapMs) {
  let queue = Promise.resolve();
  let last = 0;
  return function throttle(fn) {
    const run = queue.then(async () => {
      const wait = gapMs - (Date.now() - last);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      last = Date.now();
      return fn();
    });
    queue = run.then(() => {}, () => {});
    return run;
  };
}
const throttled = makeThrottle(XREL_GAP_MS);
const throttledSearch = makeThrottle(XREL_SEARCH_GAP_MS);

/* ---------- 2.3 Text ----------
   Eine Form, in der sich Titel vergleichen lassen: klein, ohne Diakritika,
   ohne Satzzeichen. Wird auf beide Seiten angewandt. */
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // Diakritika weg: pokemon == pokemon
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Untertitel nach dem Doppelpunkt/Gedankenstrich abtrennen: xrel fuehrt einen
// Film mal mit, mal ohne ("Dune" vs. "Dune: Part Two"). Nur fuer den Fallback.
function stripSubtitle(s) {
  return String(s || '').split(/[:–-]/)[0];
}

// tt-Kennung aus einem beliebigen IMDb-Verweis ziehen — egal ob voller Link
// (https://imdb.com/title/tt…) oder xrels Kurzform (imdb:tt…).
function imdbIdFrom(value) {
  const m = String(value || '').match(/tt\d{6,}/);
  return m ? m[0] : null;
}

/* Kino-Abfilmungen und Vorab-Leaks erkennen. xrel fuellt `video_type` bei
   P2P-Releases NICHT — die Qualitaet steht nur im Release-Namen (dirname).
   Deshalb wird der Name geprueft, verankert an Trennzeichen/Wortgrenzen, damit
   „Nice.Cuts" nicht faelschlich als TC (Telecine) durchgeht.

   Abgedeckt: CAM/CAMRip/HDCAM, TS/HDTS/TELESYNC, TC/HDTC/TELECINE, PDVD/PreDVD,
   SCR/Screener/DVDScr/BDScr/WebScr, Workprint. Alles „im Kino abgefilmt oder
   vorab geleakt" — die Kategorie schlechter Qualitaet. */
const CAM_RE = /(?:^|[._\- ])(CAM|CAMRIP|HDCAM|HQCAM|CAMHD|TS|HDTS|TELESYNC|TC|HDTC|TELECINE|PDVD|PREDVD|SCR|SCREENER|DVDSCR|BDSCR|WEBSCR|WP|WORKPRINT)(?:[._\- ]|$)/i;

function isCamRelease(dirname, videoType) {
  // video_type gewinnt, wenn xrel es doch mal fuellt (Scene-Releases); sonst
  // entscheidet der Name.
  return CAM_RE.test(String(videoType || '')) || CAM_RE.test(String(dirname || ''));
}

/* ============================================================================
   TEIL 3 — TMDB-ZUGANG
   ----------------------------------------------------------------------------
   TMDB nimmt den v4-Lesezugriffs-Token als Bearer im Header. Er ist das
   einzige Geheimnis der Kachel; `configured` verlangt genau ihn.
   ============================================================================ */

async function tmdb(get, ctx, path) {
  return ctx.httpJson(`${TMDB_BASE}${path}`, {
    timeoutMs: TMDB_TIMEOUT_MS,
    headers: { Authorization: `Bearer ${get('TMDB_TOKEN')}`, 'User-Agent': UA },
  });
}

// TMDB /movie/popular liefert Titel, Originaltitel und Datum — aber NICHT die
// imdb_id. Die holt enrichImdb() je Film ueber /movie/{id} nach.
function normalizeMovie(r) {
  return {
    tmdbId: r.id,
    title: r.title || r.original_title || '',
    originalTitle: r.original_title || '',
    year: String(r.release_date || '').slice(0, 4) || null,
    imdbId: null,
    tmdbUrl: `https://www.themoviedb.org/movie/${r.id}`,
  };
}

const TMDB_CONCURRENCY = 3;

async function enrichImdb(get, ctx, movies) {
  let next = 0;
  const worker = async () => {
    while (next < movies.length) {
      const m = movies[next++];
      try {
        const d = await cached(imdbCache, `imdb:${m.tmdbId}`, () => tmdb(get, ctx, `/movie/${m.tmdbId}`));
        m.imdbId = (d && d.imdb_id) || null;
      } catch (err) {
        // Ohne imdb_id greift nur der Titel-Fallback — kein Grund, den ganzen
        // Abruf scheitern zu lassen.
        ctx.warn(`imdb_id (${m.title}): ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: TMDB_CONCURRENCY }, worker));
}

async function popularMovies(get, ctx) {
  const list = await tmdb(get, ctx, `/movie/popular?language=${LANG}&page=1`);
  const results = (list && Array.isArray(list.results)) ? list.results.slice(0, MOVIE_LIMIT) : [];
  const movies = results.map(normalizeMovie);
  await enrichImdb(get, ctx, movies);
  return movies;
}

/* ============================================================================
   TEIL 4 — xrel-ZUGANG
   ----------------------------------------------------------------------------
   Kein Token, keine App: die gelesenen Endpunkte sind oeffentlich. Bleibt der
   Rate-Limit-Schutz und genau eine Abfragefunktion. Alles, was matchXrel und
   releasesFor an xrel schicken, laeuft durch xrelGet().
   ============================================================================ */

/* ---------- 4.1 Rate-Limit ----------
   Zwei Wege in die Pause: ein 429 (schon zu spaet) oder — proaktiv — ein
   niedriger X-RateLimit-Remaining aus einer erfolgreichen Antwort. Waehrend der
   Pause wirft xrelGet sofort `rate_limited`, damit die restlichen Filme grau
   bleiben statt faelschlich rot. */
let _rateCooldownUntil = 0;

function rateLimited() {
  return Date.now() < _rateCooldownUntil;
}

/* ---------- 4.2 Die einzige Abfragefunktion ----------
   raw:true, weil wir die X-RateLimit-Header lesen wollen — die JSON-Antwort
   parsen wir dann selbst. `search` waehlt den langsamen Such-Takt und die
   Retry-Behandlung fuer das enge Such-Zusatzlimit. */
async function xrelRequest(ctx, path) {
  const res = await ctx.httpJson(`${XREL_BASE}${path}`, {
    raw: true,
    timeoutMs: XREL_TIMEOUT_MS,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  // Proaktiv bremsen, bevor das GESAMTkontingent aufgebraucht ist.
  const remaining = Number(res.headers['x-ratelimit-remaining']);
  if (Number.isFinite(remaining) && remaining <= XREL_MIN_REMAINING) {
    _rateCooldownUntil = Date.now() + RATE_COOLDOWN_MS;
  }
  try { return JSON.parse(res.text); }
  catch { throw new Error('xrel: JSON-Parse fehlgeschlagen'); }
}

async function xrelGet(ctx, path, search = false) {
  if (rateLimited()) throw new Error('rate_limited');

  // Suchen: eigener langsamer Takt, und ein 429 ist das erwartbare enge
  // Such-Zusatzlimit — kurz warten und erneut versuchen, NICHT die Notbremse
  // fuers Gesamtlimit ziehen.
  if (search) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await throttledSearch(() => xrelRequest(ctx, path));
      } catch (err) {
        if (/HTTP 429/.test(err.message) && attempt < SEARCH_RETRIES) {
          await new Promise((r) => setTimeout(r, SEARCH_RETRY_WAIT_MS));
          continue;
        }
        if (/HTTP 429/.test(err.message)) throw new Error('rate_limited');
        throw err;
      }
    }
  }

  // Alle anderen Routen: zuegiger Takt. Ein 429 hier betrifft das Gesamtlimit —
  // Notbremse ziehen, damit die restlichen Filme grau statt rot werden.
  return throttled(async () => {
    try {
      return await xrelRequest(ctx, path);
    } catch (err) {
      if (/HTTP 429/.test(err.message)) {
        _rateCooldownUntil = Date.now() + RATE_COOLDOWN_MS;
        throw new Error('rate_limited');
      }
      throw err;
    }
  });
}

/* ============================================================================
   TEIL 5 — ZUORDNUNG TMDB ↔ xrel (der Kern)
   ============================================================================ */

/* ---------- 5.1 Verifikation ----------
   Das xrel-Suchergebnis traegt schon alles Noetige: `id`, `title`, `alt_title`,
   `link_href` und `uris` (u. a. "imdb:tt…"). Ein Kandidat gilt als Treffer,
   wenn seine IMDb-Id zu der des TMDB-Films passt. Nur wenn KEIN Kandidat eine
   passende IMDb-Id hat, greift der Titel-Fallback. */

function candidateImdb(cand) {
  for (const uri of (cand && cand.uris) || []) {
    const id = imdbIdFrom(uri);
    if (id) return id;
  }
  return null;
}

function titleMatches(cand, film) {
  const names = [normalizeText(cand && cand.title), normalizeText(cand && cand.alt_title)].filter(Boolean);
  const want = [
    normalizeText(film.title), normalizeText(film.originalTitle),
    normalizeText(stripSubtitle(film.title)), normalizeText(stripSubtitle(film.originalTitle)),
  ].filter(Boolean);
  return names.some((n) => want.includes(n));
}

/* Sucht den passenden ext_info zu einem Film. Gibt das Suchtreffer-Objekt
   zurueck (mit id + link_href) oder null. Wirft `rate_limited` nach oben,
   damit matchXrel daraus `unknown` macht. */
async function findExtInfo(ctx, film, query) {
  if (!query) return null;
  const results = await cached(searchCache, `search:${normalizeText(query)}`, () =>
    xrelGet(ctx, `/search/ext_info.json?q=${encodeURIComponent(query)}&type=movie&limit=${SEARCH_LIMIT}`, true));
  const list = (results && Array.isArray(results.results)) ? results.results : [];
  if (!list.length) return null;

  let titleFallback = null;
  for (const cand of list.slice(0, VERIFY_MAX)) {
    if (!cand || !cand.id) continue;
    if (film.imdbId && candidateImdb(cand) === film.imdbId) return cand;
    if (!titleFallback && titleMatches(cand, film)) titleFallback = cand;
  }
  return titleFallback;
}

/* ---------- 5.2 Release-Liste laden (eine Quelle fuer Zaehlung UND Modal) ----
   Frueher zaehlte die Kachel nur `total_count` von Scene und brach ab, sobald
   Scene>0 war — deshalb zeigte „Minions" 1 (Scene) statt 8 (1 Scene + 7 P2P).
   Jetzt werden Scene UND P2P immer geholt, normalisiert und gezaehlt, und das
   Ergebnis liegt im releaseCache: der Modal-Klick trifft denselben Eintrag und
   kostet keinen zweiten Abruf.

   Wirft `rate_limited` weiter (Notbremse). Sind BEIDE Quellen aus einem anderen
   Grund gescheitert, wissen wir nichts — dann wirft die Funktion, und matchXrel
   macht daraus `unknown` (grau, nicht faelschlich rot). */
async function loadReleases(ctx, extInfoId) {
  return cached(releaseCache, `rel:${extInfoId}`, async () => {
    let scene = null;
    let p2p = null;
    try {
      const r = await xrelGet(ctx, `/release/ext_info.json?id=${encodeURIComponent(extInfoId)}&per_page=${RELEASE_PAGE}`);
      scene = ((r && r.list) || []).map((rel) => normalizeRelease(rel, true)).filter(Boolean);
    } catch (err) { if (err.message === 'rate_limited') throw err; }
    try {
      const r = await xrelGet(ctx, `/p2p/releases.json?ext_info_id=${encodeURIComponent(extInfoId)}&per_page=${RELEASE_PAGE}`);
      p2p = ((r && r.list) || []).map((rel) => normalizeRelease(rel, false)).filter(Boolean);
    } catch (err) { if (err.message === 'rate_limited') throw err; }

    if (scene === null && p2p === null) throw new Error('xrel: Releases nicht ermittelbar');
    return [...(scene || []), ...(p2p || [])].sort((a, b) => b.time - a.time);
  });
}

// Zaehlt echte vs. CAM-Releases in einer geladenen Liste.
function countReleases(list) {
  let good = 0;
  let cam = 0;
  for (const r of list) (r.cam ? cam++ : good++);
  return { total: list.length, good, cam };
}

/* ---------- 5.3 Ein Film ----------
   Liefert BEIDE Zahlen: `releaseCount` (ohne CAM) und `camCount`. Die Ampel
   (gruen/rot) entscheidet das Frontend je nach CAM-Filter selbst — so schaltet
   der Toggle ohne neuen Abruf um. Der einzige Fehlerausgang ist `unknown`:
   jede Exception (Rate-Limit, Ausfall) faerbt den Film grau, nie rot. */
async function matchXrel(ctx, film) {
  const miss = { status: 'none', xrelId: null, xrelUrl: null, releaseCount: 0, camCount: 0 };
  try {
    let info = await findExtInfo(ctx, film, film.title);
    if (!info && film.originalTitle && film.originalTitle !== film.title) {
      info = await findExtInfo(ctx, film, film.originalTitle);
    }
    if (!info) return miss;

    const { good, cam } = countReleases(await loadReleases(ctx, info.id));
    return {
      // „found", sobald es irgendein Release gibt (auch nur CAM). Ob ein reiner
      // CAM-Film als rot gilt, entscheidet der Filter im Frontend.
      status: (good + cam) > 0 ? 'found' : 'none',
      xrelId: String(info.id),
      xrelUrl: /^https?:\/\//i.test(info.link_href || '') ? info.link_href : null,
      releaseCount: good,
      camCount: cam,
    };
  } catch (err) {
    ctx.warn(`Abgleich (${film.title}): ${err.message}`);
    return { status: 'unknown', xrelId: null, xrelUrl: null, releaseCount: 0, camCount: 0 };
  }
}

/* ============================================================================
   TEIL 6 — DIE ABRUFE
   ============================================================================ */

/* ---------- 6.1 Die Kachel-Liste (Standardabruf) ---------- */
async function buildList(get, ctx) {
  const movies = await popularMovies(get, ctx);

  const out = [];
  for (const m of movies) {
    const match = await matchXrel(ctx, m);
    out.push({
      id: m.tmdbId,
      title: m.title,
      originalTitle: m.originalTitle !== m.title ? m.originalTitle : null,
      year: m.year,
      tmdbUrl: m.tmdbUrl,
      status: match.status,
      xrelId: match.xrelId,
      xrelUrl: match.xrelUrl,
      // Zwei Zahlen: echte Releases (ohne Kino-Abfilmung) und CAM/TS separat.
      // Der CAM-Filter im Frontend rechnet daraus die angezeigte Zahl und die
      // Ampelfarbe, ohne einen neuen Abruf zu brauchen.
      releaseCount: match.releaseCount,
      camCount: match.camCount,
    });
  }
  return out;
}

/* ---------- 6.2 Die Release-Liste (fuers Modal) ----------
   Nutzt loadReleases (Teil 5.2), teilt sich also den Cache mit der Zaehlung —
   nach dem Kachel-Abruf ist der Klick praktisch gratis. `includeCam` steuert,
   ob Kino-Abfilmungen mitkommen; der Client schickt es passend zum Toggle. */
function normalizeRelease(r, scene) {
  if (!r) return null;
  const dirname = r.dirname || '';
  const video = r.video_type || '';
  return {
    id: String(r.id || dirname || ''),
    dirname,
    group: r.group_name || (r.group && r.group.name) || '',
    time: Number(r.time) || 0,
    video,
    audio: r.audio_type || '',
    size: (r.size && r.size.number) ? `${r.size.number} ${r.size.unit || ''}`.trim() : '',
    url: /^https?:\/\//i.test(r.link_href || '') ? r.link_href : null,
    scene,
    cam: isCamRelease(dirname, video),
  };
}

async function releasesFor(ctx, extInfoId, includeCam) {
  const all = await loadReleases(ctx, extInfoId);
  return all
    .filter((r) => includeCam || !r.cam)
    .slice(0, RELEASE_LIST_LIMIT);
}

/* ============================================================================
   TEIL 7 — DAS MODUL
   ============================================================================ */

// xrel-ext_info-Ids sind kurze alphanumerische Zeichenketten. Der Wert geht in
// eine fest verdrahtete xrel-URL (kein Dateisystem, kein Kommando) — die enge
// Zeichenklasse ist trotzdem die richtige erste Schranke.
function validXrelId(id) {
  return /^[a-zA-Z0-9]{1,32}$/.test(String(id || ''));
}

module.exports = {
  id: 'tmdb-xrel',
  label: 'TMDB × xrel',

  // 6 h Push/Cache-Takt: die Beliebt-Liste aendert sich langsam, und ein
  // haeufigerer Takt wuerde das Stundenkontingent von xrel unnoetig belasten.
  ttl: 6 * 3600 * 1000,

  // Nur EIN Geheimnis: die xrel-Lesezugriffe sind oeffentlich (kein Token).
  secrets: [
    { key: 'TMDB_TOKEN', label: 'TMDB Read Access Token', masked: true },
  ],
  configured: (get) => !!get('TMDB_TOKEN'),
  notConfigured: { ok: false, error: 'not_configured', movies: [] },
  errorFields: { movies: [] },

  async fetch(get, ctx) {
    const movies = await buildList(get, ctx);
    return { ok: true, fetchedAt: new Date().toISOString(), movies };
  },

  routes(app, { ctx }) {
    // Release-Liste fuer das Detail-Modal.
    app.get('/api/tmdb-xrel/releases', async (req, res) => {
      const id = String(req.query.id || '');
      if (!validXrelId(id)) return res.status(400).json({ ok: false, error: 'bad_id' });
      // Standard: CAM/TS ausblenden. Nur ?cam=1 zeigt sie im Modal.
      const includeCam = String(req.query.cam || '') === '1';
      res.set('Cache-Control', 'no-store');
      try {
        const releases = await releasesFor(ctx, id, includeCam);
        res.json({ ok: true, id, releases });
      } catch (err) {
        console.error('[tmdb-xrel]', err.message);
        const limited = err.message === 'rate_limited';
        res.status(limited ? 429 : 502)
          .json({ ok: false, error: limited ? 'rate_limited' : 'fetch_failed', message: err.message });
      }
    });
  },

  // Fuer den Smoke-Test: reine Funktionen, ohne Netz pruefbar.
  _internals: {
    normalizeText, stripSubtitle, imdbIdFrom, candidateImdb, titleMatches,
    normalizeMovie, normalizeRelease, validXrelId, isCamRelease, countReleases,
  },
};
