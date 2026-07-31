'use strict';

/* ============================================================================
   Game Releases — Spiele-Neuerscheinungen (IGDB)
   ============================================================================

   WAS DAS MODUL BEANTWORTET
   Vier Fragen, jede mit einer eigenen Funktion und einer eigenen Route:

     "Was erscheint heute / an Tag X?"   releasesForDay()   Teil 6.1
     "Was kommt als Naechstes?"          upcoming()         Teil 6.2
     "Erzaehl mir mehr ueber Spiel Y"    gameDetail()       Teil 6.3
     "Wann kommt eigentlich Z raus?"     searchGames()      Teil 6.4

   WOHER DIE DATEN KOMMEN
   Fuehrend ist IGDB (gehoert zu Twitch), weil RAWG.io fuer den laufenden Tag
   praktisch nichts liefert: ueber 42 Tage gemessen 0-3 Eintraege taeglich
   gegenueber 54 bei IGDB. Der Zugang laeuft ueber eine Twitch-App
   (Client-ID + Secret) und ein Client-Credentials-Token, das ~56 Tage gilt.
   Ohne beide Werte meldet configured() false — dann geht kein einziger
   Request nach draussen.

   Was IGDB nicht hat, holen Nebenquellen:

     Steam-Store    deutsche Beschreibung UND Preis (ein Abruf, zwei Angaben)
     Wikipedia DE   Beschreibung, falls es keine deutsche Steam-Seite gibt
     _gamepass.js   ob der Titel im Game-Pass-Katalog steht

   DATENFLUSS DES TAGESABRUFS

     Registry ──> fetch() ──> releasesForDay()
                                │
                                ├─ dayRows() x2      IGDB: Spiele + Add-ons
                                ├─ groupReleases()   mehrere Termine -> 1 Eintrag
                                ├─ normalizeEntry()  IGDB-Rohform -> Kachel-Form
                                ├─ popularityFor()   IGDB-Kennzahlen
                                ├─ rankPopularity()  Kennzahlen -> Rang im Tag
                                ├─ sortByRelevance()
                                ├─ translateTop()    Steam / Wikipedia
                                └─ applyGamePass()   Katalog-Abgleich

   AUFBAU DIESER DATEI
   Die Teile bauen strikt aufeinander auf — jeder benutzt nur, was ueber ihm
   steht. Wer die Datei von oben nach unten liest, hat nie eine offene Frage
   im Ruecken.

     Teil 1  Konstanten und Uebersetzungstabellen (reine Daten, kein Code)
     Teil 2  Werkzeugkasten: Caches, Datum, Text (weiss nichts von IGDB)
     Teil 3  IGDB-Zugang: Token, Rate-Limit, igdb(), Feldlisten
     Teil 4  Normalisieren: eine IGDB-Zeile wird ein Kachel-Objekt
     Teil 5  Anreichern: Popularity, Game Pass, Steam, Beschreibung, Preis
     Teil 6  Die vier Abfragen (siehe oben)
     Teil 7  Bild-Proxy
     Teil 8  Das Modul-Manifest, das die Registry einliest

   MUSTER, DIE HIER STAENDIG WIEDERKEHREN
   Wer den Code als Vorlage nimmt, nimmt am besten diese fuenf mit:

   1. Anreicherung darf die Kachel nie kippen. Beschreibung, Preis, Game Pass
      und Popularity sind Kuer. Jede dieser Funktionen faengt ihre Fehler
      selbst ab und liefert im Zweifel weniger — nie eine Exception nach oben.
      Die Pflicht (die Release-Liste) darf an der Kuer nicht scheitern.

   2. Ids statt Namen als Tabellenschluessel. IGDB benennt Genres und
      Plattformen gelegentlich um, die Ids bleiben. Faellt eine Id durch die
      Tabelle, bleibt der englische Originalname stehen — lieber englisch als
      leer.

   3. Normalisieren an der Grenze. Alles, was den Server verlaesst, hat die
      flache Form aus normalizeEntry() bzw. gameDetail(). Die Kachel kennt die
      IGDB-Struktur nicht, und ein Feldwechsel beim Upstream bleibt hier lokal.

   4. Jede Frage bekommt ihren eigenen Cache mit eigener Laufzeit (Teil 2.1).
      Stammdaten duerfen 24 h alt sein, ein Preis nicht.

   5. Fremddaten immer gedeckelt: Zeichenketten gekuerzt (clip, PRICE_MAX_CHARS),
      Bilder nach Bytes begrenzt und gegen eine Host-Allowlist geprueft, alles
      in eine Query nur ueber quote() bzw. toId().

   ACHTUNG BEI AENDERUNGEN AN DEN ABFRAGEN
   IGDB hat Felder umbenannt: category -> date_format, region -> release_region,
   age_ratings.category -> rating_category + organization, websites.category ->
   websites.type. Die alten Namen werfen KEINEN Fehler, sie liefern still null.
   Eine Abfrage, die sich falsch anfuehlt, prueft man mit:
       node scripts/igdb-check.mjs
   ============================================================================ */

// Unterstrich = Helfer, kein Modul (server/registry.js ueberspringt ihn).
const gamepass = require('./_gamepass');

/* ============================================================================
   TEIL 1 — KONSTANTEN UND TABELLEN
   ----------------------------------------------------------------------------
   Hier steht nur, was mehrere Teile teilen oder was eine bewusste Entscheidung
   festhaelt ("was zaehlt als Release?"). Konstanten, die genau eine Funktion
   betreffen, stehen bei dieser Funktion — dort sind sie leichter zu finden und
   leichter zu aendern.
   ============================================================================ */

/* ---------- 1.1 Endpunkte und Grenzen ---------- */

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

// Das Dashboard steht in Deutschland — der "heutige Tag" ist der hiesige.
const TIMEZONE = 'Europe/Berlin';

/* ---------- 1.2 Wie viel geholt wird ---------- */

/* Ein Tag hat gemessen ~55 Termine; 400 faengt auch Ausreisser ab.
   ACHTUNG falls das je zu klein wird: `sort date asc` hilft beim Blaettern
   nicht weiter, weil alle Zeilen eines Tages denselben Zeitstempel tragen
   (IGDB legt `date` auf 00:00 UTC). Ein `offset` darauf liefert Zeilen
   doppelt oder gar nicht — dann muss erst die Sortierung auf `id asc`
   wechseln. Gemessen am 29.07.2026: 69 Zeilen von 400, also weit weg. */
const DAY_LIMIT = 400;
const SEARCH_LIMIT = 8;
const UPCOMING_LIMIT = 12;
const SUMMARY_CHARS = 600;

/* ---------- 1.3 Was als Release zaehlt ----------
   IGDBs `game_type`. Die beiden Listen sind der inhaltliche Kern des Moduls:
   sie entscheiden, was ueberhaupt auf der Kachel landen kann. Der Smoke-Test
   prueft beide gegeneinander ab, weil ein Fehler hier still falsche Zeilen
   erzeugt statt eines Fehlers. */

/* 0 Main Game, 4 Standalone Expansion, 8 Remake, 9 Remaster,
   10 Expanded Game, 11 Port. Bewusst NICHT dabei: DLC (1), Expansion (2),
   Bundle (3), Mod (5), Episode (6), Season (7), Pack (13), Update (14).

   Der Filter kostete beim Bauen einen Anlauf: mit `game_type = 0` fehlten
   "Halo: Campaign Evolved" (Remake) und "Gothic Classic" (Port), also
   ausgerechnet die beiden Titel des Testtags. */
const GAME_TYPES = [0, 4, 8, 9, 10, 11];

/* Add-ons holt eine ZWEITE Abfrage, nicht die Liste oben. Zwei Gruende:
   die Zusicherung im Smoke-Test ("DLC, Expansion, Bundle, Mod, Pack und
   Update bleiben draussen") ist ein Regressionsschutz, der seinen Sinn
   verliert, sobald man GAME_TYPES aufweicht — und mit zwei Abfragen hat
   jede ihr eigenes `limit`, statt dass Add-on-Zeilen an einem DLC-schweren
   Tag echte Releases aus dem Budget draengen.

   Dass sie ueberhaupt hereinkommen, war eine Entscheidung gegen den alten
   Grundsatz "das sind keine Neuerscheinungen": auf ein Kosmetik-Pack trifft
   er zu, auf "The Elder Scrolls Online: Season One" nicht. Das Volumen
   traegt es, gemessen ueber drei Tage waren es 1 bis 3 Add-ons taeglich.
   Der Schalter in der Kachel entscheidet, ob sie angezeigt werden.

   Bundle (3), Mod (5), Fork (12), Pack (13) und Update (14) bleiben auch
   damit draussen — das sind keine Releases. */
const ADDON_TYPES = [1, 2, 6, 7]; // DLC, Erweiterung, Episode, Season

