#!/usr/bin/env node
/* ============================================================================
   Smoke-Test — laeuft ohne Test-Framework und ohne echte Upstreams.

       npm test

   Hintergrund: app.js und server.js sind grosse Einzeldateien ohne
   Modulsystem im Browser. Ein Syntaxfehler in app.js liefert ein weisses
   Dashboard, ohne dass irgendetwas fehlschlaegt — das faellt sonst erst dem
   Benutzer auf. Ebenso rutscht ein Modul mit kaputtem Manifest oder doppelter
   id bisher unbemerkt durch.

   Geprueft wird deshalb:
     1. Syntax aller JS-Dateien
     2. Backend-Modulmanifeste (Pflichtfelder, id-Format, doppelte ids/Events)
     3. Frontend-Registry (Ableitung der Tabellen, doppelte Kachel-ids)
     4. Server-Start und die Kern-Endpunkte
     5. Host-Allowlist (DNS-Rebinding-Schutz)
   ============================================================================ */

import { execFileSync, spawn } from 'node:child_process';
import { readdirSync, readFileSync, mkdtempSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import { createRequire } from 'node:module';
import { get as httpGet } from 'node:http';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.SMOKE_PORT || 3921;
const BASE = `http://127.0.0.1:${PORT}`;

let failed = 0;
const ok   = (m) => console.log(`  [32m✓[0m ${m}`);
const bad  = (m) => { failed++; console.log(`  [31m✗[0m ${m}`); };
const is   = (cond, m) => (cond ? ok(m) : bad(m));
const head = (m) => console.log(`\n${m}`);

/* ---------- 1. Syntax ---------- */
head('Syntax');
const jsFiles = [
  'server.js', 'server/registry.js',
  'public/app.js', 'public/registry.js',
  ...readdirSync(join(ROOT, 'server/modules')).filter((f) => f.endsWith('.js')).map((f) => `server/modules/${f}`),
  ...readdirSync(join(ROOT, 'public/modules')).filter((f) => f.endsWith('.js')).map((f) => `public/modules/${f}`),
];
for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', join(ROOT, f)], { stdio: 'pipe' }); ok(f); }
  catch (e) { bad(`${f}: ${String(e.stderr || e).split('\n').slice(0, 3).join(' ')}`); }
}

/* ---------- 1b. Image-Vollstaendigkeit ----------
   Der Smoke-Test laeuft gegen das Repo, das Image enthaelt aber nur die im
   Dockerfile per COPY aufgefuehrten Pfade. Genau daran ist der Container schon
   einmal gestorben: server/registry.js war neu, aber nicht kopiert — Node
   brach beim require sofort ab, waehrend hier alles gruen war.
   Deshalb: jeden relativen require()-Pfad aus server.js gegen die kopierten
   Pfade pruefen. */
