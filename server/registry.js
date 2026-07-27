'use strict';

/* ============================================================
   Modul-Registry
   ------------------------------------------------------------
   Ein Modul beschreibt eine Integration deklarativ (siehe
   server/modules/README.md). Die Registry leitet daraus die
   komplette Verdrahtung ab, die vorher pro Integration von Hand
   in server.js stand:

     Cache-Slot · TTL · GET-Route · Push-Hub-Eintrag ·
     Secrets-Keys & Maskierung · In-Flight-Dedupe ·
     _stale-Fallback · not_configured-Antwort

   Damit kostet eine neue Integration eine Datei statt ~8 verteilter
   Aenderungen in server.js.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const MODULE_DIR = path.join(__dirname, 'modules');

/* ---------- HTTP-Helfer fuer Module ---------- */
// Ein schlanker JSON-Client: Timeout, optionales Akzeptieren self-signed
// Zertifikate (LAN-Appliances wie UniFi-Consoles), Fehler ab Status 400.
function httpJson(url, opts = {}) {
  const {
    method = 'GET', headers = {}, body = null,
    timeoutMs = 6000, insecure = false, raw = false,
  } = opts;
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(url); } catch (e) { return reject(e); }
    const lib = parsed.protocol === 'https:' ? https : http;
    const payload = body == null ? null
      : Buffer.isBuffer(body) ? body
      : typeof body === 'string' ? Buffer.from(body)
      : Buffer.from(JSON.stringify(body));
    let settled = false;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      ...(insecure ? { rejectUnauthorized: false } : {}),
      headers: {
        Accept: 'application/json',
        ...(payload && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
        ...(payload ? { 'Content-Length': payload.length } : {}),
        ...headers,
      },
    }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => {
        if (settled) return; settled = true;
        clearTimeout(timer);
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
        if (raw) return resolve({ statusCode: res.statusCode, headers: res.headers, text });
        try { resolve(JSON.parse(text)); } catch (e) { reject(new Error('JSON-Parse fehlgeschlagen')); }
      });
    });
    const timer = setTimeout(() => {
      if (settled) return; settled = true;
      req.destroy();
      reject(new Error('timeout'));
    }, timeoutMs);
    req.on('error', (e) => { if (settled) return; settled = true; clearTimeout(timer); reject(e); });
    if (payload) req.write(payload);
    req.end();
  });
}

/* ---------- Laden & Validieren ---------- */
function loadModules(dir = MODULE_DIR) {
  let files;
  try { files = fs.readdirSync(dir); }
  catch { return []; }
  const mods = [];
  const seen = new Set();
  for (const f of files.sort()) {
    if (!f.endsWith('.js') || f.startsWith('_')) continue;
    const full = path.join(dir, f);
    let mod;
    try { mod = require(full); }
    catch (err) { console.error(`Modul ${f} konnte nicht geladen werden:`, err.message); continue; }
    const problem = validateModule(mod, f);
    if (problem) { console.error(`Modul ${f} ignoriert: ${problem}`); continue; }
    if (seen.has(mod.id)) { console.error(`Modul ${f} ignoriert: doppelte id "${mod.id}"`); continue; }
    seen.add(mod.id);
    mods.push(normalizeModule(mod));
  }
  return mods;
}

function validateModule(mod, file) {
  if (!mod || typeof mod !== 'object') return 'kein Objekt exportiert';
  if (!mod.id || typeof mod.id !== 'string') return 'Feld `id` fehlt';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(mod.id)) return `id "${mod.id}" muss kebab-case sein`;
  if (typeof mod.fetch !== 'function') return 'Feld `fetch` fehlt oder ist keine Funktion';
  if (mod.ttl != null && !(Number.isFinite(mod.ttl) && mod.ttl > 0)) return '`ttl` muss eine positive Zahl sein';
  if (mod.secrets && !Array.isArray(mod.secrets)) return '`secrets` muss ein Array sein';
  for (const s of (mod.secrets || [])) {
    if (!s || typeof s.key !== 'string' || !s.key) return '`secrets[].key` fehlt';
  }
  return null;
}

