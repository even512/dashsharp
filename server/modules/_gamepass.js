'use strict';

/* ============================================================
   Xbox Game Pass — Katalog-Abgleich (Helfer, keine eigene Kachel)
   ------------------------------------------------------------
   Der Unterstrich im Dateinamen ist Absicht: server/registry.js
   ueberspringt ihn beim Laden, die Datei ist also ein Helfer fuer
   game-releases.js und kein Modul-Manifest.

   WAS DIE QUELLE HERGIBT
   Microsoft hat keine offizielle Game-Pass-API, aber zwei
   oeffentliche Endpunkte ohne Zugangsdaten:

     catalog.gamepass.com/sigls/v2   -> Mitgliedschaft (Produkt-IDs
                                        einer Sammlung)
     displaycatalog.mp.microsoft.com -> Titel zu diesen IDs

   Am Produkt selbst haengt KEIN Game-Pass-Attribut — die
   Zugehoerigkeit zu einer Sammlung ist das einzige Signal.

   WAS DIE QUELLE NICHT HERGIBT
   "Kommt am X in den Game Pass". Alle rund 60 Sammlungen, die
   xbox.com selbst benutzt, wurden geprueft: es gibt keine "Bald
   verfuegbar"-Liste, und selbst die Sammlung "Veroeffentlichungen
   am ersten Tag" enthaelt ausschliesslich bereits erschienene
   Titel. Der Xbox-Wire-Feed als Alternative ist per Cloudflare
   gesperrt. Die Kachel zeigt deshalb nur den AKTUELLEN Katalog —
   lieber keine Angabe als eine falsche.

   TITEL-ABGLEICH
   IGDB-Name und Store-Titel sind selten identisch. Ein falscher
   "Game Pass"-Chip waere schlimmer als ein fehlender, deshalb:
   ausschliesslich exakter Treffer auf normalisierten Schluesseln,
   keine Fuzzy-Suche (Begruendung bei lookup()).

   KOSTEN
   Ein voller Aufbau sind 5 + ~19 Anfragen und rund 13 MB, hoechstens
   alle 6 Stunden. Angestossen wird er nur, wenn die Kachel selbst
   abruft — ein Dashboard ohne IGDB-Zugangsdaten telefoniert also
   auch hier nicht nach Hause.
   ============================================================ */

const SIGL_URL = 'https://catalog.gamepass.com/sigls/v2';
const CATALOG_URL = 'https://displaycatalog.mp.microsoft.com/v7.0/products';

// Das Dashboard steht in Deutschland: Mitgliedschaft im deutschen Markt.
// Die Titel kommen trotzdem auf Englisch — IGDB-Namen sind englisch, und
// gemessen weichen 67 von 628 deutschen Store-Titeln ab ("Bau-Simulator"
// statt "Construction Simulator"). market=DE mit languages=en-us liefert
// genau die richtige Kombination aus beidem.
const MARKET = 'DE';
const LANG_SIGL = 'de-de';
const LANG_TITLES = 'en-us';

const UA = 'DashSharp/1.0 (+homelab dashboard)';

/* Die Sammlungen. `bucket` ist die Plattform-Aussage, die sich aus der
   Sammlung ableiten laesst — "Alle Spiele" macht keine, zaehlt aber fuer
   die Mitgliedschaft. */
const COLLECTIONS = [
  { id: 'f6f1f99f-9b49-4ccd-b3bf-4d9767a77f5e', bucket: 'console' }, // Alle Konsolenspiele
  { id: 'fdd9e2a7-0fee-49f6-ad69-4354098401ff', bucket: 'pc' },      // Alle PC-Spiele
  { id: '609d944c-d395-4c0a-9ea4-e9f39b52c1ad', bucket: 'pc' },      // zweite, groessere PC-Liste
  { id: '29a81209-df6f-41fd-a528-2ae6b91f719c', bucket: null },      // Alle Spiele
  { id: 'b8900d09-a491-44cc-916e-32b5acae621b', bucket: 'eaPlay' },  // EA Play
];