/* ---------- 1.4 Bekanntheit ----------
   `hypes` allein reichte nicht. Es ist IGDBs *Vorab*-Zaehler (wer merkt ein
   kommendes Spiel vor) und am Erscheinungstag regelmaessig leer:
   "Company of Heroes 3: Final Stand" (29.07.2026, 30 Euro, Relic/SEGA) hatte
   weder hypes noch rating noch aggregated_rating und fiel deshalb aus der
   Kachel, waehrend die Lupe es fand und "erscheint noch" sagte — genau die
   Asymmetrie, die den Fehler ausgeloest hat. An dem Tag gemessen: von 48
   Spielen passierten 15 die Stufe "Ausgewogen", und `follows` war bei allen
   48 leer.

   /popularity_primitives liefert stattdessen laufende Kennzahlen, auch fuer
   taufrische Titel: 45 der 48 hatten Werte, "Final Stand" stand auf Rang 4.
   Verglichen wird ueber den RANG innerhalb des Tages, nie ueber den Rohwert —
   die Werte sind normalisierte Bruchzahlen und nur innerhalb eines Typs
   vergleichbar (siehe rankPopularity, Teil 5.1). */
const POPULARITY_TYPES = [
  1,  // IGDB Visits
  2,  // IGDB Want to Play
  5,  // Steam 24hr Peak Players
  9,  // Steam Global Top Sellers
  10, // Steam Most Wishlisted Upcoming
];

const POP_LIMIT = 500; // IGDB-Maximum, hart: 501 antwortet mit HTTP 403

/* Spiel-Ids pro Anfrage. 90 statt 100, damit der schlechteste Fall (jedes
   Spiel hat jede Kennzahl) mit 450 Zeilen unter POP_LIMIT bleibt: bei genau
   500 waere nicht zu unterscheiden, ob es gepasst hat oder abgeschnitten
   wurde. Ein Tag hat gemessen 50-75 Spiele, das bleibt also eine Anfrage. */
const POP_CHUNK = 90;

/* ---------- 1.5 Uebersetzungstabellen ----------
   Schluessel sind IGDB-Ids, nicht Namen: Ids sind stabil, Namen nicht.
   Faellt eine Id durch, bleibt der englische Originalname stehen — lieber
   englisch als leer. (Muster 2 im Dateikopf.) */

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

/* Plattformen: kurzes Label fuer die Chips + Familie fuer den Filter der
   Kachel. Abgedeckt ist, was in 28 Tagen tatsaechlich vorkam, plus die
   naheliegenden Nachbarn. Die Familien muessen zu den Filteroptionen in
   public/modules/game-releases.js passen — der Smoke-Test prueft das. */
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
   USK ist Organisation 4 — fuer ein deutsches Dashboard die interessanteste,
   deshalb steht sie in AGE_ORG_ORDER vor PEGI. */
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

/* ============================================================================
   TEIL 2 — WERKZEUGKASTEN
   ----------------------------------------------------------------------------
   Allgemeines Handwerkszeug ohne jeden Bezug zu IGDB oder Spielen. Es liesse
   sich unveraendert in ein anderes Modul kopieren — genau daran erkennt man,
   dass die Schichttrennung stimmt.
   ============================================================================ */

/* ---------- 2.1 Caches ----------
   Die Registry cacht nur den Modul-Slot (= heutiger Tag). Datumspruenge,
   Suche und Detailfenster brauchen eigene Toepfe mit eigenen Laufzeiten. */

/* Eine LRU-Map mit Ablaufzeit, ~20 Zeilen, ohne Abhaengigkeit.
   Der Kniff steckt in get(): `map.delete(key); map.set(key, hit)` schiebt den
   Eintrag ans Ende der Einfuegereihenfolge. Da eine Map ihre Schluessel genau
   in dieser Reihenfolge herausgibt, ist `map.keys().next().value` immer der am
   laengsten nicht benutzte Eintrag — mehr braucht ein LRU nicht. */
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

/* Alle Toepfe an einer Stelle, damit die Laufzeiten vergleichbar sind. Die
   Frage ist jedes Mal dieselbe: wie lange darf diese Antwort danebenliegen?

     dayCache       6 h   ein vergangener Tag aendert sich gar nicht mehr,
                          ein kommender selten
     upcomingCache  1 h   nur ein Eintrag: die Liste ist fuer alle gleich
     searchCache    1 h   dieselbe Eingabe zweimal soll nichts kosten
     detailCache   24 h   IGDB-Stammdaten eines Spiels sind traege
     steamCache     3 h   kurz genug, dass ein beginnender oder endender Sale
                          nicht lange falsch dasteht (siehe steamAppDetails)
     teaserCache   24 h   uebersetzte Kurztexte, so traege wie ihre Quelle */
const dayCache = makeCache(60, 6 * 3600 * 1000);
const upcomingCache = makeCache(1, 3600 * 1000);
const searchCache = makeCache(100, 3600 * 1000);
const detailCache = makeCache(200, 24 * 3600 * 1000);
const steamCache = makeCache(200, 3 * 3600 * 1000);
const teaserCache = makeCache(400, 24 * 3600 * 1000);

/* Parallele Anfragen auf denselben Schluessel teilen sich einen Abruf —
   dasselbe, was die Registry mit withInflight fuer den Modul-Slot macht.
   Ohne das holen drei gleichzeitig geoeffnete Tabs dieselben Daten dreimal. */
const _inflight = new Map();

function once(key, fn) {
  const running = _inflight.get(key);
  if (running) return running;
  const p = fn().finally(() => _inflight.delete(key));
  _inflight.set(key, p);
  return p;
}

// Der uebliche Dreisatz: Treffer zurueck, sonst genau einmal holen und ablegen.
async function cached(cache, key, fn) {
  const hit = cache.get(key);
  if (hit) return hit;
  return once(key, async () => {
    const data = await fn();
    cache.put(key, data);
    return data;
  });
}

/* ---------- 2.2 Datum ----------
   IGDB legt `date` auf 00:00 UTC des Kalendertags. Der Nutzer meint aber den
   hiesigen Kalendertag, deshalb wird der erst in Europe/Berlin bestimmt und
   dann als UTC-Mitternacht gerechnet — sonst zeigt die Kachel abends schon
   den Folgetag. */

// en-CA formatiert als YYYY-MM-DD, das spart eigenes Zusammenbauen.
function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function isValidIso(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  // Faengt den 31.02. ab: Date normalisiert still auf den 03.03. Nur der
  // Rueckweg ueber toISOString deckt das auf.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

// Die Unix-Sekunden-Grenzen eines Tages, so wie IGDB sie in `where` erwartet.
function dayBounds(iso) {
  const start = Date.parse(`${iso}T00:00:00Z`) / 1000;
  return { start, end: start + 86400 };
}

function isoOf(unixSeconds) {
  return Number.isFinite(unixSeconds)
    ? new Date(unixSeconds * 1000).toISOString().slice(0, 10)
    : null;
}

/* ---------- 2.3 Text ---------- */

// Fremdtext kommt mit Zeilenumbruechen und beliebiger Laenge herein. clip()
// ist die einzige Stelle, an der beides geradegezogen wird (Muster 5).
function clip(text, max = SUMMARY_CHARS) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/* ============================================================================
   TEIL 3 — IGDB-ZUGANG
   ----------------------------------------------------------------------------
   Ab hier kennt der Code IGDB. Alle Abfragen des Moduls laufen durch genau
   eine Funktion: igdb(). Sie kuemmert sich um Token, Token-Erneuerung und
   Rate-Limit, damit das keine der vier Abfragen aus Teil 6 selbst tun muss.
   ============================================================================ */

/* ---------- 3.1 Token ----------
   Client-Credentials-Token, gemessen ~56 Tage gueltig. Im Speicher halten und
   nur erneuern, wenn er ablaeuft oder IGDB 401 meldet; ein Neustart holt sich
   ohnehin einen frischen. Kein Grund, ihn auf die Platte zu schreiben. */

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

/* ---------- 3.2 Rate-Limit ----------
   IGDB deckelt bei 4 Anfragen/Sekunde und antwortet sonst mit 429. Eine
   serielle Kette mit Mindestabstand ist hier genug: die Kachel feuert nie mehr
   als eine Handvoll Abfragen auf einmal.

   Das Prinzip: _queue ist ein Promise, das immer auf den zuletzt
   eingereihten Aufruf zeigt. Jeder neue Aufruf haengt sich hinten an und
   wartet vorher den Mindestabstand ab. Deshalb duerfen die Aufrufer in Teil 6
   bedenkenlos Promise.all() benutzen — serialisiert wird trotzdem hier. */

let _queue = Promise.resolve();
let _lastCall = 0;

function throttled(fn) {
  const run = _queue.then(async () => {
    const wait = MIN_REQUEST_GAP_MS - (Date.now() - _lastCall);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    _lastCall = Date.now();
    return fn();
  });
  // Die Kette darf nicht an einem Fehler haengenbleiben: der Nachfolger haengt
  // an einer Variante, die immer erfuellt wird.
  _queue = run.then(() => {}, () => {});
  return run;
}

/* ---------- 3.3 Die einzige Abfragefunktion ----------
   `query` ist Apicalypse (IGDBs eigene Abfragesprache) und geht als
   text/plain in den Body. Fremdtext darf dort nur ueber quote() bzw. toId()
   hinein — siehe 3.4. */

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
      // Ein abgelaufener oder zurueckgezogener Token faellt nur hier auf:
      // einmal mit erzwungener Erneuerung nachfassen, dann geben wir auf.
      if (!/HTTP 401/.test(err.message)) throw err;
      return call(await getToken(get, ctx, true));
    }
  });
}

