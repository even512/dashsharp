#!/usr/bin/env node
/* ============================================================================
   Laedt die Web-Schriften einmalig nach public/vendor/fonts und erzeugt die
   passenden @font-face-Regeln.

       node scripts/fetch-fonts.mjs

   Warum ueberhaupt lokal: das Dashboard wirbt mit „no telemetry, nothing
   phoning home". Ein <link> auf fonts.googleapis.com widerspricht dem (Google
   sieht IP und User-Agent jedes Aufrufs) und bricht in Homelabs ohne
   Internetzugang. Die Dateien liegen deshalb im Repo — dieses Skript ist nur
   noetig, um sie zu aktualisieren oder eine Schrift zu ergaenzen.

   Es werden nur die Latin-Subsets geholt (~360 KB statt ~1,5 MB fuer alle
   Sprachen). Die erzeugten Regeln landen zwischen den MARKER-Zeilen in
   public/styles.css; alles ausserhalb bleibt unangetastet.
   ============================================================================ */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = join(ROOT, 'public', 'vendor', 'fonts');
const CSS_PATH = join(ROOT, 'public', 'styles.css');

const START = '/* >>> FONTS: von scripts/fetch-fonts.mjs erzeugt — nicht von Hand aendern <<< */';
const END   = '/* <<< FONTS ENDE >>> */';

const FAMILIES = 'family=JetBrains+Mono:wght@400;500;600;700'
               + '&family=Space+Grotesk:wght@400;500;600;700'
               + '&family=VT323';
const SUBSETS = ['latin', 'latin-ext'];
// Ohne Browser-User-Agent liefert Google die alte TTF-Variante statt woff2.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');

async function download(url, dest, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      // woff2-Magic pruefen, damit keine Fehlerseite als Schrift landet.
      if (buf.subarray(0, 4).toString() !== 'wOF2') throw new Error('keine woff2-Datei');
      writeFileSync(dest, buf);
      return buf.length;
    } catch (err) {
      if (i === tries) throw err;
      await new Promise((r) => setTimeout(r, i * 2000));
    }
  }
}

const cssUrl = `https://fonts.googleapis.com/css2?${FAMILIES}&display=swap`;
const res = await fetch(cssUrl, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
if (!res.ok) { console.error(`Google-Fonts-CSS nicht erreichbar: HTTP ${res.status}`); process.exit(1); }
const css = await res.text();

mkdirSync(FONT_DIR, { recursive: true });

const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*@font-face \{(.*?)\}/gs)];
const faces = [];
let total = 0;

for (const [, subset, body] of blocks) {
  if (!SUBSETS.includes(subset)) continue;
  const family = /font-family: '([^']+)'/.exec(body)?.[1];
  const weight = /font-weight: (\d+)/.exec(body)?.[1];
  const url    = /url\((https:\/\/[^)]+)\)/.exec(body)?.[1];
  const range  = /unicode-range: ([^;]+);/.exec(body)?.[1]?.trim();
  if (!family || !weight || !url) continue;

  const file = `${slug(family)}-${weight}-${subset}.woff2`;
  const size = await download(url, join(FONT_DIR, file));
  total += size;
  faces.push({ family, weight, file, range });
  console.log(`  ${file.padEnd(42)} ${(size / 1024).toFixed(1).padStart(6)} KB`);
}

if (!faces.length) { console.error('Keine passenden @font-face-Bloecke gefunden.'); process.exit(1); }

const order = { 'JetBrains Mono': 0, 'Space Grotesk': 1, VT323: 2 };
faces.sort((a, b) => (order[a.family] ?? 9) - (order[b.family] ?? 9)
                  || a.weight - b.weight
                  || a.file.localeCompare(b.file));

const rules = faces.map((f) => [
  '@font-face {',
  `  font-family: '${f.family}';`,
  '  font-style: normal;',
  `  font-weight: ${f.weight};`,
  '  font-display: swap;',
  `  src: url('vendor/fonts/${f.file}') format('woff2');`,
  ...(f.range ? [`  unicode-range: ${f.range};`] : []),
  '}',
].join('\n')).join('\n');

const block = `${START}\n${rules}\n${END}`;
let sheet = readFileSync(CSS_PATH, 'utf8');
sheet = sheet.includes(START)
  ? sheet.replace(new RegExp(`${START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), block)
  : `${block}\n\n${sheet}`;
writeFileSync(CSS_PATH, sheet);

console.log(`\n${faces.length} Schriftdateien, ${(total / 1024).toFixed(0)} KB — @font-face-Regeln in public/styles.css aktualisiert.`);
