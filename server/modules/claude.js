'use strict';

/* ============================================================
   Claude — Chat-Kachel mit Abo-Anbindung
   ------------------------------------------------------------
   Anders als ein reiner API-Key bindet diese Kachel Claude über
   die Abo-Anmeldung von Claude Code an (Agent SDK, in-process).
   Das hat zwei Gründe:

     1. Die Anfragen zählen gegen dein 5h- und Weekly-Limit statt
        pro Token abzurechnen — genau die Zahlen, die die Kachel
        unten links anzeigt.
     2. Dieselbe Anmeldung (ein langlebiger OAuth-Token, erzeugt
        mit `claude setup-token`) liefert die Nutzungswerte über
        den OAuth-Usage-Endpoint von claude.ai.

   Der Token liegt als Secret CLAUDE_CODE_OAUTH_TOKEN im
   Secrets-System (Einstellungen → Module), nicht im Klartext in
   config/claude.json. Dort liegen nur die Unterhaltungen selbst.

   Fähigkeiten sind bewusst eng gefasst: reiner Text-Chat plus das
   WebSearch-Tool. Alle Datei-/Bash-/sonstigen Tools sind gesperrt,
   damit eine Konversation nichts auf dem Server anfassen kann.

   Der Usage-Endpoint (api.anthropic.com/api/oauth/usage) ist intern/
   undokumentiert — er wird defensiv geparst; fällt er aus, bleibt
   die Kachel nutzbar und die Leisten grauen aus. Er verlangt einen
   claude-code-User-Agent, sonst drosselt er hart (429).
   ============================================================ */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'claude.json');

// Agent SDK / Claude Code legen ihre Session-Dateien unter $HOME/.claude ab.
// Wir zeigen HOME in das persistente config-Volume, damit Thread-Verläufe
// einen Container-Neustart überleben (der Verlauf wird zusätzlich in
// config/claude.json gespiegelt, aber die SDK-Session trägt den Kontext).
const HOME_DIR = path.join(__dirname, '..', '..', 'config', 'claude-home');
const WORK_DIR = path.join(HOME_DIR, 'workspace');

const UA = 'DashSharp/1.0 (+homelab dashboard; claude tile)';
const OAUTH_BETA = 'oauth-2025-04-20';
const ANTHROPIC_VERSION = '2023-06-01';

// Der Usage-Endpoint schiebt Anfragen ohne claude-code-User-Agent in einen
// aggressiv gedrosselten Bucket (dauerhaft 429). Mit diesem UA ist Polling im
// ~3-Minuten-Takt stabil. Modell-/Chat-Calls brauchen ihn nicht. Bei Bedarf
// (falls der Endpoint die Version wieder prüft) hier die Nummer anheben.
const CLI_UA = 'claude-code/2.0.0';

// Grenzen — bewusst großzügig, aber gedeckelt, damit config/claude.json nicht
// unbegrenzt wächst und ein Thread nicht das ganze Limit auf einmal frisst.
const MAX_THREADS = 50;
const MAX_MSGS_PER_THREAD = 400;
const MAX_MSG_CHARS = 100000;
const MAX_TITLE_CHARS = 60;

/* ---------- kleine Helfer ---------- */

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'anthropic-beta': OAUTH_BETA,
    'User-Agent': UA,
  };
}

// Kopfzeilen für den Usage-Endpoint: wie authHeaders, aber mit dem
// claude-code-User-Agent (richtiger Rate-Limit-Bucket) plus Version/Content-Type.
function usageHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'anthropic-beta': OAUTH_BETA,
    'anthropic-version': ANTHROPIC_VERSION,
    'User-Agent': CLI_UA,
    'Content-Type': 'application/json',
  };
}

function ensureDirs() {
  try { fs.mkdirSync(WORK_DIR, { recursive: true }); } catch { /* best effort */ }
}
ensureDirs();

/* ---------- Konfiguration (config/claude.json) ----------
   mtime-Cache wie in news.js/youtube.js: bei jedem Abruf gelesen, aber nur bei
   echter Änderung neu geparst. Struktur:
     { threads: [ { id, title, model, createdAt, updatedAt,
                    messages: [ { role, content, ts } ] } ] } */

let _cfg = { threads: [] };
let _cfgMtime = -1;