/* ---------- 3.4 Fremdtext in einer Abfrage ----------
   Apicalypse kennt kein Prepared Statement. Alles, was aus einem Request
   stammt, geht deshalb ausschliesslich ueber diese beiden Funktionen in eine
   Query — der Smoke-Test prueft sie mit Einschleusversuchen. */

function quote(s) {
  // Anfuehrungszeichen und Backslash entwerten, Steuerzeichen raus.
  return String(s).replace(/[\\"]/g, '\\$&').replace(/[\u0000-\u001f]/g, ' ');
}

// Ids werden nicht zitiert, sondern auf eine echte positive Ganzzahl
// eingeengt — was das nicht ist, wird gar nicht erst zur Abfrage.
function toId(v) {
  const n = Number(String(v));
  return Number.isInteger(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER ? n : null;
}

/* ---------- 3.5 Feldlisten ----------
   Apicalypse holt nur, was ausdruecklich in `fields` steht. Zwei Listen, weil
   die Tagesabfrage ~55 Zeilen liefert und die Detailabfrage genau eine: was
   nur im Detailfenster steht, hat in LIST_FIELDS nichts verloren.

   ACHTUNG: IGDB weist eine Abfrage komplett ab, wenn ein Feld zu tief
   expandiert wird. Drei Segmente sind erprobt (game.cover.image_id), vier
   nicht — der Smoke-Test haelt das fest. */

const LIST_FIELDS = [
  'date', 'release_region', 'status',
  'platform.id', 'platform.name', 'platform.abbreviation',
  'game.id', 'game.name', 'game.slug', 'game.summary', 'game.hypes',
  'game.total_rating', 'game.total_rating_count', 'game.aggregated_rating',
  'game.game_type', 'game.cover.image_id', 'game.genres.id', 'game.genres.name',
  // Elternspiel eines Add-ons: traegt den Namen fuer den Tooltip und die
  // Bekanntheit, die ein frisches DLC selbst nie hat.
  'game.parent_game.name', 'game.parent_game.total_rating_count',
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

/* ============================================================================
   TEIL 4 — NORMALISIEREN
   ----------------------------------------------------------------------------
   Aus IGDB-Rohzeilen wird die flache Form, die die Kachel erwartet. Das ist
   Muster 3 aus dem Dateikopf: hinter dieser Schicht kennt niemand mehr die
   Struktur des Upstreams.

   Der Weg einer Tageszeile:
       IGDB release_dates ──> groupReleases() ──> normalizeEntry() ──> Kachel
   ============================================================================ */

/* ---------- 4.1 Einzelfelder ---------- */

/* Bilder gehen nie direkt an den Browser, sondern ueber den eigenen Proxy —
   so spricht der Browser weiterhin ausschliesslich mit dem Dashboard.
   Gegenstueck: Teil 7. */
function proxyUrl(url) {
  return `/api/game-releases/image?u=${encodeURIComponent(url)}`;
}

// `size` ist ein IGDB-Groessenkuerzel, z. B. t_cover_big_2x oder t_1080p.
function imageUrl(imageId, size) {
  return imageId ? proxyUrl(`${IMAGE_BASE}/${size}/${imageId}.jpg`) : null;
}

// Unbekannte Plattform? Dann das IGDB-Kuerzel und die Familie "other" —
// die Zeile bleibt vollstaendig, nur der Filter greift nicht.
function platformOf(p) {
  if (!p || !p.id) return null;
  const known = PLATFORMS[p.id];
  return {
    id: p.id,
    label: known ? known.label : (p.abbreviation || p.name || '?'),
    family: known ? known.family : 'other',
  };
}

// Die Kachel braucht von einer Plattform nur diese beiden Felder; die `id`
// ist Serversache und bleibt hier.
function toChips(platforms) {
  return platforms.map((p) => ({ label: p.label, family: p.family }));
}

function genresOf(game) {
  return (game.genres || []).map((g) => GENRES_DE[g.id] || g.name).filter(Boolean);
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

/* ---------- 4.2 Termine zu Eintraegen buendeln ----------
   IGDB liefert pro Spiel UND Plattform eine Zeile. "Spiel X erscheint heute
   auf PC, PS5 und Switch" sind dort drei Zeilen — auf der Kachel ist es eine
   mit drei Chips. */

/* Region wird bewusst NICHT in der Query gefiltert: gemessen sind praktisch
   alle Termine `8` (weltweit), ein Filter wuerde nur die seltenen regionalen
   Eintraege verlieren. Stattdessen gewinnt beim Buendeln Europa (1) vor
   weltweit (8); alles andere hat keinen Rang und verliert gegen beide. */
const REGION_RANK = { 1: 0, 8: 1 };

function groupReleases(rows) {
  const byGame = new Map();
  for (const row of rows) {
    const game = row.game;
    // Eine Zeile ohne Spiel ist fuer die Kachel wertlos.
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

    // Early Access / Alpha soll sichtbar bleiben, auch wenn nur eine der
    // Plattformen so ausgeliefert wird — der erste Treffer gewinnt.
    if (row.status && STATUS_DE[row.status] && !entry.status) entry.status = row.status;
  }
  return [...byGame.values()];
}

/* ---------- 4.3 Die Kachel-Form ----------
   Das Ergebnis ist absichtlich flach und vollstaendig: jedes Feld existiert
   immer, notfalls als null. Die Kachel muss dann nie zwischen "fehlt" und
   "gibt es nicht" unterscheiden.

   Drei Felder werden erst spaeter gefuellt (Teil 5): popRank/popTypes von
   rankPopularity(), gamePass von applyGamePass(). Sie stehen trotzdem schon
   hier, damit die Form der Objekte nie davon abhaengt, was unterwegs
   funktioniert hat. */
function normalizeEntry(entry, iso, addon = false) {
  const game = entry.game;
  const platforms = [...entry.platforms.values()];
  const parent = game.parent_game;
  return {
    id: game.id,
    name: game.name,
    slug: game.slug || null,
    date: iso,
    platforms: toChips(platforms),
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
    // Aus welcher der beiden Tagesabfragen die Zeile kam. Die Kachel blendet
    // Add-ons darueber ein und aus.
    addon,
    /* Elternspiel nur bei Add-ons. `ratings` ist die Bekanntheit des
       Elternspiels — ein frisches DLC hat nie eigene Wertungen, und ohne
       diesen Umweg wuerde die Relevanzstufe es sofort wieder ausblenden.
       `hypes` erbt bewusst NICHTS: der Wert des Elternspiels wuerde die
       Sortierung und die Zahl auf der Kachel verfaelschen. */
    parent: (addon && parent && parent.name)
      ? { name: parent.name, ratings: Number(parent.total_rating_count) || 0 }
      : null,
    // Rang im Tagesvergleich, gesetzt von rankPopularity(). null = IGDB hat
    // fuer das Spiel keine Popularity-Kennzahl.
    popRank: null,
    popTypes: null,
    // { console, pc, eaPlay } sobald der Game-Pass-Katalog es hergibt,
    // sonst null. Gesetzt wird das nachtraeglich in applyGamePass().
    gamePass: null,
  };
}

/* ============================================================================
   TEIL 5 — ANREICHERN
   ----------------------------------------------------------------------------
   Fuenf Nachlaeufe auf einer fertigen Liste. Alle folgen Muster 1: sie
   schlucken ihre Fehler und liefern im Zweifel weniger, statt den Abruf
   scheitern zu lassen. Ein fehlender Chip ist ein Schoenheitsfehler, eine
   leere Kachel waere einer.
   ============================================================================ */

/* ---------- 5.1 Popularity: Rang statt Rohwert ---------- */

/* Die Kennzahlen zu einer Menge Spiel-Ids. Schluckt jeden Fehler: das Modul
   lief lange ohne diesen Endpoint, und ein Ausfall darf die Kachel nicht
   leeren, sondern nur auf das alte Verhalten zurueckfallen. Der Dateikopf
   erklaert, warum das hier besonders wichtig ist: umbenannte IGDB-Felder
   liefern keinen Fehler, sondern still null. */
async function popularityFor(get, ctx, ids) {
  const pop = new Map();
  for (let i = 0; i < ids.length; i += POP_CHUNK) {
    const chunk = ids.slice(i, i + POP_CHUNK);
    try {
      const rows = await igdb(get, ctx, 'popularity_primitives',
        'fields game_id, popularity_type, value;'
        + ` where game_id = (${chunk.join(',')})`
        + ` & popularity_type = (${POPULARITY_TYPES.join(',')});`
        + ` limit ${POP_LIMIT};`);
      if (Array.isArray(rows) && rows.length >= POP_LIMIT) {
        // Sollte POP_CHUNK verhindern. Faellt es doch auf, fehlen Raenge.
        ctx.warn(`Popularity: ${rows.length} Zeilen am Limit — POP_CHUNK senken`);
      }
      // Ergebnis: Map<Spiel-Id, Map<Kennzahl-Typ, Wert>>
      for (const row of (Array.isArray(rows) ? rows : [])) {
        const value = Number(row.value);
        if (!row.game_id || !row.popularity_type || !Number.isFinite(value)) continue;
        if (!pop.has(row.game_id)) pop.set(row.game_id, new Map());
        pop.get(row.game_id).set(row.popularity_type, value);
      }
    } catch (err) {
      ctx.warn(`Popularity: ${err.message}`);
    }
  }
  return pop;
}

/* Pro Kennzahl eine Rangliste ueber die Spiele des Tages; jedes Spiel behaelt
   seinen BESTEN Rang. Der Rang statt des Rohwerts, weil IGDB normalisierte
   Bruchzahlen liefert, die nur innerhalb eines Typs vergleichbar sind — und
   weil ein Rang im Tagesvergleich unabhaengig davon bleibt, wie IGDB die
   Normalisierung morgen aendert.

   Der beste statt des durchschnittlichen Rangs ist Absicht: ein Titel, der
   bei vier Kennzahlen unauffaellig ist und bei einer weit vorn steht, ist
   relevant. Genau das war der Fall des gemeldeten Titels.

   Aendert die Liste in place und gibt sie zurueck. */
function rankPopularity(items, pop) {
  for (const type of POPULARITY_TYPES) {
    const ranked = items
      .filter((it) => pop.get(it.id) && pop.get(it.id).has(type))
      .sort((a, b) => pop.get(b.id).get(type) - pop.get(a.id).get(type));
    ranked.forEach((item, i) => {
      const rank = i + 1;
      if (item.popRank == null || rank < item.popRank) item.popRank = rank;
      (item.popTypes || (item.popTypes = [])).push({ type, rank });
    });
  }
  return items;
}

// Kein Rang heisst "ganz hinten", nicht "ganz vorn" — deshalb Infinity und
// nicht 0. Ein haeufiger Fehler bei Sortierungen mit Luecken.
function popRankOf(item) {
  return item.popRank == null ? Infinity : item.popRank;
}

/* Popularity fuehrt, `hypes` ist nur noch Nachrang: nach der alten Reihenfolge
   stand "Company of Heroes 3: Final Stand" (hypes 0) hinter dreizehn
   No-Name-Titeln mit hypes 1 bis 3 — selbst unter "Alles anzeigen". Spiele
   ohne Popularity-Daten landen hinten, und ein Add-on ueberholt bei gleichem
   Rang nie ein Vollspiel.

   Die Kette aus `||` ist die uebliche Form fuer eine mehrstufige Sortierung:
   jede Stufe liefert 0 bei Gleichstand und gibt damit an die naechste ab. */
function sortByRelevance(items) {
  return items.sort((a, b) => (popRankOf(a) - popRankOf(b))
    || (Number(!!a.addon) - Number(!!b.addon))
    || (b.hypes - a.hypes)
    || ((b.criticRating || 0) - (a.criticRating || 0))
    || a.name.localeCompare(b.name, 'de'));
}

/* ---------- 5.2 Game Pass ----------
   Nachlauf statt Bestandteil des Abrufs: der Katalog ist eine fremde
   Zusatzinfo, kein Teil der Releases. Faellt er aus, fehlt ein Chip — die
   Kachel selbst darf daran nie scheitern.

   `wait` nur beim Abruf der Kachel selbst: nach einem Neustart soll schon die
   erste Antwort Chips tragen. Suche und Detailfenster warten nie auf den
   Katalogaufbau. */
async function applyGamePass(ctx, items, opts = {}) {
  try {
    const idx = await gamepass.index(ctx, opts);
    if (!idx) return;
    for (const item of items) item.gamePass = gamepass.lookup(idx, item.name);
  } catch (err) {
    ctx.warn(`Game Pass: ${err.message}`);
  }
}

/* ---------- 5.3 Steam-Store ----------
   Eine Store-Seite, zwei Angaben: die deutsche Beschreibung (5.4) und der
   Preis (5.5) stehen in derselben Antwort. Der Abruf ist deshalb von der
   Auswertung getrennt — beides einzeln zu holen waere derselbe Request
   zweimal. */

// Nur der Steam-Eintrag mit rein numerischer uid — alles andere ist keine
// AppID und hat in einer Store-URL nichts zu suchen.
function steamAppId(game) {
  return (game.external_games || [])
    .filter((e) => e.external_game_source === SOURCE_STEAM && /^\d+$/.test(String(e.uid || '')))
    .map((e) => e.uid)[0] || null;
}

async function steamAppDetails(ctx, appId) {
  return cached(steamCache, `steam:${appId}`, async () => {
    const data = await ctx.httpJson(
      // cc=de liefert Euro-Preise, l=german die deutsche Store-Seite.
      `${STEAM_URL}?appids=${encodeURIComponent(appId)}&cc=de&l=german`,
      { timeoutMs: DESC_TIMEOUT_MS, headers: { 'User-Agent': UA } },
    );
    const entry = data && data[String(appId)];
    const d = (entry && entry.success && entry.data) ? entry.data : null;
    /* Gecacht wird das Destillat, nicht die Rohantwort: die bringt
       Screenshots, Trailer und Erfolge mit und ist je Titel gut 100 KB gross —
       bei 200 Eintraegen waere das der halbe Prozessspeicher fuer zwei Felder.
       Und immer ein Objekt, nie ein blankes null: cached() prueft den Treffer
       auf Wahrheitswert, ein Titel ohne Steam-Seite wuerde sonst bei jedem
       Oeffnen neu abgefragt. */
    return {
      texts: d ? { short_description: d.short_description, about_the_game: d.about_the_game } : null,
      // Der einzige Vorgriff in dieser Datei: steamPrice() steht in 5.5, bei
      // den uebrigen Preis-Funktionen. Dort gehoert es hin — hier faellt der
      // Preis nur ab, weil die Antwort ohnehin schon da ist.
      price: d ? steamPrice(d, appId) : null,
    };
  });
}

/* ---------- 5.4 Deutsche Beschreibung ----------
   Reihenfolge: Steam-Store auf Deutsch, sonst deutsche Wikipedia, sonst bleibt
   der englische IGDB-Text stehen. Der Client zeigt dann einen EN-Marker, statt
   so zu tun, als waere es Deutsch — lieber ehrlich englisch als falsch
   etikettiert. */

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

/* Steam antwortet auf l=german auch dann mit success:true, wenn es gar keine
   deutsche Store-Seite gibt — dann steht dort einfach der englische Text.
   Ohne diese Pruefung landet er mit einem "deutsch"-Etikett auf der Kachel.
   Zwei kleine Wortlisten reichen: die Funktionswoerter beider Sprachen
   ueberschneiden sich nicht. */
const DE_WORDS = /\b(und|ist|sind|ein|eine|einen|einem|der|die|das|den|dem|mit|für|von|im|auf|sich|als|wird|werden|nicht|dich|dir|deine|deinen|durch|über|zwischen)\b/gi;
const EN_WORDS = /\b(and|is|are|the|with|for|from|your|you|this|that|will|not|through|between|into|their)\b/gi;

function looksGerman(text) {
  const s = String(text || '');
  // Unter 25 Zeichen ist die Stichprobe zu klein fuer eine Aussage.
  if (s.length < 25) return false;
  const de = (s.match(DE_WORDS) || []).length;
  const en = (s.match(EN_WORDS) || []).length;
  return de > en;
}

const PREORDER_RE = /\b(vorab|vorbestell|pre-?order)/i;

/* Vorbesteller-Seiten fuehren mit dem Bonus-Paket statt mit dem Spiel
   ("Kauf X vorab und hol dir das Ruestungs-Pack ..."). Der beschreibende Teil
   steht dahinter in about_the_game und beginnt fast immer mit "<Titel> ist
   ein ...". Findet sich der nicht, bleibt der Kurztext — deutsches Marketing
   ist immer noch besser als englischer Fliesstext. */
function steamDescription(data, name) {
  const short = clip(stripHtml(data.short_description));
  if (short && !PREORDER_RE.test(short)) return short;

  const about = stripHtml(data.about_the_game);
  // Untertitel abschneiden und den Rest als Regex entschaerfen — der Titel
  // kommt aus Fremddaten und darf das Muster nicht umbauen.
  const head = String(name).split(/[:–-]/)[0].trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = head ? about.search(new RegExp(`${head}[^.!?]{0,80}?\\bist\\b`, 'i')) : -1;
  if (start >= 0) return clip(about.slice(start));
  return short || null;
}

function steamGerman(texts, name) {
  if (!texts) return null;
  const text = steamDescription(texts, name);
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
  // Ohne diese Pruefung landet bei mehrdeutigen Titeln ("Control", "Prey")
  // ein Artikel ueber etwas voellig anderes in der Kachel.
  const haystack = extract.toLowerCase();
  const looksLikeGame = /\b(spiel|videospiel|computerspiel)\b/.test(haystack)
    || haystack.includes(title.toLowerCase());
  if (!looksLikeGame) return null;
  return { text: clip(extract), source: 'Wikipedia' };
}

// Liefert { text, source } oder null. Beide Quellen duerfen ausfallen.
async function germanSummary(ctx, game) {
  const steamId = steamAppId(game);

  if (steamId) {
    try {
      const hit = steamGerman((await steamAppDetails(ctx, steamId)).texts, game.name);
      if (hit) return hit;
    } catch (err) { ctx.warn(`Steam-Beschreibung (${game.name}): ${err.message}`); }
  }
  try {
    const hit = await wikipediaGerman(ctx, game.name);
    if (hit) return hit;
  } catch { /* Kein Artikel ist der Normalfall, kein Fehler */ }
  return null;
}

/* Die obersten Karten bekommen einen deutschen Kurztext.
   Bewusst nicht alle: an einem Tag stehen ~50 Spiele in der Liste, davon
   uebersteht rund die Haelfte den Relevanzfilter der Kachel. Fuer den Rest
   einen Fremdabruf zu machen, waere Text, den nie jemand liest.
   TEASER_TRANSLATE liegt darum knapp ueber dem, was die Kachel typischerweise
   zeigt — gemessen an vier Tagen 10 bis 25 Zeilen in "Ausgewogen", vorher
   3 bis 18. Seit die Sortierung an der Popularity haengt, treffen die
   Uebersetzungen ausserdem die Titel, die auch oben stehen; vorher entschied
   `hypes` darueber.

   Voraussetzung: die Liste ist bereits sortiert (sortByRelevance). */
const TEASER_TRANSLATE = 25;
const TEASER_CONCURRENCY = 3;

async function translateTop(ctx, items) {
  const todo = items.slice(0, TEASER_TRANSLATE);
  let next = 0;
  /* Drei Arbeiter auf einer gemeinsamen Warteschlange statt Promise.all ueber
     alle 25: so laufen nie mehr als drei Fremdabrufe gleichzeitig, und ein
     langsamer Titel blockiert die anderen nicht. `next++` ist hier sicher,
     weil JavaScript einen Tick nicht unterbricht. */
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
        // Auch der Fehlschlag wird gecacht, sonst fragt jeder Abruf erneut.
        teaserCache.put(key, hit);
      }
      if (hit.text) { item.teaser = hit.text; item.teaserLang = 'de'; }
    }
  };
  await Promise.all(Array.from({ length: TEASER_CONCURRENCY }, worker));
}

/* ---------- 5.5 Preis ----------
   IGDB kennt keine Preise, auch nicht in `external_games`. Die Angabe faellt
   deshalb aus der Steam-Antwort ab, die fuer die Beschreibung ohnehin schon
   geholt wird — ohne zusaetzlichen Fremdabruf und ohne neue Zugangsdaten.
   Der Preis gilt damit fuer Steam; ein reiner Konsolen-Titel hat keinen, und
   geraten wird nichts. */

// Fremde Zeichenkette in einer Faktenzeile: gedeckelt, damit sie das Fenster
// nicht auseinanderzieht.
const PRICE_MAX_CHARS = 24;

/* Mit cc=de setzt Steam den Betrag schon deutsch ("47,99€") und trifft Symbol
   und Stellung besser als jede eigene Rechnung. Nachgerechnet wird nur, wenn
   der String leer bleibt — nicht als Verbesserung, sondern als Notnagel. Das
   fehlende Leerzeichen vor der Einheit kommt dazu, sonst steht der Preis
   anders gesetzt da als der Rest der Kachel. */
function formatMoney(formatted, cents, currency) {
  // Nur die nachgestellte Einheit abtrennen ("47,99€"). Das Komma steht
  // ebenfalls zwischen Ziffern — ohne den Anker daran wird es mitgetroffen.
  const text = String(formatted || '').replace(/\s+/g, ' ').trim().replace(/(\d)\s*([^\d\s.,]+)$/, '$1 $2');
  if (text) return text.slice(0, PRICE_MAX_CHARS);
  if (!Number.isFinite(Number(cents)) || !currency) return null;
  // Ein unbekannter Waehrungscode wirft — dann lieber gar keine Angabe.
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(Number(cents) / 100);
  } catch { return null; }
}

// Drei Ausgaenge, und zwei davon sind kein Fehler: kostenlos, ein Preis, oder
// gar nichts (Vorbestellung ohne Preis, Konsolentitel ohne Steam-Seite).
function steamPrice(data, appId) {
  if (!data) return null;
  const url = `https://store.steampowered.com/app/${encodeURIComponent(appId)}/`;
  if (data.is_free) return { free: true, text: null, was: null, discount: 0, currency: null, source: 'Steam', url };

  const p = data.price_overview;
  const text = p && formatMoney(p.final_formatted, p.final, p.currency);
  // Noch nicht bepreiste Vorbestellungen sind der Normalfall, kein Fehler.
  if (!text) return null;
  const discount = Number(p.discount_percent) || 0;
  // Ohne Rabatt schickt Steam `initial_formatted` als leeren String — den als
  // Streichpreis zu uebernehmen, wuerde einen Rabatt behaupten, den es nicht gibt.
  const was = discount > 0 ? formatMoney(p.initial_formatted, p.initial, p.currency) : null;
  return { free: false, text, was: was || null, discount, currency: p.currency || null, source: 'Steam', url };
}

async function steamPriceFor(ctx, appId) {
  if (!appId) return null;
  try {
    return (await steamAppDetails(ctx, appId)).price;
  } catch (err) {
    // Ein nicht erreichbarer Store kostet den Preis, nie das Fenster.
    ctx.warn(`Steam-Preis (App ${appId}): ${err.message}`);
    return null;
  }
}

/* Der IGDB-Teil des Fensters aendert sich tagelang nicht und liegt darum 24 h
   im detailCache — ein Preis darf das nicht, sonst zeigt die Kachel einen
   Sale, der laengst vorbei ist. Er wird deshalb erst hier danebengelegt, auf
   einer KOPIE: das gecachte Objekt bleibt preislos. `steamAppId` ist
   Serversache und faellt dabei weg. */
async function withPrice(ctx, game) {
  if (!game) return game;
  const { steamAppId: appId, ...rest } = game;
  return { ...rest, price: await steamPriceFor(ctx, appId) };
}

/* ============================================================================
   TEIL 6 — DIE VIER ABFRAGEN
   ----------------------------------------------------------------------------
   Jetzt zahlt sich der Aufbau aus: jede der vier Funktionen liest sich als
   kurze Folge von Schritten, weil Zugang (Teil 3), Form (Teil 4) und
   Nebenquellen (Teil 5) schon geregelt sind.
   ============================================================================ */

/* ---------- 6.1 Ein Tag ---------- */

// Ein Tag, ein Satz Typen. Nur damit releasesForDay die Query-Zeichenkette
// nicht zweimal fuehren muss — bewusst ohne Blaettern, siehe DAY_LIMIT.
async function dayRows(get, ctx, start, end, types) {
  const rows = await igdb(get, ctx, 'release_dates',
    `fields ${LIST_FIELDS};`
    + ` where date >= ${start} & date < ${end} & date_format = 0`
    + ` & game.game_type = (${types.join(',')});`
    + ` sort date asc; limit ${DAY_LIMIT};`);
  return Array.isArray(rows) ? rows : [];
}

async function releasesForDay(get, ctx, iso) {
  const { start, end } = dayBounds(iso);

  // 1. Holen. Getrennte Abfragen, damit jede ihr eigenes Limit hat — siehe
  //    ADDON_TYPES. igdb() serialisiert ohnehin ueber throttled(),
  //    Promise.all kostet also nichts, liest sich aber besser.
  const [mainRows, addonRows] = await Promise.all([
    dayRows(get, ctx, start, end, GAME_TYPES),
    dayRows(get, ctx, start, end, ADDON_TYPES),
  ]);

  // 2. In die Kachel-Form bringen; das dritte Argument merkt sich, aus
  //    welcher der beiden Abfragen die Zeile kam.
  const items = [
    ...groupReleases(mainRows).map((e) => normalizeEntry(e, iso, false)),
    ...groupReleases(addonRows).map((e) => normalizeEntry(e, iso, true)),
  ];

  // 3. Anreichern und sortieren. Reihenfolge ist wichtig: erst der Rang, dann
  //    die Sortierung, dann die Uebersetzung — die trifft nur die obersten 25.
  rankPopularity(items, await popularityFor(get, ctx, items.map((it) => it.id)));
  sortByRelevance(items);
  await translateTop(ctx, items);
  await applyGamePass(ctx, items, { wait: true });

  // 4. Der IGDB-Rohdatensatz war nur fuer die Uebersetzung noetig und hat in
  //    der Antwort an den Browser nichts verloren.
  for (const item of items) delete item._game;
  return items;
}

/* ---------- 6.2 Was als Naechstes ansteht ----------
   Der Fallback fuer Tage, an denen nichts erscheint. Bewusst nur Titel mit
   Vorab-Interesse: eine Liste unbekannter Titel hilft niemandem weiter.

   Dieses "Vorab-Interesse" hing bis zuletzt allein an `game.hypes >= 5` in der
   Abfrage — demselben Zaehler, der die Tagesliste falsch gemacht hat. Jetzt
   kommt alles Kommende herein, die Auswahl trifft die Popularity-Kennzahl
   (Typ 10 "Most Wishlisted Upcoming" ist genau dafuer gemacht), und `hypes`
   bleibt als zweiter Weg daneben stehen. */
async function upcoming(get, ctx) {
  const from = Math.floor(Date.now() / 1000);
  const rows = await igdb(get, ctx, 'release_dates',
    `fields ${LIST_FIELDS};`
    + ` where date > ${from} & date_format = 0`
    + ` & game.game_type = (${GAME_TYPES.join(',')});`
    + ` sort date asc; limit ${DAY_LIMIT};`);

  // Anders als beim Tagesabruf hat hier jedes Spiel sein eigenes Datum. Die
  // Zeilen kommen nach Datum sortiert, der erste Treffer je Spiel ist also
  // der fruehste kommende Termin.
  const byGame = new Map();
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const id = row.game && row.game.id;
    if (id && !byGame.has(id)) byGame.set(id, row.date);
  }
  const all = groupReleases(Array.isArray(rows) ? rows : [])
    .map((e) => normalizeEntry(e, isoOf(byGame.get(e.game.id))))
    .filter((it) => it.date);

  rankPopularity(all, await popularityFor(get, ctx, all.map((it) => it.id)));
  /* Zweimal sortieren ist Absicht: erst nach Bekanntheit, um die zwoelf
     interessantesten auszuwaehlen — dann wieder chronologisch, weil die Frage
     "was kommt als Naechstes" lautet, nicht "was ist am beliebtesten". */
  const items = all
    .filter((it) => it.popRank != null || it.hypes >= 5)
    .sort((a, b) => (popRankOf(a) - popRankOf(b)) || (b.hypes - a.hypes))
    .slice(0, UPCOMING_LIMIT)
    .sort((a, b) => a.date.localeCompare(b.date) || (popRankOf(a) - popRankOf(b)));

  await translateTop(ctx, items);
  await applyGamePass(ctx, items);
  for (const item of items) delete item._game;
  return items;
}

