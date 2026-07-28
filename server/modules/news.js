'use strict';

/* ============================================================
   News — Feed-Aggregation (RSS/Atom)
   ------------------------------------------------------------
   Der Nutzer waehlt Quellen aus einem kuratierten Katalog
   (IT, Technik, Hardware, Gaming — getrennt nach Sprache) und
   kann eigene Feed-URLs ergaenzen. Die Auswahl liegt in
   config/news.json, nicht in den Secrets: es sind keine
   Zugangsdaten, sondern Inhalte.

   Solange keine Quelle aktiv ist, meldet configured() false —
   dann geht kein einziger Request nach draussen. Das ist Absicht:
   das Dashboard soll nichts von sich aus nach Hause telefonieren.

   Aufmacherbilder holt der Server (siehe Bild-Proxy unten), damit
   der Browser weiterhin ausschliesslich mit dem Dashboard spricht.
   ============================================================ */

const crypto = require('crypto');
const dns = require('dns').promises;
const fs = require('fs');
const net = require('net');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'news.json');

// Neutral und ehrlich: manche Feeds antworten ohne User-Agent mit 403.
const UA = 'DashSharp/1.0 (+homelab dashboard; feed reader)';
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8';

const FEED_TIMEOUT_MS = 8000;
const FEED_MAX_BYTES = 2 * 1024 * 1024;
const IMG_TIMEOUT_MS = 8000;
const IMG_MAX_BYTES = 3 * 1024 * 1024;
const IMG_MAX_REDIRECTS = 2;
const PER_SOURCE_ITEMS = 20;
const TOTAL_ITEMS = 90;
const SUMMARY_CHARS = 400;
const MAX_CUSTOM = 20;
const FETCH_CONCURRENCY = 6;

/* ---------- Kategorien & Katalog ---------- */

const CATEGORIES = [
  { id: 'it-news', label: 'IT & Technik' },
  { id: 'security', label: 'Security' },
  { id: 'linux-oss', label: 'Linux & Open Source' },
  { id: 'dev', label: 'Entwicklung' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'selfhosted', label: 'Selfhosted & Homelab' },
];
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const LANGS = [
  { id: 'de', label: 'Deutschsprachig' },
  { id: 'en', label: 'Englischsprachig' },
];

/* Kuratierter Katalog. Bewusst auf IT/Technik/Hardware/Gaming begrenzt —
   wer etwas anderes lesen will, traegt es als eigene Quelle ein.

   `noImages: true` ist keine Einstellung, sondern eine nachgepruefte Eigenschaft
   des Feeds: diese Quellen fuehren pro Eintrag ueberhaupt kein Bild — kein <img>
   (auch nicht escaped), kein media:*, kein <enclosure>, kein content:encoded. Die
   Kachel zeigt dort das Kuerzel der Quelle, und das ist richtig so. Die Angabe
   steht hier, damit `scripts/feed-check.mjs` „keine Bilder" nicht bei jedem Lauf
   als Warnung meldet — sonst geht im Dauerrauschen unter, wenn eine Quelle, die
   Bilder fuehrt, ploetzlich keine mehr liefert. */