// fieldsTemplate=browse liefert denselben ProductTitle bei einem Fuenftel
// der Groesse (650 KB statt 3,1 MB je 50 Produkte). 50 IDs pro Anfrage sind
// gemessen unauffaellig; unbekannte IDs laesst der Dienst still weg.
const BATCH = 50;
const CONCURRENCY = 3;
const MIN_GAP_MS = 120;
const TIMEOUT_MS = 12000;

const TTL_MS = 6 * 3600 * 1000;         // danach im Hintergrund erneuern
const STALE_MS = 7 * 24 * 3600 * 1000;  // solange notfalls weiterbenutzen
const RETRY_MS = 10 * 60 * 1000;        // Sperre nach einem Fehlversuch
const FIRST_WAIT_MS = 9000;             // Deckel fuer den allerersten Abruf

// Loest weniger als die Haelfte der IDs auf, ist etwas kaputt. Ein halb
// gefuellter Index wuerde still falsche Negative erzeugen — das ist der
// Fehler, der am schwersten auffaellt.
const MIN_RESOLVED = 0.5;

/* ---------- Normalisierung ---------- */

/* Plattform- und Verpackungs-Anhaengsel, die der Store fuehrt und IGDB
   nicht. Alle Formen stammen aus dem echten Katalog. */
const PLAT = '(?:(?:for|f(?:ue|u|ü)r)\\s+)?'
  + '(?:xbox(?:\\s+(?:one|360|series\\s*x(?:\\s*\\|\\s*s)?|series\\s*s|play\\s+anywhere))?'
  + '|windows(?:\\s*1[01]|\\s*pc)?|pc|game\\s*preview|spielvorschau|digitale?\\s*version)';

const TAILS = [
  new RegExp(`\\s*\\((?:${PLAT})(?:\\s*(?:edition|version))?\\)\\s*$`, 'i'),
  new RegExp(`\\s*version\\s*:\\s*(?:${PLAT})\\s*$`, 'i'),
  new RegExp(`(?:\\s*[-–—:]\\s*|\\s+)(?:${PLAT})(?:\\s*(?:edition|version))?(?:\\s*\\+\\s*launcher)?\\s*$`, 'i'),
  // "Standard Edition" ist per Definition das Grundspiel — im Gegensatz zu
  // allen anderen Editionen (siehe stripEditions).
  /(?:\s*[-–—:]\s*|\s+)(?:digital(?:e)?\s+)?standard[\s-]*edition\s*$/i,
  // "… (PC) – 2009"
  /\s*[-–—]\s*(?:19|20)\d\d\s*$/,
];

/* Schneidet Plattform-Anhaengsel ab, sonst nichts.

   BEWUSST NICHT abgeschnitten werden Definitive / Ultimate / Complete /
   Anniversary / Deluxe / Gold / Game of the Year / Enhanced / Voidheart /
   EA Play Edition. Der Katalog fuehrt "Halo Wars: Definitive Edition" und
   "Dishonored Definitive Edition", aber NICHT die Originale — und IGDB
   kennt "Halo Wars" (2009) und "Dishonored" (2012) als eigene Spiele.
   Wuerde man die Edition wegschneiden, bekaemen zwei Spiele einen
   Game-Pass-Chip, die nicht im Game Pass sind. Der Preis sind ein paar
   fehlende Chips (Hollow Knight steht nur als "Voidheart Edition" drin) —
   und ein fehlender Chip kostet nichts. */
function stripEditions(s) {
  let out = String(s || '');
  for (let i = 0; i < 4; i++) {
    let changed = false;
    for (const re of TAILS) {
      const next = out.replace(re, '');
      if (next !== out) { out = next; changed = true; }
    }
    if (!changed) break;
  }
  out = out.trim();
  return out || String(s || '');
}

/* Reihenfolge ist hier entscheidend: NFKC macht aus "™" die Buchstaben
   "TM". Wer erst normalisiert und dann Symbole entfernt, bekommt
   "battlefield tm 2042" und verliert still jeden Treffer mit
   Markenzeichen — gemessen waren das Battlefield 2042, EA Sports FC 26,
   LEGO Star Wars und Dishonored. Symbole muessen ZUERST weg. */