function readCfg() {
  let mtime = 0;
  try { mtime = fs.statSync(CONFIG_PATH).mtimeMs; } catch { mtime = 0; }
  if (mtime === _cfgMtime) return _cfg;
  _cfgMtime = mtime;
  if (!mtime) { _cfg = { threads: [] }; return _cfg; }
  try { _cfg = sanitizeCfg(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (err) {
    console.error('[claude] config/claude.json ist unlesbar:', err.message);
    _cfg = { threads: [] };
  }
  return _cfg;
}

function writeCfg(cfg) {
  const clean = sanitizeCfg(cfg);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, CONFIG_PATH);
  _cfgMtime = -1; // nächster readCfg() liest frisch
  return clean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeCfg(raw) {
  const obj = raw && typeof raw === 'object' ? raw : {};
  const threads = [];
  for (const t of (Array.isArray(obj.threads) ? obj.threads : [])) {
    const clean = sanitizeThread(t);
    if (!clean) continue;
    if (threads.some((x) => x.id === clean.id)) continue;
    if (threads.length >= MAX_THREADS) break;
    threads.push(clean);
  }
  return { threads };
}

function sanitizeThread(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = UUID_RE.test(String(raw.id || '')) ? String(raw.id) : null;
  if (!id) return null;
  const messages = [];
  for (const m of (Array.isArray(raw.messages) ? raw.messages : [])) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = String(m.content == null ? '' : m.content).slice(0, MAX_MSG_CHARS);
    messages.push({ role: m.role, content, ts: Number(m.ts) || Date.now() });
    if (messages.length >= MAX_MSGS_PER_THREAD) break;
  }
  return {
    id,
    title: String(raw.title || 'Neue Unterhaltung').slice(0, MAX_TITLE_CHARS),
    model: raw.model ? String(raw.model).slice(0, 80) : null,
    createdAt: Number(raw.createdAt) || Date.now(),
    updatedAt: Number(raw.updatedAt) || Date.now(),
    messages,
  };
}

function findThread(cfg, id) {
  return cfg.threads.find((t) => t.id === id) || null;
}

function threadMeta(t) {
  return { id: t.id, title: t.title, model: t.model, updatedAt: t.updatedAt, count: t.messages.length };
}

// Titel aus der ersten Nutzer-Nachricht ableiten (eine Zeile, gedeckelt).
function titleFrom(text) {
  const one = String(text || '').replace(/\s+/g, ' ').trim();
  return (one.slice(0, MAX_TITLE_CHARS) || 'Neue Unterhaltung');
}

/* ---------- Nutzung (5h / Weekly) ----------
   claude.ai/api/oauth/usage liefert five_hour.utilization und
   seven_day.utilization plus resets_at. Feldnamen defensiv lesen und auf
   Prozent normalisieren (die Werte kommen als Bruch 0..1 oder als 0..100). */

function pctOf(x) {
  if (x == null) return null;
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n <= 1 ? n * 100 : n));
}

function normalizeUsage(u) {
  if (!u || typeof u !== 'object') return null;
  const fh = u.five_hour || u.fiveHour || {};
  const sd = u.seven_day || u.sevenDay || u.weekly || {};
  const one = (o) => ({
    pct: pctOf(o.utilization != null ? o.utilization : (o.used != null ? o.used : o.pct)),
    resetsAt: o.resets_at || o.resetsAt || null,
  });
  const out = { fiveHour: one(fh), sevenDay: one(sd) };
  if (out.fiveHour.pct == null && out.sevenDay.pct == null) return null;
  return out;
}

/* ---------- Modell-Liste ----------
   Bevorzugt dynamisch vom Konto (spiegelt genau, was das Abo freischaltet,
   inkl. älterer Versionen). Fällt die Abfrage aus, eine gepflegte Fallback-
   Liste. Beides mit eigenem, langem Cache. */