const CATALOG = [
  /* --- deutschsprachig --- */
  { id: 'heise',          name: 'heise online',       url: 'https://www.heise.de/rss/heise-atom.xml',                 category: 'it-news',    lang: 'de' },
  { id: 'golem',          name: 'Golem.de',           url: 'https://rss.golem.de/rss.php?feed=RSS2.0',                category: 'it-news',    lang: 'de' },
  { id: 'winfuture',      name: 'WinFuture',          url: 'https://static.winfuture.de/feeds/WinFuture-News-rss2.0.xml', category: 'it-news', lang: 'de' },
  { id: 't3n',            name: 't3n',                url: 'https://t3n.de/rss.xml',                                  category: 'it-news',    lang: 'de' },
  { id: 'heise-security', name: 'heise Security',     url: 'https://www.heise.de/security/feed.xml',                  category: 'security',   lang: 'de' },
  { id: 'linuxnews',      name: 'LinuxNews.de',       url: 'https://linuxnews.de/feed/',                              category: 'linux-oss',  lang: 'de', noImages: true },
  { id: 'heise-developer', name: 'heise Developer',   url: 'https://www.heise.de/developer/feed.xml',                 category: 'dev',        lang: 'de' },
  { id: 'computerbase',   name: 'ComputerBase',       url: 'https://www.computerbase.de/rss/news.xml',                category: 'hardware',   lang: 'de' },
  { id: 'hardwareluxx',   name: 'Hardwareluxx',       url: 'https://www.hardwareluxx.de/hwl.feed',                    category: 'hardware',   lang: 'de' },
  { id: 'pcgh',           name: 'PC Games Hardware',  url: 'https://www.pcgameshardware.de/feed.cfm?menu_alias=home', category: 'hardware',   lang: 'de' },
  { id: 'gamestar',       name: 'GameStar',           url: 'https://www.gamestar.de/news/rss/news.rss',               category: 'gaming',     lang: 'de' },
  { id: 'eurogamer-de',   name: 'Eurogamer.de',       url: 'https://www.eurogamer.de/feed',                           category: 'gaming',     lang: 'de' },

  /* --- englischsprachig --- */
  { id: 'arstechnica',    name: 'Ars Technica',       url: 'https://feeds.arstechnica.com/arstechnica/index',         category: 'it-news',    lang: 'en' },
  { id: 'theverge',       name: 'The Verge',          url: 'https://www.theverge.com/rss/index.xml',                  category: 'it-news',    lang: 'en' },
  { id: 'bleepingcomputer', name: 'BleepingComputer', url: 'https://www.bleepingcomputer.com/feed/',                  category: 'security',   lang: 'en', noImages: true },
  { id: 'krebs',          name: 'Krebs on Security',  url: 'https://krebsonsecurity.com/feed/',                       category: 'security',   lang: 'en' },
  { id: 'phoronix',       name: 'Phoronix',           url: 'https://www.phoronix.com/rss.php',                        category: 'linux-oss',  lang: 'en', noImages: true },
  { id: 'lwn',            name: 'LWN.net',            url: 'https://lwn.net/headlines/newrss',                        category: 'linux-oss',  lang: 'en', noImages: true },
  { id: 'itsfoss',        name: "It's FOSS",          url: 'https://feed.itsfoss.com/',                               category: 'linux-oss',  lang: 'en' },
  { id: 'hackernews',     name: 'Hacker News',        url: 'https://news.ycombinator.com/rss',                        category: 'dev',        lang: 'en', noImages: true },
  { id: 'github-blog',    name: 'GitHub Blog',        url: 'https://github.blog/feed/',                               category: 'dev',        lang: 'en' },
  { id: 'stackoverflow',  name: 'Stack Overflow Blog', url: 'https://stackoverflow.blog/feed/',                       category: 'dev',        lang: 'en', noImages: true },
  { id: 'tomshardware',   name: "Tom's Hardware",     url: 'https://www.tomshardware.com/feeds.xml',                  category: 'hardware',   lang: 'en' },
  { id: 'servethehome',   name: 'ServeTheHome',       url: 'https://www.servethehome.com/feed/',                      category: 'hardware',   lang: 'en', noImages: true },
  { id: 'rockpapershotgun', name: 'Rock Paper Shotgun', url: 'https://www.rockpapershotgun.com/feed',                 category: 'gaming',     lang: 'en' },
  { id: 'pcgamer',        name: 'PC Gamer',           url: 'https://www.pcgamer.com/rss/',                            category: 'gaming',     lang: 'en' },
  { id: 'selfhosted-reddit', name: 'r/selfhosted',    url: 'https://www.reddit.com/r/selfhosted/.rss',                category: 'selfhosted', lang: 'en' },
  { id: 'homeassistant',  name: 'Home Assistant',     url: 'https://www.home-assistant.io/atom.xml',                  category: 'selfhosted', lang: 'en' },
  { id: 'docker-blog',    name: 'Docker Blog',        url: 'https://www.docker.com/feed/',                            category: 'selfhosted', lang: 'en' },
];
const CATALOG_BY_ID = new Map(CATALOG.map((s) => [s.id, s]));

/* ---------- Konfiguration (config/news.json) ---------- */

// mtime-Cache: die Datei wird bei jedem Abruf und in configured() gelesen,
// aber nur bei echter Aenderung neu geparst.
let _cfg = { enabled: [], custom: [] };
let _cfgMtime = -1;