head('Image-Vollstaendigkeit (Dockerfile COPY)');
{
  const dockerfile = readFileSync(join(ROOT, 'Dockerfile'), 'utf8');
  const copied = [...dockerfile.matchAll(/^COPY\s+(?!--)(\S+)\s+(\S+)\s*$/gm)]
    .map(([, src]) => src.replace(/^\.\//, ''));
  const covers = (p) => copied.some((c) => {
    if (c === p) return true;
    if (c.includes('*')) return new RegExp('^' + c.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$').test(p);
    return p.startsWith(c.replace(/\/$/, '') + '/');
  });

  const server = readFileSync(join(ROOT, 'server.js'), 'utf8');
  const localReqs = [...server.matchAll(/require\(\s*'(\.[^']+)'\s*\)/g)].map(([, r]) => r);
  for (const r of localReqs) {
    const rel = r.replace(/^\.\//, '');
    const candidates = [rel, `${rel}.js`, `${rel}/index.js`];
    is(candidates.some(covers), `require('${r}') ist im Image enthalten`);
  }
  // Verzeichnisse, die zur Laufzeit eingelesen werden (Auto-Discovery)
  for (const dir of ['server/modules', 'public/modules']) {
    is(covers(`${dir}/x.js`), `${dir}/ wird ins Image kopiert`);
  }
  is(covers('public/registry.js'), 'public/registry.js ist im Image enthalten');
}

/* ---------- 2. Backend-Module ---------- */
head('Backend-Module');
const registry = await import(join(ROOT, 'server/registry.js')).then((m) => m.default ?? m);
const mods = registry.loadModules();
is(mods.length > 0, `${mods.length} Modul(e) geladen: ${mods.map((m) => m.id).join(', ')}`);
is(new Set(mods.map((m) => m.id)).size === mods.length, 'keine doppelten Modul-ids');
is(new Set(mods.map((m) => m.event)).size === mods.length, 'keine doppelten SSE-Events');
for (const m of mods) {
  const problem = registry.validateModule(m, m.id);
  is(!problem, `Manifest ${m.id}${problem ? `: ${problem}` : ''}`);
  is(typeof m.configured === 'function' && typeof m.fetch === 'function', `${m.id}: configured()/fetch() vorhanden`);
}
// Vorlagen (_-Praefix) duerfen nicht geladen werden
is(!mods.some((m) => m.id === 'example'), '_example.js wird nicht geladen');

/* ---------- 2b. News-Feed-Parser ----------
   Der Parser ist handgeschrieben (keine XML-Dependency) und bekommt
   ausschliesslich Fremddaten zu sehen: CDATA, doppelt kodierte Entities,
   relative Links, Bilder mal als enclosure, mal im Beschreibungs-HTML.
   Faellt er auf die Nase, bleibt die Kachel leer — deshalb hier festgenagelt. */
head('News-Feed-Parser');
{
  const news = createRequire(import.meta.url)(join(ROOT, 'server/modules/news.js'));
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
    <channel><title>Test-Feed</title>
      <item>
        <title><![CDATA[GPU mit 24 GB &amp; mehr]]></title>
        <link>https://example.com/a/1</link>
        <guid isPermaLink="false">abc-1</guid>
        <pubDate>Mon, 27 Jul 2026 10:15:00 +0200</pubDate>
        <description><![CDATA[<p>Ein <b>Teaser</b>.</p><img src="https://cdn.example.com/bild.jpg">]]></description>
      </item>
      <item>
        <title>Zweite Meldung &#8211; Test</title>
        <link>/relativ/2</link>
        <enclosure url="https://cdn.example.com/enc.png" type="image/png" length="1234"/>
        <description>Kurz und knapp</description>
      </item>
    </channel></rss>`;
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom-Feed</title>
    <entry>
      <title type="html">Atom &lt;Titel&gt;</title>
      <link rel="alternate" type="text/html" href="https://example.org/a/1"/>
      <link rel="enclosure" type="image/jpeg" href="https://example.org/img/1.jpg"/>
      <id>tag:example.org,2026:1</id>
      <published>2026-07-27T09:00:00Z</published>
      <summary type="html">&lt;p&gt;Doppelt kodiert&lt;/p&gt;</summary>
    </entry></feed>`;

  const r = news.parseFeed(rss);
  is(r.items.length === 2, `RSS: ${r.items.length} Eintraege (erwartet 2)`);
  is(r.items[0].title === 'GPU mit 24 GB & mehr', 'RSS: CDATA + Entity im Titel');
  is(r.items[0].link === 'https://example.com/a/1', 'RSS: Link');
  is(r.items[0].published === '2026-07-27T08:15:00.000Z', 'RSS: pubDate als ISO');
  is(r.items[0].summary === 'Ein Teaser.', 'RSS: HTML aus dem Teaser entfernt');
  is(r.items[0].image === 'https://cdn.example.com/bild.jpg', 'RSS: Bild aus dem Beschreibungs-HTML');
  is(r.items[1].image === 'https://cdn.example.com/enc.png', 'RSS: Bild aus <enclosure>');

  const a = news.parseFeed(atom);
  is(a.items.length === 1, 'Atom: 1 Eintrag');
  is(a.items[0].title === 'Atom <Titel>', 'Atom: escapte Klammern bleiben Text');
  is(a.items[0].link === 'https://example.org/a/1', 'Atom: rel="alternate" gewinnt');
  is(a.items[0].image === 'https://example.org/img/1.jpg', 'Atom: Bild aus rel="enclosure"');
  is(a.items[0].summary === 'Doppelt kodiert', 'Atom: doppelt kodiertes HTML entfernt');

  // Muell darf nie werfen — ein kaputter Feed kostet hoechstens seine Eintraege.
  for (const junk of ['', '<html>kaputt', '<rss><channel><item></item></channel></rss>', null]) {
    try { is(Array.isArray(news.parseFeed(junk).items), `robust gegen ${JSON.stringify(junk)}`); }
    catch (e) { bad(`parseFeed(${JSON.stringify(junk)}) wirft: ${e.message}`); }
  }
  is(news.CATALOG.length > 0 && news.CATALOG.every((s) => s.id && s.url && s.category && s.lang),
     `Katalog: ${news.CATALOG.length} Quellen, alle mit id/url/category/lang`);
  is(new Set(news.CATALOG.map((s) => s.id)).size === news.CATALOG.length, 'Katalog: keine doppelten Quellen-ids');
  is(news.CATALOG.every((s) => news.CATEGORIES.some((c) => c.id === s.category)),
     'Katalog: nur bekannte Kategorien');
  is(news.CATALOG.every((s) => /^https:\/\//.test(s.url)), 'Katalog: nur https-Feeds');
}

/* ---------- 3. Frontend-Registry ---------- */
head('Frontend-Registry');
{
  const target = { console };
  const sandbox = new Proxy(target, {
    has: () => true,
    get: (t, k) => (k in t ? t[k] : k in globalThis ? globalThis[k]
                  : k === Symbol.unscopables ? undefined : function stub() {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  createContext(sandbox);
  target.window = sandbox; target.globalThis = sandbox;
  runInContext(readFileSync(join(ROOT, 'public/registry.js'), 'utf8'), sandbox);

  const app = readFileSync(join(ROOT, 'public/app.js'), 'utf8');
  const from = app.indexOf('Dash.registerModule({');
  const to = app.indexOf('const WIDGET_BY_ID');
  is(from > 0 && to > from, 'Registrierungs-Block in app.js gefunden');
  runInContext(app.slice(from, to), sandbox);

  const D = target.Dash;
  const widgets = D.widgets();
  is(widgets.length > 0, `${widgets.length} Kacheln registriert`);
  is(new Set(widgets.map((w) => w.id)).size === widgets.length, 'keine doppelten Kachel-ids');
  is(widgets.every((w) => w.label && w.defaultSize?.w > 0 && w.defaultSize?.h > 0),
     'alle Kacheln haben label und defaultSize');
  is(widgets.every((w) => w.minSize.w <= w.defaultSize.w && w.minSize.h <= w.defaultSize.h),
     'minSize nie groesser als defaultSize');
  is(widgets.every((w) => w.defaultSize.w <= 12), 'keine Kachel breiter als das 12-Spalten-Raster');
  is(Object.keys(D.pushHandlers()).length > 0, `${Object.keys(D.pushHandlers()).length} Push-Handler`);

  // Optionen: keine doppelten Keys, kein reservierter Key `title`
  for (const [id, opts] of Object.entries(D.options())) {
    const keys = opts.map((o) => o.key);
    is(new Set(keys).size === keys.length, `${id}: keine doppelten Options-Keys`);
    is(!keys.includes('title'), `${id}: kein reservierter Key "title"`);
  }
}

/* ---------- 4./5. Server ---------- */
head('Server');
const cfgDir = mkdtempSync(join(tmpdir(), 'dashsharp-smoke-'));
copyFileSync(join(ROOT, 'config/services.yaml'), join(cfgDir, 'services.yaml'));

const srv = spawn(process.execPath, [join(ROOT, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), CONFIG_PATH: join(cfgDir, 'services.yaml') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let srvOut = '';
srv.stdout.on('data', (d) => { srvOut += d; });
srv.stderr.on('data', (d) => { srvOut += d; });

const get = (path, opts = {}) => fetch(BASE + path, { signal: AbortSignal.timeout(5000), ...opts });

try {
  // auf den Listener warten
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try { up = (await get('/healthz')).ok; } catch { /* noch nicht da */ }
  }
  is(up, 'Server gestartet');
  if (!up) console.log(srvOut.split('\n').slice(0, 12).map((l) => `      ${l}`).join('\n'));

  if (up) {
    for (const [path, check] of [
      ['/healthz',        (d) => d.ok === true],
      ['/api/version',    (d) => typeof d.version === 'string'],
      ['/api/config',     (d) => typeof d === 'object'],
      ['/api/dashboard',  () => true],           // null bei frischer Installation
      ['/api/status',     (d) => d.ok === true],
      ['/api/quicklinks', (d) => Array.isArray(d)],
      ['/api/secrets',    (d) => Array.isArray(d._env)],
      // Zusatz-Route eines Moduls (news): Katalog fuer das Einstellungs-Panel
      ['/api/news/config', (d) => Array.isArray(d.catalog) && Array.isArray(d.enabled)],
    ]) {
      try {
        const r = await get(path);
        const d = await r.json();
        is(r.ok && check(d), `GET ${path}`);
      } catch (e) { bad(`GET ${path}: ${e.message}`); }
    }

    // Jedes Modul bekommt seine Route
    for (const m of mods) {
      try {
        const r = await get(`/api/${m.id}`);
        const d = await r.json();
        // Ohne Zugangsdaten ist not_configured die erwartete Antwort.
        is(r.ok && typeof d === 'object', `GET /api/${m.id} (${d.error || 'ok'})`);
      } catch (e) { bad(`GET /api/${m.id}: ${e.message}`); }
    }

    // Bild-Proxy der News-Kachel: es gibt keinen Weg, ihm ein Ziel
    // unterzuschieben — er kennt nur Ids aus den zuletzt geholten Feeds.
    for (const [path, want] of [
      ['/api/news/image/..%2f..%2fetc%2fpasswd', 400],
      ['/api/news/image/nichthex', 400],
      ['/api/news/image/0123456789abcdef', 404],
    ]) {
      try {
        const r = await get(path);
        is(r.status === want, `GET ${path} -> ${r.status} (erwartet ${want})`);
      } catch (e) { bad(`GET ${path}: ${e.message}`); }
    }

    // Frontend-Bundle
    try {
      const r = await get('/modules.js');
      is(r.ok && (r.headers.get('content-type') || '').includes('javascript'), 'GET /modules.js');
    } catch (e) { bad(`GET /modules.js: ${e.message}`); }

    // Host-Allowlist. Bewusst ueber node:http statt fetch(): `Host` ist ein
    // forbidden header name, undici ueberschreibt ihn stillschweigend — mit
    // fetch wuerde dieser Test immer gruen sein, egal was der Server tut.
    const statusWithHost = (host) => new Promise((resolve, reject) => {
      const req = httpGet({ host: '127.0.0.1', port: PORT, path: '/api/version', headers: { Host: host } },
        (res) => { res.resume(); resolve(res.statusCode); });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
    });
    for (const [host, want] of [['127.0.0.1', 200], ['192.168.1.10', 200], ['tower.local', 200],
                                ['evil.example.com', 403], ['8.8.8.8', 403]]) {
      try {
        const status = await statusWithHost(host);
        is(status === want, `Host "${host}" -> ${status} (erwartet ${want})`);
      } catch (e) { bad(`Host "${host}": ${e.message}`); }
    }

    // Dashboard-Validierung: x=11,w=12 muss aufs Raster geclampt werden
    try {
      const r = await fetch(`${BASE}/api/dashboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: [{ id: 'home', name: 'T' }],
          tiles: [{ id: 'docker', type: 'widget', page: 'home', x: 11, y: 0, w: 12, h: 5 }] }),
        signal: AbortSignal.timeout(5000),
      });
      const saved = await (await get('/api/dashboard')).json();
      is(r.ok && saved.tiles[0].x + saved.tiles[0].w <= 12, 'Kachel-Geometrie wird aufs Raster geclampt');
    } catch (e) { bad(`POST /api/dashboard: ${e.message}`); }
  }
} finally {
  srv.kill('SIGTERM');
}

console.log(failed ? `\n[31m${failed} Pruefung(en) fehlgeschlagen[0m\n`
                   : '\n[32mAlle Pruefungen bestanden[0m\n');
process.exit(failed ? 1 : 0);