const FALLBACK_MODELS = [
  { id: 'claude-opus-4-8',   label: 'Opus 4.8' },
  { id: 'claude-opus-4-5',   label: 'Opus 4.5' },
  { id: 'claude-opus-4-1',   label: 'Opus 4.1' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
  { id: 'claude-haiku-4-5',  label: 'Haiku 4.5' },
];
const MODELS_TTL_MS = 6 * 60 * 60 * 1000;
let _models = { ts: 0, list: null, default: 'claude-sonnet-4-6', live: false };

async function getModels(token, ctx) {
  if (_models.list && Date.now() - _models.ts < MODELS_TTL_MS) return _models;
  let list = null;
  let live = false;
  try {
    const r = await ctx.httpJson('https://api.anthropic.com/v1/models?limit=100', {
      headers: { ...authHeaders(token), 'anthropic-version': ANTHROPIC_VERSION },
      timeoutMs: 8000,
    });
    if (r && Array.isArray(r.data)) {
      list = r.data
        .filter((m) => m && typeof m.id === 'string' && /claude/i.test(m.id))
        .map((m) => ({ id: m.id, label: m.display_name || m.id }));
      live = list.length > 0; // echter, authentifizierter Treffer -> Verbindung ok
    }
  } catch (err) { ctx.warn('models:', err.message); }
  if (!list || !list.length) { list = FALLBACK_MODELS.slice(); live = false; }
  const def = (list.find((m) => /sonnet/i.test(m.id)) || list[0]).id;
  _models = { ts: Date.now(), list, default: def, live };
  return _models;
}

/* ---------- Nutzung abrufen ----------
   Eigener, längerer Cache als der Minuten-Push: der Usage-Endpoint drosselt
   schnelle Anfragen aggressiv (429). ~3 Minuten sind stabil. Bei Fehler bleibt
   der letzte gute Wert erhalten (Backoff); die Balken grauen erst aus, wenn nie
   ein Wert kam. */
const USAGE_TTL_MS = 3 * 60 * 1000;
let _usage = { ts: 0, data: null };

async function getUsage(token, ctx) {
  if (_usage.ts && Date.now() - _usage.ts < USAGE_TTL_MS) return _usage.data;
  try {
    // Direkt via fetch (nicht ctx.httpJson): so bekommen wir bei einem Fehler den
    // Antwort-Body zu sehen. Der ist entscheidend — z. B. sagt ein 403 hier, ob
    // dem Token schlicht der Scope fehlt oder ob ein Header/UA-Detail klemmt.
    const r = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: usageHeaders(token),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) {
      const body = (await r.text().catch(() => '')).slice(0, 300).replace(/\s+/g, ' ').trim();
      ctx.warn(`usage: HTTP ${r.status}${body ? ' — ' + body : ''}`);
      _usage.ts = Date.now(); // Backoff, letzten guten Wert behalten
      return _usage.data;
    }
    _usage = { ts: Date.now(), data: normalizeUsage(await r.json()) };
  } catch (err) {
    ctx.warn('usage:', err.message);
    _usage.ts = Date.now();
  }
  return _usage.data;
}

// Kurz-Aliase, die Claude Code immer versteht (mappen auf die aktuelle Version).
const MODEL_ALIASES = ['default', 'opus', 'sonnet', 'haiku'];

function knownModelIds() {
  const ids = new Set(FALLBACK_MODELS.map((m) => m.id));
  for (const a of MODEL_ALIASES) ids.add(a);
  if (_models.list) for (const m of _models.list) ids.add(m.id);
  return ids;
}

// Modell für einen SDK-Aufruf wählen: gespeichertes Thread-Modell, sonst
// Standard. Unbekannte Strings werden nicht durchgereicht (Schutz vor Müll).
function pickModel(model) {
  if (model && knownModelIds().has(model)) return model;
  return _models.default || 'claude-sonnet-4-6';
}

/* ---------- Agent SDK (ESM, per dynamischem import geladen) ---------- */

let _sdkPromise = null;
function loadSdk() {
  if (!_sdkPromise) _sdkPromise = import('@anthropic-ai/claude-agent-sdk');
  return _sdkPromise;
}

const SYSTEM_PROMPT = [
  'Du bist Claude, ein hilfreicher Assistent in einer Kachel eines',
  'selbstgehosteten Dashboards. Antworte in der Sprache des Nutzers, standardmäßig',
  'Deutsch. Formuliere klar und auf den Punkt. Nutze die Websuche nur, wenn',
  'aktuelle oder nachprüfbare Informationen nötig sind.',
].join(' ');

// Text aus einer vollständigen Assistant-Nachricht ziehen.
function assistantText(m) {
  const c = m && m.message ? m.message.content : null;
  if (Array.isArray(c)) return c.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('');
  if (typeof c === 'string') return c;
  return '';
}

// Text-Delta aus einer partiellen Stream-Nachricht ziehen (includePartialMessages).
function partialDelta(m) {
  const ev = m && m.event ? m.event : m;
  if (ev && ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
    return ev.delta.text || '';
  }
  return '';
}