/* ---------- 6.3 Detailfenster ----------
   Dieselbe Idee wie normalizeEntry, nur ausfuehrlicher: eine flache Form, in
   der jedes Feld immer existiert. Die Kachel entscheidet dann selbst, welche
   Faktenzeilen sie zeigt — sie laesst leere weg. */

function companiesOf(game, role) {
  // Ein Studio kann in mehreren Rollen auftauchen; Set entfernt Doppelte.
  return [...new Set((game.involved_companies || [])
    .filter((c) => c[role] && c.company && c.company.name)
    .map((c) => c.company.name))];
}

// In der Reihenfolge von AGE_ORG_ORDER, damit die USK vorn steht — und pro
// Organisation nur eine Angabe.
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
    // Kein Label = keine Kaufquelle. Und nur https: der Link geht in ein
    // target="_blank" der Kachel.
    if (!label || seen.has(label) || !/^https:\/\//i.test(site.url || '')) continue;
    seen.add(label);
    out.push({ label, url: site.url });
  }
  return out;
}

// Erscheint ein Titel gestaffelt, ist genau das die interessante Information —
// die Kachel zeigt die Liste nur, wenn mehr als ein Datum darin vorkommt.
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

// Die Plattformen eines Spiels stehen nur an seinen Terminen — hier ohne
// Doppelte eingesammelt (Map ueber die Id).
function platformsOfDetail(game) {
  return [...new Map(
    (game.release_dates || [])
      .map((rd) => platformOf(rd.platform))
      .filter(Boolean)
      .map((p) => [p.id, p]),
  ).values()];
}