function readCfg() {
  let mtime = 0;
  try { mtime = fs.statSync(CONFIG_PATH).mtimeMs; }
  catch { mtime = 0; }
  if (mtime === _cfgMtime) return _cfg;
  _cfgMtime = mtime;
  if (!mtime) { _cfg = { enabled: [], custom: [] }; return _cfg; }
  try { _cfg = sanitizeCfg(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (err) {
    console.error('[news] config/news.json ist unlesbar:', err.message);
    _cfg = { enabled: [], custom: [] };
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

function sanitizeCfg(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const custom = [];
  // Die Id einer eigenen Quelle leitet der Server aus der URL ab. Eine frisch
  // angelegte Quelle traegt beim Speichern noch die Platzhalter-Id der UI —
  // ohne diese Zuordnung faende sie sich in `enabled` nicht wieder und waere
  // sofort nach dem Anlegen wieder aus.
  const alias = new Map();
  for (const entry of (Array.isArray(obj.custom) ? obj.custom : [])) {
    const clean = sanitizeCustomSource(entry);
    if (!clean) continue;
    if (custom.some((c) => c.id === clean.id)) continue; // gleiche URL zweimal
    if (custom.length >= MAX_CUSTOM) break;
    if (entry && entry.id) alias.set(String(entry.id), clean.id);
    custom.push(clean);
  }
  const known = new Set([...CATALOG_BY_ID.keys(), ...custom.map((c) => c.id)]);
  const enabled = [];
  for (const id of (Array.isArray(obj.enabled) ? obj.enabled : [])) {
    const s = alias.get(String(id)) || String(id);
    if (known.has(s) && !enabled.includes(s)) enabled.push(s);
  }
  return { enabled, custom };
}

function sanitizeCustomSource(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = String(raw.url || '').trim().slice(0, 500);
  if (!isFeedUrl(url)) return null;
  const name = String(raw.name || '').trim().slice(0, 80) || hostOf(url);
  const category = CATEGORY_IDS.includes(raw.category) ? raw.category : 'it-news';
  const lang = raw.lang === 'en' ? 'en' : 'de';
  // Id aus der URL ableiten: derselbe Feed bekommt beim erneuten Speichern
  // dieselbe Id und behaelt damit seinen An/Aus-Zustand.
  const id = `c-${sha1(url).slice(0, 8)}`;
  return { id, name, url, category, lang, custom: true };
}

// Feed-URLs kommen vom Betreiber selbst — LAN-Adressen sind hier ausdruecklich
// erlaubt (ein eigener Miniflux/FreshRSS im Homelab ist ein realistischer Fall,
// und Glances, AdGuard & Co. werden genauso eingetragen). Streng geprueft wird
// dort, wo der *Inhalt* eines Feeds das Ziel bestimmt: beim Bild-Proxy.
function isFeedUrl(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  return !!u.hostname;
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return 'Feed'; }
}

function allSources() {
  return CATALOG.concat(readCfg().custom);
}

function activeSources() {
  const enabled = new Set(readCfg().enabled);
  return allSources().filter((s) => enabled.has(s.id));
}

/* ---------- Feed-Parser ----------
   Bewusst regex-basiert und ohne Dependency: das Projekt parst auch die
   virsh-XML-Ausgabe so (server.js, parseVncGraphics). Feeds sind Fremddaten —
   der Parser darf deshalb nie werfen, sondern liefert im Zweifel weniger. */

function stripComments(xml) {
  return xml.replace(/<!--[\s\S]*?-->/g, '');
}

function unwrapCdata(s) {
  return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
  euro: '€', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·',
};

function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ref) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X'
        ? parseInt(ref.slice(2), 16)
        : parseInt(ref.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return m;
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, ref) ? ENTITIES[ref] : m;
  });
}

// Sieht der Text nach echtem Markup aus? Nach dem Dekodieren steht in einem
// doppelt kodierten Feed (&lt;p&gt;…) wieder HTML — in einem sauberen Feed
// dagegen ein legitimes Zeichen wie in „Atom <Titel>". Nur bei bekannten
// Tag-Namen wird ein zweites Mal gestrippt.
const HTML_TAG_RE = /<\/?(?:p|br|div|span|a|img|b|i|em|strong|ul|ol|li|h[1-6]|blockquote|figure|table|tr|td)\b[^>]*>/i;

