#!/usr/bin/env node
/* ============================================================
   feed-check — was liefert ein Feed wirklich?
   ------------------------------------------------------------
   „Bei Quelle X fehlen die Bilder" ist von aussen nicht zu klaeren: die
   Kachel zeigt entweder ein Bild oder nichts, und warum nichts, steht
   nirgends. Dieses Skript holt einen Feed mit denselben Kopfzeilen und
   demselben Parser wie der Server und schreibt hin, was dabei herauskommt —
   pro Eintrag Titel, Link und Bild, am Ende eine Zeile pro Quelle.

   Es laeuft bewusst ausserhalb des Servers: im Homelab ist der Feed
   erreichbar, in einer abgeschotteten Umgebung nicht.

     node scripts/feed-check.mjs                  # alle Katalog-Quellen
     node scripts/feed-check.mjs golem heise      # einzelne Quellen (id)
     node scripts/feed-check.mjs https://…/feed   # beliebige URL
     node scripts/feed-check.mjs golem --raw      # + XML des ersten Eintrags

   Der Exit-Code ist 1, sobald eine gepruefte Quelle nicht erreichbar war
   oder keinen einzigen Eintrag geliefert hat — so taugt es auch als
   gelegentlicher Katalog-Check.
   ============================================================ */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const news = createRequire(import.meta.url)(join(ROOT, 'server/modules/news.js'));

const C = process.stdout.isTTY
  ? { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { dim: '', red: '', green: '', yellow: '', bold: '', off: '' };

const TIMEOUT_MS = 15000;
const MAX_BYTES = 4 * 1024 * 1024;
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const raw = args.includes('--raw');
const wanted = args.filter((a) => !a.startsWith('--'));

// Argumente aufloesen: Katalog-id, URL — oder ohne Argument der ganze Katalog.
const targets = [];
for (const arg of wanted) {
  if (/^https?:\/\//i.test(arg)) {
    targets.push({ id: '—', name: new URL(arg).hostname, url: arg });
    continue;
  }
  const hit = news.CATALOG.find((s) => s.id === arg);
  if (hit) targets.push(hit);
  else console.error(`${C.yellow}unbekannte Quelle: ${arg}${C.off} (id aus dem Katalog oder eine URL erwartet)`);
}
if (!wanted.length) targets.push(...news.CATALOG);
if (!targets.length) process.exit(2);

// Gedeckelt lesen, wie der Server auch: ein Feed ist Fremddatenstrom.
async function readCapped(res) {
  const chunks = [];
  let total = 0;
  for await (const chunk of res.body || []) {
    total += chunk.length;
    if (total > MAX_BYTES) throw new Error('too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, total);
}

function abs(url, base) {
  if (!url) return '';
  try {
    const u = new URL(url, base);
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : '';
  } catch { return ''; }
}

async function check(source) {
  const started = Date.now();
  try {
    const res = await fetch(source.url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': news.UA, Accept: news.FEED_ACCEPT },
    });
    const buf = await readCapped(res);
    const xml = news.decodeBody(buf, res.headers.get('content-type'));
    if (!res.ok) return { source, error: `HTTP ${res.status}`, ms: Date.now() - started, xml };
    const parsed = news.parseFeed(xml);
    const items = parsed.items.map((it) => ({
      title: it.title,
      link: abs(it.link, source.url),
      image: abs(it.image, abs(it.link, source.url) || source.url),
    }));
    return {
      source,
      status: res.status,
      finalUrl: res.url !== source.url ? res.url : '',
      type: (res.headers.get('content-type') || '').split(';')[0],
      bytes: buf.length,
      ms: Date.now() - started,
      items,
      xml,
    };
  } catch (err) {
    return { source, error: err.message, ms: Date.now() - started };
  }
}

async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let next = 0;
  await Promise.all(new Array(Math.min(limit, list.length)).fill(0).map(async () => {
    for (;;) {
      const i = next++;
      if (i >= list.length) return;
      out[i] = await fn(list[i]);
    }
  }));
  return out;
}

// Den ersten <item>/<entry> im Original zeigen — bei „keine Bilder" ist das
// die einzige Frage, die zaehlt: was steht ueberhaupt drin?
function firstBlock(xml) {
  const m = /<(?:[a-zA-Z0-9]+:)?(item|entry)\b[^>]*>[\s\S]*?<\/(?:[a-zA-Z0-9]+:)?\1\s*>/i.exec(String(xml || ''));
  return m ? m[0] : '(kein <item>/<entry> gefunden)';
}

const results = await mapLimit(targets, CONCURRENCY, check);
const broken = [];

for (const r of results) {
  const { source } = r;
  console.log(`${C.bold}${source.id}${C.off}  ${source.name}`);
  console.log(`  ${C.dim}${source.url}${C.off}`);

  if (r.error) {
    console.log(`  ${C.red}✗ ${r.error}${C.off} ${C.dim}(${r.ms} ms)${C.off}\n`);
    broken.push(`${source.id}: ${r.error}`);
    if (raw && r.xml) console.log(`${C.dim}${firstBlock(r.xml).slice(0, 2000)}${C.off}\n`);
    continue;
  }

  const withImage = r.items.filter((i) => i.image).length;
  const mark = !r.items.length ? C.red + '✗' : withImage ? C.green + '✓' : C.yellow + '!';
  console.log(`  ${mark}${C.off} HTTP ${r.status} · ${r.type || '?'} · ${(r.bytes / 1024).toFixed(0)} kB`
    + ` · ${r.items.length} Eintraege · ${withImage} mit Bild ${C.dim}(${r.ms} ms)${C.off}`);
  if (r.finalUrl) console.log(`  ${C.dim}→ umgeleitet auf ${r.finalUrl}${C.off}`);

  for (const it of r.items.slice(0, 3)) {
    console.log(`    ${C.dim}·${C.off} ${it.title.slice(0, 70)}`);
    console.log(`      ${it.image ? C.dim + it.image : C.yellow + 'kein Bild'}${C.off}`);
  }

  if (!r.items.length) broken.push(`${source.id}: 0 Eintraege (Feed erreichbar, aber leer oder kein Feed)`);
  else if (!withImage) broken.push(`${source.id}: 0 von ${r.items.length} Eintraegen mit Bild`);

  if (raw) console.log(`\n${C.dim}${firstBlock(r.xml).slice(0, 2000)}${C.off}`);
  console.log('');
}

console.log(`${C.bold}${results.length} Quelle(n) geprueft${C.off}`);
for (const line of broken) console.log(`  ${C.yellow}${line}${C.off}`);
// Fehlende Bilder allein sind kein Fehler — manche Feeds fuehren schlicht
// keine. Unerreichbar oder leer dagegen schon.
process.exit(results.some((r) => r.error || !r.items.length) ? 1 : 0);