async function gameDetail(get, ctx, id) {
  const rows = await igdb(get, ctx, 'games',
    `fields ${DETAIL_FIELDS}; where id = ${id}; limit 1;`);
  const game = Array.isArray(rows) && rows[0];
  if (!game) return null;

  const german = await germanSummary(ctx, game);

  const detail = {
    id: game.id,
    name: game.name,
    date: isoOf(game.first_release_date),
    kind: GAME_TYPE_DE[game.game_type] || null,
    gamePass: null,
    // Der Preis kommt nicht von hier, sondern aus withPrice() — siehe 5.5.
    steamAppId: steamAppId(game),
    price: null,

    cover: imageUrl(game.cover && game.cover.image_id, 't_cover_big_2x'),
    artwork: imageUrl((game.artworks || [])[0] && game.artworks[0].image_id, 't_720p'),
    // Zwei Groessen: der Streifen zeigt 104px hohe Vorschauen, die Lightbox
    // darf gross werden. t_screenshot_huge liefert dieselben Bytes wie
    // t_720p — t_1080p ist die einzige Stufe, die wirklich mehr bringt.
    screenshots: (game.screenshots || []).slice(0, 6)
      .filter((s) => s.image_id)
      .map((s) => ({ thumb: imageUrl(s.image_id, 't_720p'), full: imageUrl(s.image_id, 't_1080p') })),

    // Die Kachel markiert englischen Text als solchen, statt ihn als deutsch
    // auszugeben — deshalb reisen Sprache und Quelle mit.
    summary: german ? german.text : clip(game.summary),
    summaryLang: german ? 'de' : 'en',
    summarySource: german ? german.source : 'IGDB',

    genres: genresOf(game),
    platforms: toChips(platformsOfDetail(game)),
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
  await applyGamePass(ctx, [detail]);
  return detail;
}

/* ---------- 6.4 Suche ----------
   Die Lupe soll auch dann treffen, wenn man den Titel nicht exakt tippt.
   IGDBs eigene Suche reicht dafuer nicht, an echten Abfragen gemessen:

     search "world of war"  -> World War Z, World War Armies, World War I …
                               (kein World of Warcraft; "of" wird ignoriert
                               und die Tokens frei kombiniert)
     search "wracraft"      -> 0 Treffer
     search "cyberpank"     -> 0 Treffer   (keinerlei Tippfehlertoleranz)

   Dazu kam ein handfester Fehler: `search` und `where` zusammen ergeben KEINE
   gefilterte Suche — IGDB rankt zuerst und filtert danach. Mit
   `where game_type = (…)` und `limit 8` lieferte "world of war" deshalb gar
   nichts, waehrend "world" und "world of warcraft" funktionierten.

   Also zwei Schritte, die man auch getrennt lesen kann:
     A) Kandidaten aus mehreren Abfragen einsammeln  -> collectCandidates()
     B) die Rangfolge selbst bilden                  -> scoreHit()
   Die Wildcard-Abfragen in A sind dabei der eigentliche Gewinn:
   `name ~ *"world"* & name ~ *"war"*` findet World of Warcraft unabhaengig
   von Wortstellung und Fuellwoertern. */

const SEARCH_SKIP = new Set([3, 5, 12, 13, 14]); // Bundle, Mod, Fork, Pack, Update
const SEARCH_FETCH = 40; // breiter holen als anzeigen: sortiert wird selbst
const SEARCH_FIELDS = 'fields id, name, first_release_date, hypes, cover.image_id,'
  + ' game_type, total_rating_count, alternative_names.name,'
  + ' platforms.id, platforms.name, platforms.abbreviation;';

/* --- A) Eingabe zerlegen --- */

// Fuellwoerter tragen nichts zur Unterscheidung bei und stehen in Titeln
// mal da, mal nicht ("World of Warcraft" vs. "World War").
const STOPWORDS = new Set(['of', 'the', 'a', 'an', 'and', 'der', 'die', 'das', 'und', 'fuer', 'for']);

// Eine Form, in der sich Titel und Eingabe vergleichen lassen: klein, ohne
// Diakritika, ohne Satzzeichen. Wird auf BEIDE Seiten angewandt.
function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Diakritika weg: pokemon == pokemon
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

/* --- B) Bewertung eines einzelnen Treffers --- */

/* Ein Token gilt als getroffen, wenn irgendein Wort des Titels damit anfaengt
   — "war" trifft "warcraft", "zelda breath" trifft "The Legend of Zelda:
   Breath of the Wild".

   Kurze Tokens muessen dagegen ein ganzes Wort treffen: als Praefix passt "v"
   auf jedes Wort mit V, und so stand bei "gta v" ploetzlich "Vigtafl" in der
   Liste. Kuerzel wie GTA oder WoW kommen ohnehin ueber alternative_names
   herein, nicht ueber diesen Weg. */
const MIN_PREFIX_TOKEN = 4;

function tokenHit(nameTokens, token) {
  return token.length < MIN_PREFIX_TOKEN
    ? nameTokens.includes(token)
    : nameTokens.some((w) => w.startsWith(token));
}

// Wie viele Zeichen zwei Woerter am Anfang teilen.
function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}

