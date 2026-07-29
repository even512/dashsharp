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
     node scripts/igdb-check.mjs --why "Company of Heroes 3: Final Stand"
                                                 # warum fehlt EIN Titel?
     node scripts/igdb-check.mjs --audit         # Typen und Kennzahlen des Tages

   `--why` ist aus einem konkreten Fehler entstanden: "Final Stand" war in
   der Serverantwort und fiel erst in der Relevanzstufe der Kachel aus. Von
   aussen sah das aus wie ein Filter- oder Datumsproblem, und die Suche
   danach kostete vier Anlaeufe. Der Modus geht jetzt jede Huerde in genau
   der Reihenfolge durch, in der der Server sie anlegt.

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

// Exakt die Stufen aus public/modules/game-releases.js — inklusive der
// Popularity-Raenge und des Add-on-Umwegs ueber das Elternspiel.
const POP_NOTABLE = 5;
const POP_BALANCED = 8;
const PARENT_KNOWN_RATINGS = 20;

function tierOf(it) {
  const rank = it.popRank == null ? Infinity : it.popRank;
  const parent = !!(it.addon && it.parent && it.parent.ratings >= PARENT_KNOWN_RATINGS);
  if (rank <= POP_NOTABLE || it.hypes >= 5 || it.criticRating != null || parent) return 'notable';
  if (rank <= POP_BALANCED || it.hypes >= 1 || it.rating != null) return 'balanced';
  return 'all';
}

function popText(it) {
  if (!it.popTypes || !it.popTypes.length) return 'keine Popularity-Daten';
  const TN = { 1: 'Visits', 2: 'WantToPlay', 5: 'Peak', 9: 'TopSeller', 10: 'Wishlist' };
  return it.popTypes.map((p) => `${TN[p.type] || p.type}#${p.rank}`).join(' ');
}

function printItems(items) {
  const counts = { all: items.length, balanced: 0, notable: 0 };
  for (const it of items) {
    const tier = tierOf(it);
    if (tier === 'notable') { counts.notable++; counts.balanced++; }
    else if (tier === 'balanced') counts.balanced++;

    const mark = tier === 'notable' ? `${C.green}##${C.off}`
      : tier === 'balanced' ? `${C.green} #${C.off}` : `${C.dim} .${C.off}`;
    const flags = [it.kind, it.status, it.parent ? `zu ${it.parent.name}` : ''].filter(Boolean).join(', ');
    const gp = it.gamePass ? `${C.green}GP${C.off}` : '  ';
    const rank = it.popRank == null ? `${C.dim} -- ${C.off}` : `#${String(it.popRank).padEnd(3)}`;
    console.log(`  ${mark} ${gp} ${rank} hypes=${String(it.hypes).padEnd(4)}`
      + `${it.cover ? '  ' : `${C.yellow}!C${C.off}`} ${it.name}`);
    console.log(`       ${C.dim}${(it.platforms || []).map((p) => p.label).join(', ') || '-'}`
      + ` | ${(it.genres || []).join(', ') || 'ohne Genre'}${flags ? ` | ${flags}` : ''}${C.off}`);
  }
  console.log(`\n  ${C.bold}Stufen:${C.off} alles=${counts.all}`
    + `  ausgewogen=${counts.balanced}  namhaft=${counts.notable}`);
  console.log(`  ${C.dim}## = auch in "Nur Namhaftes"   # = in "Ausgewogen"`
    + `   . = nur in "Alles anzeigen"   !C = ohne Cover   GP = im Game Pass${C.off}`);
  console.log(`  ${C.dim}#N = Popularity-Rang im Tagesvergleich, -- = keine Daten${C.off}`);
}

/* „Warum fehlt dieser Titel?" — jede Huerde einzeln, in der Reihenfolge des
   Servers. Am Ende steht, welche als erste gerissen hat. */