// Aus einem HTML-Schnipsel Fliesstext machen. Landet ausschliesslich in
// textContent, hier geht es also um Lesbarkeit, nicht um XSS-Schutz.
function toPlainText(html) {
  let s = unwrapCdata(html);
  s = s.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/p>/gi, ' ');
  s = s.replace(/<[^>]*>/g, ' ');
  s = decodeEntities(s);
  if (HTML_TAG_RE.test(s)) s = s.replace(/<[^>]*>/g, ' ');
  // Doppelt kodierte Feeds liefern nach der ersten Runde noch &amp;/&#8211;.
  if (/&(?:[a-zA-Z]+|#x?[0-9a-fA-F]+);/.test(s)) s = decodeEntities(s);
  return s.replace(/\s+/g, ' ')
    // Aus <b>Wort</b>. wird sonst "Wort ." — jedes entfernte Inline-Tag
    // hinterlaesst ein Leerzeichen.
    .replace(/\s+([.,;:!?)\]»”])/g, '$1')
    .replace(/([(\[«„])\s+/g, '$1')
    .trim();
}

// <title>, <dc:date>, <content:encoded> … — der Namensraum-Praefix ist egal.
function tagText(block, names) {
  const re = new RegExp(`<(?:[a-zA-Z0-9]+:)?(${names.join('|')})\\b[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?\\1\\s*>`, 'i');
  const m = re.exec(block);
  return m ? m[2] : '';
}

function attr(tag, name) {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? (m[2] != null ? m[2] : m[3]) : '';
}

// attr() trennt mit \b — bei `src` trifft das auch `data-src`, denn zwischen
// `-` und `s` steht eine Wortgrenze. Fuer Bilder muss der Name genau stimmen:
// bei einem Lazy-Load-Bild stehen Platzhalter und echte URL nebeneinander,
// und welches der beiden man erwischt, entscheidet ueber Bild oder kein Bild.
function attrExact(tag, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? (m[2] != null ? m[2] : m[3]) : '';
}

function pickLink(block) {
  // Atom: <link rel="alternate" type="text/html" href="…"/>
  const tags = block.match(/<(?:[a-zA-Z0-9]+:)?link\b[^>]*\/?>/gi) || [];
  const withHref = tags.map((t) => ({ tag: t, href: attr(t, 'href'), rel: attr(t, 'rel'), type: attr(t, 'type') }))
    .filter((l) => l.href);
  const alt = withHref.find((l) => l.rel === 'alternate' || (!l.rel && (!l.type || /html/i.test(l.type))));
  if (alt) return alt.href;
  if (withHref.length) return withHref[0].href;
  // RSS: <link>https://…</link>
  return toPlainText(tagText(block, ['link']));
}

/* ---------- Aufmacherbild eines Eintrags ----------
   Ein Feed kann sein Bild an einem halben Dutzend Stellen unterbringen, und
   die Fundstelle ist nicht dieselbe wie „taugt als Aufmacher". Zwei Faelle
   haben in der Praxis dafuer gesorgt, dass eine Kachelzeile leer blieb:

   1. Zaehlpixel. Etliche deutsche Angebote haengen an jeden Teaser einen
      1x1-Pixel (Golem: cpx.golem.de). Der stand im HTML vor dem eigentlichen
      Bild, war formal ein voellig korrektes GIF — und landete deshalb als
      „Aufmacherbild" in der Kachel. Der Proxy holt ihn brav, die Zeile zeigt
      ein leeres Kaestchen. Nebenbei ist ein Zaehlpixel abzurufen genau das,
      was dieses Dashboard nicht tun soll.
   2. Lazy-Load. Steht die echte URL in data-src und im src nur ein
      data:-Platzhalter, kam eine data:-URI heraus, die absoluteUrl() danach
      verwirft — Ergebnis: kein Bild, ohne jede Spur im Log.

   Deshalb wird nicht mehr der erste Treffer genommen, sondern jedes <img>
   angesehen und das erste brauchbare zurueckgegeben. */

const IMG_TAG_RE = /<img\b[^>]*>/gi;

// Bekannte Zaehl-Endpunkte. Bewusst kurz: die Groessenangabe im Tag faengt
// den Rest, und eine lange Namensliste trifft irgendwann ein echtes Bild.
const PIXEL_URL_RE = /^https?:\/\/cpx\.|\/cpx\.php|feedburner|feedsportal|\/(?:count|counter|pixel|beacon)\.(?:gif|php|png)(?:\?|$)|\/1x1\./i;

// Kein Aufmacher, sondern Messtechnik — wird nie genommen, auch nicht als
// letzte Rettung: ein 1x1-Pixel ist in keiner Lage das gesuchte Bild.
function isPixel(tag, url) {
  if (/^data:/i.test(url)) return true;
  for (const dim of ['width', 'height']) {
    const n = parseInt(attrExact(tag, dim), 10);
    if (Number.isFinite(n) && n > 0 && n <= 4) return true;
  }
  return PIXEL_URL_RE.test(url);
}

function srcOf(tag) {
  // Lazy-Load zuerst: dort steht die echte URL, im src nur der Platzhalter.
  const direct = attrExact(tag, 'data-src') || attrExact(tag, 'data-original')
    || attrExact(tag, 'data-lazy-src') || attrExact(tag, 'src');
  if (direct) return direct;
  // srcset: "url 320w, url 640w" — der erste Eintrag genuegt.
  const set = attrExact(tag, 'srcset') || attrExact(tag, 'data-srcset');
  return set ? String(set).split(',')[0].trim().split(/\s+/)[0] : '';
}

/* imgFromHtml(raw) — alle <img> eines Textfelds durchgehen und das erste
   liefern, das kein Zaehlpixel ist. RSS legt sein Beschreibungs-HTML
   ueblicherweise in CDATA (nach unwrapCdata() steht dort echtes Markup),
   Atom escaped es stattdessen (<content type="html"> liefert &lt;img …&gt;) —
   dort muss vorher dekodiert werden, sonst gibt es kein literales <img zu
   finden. */
function imgFromHtml(raw) {
  if (!raw) return '';
  let s = unwrapCdata(raw);
  if (!/<img\b/i.test(s) && /&(?:lt|#0*60|#x0*3c);\s*img/i.test(s)) s = decodeEntities(s);
  for (const tag of (s.match(IMG_TAG_RE) || [])) {
    const url = decodeEntities(srcOf(tag)).trim();
    if (!url || isPixel(tag, url)) continue;
    return url;
  }
  return '';
}

/* pickImage(block, htmls) — htmls sind die Fliesstext-Felder des Eintrags in
   der Reihenfolge, in der sie als Bildquelle taugen. Explizite Bild-Elemente
   gehen vor, danach der Fliesstext; ganz zum Schluss wird der komplette
   Eintrag durchsucht, damit ein <img> auch aus einem Feld gefunden wird, das
   der Parser sonst gar nicht liest. */
function pickImage(block, htmls) {
  // Atom haengt Bilder als <link rel="enclosure" type="image/…" href="…"/> an.
  for (const tag of (block.match(/<(?:[a-zA-Z0-9]+:)?link\b[^>]*>/gi) || [])) {
    if (attr(tag, 'rel') === 'enclosure' && /^image\//i.test(attr(tag, 'type'))) {
      const href = attr(tag, 'href');
      if (href) return decodeEntities(href);
    }
  }
  const tags = block.match(/<(?:[a-zA-Z0-9]+:)?(enclosure|content|thumbnail|image)\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const url = attr(tag, 'url') || attr(tag, 'href');
    if (!url) continue;
    const type = attr(tag, 'type');
    const medium = attr(tag, 'medium');
    if (type && !/^image\//i.test(type)) continue;
    if (!type && medium && medium.toLowerCase() !== 'image') continue;
    if (!type && !medium && !/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url)) continue;
    const clean = decodeEntities(url);
    if (isPixel(tag, clean)) continue;
    return clean;
  }
  for (const html of htmls.concat(block)) {
    const src = imgFromHtml(html);
    if (src) return src;
  }
  return '';
}

function parseDate(raw) {
  const s = toPlainText(raw);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/* parseFeed(xml) -> { title, items: [{ title, link, guid, published, summary, image }] }
   Wird auch vom Smoke-Test benutzt. */
function parseFeed(xml) {
  const clean = stripComments(String(xml || ''));
  const blocks = clean.match(/<(?:[a-zA-Z0-9]+:)?(item|entry)\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?\1\s*>/gi) || [];
  const head = clean.slice(0, blocks.length ? clean.indexOf(blocks[0]) : clean.length);
  const items = [];
  for (const block of blocks) {
    // Teaser und Volltext getrennt halten: der Kurztext kommt aus dem
    // Teaser, das Bild darf aber auch aus dem laengeren <content:encoded>
    // stammen — bisher wurde nur das erste nicht-leere Feld ueberhaupt
    // angesehen, und damit blieben Bilder liegen.
    const summaryHtml = tagText(block, ['description', 'summary']);
    const contentHtml = tagText(block, ['encoded', 'content']);
    const rawSummary = summaryHtml || contentHtml;
    const title = toPlainText(tagText(block, ['title']));
    const link = toPlainText(pickLink(block));
    if (!title && !link) continue;
    items.push({
      title,
      link,
      guid: toPlainText(tagText(block, ['guid', 'id'])),
      published: parseDate(tagText(block, ['pubDate', 'published', 'updated', 'date'])),
      summary: toPlainText(rawSummary).slice(0, SUMMARY_CHARS),
      image: pickImage(block, [summaryHtml, contentHtml]),
    });
  }
  return { title: toPlainText(tagText(head, ['title'])), items };
}

/* ---------- Bild-Proxy ----------
   Der Client bekommt nie die Original-URL, sondern nur /api/news/image/<id>.
   Die Zuordnung id -> URL entsteht ausschliesslich aus den gerade abgerufenen
   Feeds. Damit gibt es keinen Parameter, ueber den sich ein fremdes Ziel
   unterschieben liesse — die Allowlist ist das Ergebnis selbst. */

let _imgCur = new Map();
let _imgPrev = new Map(); // vorige Generation: offene Detailfenster bleiben heil

// Zusaetzlich zur URL wird der Host des Feeds gemerkt, aus dem das Bild stammt:
// wer einen Feed im LAN eintraegt (eigener Blog, FreshRSS), hat dessen Host
// bewusst freigegeben — dessen Bilder duerfen dann auch aus dem LAN kommen.
function imageRef(url, feedUrl) {
  const id = sha1(url).slice(0, 16);
  let host = '';
  try { host = new URL(feedUrl).hostname.toLowerCase(); } catch { host = ''; }
  _imgCur.set(id, { url, host });
  return `/api/news/image/${id}`;
}
function imageEntryFor(id) {
  return _imgCur.get(id) || _imgPrev.get(id) || null;
}

// Kleiner LRU im Speicher — anders als die Icons (unveraenderlich, feste Namen)
// wechseln Aufmacherbilder staendig; die haben im Config-Volume nichts verloren.
// Begrenzt wird nach Anzahl UND Bytes: 60 Bilder à 3 MB waeren sonst 180 MB in
// einem Prozess, der sonst mit ~50 MB auskommt.
const IMG_CACHE_MAX = 60;
const IMG_CACHE_BYTES = 24 * 1024 * 1024;
const _imgCache = new Map();
let _imgCacheBytes = 0;
function imgCacheGet(id) {
  const hit = _imgCache.get(id);
  if (!hit) return null;
  _imgCache.delete(id);
  _imgCache.set(id, hit); // als zuletzt benutzt markieren
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

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split('.').map(Number);
    if (p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    return a === 0 || a === 10 || a === 127
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 100 && b >= 64 && b <= 127)   // CGNAT
      || (a === 192 && b === 0)               // IETF-Protokollzuweisungen
      || (a === 198 && (b === 18 || b === 19)) // Benchmark
      || a >= 224;                            // Multicast + reserviert
  }
  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase();
    if (v6 === '::' || v6 === '::1') return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(f[cd]|fe[89ab])/.test(v6);
  }
  return true;
}

// Der Feed ist nutzergewaehlt, sein Inhalt nicht: eine Bild-URL im Feed koennte
// auf das LAN zeigen. Deshalb wird jeder Hop aufgeloest und geprueft. (Ein
// Rebinding zwischen Pruefung und Verbindung bleibt theoretisch moeglich —
// dagegen hilft nur ein eigener Socket-Dialer, was hier ueberzogen waere.)
async function assertPublicUrl(url, trustedHost) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad_protocol');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  // Der Host des Feeds selbst ist vom Betreiber eingetragen worden.
  if (trustedHost && host.toLowerCase() === trustedHost) return;
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('private_target');
    return;
  }
  const addrs = await dns.lookup(host, { all: true });
  if (!addrs.length) throw new Error('dns_empty');
  if (addrs.some((a) => isPrivateAddress(a.address))) throw new Error('private_target');
}