// Anteil der getroffenen Tokens, hochgerechnet auf maximal 350 Punkte.
function tokenOverlapScore(nameTokens, tokens) {
  if (!tokens.length) return 0;
  const hits = tokens.filter((t) => tokenHit(nameTokens, t)).length;
  return hits ? Math.round(350 * (hits / tokens.length)) : 0;
}

/* Die einzige Stelle, an der ein Vertipper noch aufgefangen wird: "cyberpank"
   und "cyberpunk" teilen sechs Zeichen. Greift nur, wenn kein Token sauber
   passt, und bleibt mit maximal 250 Punkten unter jedem echten Treffer.

   Die absolute Mindestlaenge kommt zum Anteil hinzu: bei einem
   Ein-Buchstaben-Token waere der Anteil sonst rechnerisch 100 %, und "v"
   haette "Vigtafl" als Treffer fuer "gta v" durchgelassen. */
function typoScore(nameTokens, tokens) {
  let best = 0;
  for (const t of tokens) {
    for (const w of nameTokens) {
      const shared = commonPrefix(t, w);
      if (shared >= MIN_PREFIX_TOKEN) best = Math.max(best, shared / t.length);
    }
  }
  return best >= 0.6 ? Math.round(250 * best) : 0;
}

// Wie gut der Titel selbst passt: von "exakt" (1000) hinunter zu "ein paar
// Woerter kommen vor" und ganz unten dem Vertipper-Notnagel.
function nameScore(name, nameTokens, q, tokens) {
  if (name === q) return 1000;
  if (name.startsWith(q)) return 700;
  if (name.includes(q)) return 500;
  const overlap = tokenOverlapScore(nameTokens, tokens);
  return overlap > 0 ? overlap : typoScore(nameTokens, tokens);
}

