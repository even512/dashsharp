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