/* ---------- Modul ---------- */

module.exports = {
  id: 'claude',
  label: 'Claude',
  ttl: 60000, // Usage etwa im Minutentakt pollen (ändert sich nicht sekündlich)

  secrets: [
    { key: 'CLAUDE_CODE_OAUTH_TOKEN', label: 'Abo-Token (claude setup-token)', masked: true },
  ],

  // Ohne Token kein Abruf: die Kachel meldet not_configured und der Server
  // telefoniert nicht nach Hause.
  configured: (get) => !!get('CLAUDE_CODE_OAUTH_TOKEN'),
  notConfigured: { ok: false, error: 'not_configured', usage: null, models: [], threads: [] },
  errorFields: { usage: null, models: [], threads: [] },

  // Periodischer Push: Verbindungsstatus + Usage-Leisten + Modell-Liste +
  // Thread-Metadaten. Der eigentliche Chat läuft über die Routen unten.
  async fetch(get, ctx) {
    const token = get('CLAUDE_CODE_OAUTH_TOKEN');
    const cfg = readCfg();

    // Verbindungsstatus am erfolgreichen (authentifizierten) Modell-Abruf auf
    // api.anthropic.com festmachen — nicht am Usage-Endpoint, der unabhängig
    // davon ausfallen/drosseln kann. Usage ist rein best-effort (die Balken).
    const models = await getModels(token, ctx);
    const usage = await getUsage(token, ctx);

    return {
      ok: true,
      configured: true,
      connected: models.live === true,
      usage,
      models: models.list,
      defaultModel: models.default,
      threads: cfg.threads.map(threadMeta),
    };
  },

  routes(app, { get, ctx, invalidate, refresh }) {
    // Verfügbare Modelle (für den Wechsler).
    app.get('/api/claude/models', async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const token = get('CLAUDE_CODE_OAUTH_TOKEN');
      if (!token) return res.json({ ok: true, models: FALLBACK_MODELS, default: _models.default });
      const models = await getModels(token, ctx);
      res.json({ ok: true, models: models.list, default: models.default });
    });

    // Vollständiger Verlauf eines Threads (zum Rendern beim Öffnen).
    app.get('/api/claude/thread/:id', (req, res) => {
      res.set('Cache-Control', 'no-store');
      const t = findThread(readCfg(), String(req.params.id || ''));
      if (!t) return res.status(404).json({ ok: false, error: 'not_found' });
      res.json({ ok: true, thread: { id: t.id, title: t.title, model: t.model, messages: t.messages } });
    });

    // Neuen Thread anlegen.
    app.post('/api/claude/threads', (req, res) => {
      try {
        const cfg = readCfg();
        if (cfg.threads.length >= MAX_THREADS) {
          return res.status(400).json({ ok: false, error: 'too_many_threads' });
        }
        const now = Date.now();
        const model = req.body && req.body.model ? pickModel(String(req.body.model)) : (_models.default || null);
        const thread = { id: crypto.randomUUID(), title: 'Neue Unterhaltung', model, createdAt: now, updatedAt: now, messages: [] };
        cfg.threads.unshift(thread);
        writeCfg(cfg);
        invalidate();
        refresh().catch(() => {});
        res.json({ ok: true, thread: threadMeta(thread) });
      } catch (err) {
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    // Thread umbenennen / löschen / Modell setzen — Aktion über Whitelist.
    app.post('/api/claude/thread/:id', (req, res) => {
      try {
        const cfg = readCfg();
        const id = String(req.params.id || '');
        const t = findThread(cfg, id);
        if (!t) return res.status(404).json({ ok: false, error: 'not_found' });
        const action = String((req.body && req.body.action) || '');
        if (action === 'rename') {
          t.title = titleFrom(req.body.title);
        } else if (action === 'setModel') {
          t.model = pickModel(String(req.body.model || ''));
        } else if (action === 'delete') {
          cfg.threads = cfg.threads.filter((x) => x.id !== id);
        } else {
          return res.status(400).json({ ok: false, error: 'bad_action' });
        }
        t.updatedAt = Date.now();
        writeCfg(cfg);
        invalidate();
        refresh().catch(() => {});
        res.json({ ok: true });
      } catch (err) {
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    // Chat: Nachricht senden, Antwort streamen (NDJSON). Läuft über das Agent
    // SDK mit der Abo-Anmeldung; nur WebSearch ist erlaubt, alles andere gesperrt.
    app.post('/api/claude/chat', async (req, res) => {
      const token = get('CLAUDE_CODE_OAUTH_TOKEN');
      const threadId = String((req.body && req.body.threadId) || '');
      const message = String((req.body && req.body.message) || '').slice(0, MAX_MSG_CHARS);

      // NDJSON-Stream: eine JSON-Zeile pro Ereignis (delta/done/error).
      res.set('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.set('Cache-Control', 'no-store, no-transform');
      res.set('X-Accel-Buffering', 'no');
      const send = (obj) => { res.write(JSON.stringify(obj) + '\n'); if (res.flush) res.flush(); };
      const fail = (msg) => { send({ type: 'error', message: msg }); res.end(); };

      if (!token) return fail('not_configured');
      if (!message.trim()) return fail('empty_message');

      const cfg = readCfg();
      const thread = findThread(cfg, threadId);
      if (!thread) return fail('thread_not_found');

      // Nutzer-Nachricht anhängen + Titel setzen, bevor die Antwort läuft.
      const resume = thread.messages.length > 0;
      if (!resume) thread.title = titleFrom(message);
      thread.messages.push({ role: 'user', content: message, ts: Date.now() });
      thread.updatedAt = Date.now();
      writeCfg(cfg);
      invalidate();
      refresh().catch(() => {});

      let query;
      try {
        ({ query } = await loadSdk());
      } catch (err) {
        return fail('sdk_unavailable: ' + err.message);
      }

      // Umgebung für den SDK-Aufruf: Abo-Token, HOME im persistenten Volume,
      // KEIN ANTHROPIC_API_KEY (sonst würde er das Abo überstimmen).
      const env = { ...process.env, CLAUDE_CODE_OAUTH_TOKEN: token, HOME: HOME_DIR, API_TIMEOUT_MS: '120000' };
      delete env.ANTHROPIC_API_KEY;

      const options = {
        model: pickModel(thread.model),
        cwd: WORK_DIR,
        settingSources: [],            // keine Projekt-/User-Settings/CLAUDE.md laden
        allowedTools: ['WebSearch'],   // nur Websuche
        disallowedTools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebFetch', 'NotebookEdit', 'TodoWrite'],
        permissionMode: 'dontAsk',     // nicht erlaubte Tools werden verweigert, nicht nachgefragt
        systemPrompt: SYSTEM_PROMPT,
        includePartialMessages: true,  // Token-für-Token-Deltas
        [resume ? 'resume' : 'sessionId']: thread.id,
        env,
      };

      let aborted = false;
      let q = null;
      req.on('close', () => { aborted = true; try { if (q && q.interrupt) q.interrupt(); } catch { /* egal */ } });

      let finalText = '';
      let streamed = false;
      try {
        q = query({ prompt: message, options });
        for await (const m of q) {
          if (aborted) break;
          if (!m || typeof m !== 'object') continue;

          const delta = partialDelta(m);
          if (delta) { streamed = true; send({ type: 'delta', text: delta }); continue; }

          if (m.type === 'assistant') {
            const t = assistantText(m);
            if (t) {
              finalText += t;
              if (!streamed) send({ type: 'delta', text: t }); // Fallback ohne Partials
            }
            continue;
          }
          if (m.type === 'result' && !finalText && typeof m.result === 'string') {
            finalText = m.result;
          }
        }
      } catch (err) {
        // Häufigster Fall: Limit erreicht oder Auth abgelaufen.
        if (!aborted) fail('claude_error: ' + err.message);
        return;
      }

      if (aborted) { try { res.end(); } catch { /* egal */ } return; }

      // Assistant-Antwort persistieren (frisch lesen: Nebenläufigkeit).
      finalText = finalText.trim();
      if (finalText) {
        const cfg2 = readCfg();
        const t2 = findThread(cfg2, threadId);
        if (t2) {
          t2.messages.push({ role: 'assistant', content: finalText.slice(0, MAX_MSG_CHARS), ts: Date.now() });
          t2.updatedAt = Date.now();
          writeCfg(cfg2);
        }
        invalidate();
        refresh().catch(() => {});
      }

      send({ type: 'done', text: finalText });
      res.end();
    });
  },
};