/* Kuerzel und Zweitnamen ("WoW", "BotW", "GTA V") stehen bei IGDB in
   alternative_names — ohne die findet man ein Spiel nur ueber den vollen
   Titel. Bewertet wird der beste Zweitname; er kann den Namenswert nur
   anheben, nie senken. */
function altNameScore(game, q) {
  let best = 0;
  for (const alt of (game.alternative_names || [])) {
    const a = normalizeText(alt.name);
    if (!a) continue;
    if (a === q) best = Math.max(best, 900);
    else if (a.startsWith(q) || q.startsWith(a)) best = Math.max(best, 620);
  }
  return best;
}

/* `q` ist die normalisierte Eingabe, `tokens` deren Woerter ohne Fuellwoerter
   — beide werden fuer jeden Kandidaten gebraucht und deshalb einmal aussen
   berechnet statt hier drin. */
function scoreHit(game, q, tokens) {
  const name = normalizeText(game.name);
  const nameTokens = name.split(' ').filter(Boolean);

  let score = Math.max(nameScore(name, nameTokens, q, tokens), altNameScore(game, q));

  // Ohne jede Namensuebereinstimmung gibt es keine Punkte. Sonst schwemmen
  // die Boni unten Titel nach oben, die nur zufaellig in einer der
  // Wildcard-Abfragen mitgekommen sind — im Test standen so "Vigtafl" bei
  // "gta v" und "Wowo Island" bei "wow" in der Liste.
  if (score <= 0) return 0;

  // Bekanntheit entscheidet, welcher von mehreren passenden Titeln gemeint
  // ist: bei "world war" hat World of Warcraft 893 Wertungen, die
  // namensaehnliche Konkurrenz eine Handvoll. Gedeckelt, damit ein Klassiker
  // einen exakten Treffer nie ueberholt.
  score += Math.min(Number(game.total_rating_count) || 0, 1000) / 5;
  score += Math.min(Number(game.hypes) || 0, 100) / 2;

  if (game.game_type === 0) score += 40;
  else if (game.game_type === 1 || game.game_type === 2) score -= 40; // DLC/Erweiterung nach hinten
  return score;
}

/* --- C) Kandidaten einsammeln --- */

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

// "world", "war" -> name ~ *"world"* & name ~ *"war"*
function tokenWildcardWhere(tokens) {
  return tokens.map((t) => `name ~ *"${quote(t)}"*`).join(' & ');
}

/* Bis zu vier Abfragen, jede mit einer eigenen Staerke. Die spaeteren laufen
   nur, wenn die frueheren zu wenig gefunden haben — der Normalfall bleibt
   damit bei zwei Abfragen. Doppelte Treffer fallen ueber die Map heraus.

   `raw` ist die Eingabe, wie sie getippt wurde: IGDB und die Zweitnamen
   suchen darauf besser als auf der normalisierten Fassung. Normalisiert wird
   erst beim Bewerten (scoreHit), wo beide Seiten dieselbe Form brauchen. */
async function collectCandidates(get, ctx, raw, tokens) {
  const pool = new Map();
  const add = (rows) => { for (const g of rows) if (g && g.id && g.name) pool.set(g.id, g); };

  // 1. IGDBs Relevanzsuche — stark bei vollstaendigen Titeln.
  add(await searchQuery(get, ctx, `search "${quote(raw)}"; ${SEARCH_FIELDS} limit ${SEARCH_FETCH};`));

  // 2. Alle Woerter irgendwo im Titel, Reihenfolge egal. Das ist der Teil,
  //    der "world of war" -> World of Warcraft ueberhaupt erst findet.
  add(await searchQuery(get, ctx,
    `${SEARCH_FIELDS} where ${tokenWildcardWhere(tokens)};`
    + ` sort total_rating_count desc; limit ${SEARCH_FETCH};`));

  // 3. Kuerzel wie "wow" oder "botw" stehen nur in den Zweitnamen.
  if (pool.size < 5) {
    add(await searchQuery(get, ctx,
      `${SEARCH_FIELDS} where alternative_names.name ~ *"${quote(raw)}"*;`
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
    const stems = tokens.map((t) => t.slice(0, Math.max(4, Math.ceil(t.length * 0.6))))
      .filter((t) => t.length >= 4);
    if (stems.length) {
      add(await searchQuery(get, ctx,
        `${SEARCH_FIELDS} where ${tokenWildcardWhere(stems)};`
        + ` sort total_rating_count desc; limit ${SEARCH_FETCH};`));
    }
  }
  return pool;
}

/* --- D) Auswahl --- */

// Bei gleichem Rang zaehlt, was noch aussteht — danach wird gefragt.
function pendingRank(g, today) {
  const iso = isoOf(g.first_release_date);
  return iso && iso >= today ? 0 : 1;
}

// Die Trefferliste braucht viel weniger als eine Tageszeile — eigene, noch
// schlankere Form statt normalizeEntry.
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
    platforms: toChips((g.platforms || []).map(platformOf).filter(Boolean)),
    gamePass: null, // wird in searchGames nachgetragen
  };
}