function imageTypeOf(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  // AVIF liefern die Bild-CDNs deutscher Nachrichtenseiten inzwischen von sich
  // aus aus; ohne diesen Zweig landete so ein Bild als 'not_an_image' im 404.
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null; // insbesondere SVG: wuerde same-origin ausgeliefert und koennte Skript ausfuehren
}

async function fetchImage(startUrl, trustedHost) {
  let url = startUrl;
  for (let hop = 0; hop <= IMG_MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url, trustedHost);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(IMG_TIMEOUT_MS),
      headers: { 'User-Agent': UA, Accept: 'image/*' },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('redirect_without_location');
      url = new URL(loc, url).toString();
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await readCapped(res, IMG_MAX_BYTES);
    const type = imageTypeOf(buf);
    if (!type) throw new Error('not_an_image');
    return { type, buf };
  }
  throw new Error('too_many_redirects');
}

/* ---------- Abruf ---------- */

function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex');
}

// Antwort lesen und dabei deckeln. `arrayBuffer()` wuerde alles nehmen, was der
// Gegenueber schickt — bei fremden Servern keine gute Idee, und der Timeout
// hilft dagegen nicht (ein langsamer Riesen-Body bleibt innerhalb der Zeit).
async function readCapped(res, maxBytes) {
  if (Number(res.headers.get('content-length') || 0) > maxBytes) throw new Error('too_large');
  if (!res.body) return Buffer.alloc(0);
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body) {
    total += chunk.length;
    if (total > maxBytes) throw new Error('too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

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

// Feeds liefern nicht immer UTF-8 (deutsche Angebote gern ISO-8859-1) — die
// Kodierung steht im Content-Type oder in der XML-Deklaration.
function decodeBody(buf, contentType) {
  let charset = /charset\s*=\s*"?([\w-]+)/i.exec(contentType || '');
  if (!charset) charset = /<\?xml[^>]*encoding\s*=\s*["']([\w-]+)["']/i.exec(buf.toString('latin1', 0, 200));
  const enc = (charset ? charset[1] : 'utf-8').toLowerCase();
  if (enc === 'utf-8' || enc === 'utf8') return buf.toString('utf8');
  try { return new TextDecoder(enc).decode(buf); }
  catch { return buf.toString('utf8'); }
}

async function fetchSource(source) {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: { 'User-Agent': UA, Accept: FEED_ACCEPT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await readCapped(res, FEED_MAX_BYTES);
  const parsed = parseFeed(decodeBody(buf, res.headers.get('content-type')));
  return parsed.items.slice(0, PER_SOURCE_ITEMS)
    .map((it) => normalizeItem(it, source))
    .filter(Boolean);
}

function normalizeItem(it, source) {
  const link = absoluteUrl(it.link, source.url);
  if (!it.title || !link) return null;
  const image = absoluteUrl(it.image, link);
  return {
    id: sha1(it.guid || link).slice(0, 16),
    title: it.title.slice(0, 200),
    summary: it.summary,
    link,
    source: source.name,
    sourceId: source.id,
    category: source.category,
    lang: source.lang,
    published: it.published,
    image: image ? imageRef(image, source.url) : null,
  };
}

function absoluteUrl(url, base) {
  if (!url) return '';
  try {
    const u = new URL(url, base);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch { return ''; }
}

/* ---------- Modul ---------- */

module.exports = {
  id: 'news',
  label: 'News',
  ttl: 600000, // 10 min — Feeds fuellen sich langsam, und der Takt geht an Fremdserver

  // Ohne aktive Quelle passiert gar nichts: kein Abruf, kein Fremd-Request.
  configured: () => activeSources().length > 0,
  notConfigured: { ok: false, error: 'not_configured', items: [], sources: [] },
  errorFields: { items: [], sources: [] },

  async fetch(get, ctx) {
    const sources = activeSources();
    // Neue Generation der Bild-Zuordnung; die vorige bleibt gueltig, damit ein
    // offenes Detailfenster ueber einen Refresh hinweg sein Bild behaelt.
    _imgPrev = _imgCur;
    _imgCur = new Map();

    const results = await mapLimit(sources, FETCH_CONCURRENCY, async (source) => {
      try {
        const items = await fetchSource(source);
        return { source, items, error: null };
      } catch (err) {
        // Eine kaputte Quelle darf die uebrigen nicht mitreissen.
        ctx.warn(`${source.id}: ${err.message}`);
        return { source, items: [], error: err.message };
      }
    });

    const seen = new Set();
    const items = [];
    for (const r of results) {
      for (const it of r.items) {
        if (seen.has(it.link)) continue;
        seen.add(it.link);
        items.push(it);
      }
    }
    // Ohne Datum ans Ende — sonst stehen undatierte Meldungen dauerhaft oben.
    items.sort((a, b) => (Date.parse(b.published) || 0) - (Date.parse(a.published) || 0));

    return {
      ok: true,
      fetchedAt: Date.now(),
      // Kategorie-Labels wandern mit: die Kachel beschriftet ihren Themenfilter
      // damit, ohne den Katalog ein zweites Mal im Frontend zu pflegen.
      categories: CATEGORIES,
      items: items.slice(0, TOTAL_ITEMS),
      sources: results.map((r) => ({
        id: r.source.id,
        name: r.source.name,
        category: r.source.category,
        lang: r.source.lang,
        ok: !r.error,
        error: r.error,
        count: r.items.length,
      })),
    };
  },

  routes(app, { invalidate, refresh }) {
    // Katalog + aktuelle Auswahl fuer das Einstellungs-Panel.
    app.get('/api/news/config', (req, res) => {
      const cfg = readCfg();
      res.set('Cache-Control', 'no-store');
      res.json({
        ok: true,
        categories: CATEGORIES,
        langs: LANGS,
        catalog: CATALOG,
        custom: cfg.custom,
        enabled: cfg.enabled,
      });
    });

    app.post('/api/news/config', (req, res) => {
      try {
        const clean = writeCfg(req.body || {});
        invalidate();
        // Sofort neu holen und pushen, statt auf den naechsten Hub-Tick (10 min)
        // zu warten — sonst zeigen andere Tabs weiter die alte Quellenauswahl.
        refresh().catch(() => { /* Fehler landen in der naechsten Antwort */ });
        res.json({ ok: true, enabled: clean.enabled, custom: clean.custom });
      } catch (err) {
        console.error('[news] Konfiguration konnte nicht gespeichert werden:', err.message);
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    app.get('/api/news/image/:id', async (req, res) => {
      const id = String(req.params.id || '');
      if (!/^[a-f0-9]{16}$/.test(id)) return res.status(400).json({ ok: false, error: 'bad_id' });
      const entry = imageEntryFor(id);
      if (!entry) return res.status(404).json({ ok: false, error: 'unknown_image' });

      const send = (img) => {
        res.set('Content-Type', img.type);
        res.set('Cache-Control', 'public, max-age=3600');
        res.set('X-Content-Type-Options', 'nosniff');
        res.end(img.buf);
      };
      const hit = imgCacheGet(id);
      if (hit) return send(hit);

      try {
        const img = await fetchImage(entry.url, entry.host);
        imgCachePut(id, img);
        send(img);
      } catch (err) {
        // Die Kachel blendet fehlgeschlagene Bilder aus (img.onerror) — ein
        // 404 ist hier der ruhige Weg, kein 500.
        res.status(404).json({ ok: false, error: 'unavailable', message: err.message });
      }
    });
  },

  // Export fuer Smoke-Test und scripts/feed-check.mjs; die Registry ignoriert
  // unbekannte Felder. decodeBody gehoert dazu, damit das Diagnose-Skript
  // einen Feed exakt so liest wie der Server — sonst diagnostiziert es sich
  // selbst statt das Problem.
  parseFeed,
  decodeBody,
  CATALOG,
  CATEGORIES,
  UA,
  FEED_ACCEPT,
};