async function checkWhy(args) {
  const query = args[0];
  if (!query) throw new Error('--why braucht einen Titel oder eine IGDB-Id');
  const day = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || I.todayIso();
  if (!I.isValidIso(day)) throw new Error(`ungueltiges Datum: ${day}`);

  let id = I.toId(query);
  if (!id) {
    const hits = await I.searchGames(get, ctx, query);
    if (!hits.length) {
      console.log(`${C.red}Die Lupe findet "${query}" nicht.${C.off}`);
      console.log('  Dann liegt es nicht an der Kachel, sondern daran, dass IGDB den');
      console.log('  Titel nicht (so) kennt. Mit --search andere Schreibweisen probieren.');
      process.exitCode = 1;
      return;
    }
    id = hits[0].id;
    if (hits.length > 1) {
      console.log(`${C.dim}Mehrere Treffer, geprueft wird der erste:${C.off}`);
      for (const h of hits.slice(0, 5)) console.log(`  ${C.dim}${h.id}  ${h.name}${C.off}`);
      console.log('');
    }
  }

  const games = await I.igdb(get, ctx, 'games',
    'fields id, name, game_type, first_release_date, hypes, total_rating,'
    + ' total_rating_count, aggregated_rating, cover.image_id,'
    + ` parent_game.name, parent_game.total_rating_count; where id = ${id};`);
  const g = Array.isArray(games) && games[0];
  if (!g) { console.log(`${C.yellow}Kein Spiel mit der Id ${id}.${C.off}`); return; }

  console.log(`${C.bold}${g.name}${C.off} ${C.dim}(IGDB ${g.id}), geprueft fuer ${day}${C.off}\n`);

  const fails = [];
  const gate = (ok, label, detail) => {
    console.log(`  ${ok ? `${C.green}ok  ${C.off}` : `${C.red}FEHL${C.off}`} ${label.padEnd(22)}`
      + `${C.dim}${detail}${C.off}`);
    if (!ok) fails.push(label);
  };

  // 1. Typ — und aus welcher der beiden Tagesabfragen er kommt.
  const kind = I.GAME_TYPE_DE[g.game_type] || (g.game_type === 0 ? 'Hauptspiel' : `Typ ${g.game_type}`);
  const inMain = I.GAME_TYPES.includes(g.game_type);
  const inAddon = I.ADDON_TYPES.includes(g.game_type);
  gate(inMain || inAddon, 'game_type',
    `${g.game_type} (${kind}) — ${inMain ? 'Hauptabfrage' : inAddon ? 'Add-on-Abfrage' : 'in KEINER Abfrage'}`);
  if (inAddon) {
    const p = g.parent_game;
    console.log(`       ${C.dim}Add-on${p ? ` zu "${p.name}" (${p.total_rating_count || 0} Wertungen)` : ' ohne Elternspiel'}`
      + ` — Schalter "Erweiterungen & DLC" muss an sein${C.off}`);
  }

  // 2. Alle Termine des Spiels, die im Tagesfenster markiert.
  const { start, end } = I.dayBounds(day);
  console.log(`\n  ${C.bold}Tagesfenster${C.off} ${start} .. ${end}`
    + ` ${C.dim}(${day}T00:00:00Z bis ${I.isoOf(end)}T00:00:00Z, Europe/Berlin auf UTC gerechnet)${C.off}`);
  const rds = await I.igdb(get, ctx, 'release_dates',
    `fields date, date_format, status, platform.name; where game = ${id}; sort date asc; limit 50;`);
  const dates = Array.isArray(rds) ? rds : [];
  if (!dates.length) console.log(`       ${C.yellow}keine release_dates-Zeile${C.off}`);
  for (const rd of dates) {
    const inWin = rd.date >= start && rd.date < end;
    console.log(`       ${inWin ? `${C.green}>>${C.off}` : '  '} ${I.isoOf(rd.date) || '?'}`
      + `  format=${rd.date_format}  ${C.dim}${(rd.platform || {}).name || '-'}${C.off}`);
  }
  const inWindow = dates.filter((rd) => rd.date >= start && rd.date < end);
  gate(inWindow.length > 0, 'Termin im Fenster',
    `${inWindow.length} von ${dates.length} Zeilen`);
  gate(inWindow.some((rd) => rd.date_format === 0), 'date_format',
    inWindow.length ? `${inWindow.map((rd) => rd.date_format).join(', ')} (die Abfrage verlangt 0)` : '—');

  /* Die Gegenprobe zur Lupe: die liest first_release_date, die Tagesliste
     liest release_dates. Klaffen die auseinander, kann die Kachel den Titel
     strukturell nicht sehen — und genau so entsteht der Eindruck, sie sei
     kaputt. */
  const frd = I.isoOf(g.first_release_date);
  if (!inWindow.length && frd === day) {
    console.log(`\n  ${C.yellow}Nur ueber first_release_date auffindbar (${frd}).${C.off}`);
    console.log(`  ${C.dim}Die Lupe sagt deshalb "heute", die Tagesabfrage ueber release_dates`);
    console.log(`  kann den Titel aber nicht sehen. Das ist ein IGDB-Datenproblem.${C.off}`);
  }

  // 3. Kommt er tatsaechlich in der Serverantwort an?
  console.log('');
  const items = await I.releasesForDay(get, ctx, day);
  const at = items.findIndex((it) => it.id === id);
  gate(at >= 0, 'in der Antwort', at >= 0 ? `Platz ${at + 1} von ${items.length}` : `${items.length} Spiele, nicht dabei`);

  // 4. Die Huerden im Browser.
  if (at >= 0) {
    const it = items[at];
    const tier = tierOf(it);
    console.log('');
    gate(it.popRank != null, 'Popularity', `${it.popRank == null ? '—' : `Rang ${it.popRank}`}  ${popText(it)}`);
    gate(tier !== 'all', 'Relevanzstufe',
      `${tier}  (hypes=${it.hypes}, rating=${it.rating}, kritik=${it.criticRating})`);
    gate(!!it.cover, 'Cover', it.cover ? 'vorhanden' : 'fehlt — "Nur mit Cover" blendet aus');
    console.log(`  ${C.dim}     Plattformen            ${(it.families || []).join(', ') || '-'}${C.off}`);
  }

  console.log('');
  if (!fails.length) {
    console.log(`  ${C.green}Sichtbar${C.off} — mit den Standardeinstellungen steht der Titel auf der Kachel.`);
    return;
  }
  const first = fails[0];
  const settings = ['Relevanzstufe', 'Cover'];
  console.log(`  ${C.red}Gerissen an: ${first}${C.off}`
    + `${fails.length > 1 ? ` ${C.dim}(dann auch: ${fails.slice(1).join(', ')})${C.off}` : ''}`);
  console.log(settings.includes(first)
    ? '  Das ist eine Kachel-Einstellung — Relevanz auf "Alles anzeigen" stellen.'
    : '  Das ist Code: die Abfrage in releasesForDay() laesst den Titel nicht durch.');
  process.exitCode = 1;
}