async function searchGames(get, ctx, q) {
  const norm = normalizeText(q);
  const tokens = searchTokens(q);
  if (!norm) return [];

  const pool = await collectCandidates(get, ctx, q, tokens);

  const today = todayIso();
  const hits = [...pool.values()]
    .filter((g) => !SEARCH_SKIP.has(g.game_type))
    .map((g) => ({ g, score: scoreHit(g, norm, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => (b.score - a.score)
      || (pendingRank(a.g, today) - pendingRank(b.g, today))
      || ((b.g.first_release_date || 0) - (a.g.first_release_date || 0)))
    .slice(0, SEARCH_LIMIT)
    .map(({ g }) => searchHit(g));
  await applyGamePass(ctx, hits);
  return hits;
}

/* ============================================================================
   TEIL 7 — BILD-PROXY
   ----------------------------------------------------------------------------
   Cover und Screenshots laufen ueber den eigenen Server, damit der Browser
   weiterhin ausschliesslich mit dem Dashboard spricht (kein Referrer, keine
   Cookies, keine IP an IGDB oder Steam).

   Ein Proxy, der eine URL aus dem Request holt, ist ein klassisches
   SSRF-Loch. Vier Schranken schliessen es:
     1. Host-Allowlist   nur die drei bekannten Bildhosts
     2. nur https        kein file://, kein http://
     3. keine Redirects  ein Umleitungsziel waere nicht mehr gedeckt
     4. Magic Bytes      was kein Bild ist, wird nicht ausgeliefert

   Anders als bei den News stehen die Bildhosts hier von vornherein fest,
   deshalb genuegt eine statische Allowlist — es gibt keinen Parameter, ueber
   den sich ein fremdes Ziel unterschieben liesse. Der Rest (Byte-Deckel,
   Magic-Byte-Pruefung, LRU) folgt server/modules/news.js.
   ============================================================================ */

/* Steam liefert dieselben Bilder ueber wechselnde CDN-Hosts aus
   (shared.akamai., cdn.cloudflare., shared.fastly. …), deshalb dort beliebig
   viele Labels. Verankert bleibt es trotzdem am Domain-Ende ($) —
   "steamstatic.com.evil.example" faellt durch. */
const IMAGE_HOSTS = [
  /^images\.igdb\.com$/,
  /^([a-z0-9-]+\.)*steamstatic\.com$/,
  /^upload\.wikimedia\.org$/,
];

// Gibt die gepruefte URL zurueck oder null. Ein null bedeutet immer 400 —
// nie einen Abrufversuch.
function allowedImageUrl(raw) {
  let u;
  try { u = new URL(String(raw)); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (!IMAGE_HOSTS.some((re) => re.test(u.hostname))) return null;
  return u.toString();
}

/* Der Content-Type der Gegenstelle wird bewusst nicht uebernommen, sondern am
   Dateianfang selbst bestimmt. Sonst koennte ein Host beliebige Bytes als
   Bild deklarieren, und die kaemen same-origin vom Dashboard zurueck. */
function imageTypeOf(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null; // insbesondere SVG: wuerde same-origin ausgeliefert und koennte Skript ausfuehren
}

// Nicht res.arrayBuffer(): der laedt erst alles und prueft dann. Hier bricht
// der Abruf ab, sobald der Deckel gerissen ist.
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

/* Zweiter Cache neben makeCache(), und zwar bewusst: Bilder werden nicht nach
   ANZAHL gedeckelt, sondern nach BYTES — 60 Cover sind ein paar hundert
   Kilobyte, 60 Screenshots in 1080p sprengen den Prozess. Eine Ablaufzeit
   braucht er dagegen nicht: hinter einer IGDB-Bild-Id liegt immer dasselbe
   Bild. */
const IMG_CACHE_MAX = 60;
const IMG_CACHE_BYTES = 24 * 1024 * 1024;

function makeImageCache(maxEntries, maxBytes) {
  const map = new Map();
  let bytes = 0;
  return {
    get(url) {
      const hit = map.get(url);
      if (!hit) return null;
      map.delete(url); map.set(url, hit); // als zuletzt benutzt markieren
      return hit;
    },
    put(url, entry) {
      if (map.has(url)) bytes -= map.get(url).buf.length;
      map.set(url, entry);
      bytes += entry.buf.length;
      while (map.size > maxEntries || bytes > maxBytes) {
        const oldest = map.keys().next().value;
        if (oldest === undefined) break;
        bytes -= map.get(oldest).buf.length;
        map.delete(oldest);
      }
    },
  };
}

const imageCache = makeImageCache(IMG_CACHE_MAX, IMG_CACHE_BYTES);

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

/* ============================================================================
   TEIL 8 — DAS MODUL
   ----------------------------------------------------------------------------
   Was hier steht, liest server/registry.js ein: daraus entstehen Cache-Slot,
   Route GET /api/game-releases, SSE-Push, Secrets-Verwaltung und der
   _stale-Fallback. Siehe server/modules/README.md.
   ============================================================================ */

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

  // Der Standardabruf: immer der heutige Tag. Alles andere laeuft ueber die
  // Zusatzrouten unten.
  async fetch(get, ctx) {
    const date = todayIso();
    const items = await releasesForDay(get, ctx, date);
    return { ok: true, fetchedAt: new Date().toISOString(), date, items };
  },

  /* Vier Zusatzrouten, alle nach demselben Schema:
       1. Eingabe pruefen und im Zweifel 400 — noch vor allem anderen
       2. guard(): ohne Zugangsdaten 503 statt eines sinnlosen Abrufs
       3. no-store: die Antworten sind zustandsabhaengig, der Browser soll
          sie nicht zwischenspeichern (gecacht wird serverseitig, Teil 2.1)
       4. try/catch -> 502, damit ein Upstream-Fehler nie als 500 durchschlaegt
     Die Reihenfolge von 1 und 2 ist Absicht: ein kaputtes Datum ist ein
     kaputtes Datum, auch auf einem nicht eingerichteten Server. */
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

    // Der Fallback der Kachel fuer Tage, an denen nichts erscheint.
    app.get('/api/game-releases/upcoming', async (req, res) => {
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        res.json({ ok: true, items: await cached(upcomingCache, 'upcoming', () => upcoming(get, ctx)) });
      } catch (err) { fail(res, err); }
    });

    // Die Lupe. Der Cache-Schluessel ist kleingeschrieben, damit "Zelda" und
    // "zelda" sich einen Eintrag teilen.
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

    // Das Detailfenster. withPrice() liegt bewusst AUSSERHALB von cached() —
    // siehe Teil 5.5.
    app.get('/api/game-releases/game/:id', async (req, res) => {
      const id = toId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'bad_id' });
      if (guard(res)) return;
      res.set('Cache-Control', 'no-store');
      try {
        const game = await withPrice(ctx, await cached(detailCache, `game:${id}`, () => gameDetail(get, ctx, id)));
        if (!game) return res.status(404).json({ ok: false, error: 'unknown_game' });
        res.json({ ok: true, game });
      } catch (err) { fail(res, err); }
    });

    // Der Bild-Proxy aus Teil 7. Braucht kein guard(): die Ziel-URL ist durch
    // die Allowlist gedeckt und haengt an keinen Zugangsdaten.
    app.get('/api/game-releases/image', async (req, res) => {
      const url = allowedImageUrl(req.query.u);
      if (!url) return res.status(400).json({ ok: false, error: 'bad_url' });

      const send = (img) => {
        res.set('Content-Type', img.type);
        // Cover und Screenshots sind unveraenderlich — ein Tag ist konservativ.
        res.set('Cache-Control', 'public, max-age=86400');
        // Der Typ steht fest (imageTypeOf) und soll nicht neu geraten werden.
        res.set('X-Content-Type-Options', 'nosniff');
        res.end(img.buf);
      };

      const hit = imageCache.get(url);
      if (hit) return send(hit);

      try {
        const img = await fetchImage(url);
        imageCache.put(url, img);
        send(img);
      } catch (err) {
        // Die Kachel blendet fehlgeschlagene Bilder aus (img.onerror) —
        // ein 404 ist hier der ruhige Weg, kein 500.
        res.status(404).json({ ok: false, error: 'unavailable', message: err.message });
      }
    });
  },

  /* Fuer den Smoke-Test und scripts/igdb-check.mjs. Alles hier ist bewusst
     nach aussen gegeben, damit sich die reinen Funktionen ohne Netz pruefen
     lassen — kein Teil davon gehoert zur oeffentlichen Schnittstelle des
     Moduls. */
  _internals: {
    // Tabellen und Politik
    GAME_TYPES, ADDON_TYPES, GENRES_DE, PLATFORMS, GAME_MODES_DE, PERSPECTIVES_DE,
    AGE_ORGS, AGE_CATEGORIES, GAME_TYPE_DE, STATUS_DE, WEBSITE_DE,
    POPULARITY_TYPES, DAY_LIMIT, LIST_FIELDS,
    // Reine Funktionen, ohne Netz pruefbar
    isValidIso, dayBounds, todayIso, isoOf, quote, toId, allowedImageUrl, looksGerman,
    SEARCH_SKIP, SEARCH_FETCH, normalizeText, searchTokens, scoreHit, tokenWildcardWhere,
    commonPrefix,
    imageTypeOf, groupReleases, sortByRelevance, clip,
    steamAppId, steamPrice, formatMoney, steamPriceFor, withPrice,
    // Abrufe (brauchen Netz und Zugangsdaten)
    releasesForDay, searchGames, gameDetail, upcoming, getToken,
    // Fuer scripts/igdb-check.mjs: igdb() bringt Token-Refresh und Throttle mit.
    igdb, popularityFor, rankPopularity, dayRows,
    gamepass,
  },
};