function normalizeTitle(s) {
  return String(s || '')
    .replace(/[™®©℠]/g, ' ')
    .normalize('NFKC')
    .replace(/[‘’ʼ´`]/g, "'")
    .replace(/[–—―−]/g, '-')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* ---------- Index ---------- */

/* Produkte -> Map(Schluessel -> Flags). Jedes Produkt landet unter zwei
   Schluesseln: dem vollen Titel und dem ohne Plattform-Anhaengsel. Der
   Index ist damit grosszuegig, die Abfrage in lookup() streng.

   Zeigen zwei Schluessel auf verschiedene Grundtitel, wird der Schluessel
   als `ambiguous` markiert und liefert gar nichts mehr. Gemessen tritt das
   ueber alle 914 Katalog-Titel kein einziges Mal auf — die Sperre kostet
   also nichts und haelt kuenftige Katalog-Zugaenge davon ab, still einen
   falschen Chip zu erzeugen. */
function indexTitles(products) {
  const keys = new Map();
  for (const p of products || []) {
    const title = String(p && p.title || '');
    const base = normalizeTitle(stripEditions(title));
    if (base.length < 2) continue;
    const plain = normalizeTitle(title);
    for (const key of new Set([plain, base])) {
      if (key.length < 2) continue;
      let hit = keys.get(key);
      if (!hit) {
        hit = { console: false, pc: false, eaPlay: false, base, ambiguous: false };
        keys.set(key, hit);
      } else if (hit.base !== base) {
        hit.ambiguous = true;
      }
      if (p.console) hit.console = true;
      if (p.pc) hit.pc = true;
      if (p.eaPlay) hit.eaPlay = true;
    }
  }
  return keys;
}

/* Exakter Treffer auf normalisiertem Titel — sonst nichts.

   Kein Fuzzy-Fallback, und das ist eine Entscheidung, keine Bequemlichkeit:
   die Ausgabe ist ein binaerer Chip, den niemand nachpruefen oder
   korrigieren kann, und in einem Namensraum aus ~900 durchnummerierten
   Fortsetzungen ist Aehnlichkeit ein Fehlerlieferant — Diablo III/IV,
   EA Sports FC 25/26, Forza Horizon 4/5, Modern Warfare II/III liegen alle
   bei Editierdistanz 1 bis 2. */
function lookup(idx, name) {
  if (!idx || !idx.keys || !name) return null;
  for (const key of [normalizeTitle(name), normalizeTitle(stripEditions(name))]) {
    if (key.length < 2) continue;
    const hit = idx.keys.get(key);
    if (hit && !hit.ambiguous) {
      return { console: hit.console, pc: hit.pc, eaPlay: hit.eaPlay };
    }
  }
  return null;
}

/* ---------- Abruf ---------- */

// Produkt-IDs sind 12-stellig alphanumerisch und landen in einer URL —
// wie ueberall im Modul wird geprueft statt eingesetzt.
const ID_RE = /^[A-Z0-9]{12}$/i;

async function fetchSigl(ctx, siglId) {
  const url = `${SIGL_URL}?id=${encodeURIComponent(siglId)}`
    + `&language=${LANG_SIGL}&market=${MARKET}`;
  const rows = await ctx.httpJson(url, {
    timeoutMs: TIMEOUT_MS,
    headers: { 'User-Agent': UA },
  });
  if (!Array.isArray(rows)) return [];
  // Der erste Eintrag ist der Sammlungs-Kopf, danach kommen die Produkte.
  return rows.map((r) => r && r.id).filter((id) => typeof id === 'string' && ID_RE.test(id));
}

async function fetchTitles(ctx, ids) {
  const url = `${CATALOG_URL}?bigIds=${ids.join(',')}`
    + `&market=${MARKET}&languages=${LANG_TITLES}&fieldsTemplate=browse`;
  const data = await ctx.httpJson(url, {
    timeoutMs: TIMEOUT_MS,
    headers: { 'User-Agent': UA },
  });
  const out = [];
  for (const p of (data && data.Products) || []) {
    if (p.ProductKind !== 'Game') continue;
    const title = p.LocalizedProperties && p.LocalizedProperties[0]
      && p.LocalizedProperties[0].ProductTitle;
    if (p.ProductId && title) out.push({ id: p.ProductId, title });
  }
  return out;
}

// Arbeiter-Schleife mit Mindestabstand — dieselbe Bauart wie translateTop()
// und throttled() in game-releases.js.
async function pool(items, worker) {
  let next = 0;
  let last = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next++];
      const gap = MIN_GAP_MS - (Date.now() - last);
      if (gap > 0) await new Promise((r) => setTimeout(r, gap));
      last = Date.now();
      await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
}

async function buildIndex(ctx) {
  const warn = ctx.warn || (() => {});
  const flags = new Map(); // Produkt-ID -> { console, pc, eaPlay }

  // Eine einzelne Sammlung kostet nur ihre eigenen Titel. Gesammelt gemeldet
  // statt einzeln: bei einem Totalausfall waeren das sonst fuenf gleiche
  // Zeilen, und die eine interessante ginge darin unter.
  const failed = [];
  for (const col of COLLECTIONS) {
    let ids;
    try {
      ids = await fetchSigl(ctx, col.id);
    } catch (err) {
      failed.push(`${col.id} (${err.message})`);
      continue;
    }
    for (const id of ids) {
      let f = flags.get(id);
      if (!f) { f = { console: false, pc: false, eaPlay: false }; flags.set(id, f); }
      if (col.bucket) f[col.bucket] = true;
    }
  }
  if (!flags.size) throw new Error(`keine Sammlung erreichbar — ${failed[0] || 'unbekannt'}`);
  if (failed.length) warn(`Game-Pass-Sammlung nicht erreichbar: ${failed.join(', ')}`);

  const ids = [...flags.keys()];
  const batches = [];
  for (let i = 0; i < ids.length; i += BATCH) batches.push(ids.slice(i, i + BATCH));

  const products = [];
  await pool(batches, async (batch) => {
    try {
      for (const p of await fetchTitles(ctx, batch)) {
        products.push({ title: p.title, ...flags.get(p.id) });
      }
    } catch (err) {
      warn(`Game-Pass-Titel: ${err.message}`);
    }
  });

  const ratio = products.length / ids.length;
  if (ratio < MIN_RESOLVED) {
    throw new Error(`nur ${products.length} von ${ids.length} Titeln aufgeloest`);
  }
  return {
    at: Date.now(),
    keys: indexTitles(products),
    products: products.length,
    requested: ids.length,
  };
}

/* ---------- Zustand ----------
   Ein einziger Wert, kein LRU: der Index ist nicht geschluesselt. */

let _idx = null;
let _refreshing = null;
let _blockedUntil = 0;

function kick(ctx) {
  if (_refreshing) return _refreshing;
  _refreshing = buildIndex(ctx)
    .then((idx) => { _idx = idx; _blockedUntil = 0; return idx; })
    .catch((err) => {
      // Der letzte gute Index bleibt stehen — ein Ausfall bei Microsoft
      // nimmt der Kachel keine Chips weg, die schon da sind.
      _blockedUntil = Date.now() + RETRY_MS;
      (ctx.warn || console.warn)(`Game-Pass-Katalog: ${err.message}`);
      return _idx;
    })
    .then((idx) => { _refreshing = null; return idx; });
  return _refreshing;
}

/* Liefert den Index oder null. Wirft nie.

   `wait` nur dort setzen, wo die Kachel selbst abruft: nach einem Neustart
   soll schon die erste Antwort Chips tragen. Detailfenster und Suche warten
   nie — ein nicht erreichbares Microsoft darf dort keine Sekunde kosten. */
async function index(ctx, opts = {}) {
  const age = _idx ? Date.now() - _idx.at : Infinity;
  if (_idx && age < TTL_MS) return _idx;
  if (_idx && age < STALE_MS) { kick(ctx).catch(() => {}); return _idx; }
  if (Date.now() < _blockedUntil) return _idx;

  const running = kick(ctx);
  if (opts.wait !== true) return _idx;
  await Promise.race([running, new Promise((r) => {
    const t = setTimeout(r, FIRST_WAIT_MS);
    if (t.unref) t.unref();
  })]);
  return _idx;
}

function _reset() { _idx = null; _refreshing = null; _blockedUntil = 0; }

module.exports = {
  index, lookup, normalizeTitle, stripEditions, indexTitles,
  COLLECTIONS, TTL_MS, _reset,
};