/* Bestandsaufnahme eines Tages ohne die Filter des Servers. Dient zwei
   Zwecken: POP_NOTABLE/POP_BALANCED ueber mehrere Tage nachjustieren, und
   ein stilles Umnummerieren der IGDB-Enums auffallen lassen — der Dateikopf
   des Moduls warnt davor, weil umbenannte Felder null liefern statt zu
   scheitern. */
async function checkAudit(args) {
  const day = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) || I.todayIso();
  if (!I.isValidIso(day)) throw new Error(`ungueltiges Datum: ${day}`);
  const { start, end } = I.dayBounds(day);
  console.log(`${C.bold}Bestandsaufnahme ${day}${C.off} ${C.dim}(ohne Typ- und Datumsfilter)${C.off}\n`);

  const rows = await I.igdb(get, ctx, 'release_dates',
    'fields date, date_format, game.id, game.name, game.game_type, game.hypes;'
    + ` where date >= ${start} & date < ${end}; limit ${I.DAY_LIMIT};`);
  const all = Array.isArray(rows) ? rows : [];
  const games = new Map();
  for (const r of all) if (r.game && r.game.id) games.set(r.game.id, r.game);

  console.log(`  Zeilen ${all.length} von ${I.DAY_LIMIT}`
    + `${all.length >= I.DAY_LIMIT ? `  ${C.red}AM LIMIT — es fehlen Zeilen${C.off}` : ''}`);
  console.log(`  Spiele ${games.size}\n`);

  const hist = (label, pick, label2) => {
    const counts = new Map();
    for (const g of games.values()) counts.set(pick(g), (counts.get(pick(g)) || 0) + 1);
    console.log(`  ${C.bold}${label}${C.off}`);
    for (const [k, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(k).padEnd(6)} ${String(n).padStart(4)}  ${C.dim}${label2(k)}${C.off}`);
    }
    console.log('');
  };
  hist('game_type', (g) => g.game_type, (k) => {
    const name = I.GAME_TYPE_DE[k] || (Number(k) === 0 ? 'Hauptspiel' : 'unbenannt');
    const where = I.GAME_TYPES.includes(Number(k)) ? 'Hauptabfrage'
      : I.ADDON_TYPES.includes(Number(k)) ? 'Add-on-Abfrage' : 'wird ignoriert';
    return `${name} — ${where}`;
  });
  const byFormat = new Map();
  for (const r of all) byFormat.set(r.date_format, (byFormat.get(r.date_format) || 0) + 1);
  console.log(`  ${C.bold}date_format${C.off} ${C.dim}(Zeilen, nicht Spiele)${C.off}`);
  for (const [k, n] of [...byFormat.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(k).padEnd(6)} ${String(n).padStart(4)}`
      + `  ${C.dim}${Number(k) === 0 ? 'taggenau — nur das nimmt die Abfrage' : 'ungenau (Monat/Quartal/Jahr)'}${C.off}`);
  }
  if (!byFormat.has(0)) {
    console.log(`    ${C.red}Kein date_format = 0 — dann hat IGDB das Feld umnummeriert`);
    console.log(`    und die Tagesabfrage laeuft still leer.${C.off}`);
  }
  console.log('');

  const ids = [...games.keys()];
  const pop = await I.popularityFor(get, ctx, ids);
  const withPop = ids.filter((i) => pop.has(i)).length;
  const withHypes = [...games.values()].filter((g) => (g.hypes || 0) >= 1).length;
  console.log(`  ${C.bold}Signale${C.off}`);
  console.log(`    Popularity  ${String(withPop).padStart(4)} von ${games.size}`);
  console.log(`    hypes >= 1  ${String(withHypes).padStart(4)} von ${games.size}`);
  console.log(`    keins       ${String(ids.filter((i) => !pop.has(i)
    && !((games.get(i).hypes || 0) >= 1)).length).padStart(4)} von ${games.size}`);
  console.log(`\n  ${C.dim}Popularity ist eine Momentaufnahme: fuer vergangene Tage sinkt die`);
  console.log(`  Abdeckung, deshalb prueft die Kachel Popularity ODER hypes/Wertung.${C.off}`);
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

  const whyAt = args.indexOf('--why');
  if (whyAt >= 0) return checkWhy(args.slice(whyAt + 1));

  const auditAt = args.indexOf('--audit');
  if (auditAt >= 0) return checkAudit(args.slice(auditAt + 1));

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
