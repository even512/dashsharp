#!/usr/bin/env node
/* ============================================================
   igdb-check — kommt die Game-Releases-Kachel bei IGDB an?
   ------------------------------------------------------------
   „Die Kachel bleibt leer" hat drei sehr verschiedene Ursachen:
   die Twitch-Zugangsdaten stimmen nicht, IGDB antwortet nicht,
   oder an dem Tag erscheint schlicht nichts Relevantes. Von
   aussen sieht alles drei gleich aus.

   Dieses Skript geht denselben Weg wie der Server — gleiche
   Zugangsdaten, gleiche Abfrage, gleiche Filter — und schreibt
   hin, wo es haengt. Ausgegeben wird pro Spiel, ob es die
   Relevanz-Stufen der Kachel passiert.

     node scripts/igdb-check.mjs                 # heute
     node scripts/igdb-check.mjs 2026-09-17      # ein bestimmter Tag
     node scripts/igdb-check.mjs --search gothic # Lupe testen
     node scripts/igdb-check.mjs --game 375232   # Detail + Uebersetzung
     node scripts/igdb-check.mjs --gamepass      # Game-Pass-Katalog + Abgleich
                                                 # (braucht keine Zugangsdaten)

   Zugangsdaten kommen aus der Umgebung (IGDB_CLIENT_ID /
   IGDB_CLIENT_SECRET) oder aus config/secrets.json, also
   genauso wie beim Server.

   Exit-Code 1, sobald der Token nicht zu holen ist oder eine
   Abfrage scheitert.
   ============================================================ */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const mod = require(join(ROOT, 'server/modules/game-releases.js'));
const { httpJson } = require(join(ROOT, 'server/registry.js'));
const I = mod._internals;