function normalizeModule(mod) {
  return {
    push: true,
    ttl: 30000,
    secrets: [],
    configured: () => true,
    notConfigured: { ok: false, error: 'not_configured' },
    errorFields: null,
    ...mod,
    event: mod.event || camel(mod.id),
    label: mod.label || mod.id,
  };
}

// `unraid-docker` -> `unraidDocker` (SSE-Event-Namen bleiben camelCase wie bisher)
function camel(s) { return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()); }

/* ---------- Laufzeit ---------- */
// Baut den generischen Abruf-Pfad eines Moduls. `deps` liefert die geteilten
// Bausteine aus server.js (Secret-Getter, Cache, In-Flight-Dedupe), damit die
// Registry selbst keinen globalen Zustand haelt.
function createRuntime(mods, deps) {
  const { getSecret, cache, withInflight } = deps;

  for (const mod of mods) {
    if (!cache[mod.id]) cache[mod.id] = { ts: 0, data: null };
  }

  const ctxFor = (mod) => ({
    httpJson,
    cache,
    log: (...a) => console.log(`[${mod.id}]`, ...a),
    warn: (...a) => console.warn(`[${mod.id}]`, ...a),
  });

  // cfg-Check -> Cache-Hit -> Fetch (dedupliziert) -> _stale-Fallback.
  // Exakt das Muster, das vorher als getUnraid() nur fuer die Unraid-Slots
  // existierte — jetzt fuer jedes Modul.
  async function run(mod) {
    if (!mod.configured(getSecret)) return mod.notConfigured;
    const slot = mod.id;
    if (cache[slot].data && Date.now() - cache[slot].ts < mod.ttl) return cache[slot].data;
    try {
      return await withInflight(slot, async () => {
        const result = await mod.fetch(getSecret, ctxFor(mod));
        cache[slot] = { ts: Date.now(), data: result };
        return result;
      });
    } catch (err) {
      console.error(`Modul-Abruf (${slot}) fehlgeschlagen:`, err.message);
      if (cache[slot].data) return { ...cache[slot].data, _stale: true };
      // errorFields: Felder, die die Kachel auch im Fehlerfall braucht, um
      // „eingerichtet, aber offline" von „nicht eingerichtet" zu unterscheiden.
      return { ok: false, error: 'fetch_failed', message: err.message, ...mod.errorFields };
    }
  }

  return { run, ctxFor };
}

// Registriert GET /api/<id> plus die optionalen Aktions-Routen des Moduls.
function registerRoutes(app, mods, runtime, deps) {
  for (const mod of mods) {
    app.get(`/api/${mod.id}`, async (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json(await runtime.run(mod));
    });
    if (typeof mod.routes === 'function') {
      mod.routes(app, {
        get: deps.getSecret,
        run: () => runtime.run(mod),
        ctx: runtime.ctxFor(mod),
        invalidate: () => { deps.cache[mod.id].ts = 0; },
      });
    }
  }
}

// Push-Hub-Eintraege im Format, das startPushHub() erwartet.
function pushSources(mods, runtime) {
  return mods.filter((m) => m.push)
    .map((mod) => ({ event: mod.event, interval: mod.ttl, get: () => runtime.run(mod) }));
}

// Secrets-Metadaten fuer /api/secrets (Keys, Maskierung, Anzeige-Label).
function secretsMeta(mods) {
  const keys = [];
  const masked = new Set();
  const labels = {};
  for (const mod of mods) {
    for (const s of mod.secrets) {
      if (!keys.includes(s.key)) keys.push(s.key);
      if (s.masked) masked.add(s.key);
      if (s.label) labels[s.key] = `${mod.label} · ${s.label}`;
    }
  }
  return { keys, masked, labels };
}

module.exports = {
  httpJson, loadModules, validateModule, normalizeModule,
  createRuntime, registerRoutes, pushSources, secretsMeta,
  MODULE_DIR,
};