const C = process.stdout.isTTY
  ? { dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { dim: '', red: '', green: '', yellow: '', bold: '', off: '' };

/* Dieselbe Reihenfolge wie server.js: Umgebung schlaegt die UI-Werte. */
function secrets() {
  let file = {};
  try { file = JSON.parse(readFileSync(join(ROOT, 'config/secrets.json'), 'utf8')); }
  catch { /* ohne Datei zaehlt nur die Umgebung */ }
  return (key) => process.env[key] || file[key] || '';
}

const get = secrets();
const ctx = {
  httpJson,
  log: (...a) => console.log(C.dim, ...a, C.off),
  warn: (...a) => console.warn(`${C.yellow}!${C.off}`, ...a),
};

function fmtDate(iso) { return iso || 'Termin offen'; }

// Exakt die Stufen aus public/modules/game-releases.js.
function tierOf(it) {
  if (it.hypes >= 5 || it.criticRating != null) return 'notable';
  if (it.hypes >= 1 || it.rating != null || it.criticRating != null) return 'balanced';
  return 'all';
}

function printItems(items) {
  const counts = { all: items.length, balanced: 0, notable: 0 };
  for (const it of items) {
    const tier = tierOf(it);
    if (tier === 'notable') { counts.notable++; counts.balanced++; }
    else if (tier === 'balanced') counts.balanced++;

    const mark = tier === 'notable' ? `${C.green}##${C.off}`
      : tier === 'balanced' ? `${C.green} #${C.off}` : `${C.dim} .${C.off}`;
    const flags = [it.kind, it.status].filter(Boolean).join(', ');
    const gp = it.gamePass ? `${C.green}GP${C.off}` : '  ';
    console.log(`  ${mark} ${gp} hypes=${String(it.hypes).padEnd(4)}`
      + `${it.cover ? '  ' : `${C.yellow}!C${C.off}`} ${it.name}`);
    console.log(`       ${C.dim}${(it.platforms || []).map((p) => p.label).join(', ') || '-'}`
      + ` | ${(it.genres || []).join(', ') || 'ohne Genre'}${flags ? ` | ${flags}` : ''}${C.off}`);
  }
  console.log(`\n  ${C.bold}Stufen:${C.off} alles=${counts.all}`
    + `  ausgewogen=${counts.balanced}  namhaft=${counts.notable}`);
  console.log(`  ${C.dim}## = auch in "Nur Namhaftes"   # = in "Ausgewogen"`
    + `   . = nur in "Alles anzeigen"   !C = ohne Cover   GP = im Game Pass${C.off}`);
}

/* „Der Game-Pass-Chip fehlt" hat drei Ursachen, die von aussen gleich
   aussehen: der Katalog war nicht erreichbar, das Spiel steht wirklich nicht
   drin, oder der Titel-Abgleich hat danebengegriffen. Dieser Modus trennt
   die drei — und braucht keine IGDB-Zugangsdaten, weil der Katalog eine
   eigene, offene Quelle ist. */
async function checkGamePass(names) {
  const gp = I.gamepass;
  process.stdout.write('Game-Pass-Katalog aufbauen … ');
  const t0 = Date.now();
  const idx = await gp.index(ctx, { wait: true });
  if (!idx) {
    console.log(`${C.red}fehlgeschlagen${C.off}`);
    console.log('  Der Katalog war nicht erreichbar — die Kachel zeigt dann einfach keine Chips.');
    process.exitCode = 1;
    return;
  }
  console.log(`${C.green}ok${C.off} ${C.dim}(${((Date.now() - t0) / 1000).toFixed(1)}s)${C.off}\n`);

  let ambiguous = 0;
  for (const v of idx.keys.values()) if (v.ambiguous) ambiguous++;
  console.log(`  Produkte    ${idx.products} von ${idx.requested} aufgeloest`);
  console.log(`  Schluessel  ${idx.keys.size}${ambiguous ? `  ${C.yellow}(${ambiguous} mehrdeutig, liefern nichts)${C.off}` : ''}`);

  if (!names.length) {
    console.log(`\n  ${C.dim}Einzelne Titel pruefen: node scripts/igdb-check.mjs --gamepass "Starfield" "Halo Wars"${C.off}`);
    return;
  }
  console.log('');
  for (const name of names) {
    const hit = gp.lookup(idx, name);
    const where = hit
      ? [hit.console && 'Konsole', hit.pc && 'PC', hit.eaPlay && 'EA Play'].filter(Boolean).join(', ')
      : '';
    console.log(`  ${hit ? `${C.green}HIT ${C.off}` : `${C.dim}miss${C.off}`} ${name.padEnd(40)} ${C.dim}${where}${C.off}`);
    if (!hit) {
      console.log(`       ${C.dim}Schluessel: "${gp.normalizeTitle(gp.stripEditions(name))}"${C.off}`);
    }
  }
  console.log(`\n  ${C.dim}miss heisst nicht zwingend "nicht im Game Pass": steht dort nur eine`
    + ` Edition\n  ("Halo Wars: Definitive Edition"), wird bewusst nicht zugeordnet.${C.off}`);
}

async function main() {
  const args = process.argv.slice(2);

  // Vor der Zugangsdaten-Pruefung: der Game-Pass-Katalog ist eine eigene,
  // offene Quelle und laesst sich auch ohne IGDB-Zugang testen.
  const gpAt = args.indexOf('--gamepass');
  if (gpAt >= 0) return checkGamePass(args.slice(gpAt + 1));

  if (!get('IGDB_CLIENT_ID') || !get('IGDB_CLIENT_SECRET')) {
    console.error(`${C.red}IGDB_CLIENT_ID / IGDB_CLIENT_SECRET fehlen.${C.off}`);
    console.error('Entweder in .env setzen oder in den Einstellungen des Dashboards eintragen.');
    console.error('Anlegen unter https://dev.twitch.tv/console/apps (kostenlos).');
    process.exit(1);
  }

  process.stdout.write('Token holen … ');
  await I.getToken(get, ctx);
  console.log(`${C.green}ok${C.off}\n`);

  const searchAt = args.indexOf('--search');
  if (searchAt >= 0) {
    const q = args.slice(searchAt + 1).join(' ').trim();
    if (!q) throw new Error('--search braucht einen Suchbegriff');
    console.log(`${C.bold}Suche "${q}"${C.off}\n`);
    for (const g of await I.searchGames(get, ctx, q)) {
      console.log(`  ${fmtDate(g.date).padEnd(12)} hypes=${String(g.hypes).padEnd(4)}`
        + ` ${g.name}${g.kind ? ` ${C.dim}(${g.kind})${C.off}` : ''}`);
    }
    return;
  }

  const gameAt = args.indexOf('--game');
  if (gameAt >= 0) {
    const id = I.toId(args[gameAt + 1]);
    if (!id) throw new Error('--game braucht eine numerische IGDB-Id');
    const g = await I.gameDetail(get, ctx, id);
    if (!g) { console.log(`${C.yellow}Kein Spiel mit dieser Id.${C.off}`); return; }
    console.log(`${C.bold}${g.name}${C.off}  ${C.dim}${fmtDate(g.date)}${C.off}\n`);
    const lang = g.summaryLang === 'de' ? `${C.green}deutsch${C.off}` : `${C.yellow}englisch${C.off}`;
    console.log(`  Beschreibung (${lang}, Quelle ${g.summarySource}):`);
    console.log(`    ${g.summary || '-'}\n`);
    for (const [k, v] of [
      ['Entwickler', g.developers], ['Publisher', g.publishers],
      ['Genres', g.genres], ['Plattformen', (g.platforms || []).map((p) => p.label)],
      ['Spielmodi', g.modes], ['Perspektive', g.perspectives], ['Engine', g.engines],
      ['Freigaben', (g.ageRatings || []).map((r) => `${r.org} ${r.value}`)],
      ['Stores', (g.stores || []).map((s) => s.label)],
    ]) if (v && v.length) console.log(`  ${k.padEnd(13)} ${v.join(', ')}`);
    console.log(`  ${'Screenshots'.padEnd(13)} ${(g.screenshots || []).length}`);
    return;
  }

  const date = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || I.todayIso();
  if (!I.isValidIso(date)) throw new Error(`ungueltiges Datum: ${date}`);
  console.log(`${C.bold}Releases am ${date}${C.off}\n`);
  const items = await I.releasesForDay(get, ctx, date);
  if (!items.length) {
    console.log(`  ${C.yellow}IGDB kennt fuer diesen Tag keine Neuerscheinung.${C.off}`);
    console.log('\n  Was als Naechstes ansteht:');
    for (const g of await I.upcoming(get, ctx)) {
      console.log(`    ${g.date}  hypes=${String(g.hypes).padEnd(4)} ${g.name}`);
    }
    return;
  }
  printItems(items);
}

main().catch((err) => {
  console.error(`\n${C.red}Fehlgeschlagen:${C.off} ${err.message}`);
  if (/HTTP 40[13]/.test(err.message)) {
    console.error(`${C.dim}Sieht nach falschen Zugangsdaten aus — Client-ID und Secret pruefen.${C.off}`);
  }
  process.exit(1);
});
