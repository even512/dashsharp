'use strict';

/* ============================================================
   Logs — Logviewer per SSH zum Unraid-Host
   ------------------------------------------------------------
   Zwei Zugriffsmuster ueber EINE selbst aufgebaute ssh2-Verbindung:

   1) Uebersicht (gepuffert, pro TTL-Takt): ein Connect + ein Exec.
      Ein gebuendeltes Remote-Kommando tailt jede konfigurierte
      Quelle (~200 Zeilen), getrennt durch Marker. Pro Quelle
      werden ERROR/WARN gezaehlt und die letzte Zeile gemerkt.

   2) Viewer (streamend, pro Detailfenster): eigener Connect mit
      Follow-Kommando (tail -F / docker logs -f / dmesg --follow),
      zeilenweise per SSE an den Browser.

   Alle Zugangsdaten sind Kern-Secrets (UNRAID_SSH_*) — dieses Modul
   deklariert KEINE eigenen secrets[] und liefert nie Creds aus. Die
   Quelle wird IMMER nur ueber die Config-Allowlist (per id) zu
   Pfad/Container/Command aufgeloest; jeder Remote-Wert wird shq()-
   gequotet. `command` ist auf die feste Whitelist (dmesg) begrenzt.

   ssh2 wird bewusst LAZY geladen (require in sshClient()), damit die
   Modul-Registry das Manifest auch ohne installiertes ssh2 laden kann.
   ============================================================ */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'logs.json');

/* ---------- SSH-Grundlagen (Muster aus server.js kopiert) ---------- */

// Shell-sicheres Single-Quoting fuer Remote-Kommandos (verhindert Injection).
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

// ssh2 erst bei Bedarf laden; fehlt es (Dev-Arbeitskopie), crasht nicht das Modul-Laden.
let _SSHClient = null;
function sshClient() {
  if (_SSHClient) return _SSHClient;
  _SSHClient = require('ssh2').Client;
  return _SSHClient;
}

// Eigene Cfg analog unraidSshCfg(): Host aus UNRAID_SSH_HOST (Fallback Hostname
// aus UNRAID_URL), Passwort ODER Key. null, wenn nicht nutzbar.
function sshCfg(get) {
  let host = get('UNRAID_SSH_HOST');
  if (!host) { try { host = new URL(get('UNRAID_URL')).hostname; } catch (_) { host = ''; } }
  const user = get('UNRAID_SSH_USER') || 'root';
  const port = parseInt(get('UNRAID_SSH_PORT') || '22', 10) || 22;
  const password = get('UNRAID_SSH_PASSWORD') || '';
  const key = get('UNRAID_SSH_KEY') || '';
  if (!host || (!password && !key)) return null;
  return { host, user, port, password, key };
}

function sshConnect(cfg, timeoutMs = 8000) {
  const Client = sshClient();
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;
    const done = (fn, arg) => { if (settled) return; settled = true; clearTimeout(t); fn(arg); };
    const t = setTimeout(() => { done(reject, new Error('ssh_timeout')); try { conn.end(); } catch (_) {} }, timeoutMs);
    conn.on('ready', () => done(resolve, conn));
    conn.on('error', (e) => done(reject, e));
    const auth = { host: cfg.host, port: cfg.port, username: cfg.user, readyTimeout: timeoutMs, keepaliveInterval: 15000 };
    if (cfg.key) auth.privateKey = cfg.key; else auth.password = cfg.password;
    try { conn.connect(auth); } catch (e) { done(reject, e); }
  });
}

// Gepufferter Exec: Ausgabe sammeln (deckelt Bytes), dann aufloesen.
// Overview-Kommandos enden auf `|| true`, der Exit-Code ist damit belanglos —
// wir liefern die Ausgabe unabhaengig vom Code zurueck.
function sshExecBuffered(conn, cmd, timeoutMs = 12000, maxBytes = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = ''; let bytes = 0;
      const t = setTimeout(() => { try { stream.close(); } catch (_) {} reject(new Error('exec_timeout')); }, timeoutMs);
      const add = (d) => { bytes += d.length; if (bytes <= maxBytes) out += d.toString('utf8'); };
      stream.on('data', add);
      stream.stderr.on('data', add); // fuer Kommandos ohne 2>&1 (ls) – schadet sonst nicht
      stream.on('close', (code) => { clearTimeout(t); resolve({ out, code }); });
    });
  });
}

/* ---------- Whitelists & Konstanten ---------- */

const TYPES = ['docker', 'file', 'folder', 'command'];

// `command`-Typ NUR aus dieser festen Whitelist. Nie ein beliebiges Kommando
// aus der Config als Kommando ausfuehren.
const COMMANDS = {
  dmesg: {
    overview: 'dmesg 2>&1 | tail -n 200',
    follow: 'dmesg --follow 2>&1',
  },
};

// Erlaubte Wurzeln fuer Custom file/folder-Pfade (Soft-Allowlist).
const ALLOWED_ROOTS = ['/mnt/', '/var/log', '/boot/logs'];

const MAX_SOURCES = 30;
const LABEL_MAX = 80;
const SCAN_LINES = 200;      // Fenster fuer die Uebersicht je Quelle
const LASTLINE_MAX = 300;

// Feste Presets fuers Settings-Panel. Pfade liegen ohnehin unter den erlaubten Wurzeln.
const PRESETS = [
  { id: 'syslog',        label: 'syslog',           type: 'file',    path: '/var/log/syslog' },
  { id: 'docker-daemon', label: 'Docker-Daemon',    type: 'file',    path: '/var/log/docker.log' },
  { id: 'dmesg',         label: 'Kernel (dmesg)',   type: 'command', cmd:  'dmesg' },
  { id: 'libvirtd',      label: 'libvirtd (VMs)',   type: 'file',    path: '/var/log/libvirt/libvirtd.log' },
];

// Kuratierter Appdata-Log-Katalog — reines Vorfuell-Template (Nutzer editiert vor
// dem Speichern). Pfade relativ zum appdata-Ordner der App. `type:'docker'` = die
// App loggt per Default nach stdout, dort ist `docker logs` der richtige Weg.
const CATALOG = [
  { id: 'plex',                     name: 'Plex Media Server',       path: 'Library/Application Support/Plex Media Server/Logs/', type: 'folder', note: 'docker logs zeigt nur den Start; rotierte *.log im Ordner' },
  { id: 'jellyfin',                 name: 'Jellyfin',                path: 'log/',                                type: 'folder', note: 'mehrere *.log, u.a. log_YYYYMMDD.log' },
  { id: 'emby',                     name: 'Emby',                    path: 'logs/',                               type: 'folder', note: 'embyserver.txt + Hardware-/FFmpeg-Logs' },
  { id: 'sonarr',                   name: 'Sonarr',                  path: 'logs/',                               type: 'folder', note: '*.txt, rotiert; docker logs bringt wenig' },
  { id: 'radarr',                   name: 'Radarr',                  path: 'logs/',                               type: 'folder', note: '*.txt, rotiert' },
  { id: 'lidarr',                   name: 'Lidarr',                  path: 'logs/',                               type: 'folder', note: '*.txt, rotiert' },
  { id: 'prowlarr',                 name: 'Prowlarr',                path: 'logs/',                               type: 'folder', note: '*.txt, rotiert' },
  { id: 'bazarr',                   name: 'Bazarr',                  path: 'log/',                                type: 'folder', note: 'Singular log/ (nicht logs/); bazarr.log*' },
  { id: 'sabnzbd',                  name: 'SABnzbd',                 path: 'logs/',                               type: 'folder', note: 'sabnzbd.log (+ rotierte)' },
  { id: 'qbittorrent',              name: 'qBittorrent',             path: 'qBittorrent/logs/qbittorrent.log',    type: 'file',   note: 'LSIO-Pfad; unsicher je Image', unsure: true },
  { id: 'deluge',                   name: 'Deluge',                  path: 'deluged.log',                         type: 'file',   note: 'unsicher: loggt per Default nicht in Datei -> sonst docker logs', unsure: true },
  { id: 'nzbget',                   name: 'NZBGet',                  path: 'nzbget.log',                          type: 'file',   note: 'Pfad ueber LogFile konfigurierbar. leicht unsicher', unsure: true },
  { id: 'tautulli',                 name: 'Tautulli',                path: 'logs/tautulli.log',                   type: 'file',   note: 'daneben logs/tautulli_api.log' },
  { id: 'overseerr',                name: 'Overseerr',               path: 'logs/overseerr.log',                  type: 'file',   note: 'daneben logs/.machinelogs.json' },
  { id: 'jellyseerr',               name: 'Jellyseerr',              path: 'logs/overseerr.log',                  type: 'file',   note: 'Fork von Overseerr — Datei heisst weiter overseerr.log' },
  { id: 'nginx-proxy-manager',      name: 'Nginx Proxy Manager',     path: 'logs/',                               type: 'folder', note: 'mappt /data (nicht /config); proxy-host-*_access/_error.log' },
  { id: 'swag',                     name: 'SWAG',                    path: 'log/nginx/',                          type: 'folder', note: 'access.log/error.log; daneben log/letsencrypt/, log/fail2ban/' },
  { id: 'home-assistant',           name: 'Home Assistant',          path: 'home-assistant.log',                  type: 'file',   note: 'im Config-Root; docker logs liefert dasselbe live' },
  { id: 'adguardhome',              name: 'AdGuard Home',            path: '',                                    type: 'docker', note: 'stdout-Default -> docker logs; Datei nur bei log_file in AdGuardHome.yaml' },
  { id: 'vaultwarden',              name: 'Vaultwarden',             path: '',                                    type: 'docker', note: 'stdout-Default -> docker logs; Datei nur bei gesetztem LOG_FILE' },
  { id: 'immich',                   name: 'Immich',                  path: '',                                    type: 'docker', note: 'stdout-Default -> docker logs (je Container: immich_server, immich_machine_learning …)' },
  { id: 'unifi-network-application', name: 'UniFi Network Application', path: 'logs/server.log',                  type: 'folder', note: 'auch mongodb.log; leicht unsicher beim Dateinamen', unsure: true },
  { id: 'nextcloud',                name: 'Nextcloud',               path: 'data/nextcloud.log',                  type: 'file',   note: 'unsicher: Pfad image-/config-abhaengig (config.php -> logfile)', unsure: true },
];

/* ---------- Pfad-Soft-Allowlist ---------- */

// Remote-POSIX-Pfad pruefen: muss absolut sein, kein `..`/`.`-Segment, kein `//`.
// Bewusst verwerfend (nicht kollabierend) — die einfachste robuste Loesung.
// Kein path.normalize(): das wuerde unter Windows Backslashes einmischen.
function normalizeRemotePath(p) {
  if (typeof p !== 'string') return null;
  const s = p.trim();
  if (!s || s[0] !== '/') return null;
  if (s.includes('\0') || s.includes('//')) return null;
  const parts = s.split('/');
  for (const seg of parts) {
    if (seg === '..' || seg === '.') return null;
  }
  const clean = '/' + parts.filter(Boolean).join('/');
  return clean || null;
}

function underAllowedRoot(p) {
  return ALLOWED_ROOTS.some((r) => (r.endsWith('/') ? p.startsWith(r) : (p === r || p.startsWith(r + '/'))));
}

/* ---------- Konfiguration (config/logs.json) ---------- */

function sha1(s) { return crypto.createHash('sha1').update(String(s)).digest('hex'); }

let _cfg = { sources: [] };
let _cfgMtime = -1;

function readCfg() {
  let mtime = 0;
  try { mtime = fs.statSync(CONFIG_PATH).mtimeMs; } catch { mtime = 0; }
  if (mtime === _cfgMtime) return _cfg;
  _cfgMtime = mtime;
  if (!mtime) { _cfg = { sources: [] }; return _cfg; }
  try { _cfg = sanitizeCfg(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))); }
  catch (err) {
    console.error('[logs] config/logs.json ist unlesbar:', err.message);
    _cfg = { sources: [] };
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
  const sources = [];
  const ids = new Set();
  for (const entry of (Array.isArray(obj.sources) ? obj.sources : [])) {
    const clean = sanitizeSource(entry);
    if (!clean) continue;
    if (ids.has(clean.id)) continue;       // dasselbe Ziel nicht doppelt
    if (sources.length >= MAX_SOURCES) break;
    ids.add(clean.id);
    sources.push(clean);
  }
  return { sources };
}

// Eine Quelle saeubern. id wird serverseitig aus Typ+Ziel abgeleitet (stabil
// ueber erneutes Speichern). Ungueltige Eintraege werden verworfen (null).
function sanitizeSource(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = TYPES.includes(raw.type) ? raw.type : null;
  if (!type) return null;
  const label = String(raw.label || '').trim().slice(0, LABEL_MAX);

  if (type === 'docker') {
    const container = String(raw.container || '').trim();
    if (!/^[A-Za-z0-9._-]+$/.test(container)) return null;
    return { id: 'd-' + sha1('docker:' + container).slice(0, 8), type, label: label || container, container };
  }

  if (type === 'command') {
    const cmd = String(raw.cmd || '').trim();
    if (!Object.prototype.hasOwnProperty.call(COMMANDS, cmd)) return null;
    return { id: 'c-' + sha1('command:' + cmd).slice(0, 8), type, label: label || cmd, cmd };
  }

  // file / folder: Pfad gegen Soft-Allowlist
  const norm = normalizeRemotePath(raw.path);
  if (!norm || !underAllowedRoot(norm)) return null;
  const prefix = type === 'file' ? 'f-' : 'o-';
  const out = { id: prefix + sha1(type + ':' + norm).slice(0, 8), type, label: label || (norm.split('/').pop() || norm), path: norm };
  if (typeof raw.preset === 'string' && /^[a-z0-9-]{1,32}$/.test(raw.preset)) out.preset = raw.preset;
  return out;
}

function findSource(id) {
  const wanted = String(id || '');
  return readCfg().sources.find((s) => s.id === wanted) || null;
}

/* ---------- Uebersicht: Kommandos & Auswertung ---------- */

function overviewCmdFor(src) {
  if (src.type === 'docker') return `docker logs --tail ${SCAN_LINES} -t ${shq(src.container)} 2>&1 | tail -n ${SCAN_LINES}`;
  if (src.type === 'command') return COMMANDS[src.cmd].overview;
  if (src.type === 'file') return `tail -n ${SCAN_LINES} ${shq(src.path)} 2>&1`;
  if (src.type === 'folder') {
    // Zuletzt geaenderte *.log/*.txt im Ordner tailen. src.path ist shq-gequotet;
    // die Globs stehen ausserhalb der Quotes, damit die Shell sie expandiert.
    const f = shq(src.path);
    return `f=$(ls -1t ${f}/*.log ${f}/*.txt 2>/dev/null | head -n1); [ -n "$f" ] && tail -n ${SCAN_LINES} "$f" 2>&1 || echo '(keine Logdatei gefunden)'`;
  }
  return 'true';
}

const RE_ERROR = /\b(ERROR|ERR|FATAL|CRITICAL|CRIT|EMERG|EMERGENCY|ALERT|SEVERE)\b/i;
const RE_WARN = /\b(WARN|WARNING)\b/i;
// Kurzer Fehl-Text (wenige Zeilen) einer fehlgeschlagenen Quelle.
const RE_UNREACHABLE = /(No such (file|container|directory)|cannot open|Cannot connect|permission denied|Operation not permitted|command not found)/i;

function analyzeSegment(text) {
  let errorCount = 0, warnCount = 0, lastLine = '', nonEmpty = 0;
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (RE_ERROR.test(line)) errorCount++;
    else if (RE_WARN.test(line)) warnCount++;
    if (line.trim()) { lastLine = line; nonEmpty++; }
  }
  return { errorCount, warnCount, lastLine: lastLine.trim().slice(0, LASTLINE_MAX), nonEmpty };
}

// Ausgabe an den Markern in {id -> segment-text} splitten. Der `nonce` ist ein
// serverseitiger, rein hex-Zufallswert pro fetch()-Takt: enthielte eine echte
// Logzeile buchstaeblich `@@SRC:<id>@@`, koennte sie die Zuordnung verrutschen —
// mit der unbekannten Nonce im Marker ist das praktisch ausgeschlossen.
function splitByMarkers(out, nonce) {
  const map = new Map();
  const re = new RegExp('@@SRC:' + nonce + ':([^@\\n]+)@@');
  const segs = String(out).split(re);
  for (let i = 1; i < segs.length; i += 2) {
    map.set(segs[i], (segs[i + 1] || ''));
  }
  return map;
}

/* ---------- Ordner-Dateien listen (fuer Picker & Stream-Validierung) ---------- */

async function listFolderFiles(conn, folderPath) {
  const f = shq(folderPath);
  const { out } = await sshExecBuffered(conn, `ls -1t ${f}/*.log ${f}/*.txt 2>/dev/null`, 8000);
  const seen = new Set(); const files = [];
  for (const raw of String(out).split('\n')) {
    const p = raw.replace(/\r$/, '').trim();
    if (!p) continue;
    const base = p.split('/').pop();
    if (!base || !/^[^/\\]+$/.test(base) || base.includes('..')) continue;
    if (!seen.has(base)) { seen.add(base); files.push(base); }
  }
  return files;
}

/* ---------- Stream: Follow-Kommandos & Zaehler ---------- */

let _activeStreams = 0;
const MAX_STREAMS = 3;
const ALLOWED_LINES = [200, 500, 1000, 2000];

// Gemeinsamer Cap fuer die kurzlebigen, SSH-oeffnenden Lese-Routen
// (/api/logs/containers, /api/logs/files): begrenzt parallele In-Flight-Aufrufe,
// bevor eine SSH-Verbindung aufgebaut wird.
let _activeReads = 0;
const MAX_READS = 3;

// `lines` ist immer eine Zahl aus ALLOWED_LINES, `fileName` ein validierter
// Basename — beide sicher zu interpolieren. Pfad/Container per shq().
function followCmd(src, lines, fileName) {
  if (src.type === 'docker') return `docker logs --tail ${lines} -f -t ${shq(src.container)} 2>&1`;
  if (src.type === 'command') return COMMANDS[src.cmd].follow;
  if (src.type === 'file') return `tail -F -n ${lines} ${shq(src.path)} 2>&1`;
  if (src.type === 'folder') return `tail -F -n ${lines} ${shq(src.path + '/' + fileName)} 2>&1`;
  return 'true';
}

/* ---------- Modul ---------- */

module.exports = {
  id: 'logs',
  label: 'Logs',
  ttl: 30000, // nur die Kachel-Uebersicht; der Viewer streamt unabhaengig (SSE)

  // Keine eigenen secrets[] — die UNRAID_SSH_* sind bereits Kern-Secrets.
  configured: (get) => !!sshCfg(get) && readCfg().sources.length > 0,
  notConfigured: { ok: false, error: 'not_configured', sources: [] },
  errorFields: { sources: [] },

  async fetch(get, ctx) {
    const cfg = sshCfg(get);
    const sources = readCfg().sources;
    if (!cfg || !sources.length) return { ok: false, error: 'not_configured', sources: [] };

    // Zufalls-Nonce pro Takt (rein hex, serverseitig) — macht die Marker
    // praktisch unfaelschbar, falls eine Logzeile den Marker-Text enthaelt.
    const nonce = crypto.randomBytes(6).toString('hex');

    // EIN gebuendeltes Kommando: je Quelle ein Marker + ihr Tail. Jede Teil-
    // Aktion mit 2>&1 und `|| true`, damit der Gesamt-Exit 0 bleibt und eine
    // kaputte Quelle die anderen nicht mitreisst.
    const cmd = sources.map((s) =>
      `printf '\\n@@SRC:${nonce}:%s@@\\n' ${shq(s.id)}; { ${overviewCmdFor(s)}; } 2>&1 || true`
    ).join('; ');

    let conn = null;
    try {
      conn = await sshConnect(cfg, 8000);
      const { out } = await sshExecBuffered(conn, cmd, 15000);
      const segs = splitByMarkers(out, nonce);

      const result = sources.map((s) => {
        const seg = segs.get(s.id);
        const base = { id: s.id, label: s.label, type: s.type };
        if (seg == null) return { ...base, ok: false, errorCount: 0, warnCount: 0, lastLine: '', error: 'no_output' };
        const a = analyzeSegment(seg);
        let ok = true, error = null;
        if (!a.nonEmpty) { ok = false; error = 'empty'; }
        else if (/\(keine Logdatei gefunden\)/.test(seg)) { ok = false; error = 'no_file'; }
        else if (a.nonEmpty <= 3 && RE_UNREACHABLE.test(seg)) { ok = false; error = 'unreachable'; }
        return { ...base, ok, errorCount: a.errorCount, warnCount: a.warnCount, lastLine: a.lastLine, error };
      });

      return { ok: true, fetchedAt: Date.now(), sources: result };
    } finally {
      if (conn) { try { conn.end(); } catch (_) {} }
    }
  },

  routes(app, { get, invalidate, refresh }) {
    // --- Config lesen (fuers Panel) ---
    app.get('/api/logs/config', (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json({
        ok: true,
        sources: readCfg().sources,
        presets: PRESETS,
        catalog: CATALOG,
        sshReady: !!sshCfg(get),
      });
    });

    // --- Config ersetzen ---
    app.post('/api/logs/config', (req, res) => {
      try {
        const clean = writeCfg(req.body || {});
        invalidate();
        refresh().catch(() => { /* Fehler zeigt der naechste Abruf */ });
        res.json({ ok: true, sources: clean.sources });
      } catch (err) {
        console.error('[logs] Konfiguration konnte nicht gespeichert werden:', err.message);
        res.status(500).json({ ok: false, error: 'write_failed', message: err.message });
      }
    });

    // --- Container-Liste (fuers Dropdown), nur lesend ---
    app.get('/api/logs/containers', async (req, res) => {
      const cfg = sshCfg(get);
      if (!cfg) return res.json({ ok: false, error: 'not_configured' });
      // Parallele Lese-Aufrufe deckeln, BEVOR SSH aufgebaut wird.
      if (_activeReads >= MAX_READS) return res.status(429).json({ ok: false, error: 'too_many_requests' });
      _activeReads++;
      let conn = null;
      try {
        conn = await sshConnect(cfg, 8000);
        // Kein Nutzereingang im Kommando — feste Format-Platzhalter.
        const { out } = await sshExecBuffered(conn, "docker ps -a --format '{{.Names}}\t{{.State}}\t{{.Image}}'", 8000);
        const containers = String(out).split('\n')
          .map((l) => l.replace(/\r$/, ''))
          .filter(Boolean)
          .map((l) => { const [name, state, image] = l.split('\t'); return { name: name || '', state: state || '', image: image || '' }; })
          .filter((c) => c.name);
        res.json({ ok: true, containers });
      } catch (err) {
        res.json({ ok: false, error: 'ssh_failed', message: err.message });
      } finally {
        if (conn) { try { conn.end(); } catch (_) {} }
        _activeReads = Math.max(0, _activeReads - 1);
      }
    });

    // --- Dateien einer folder-Quelle listen ---
    app.get('/api/logs/files', async (req, res) => {
      const src = findSource(req.query.source);
      if (!src || src.type !== 'folder') return res.status(400).json({ ok: false, error: 'bad_source' });
      const cfg = sshCfg(get);
      if (!cfg) return res.json({ ok: false, error: 'not_configured' });
      // Parallele Lese-Aufrufe deckeln, BEVOR SSH aufgebaut wird.
      if (_activeReads >= MAX_READS) return res.status(429).json({ ok: false, error: 'too_many_requests' });
      _activeReads++;
      let conn = null;
      try {
        conn = await sshConnect(cfg, 8000);
        const files = (await listFolderFiles(conn, src.path)).map((name) => ({ name }));
        res.json({ ok: true, files });
      } catch (err) {
        res.json({ ok: false, error: 'ssh_failed', message: err.message });
      } finally {
        if (conn) { try { conn.end(); } catch (_) {} }
        _activeReads = Math.max(0, _activeReads - 1);
      }
    });

    // --- Echter SSH-Verbindungstest ---
    // Baut wirklich eine Verbindung auf (nicht nur „Creds vorhanden") und
    // fuehrt ein triviales `true` aus. Unterscheidet auth_failed vs. unreachable
    // am ssh2-Fehler-Level. `message` enthaelt nie Zugangsdaten.
    app.get('/api/logs/ssh-check', async (req, res) => {
      const cfg = sshCfg(get);
      if (!cfg) return res.json({ ok: false, state: 'not_configured' });
      if (_activeReads >= MAX_READS) return res.status(429).json({ ok: false, error: 'too_many_requests' });
      _activeReads++;
      let conn = null;
      try {
        conn = await sshConnect(cfg, 6000);
        await sshExecBuffered(conn, 'true', 6000);
        res.json({ ok: true, state: 'connected' });
      } catch (err) {
        const msg = String(err && err.message || err || '').slice(0, 160);
        const authFail = (err && err.level === 'client-authentication')
          || /All configured authentication methods failed/i.test(msg);
        res.json({ ok: false, state: authFail ? 'auth_failed' : 'unreachable', message: msg });
      } finally {
        if (conn) { try { conn.end(); } catch (_) {} }
        _activeReads = Math.max(0, _activeReads - 1);
      }
    });

    // --- Live-Stream (SSE) ---
    app.get('/api/logs/stream', async (req, res) => {
      // 1) Quelle streng ueber die Config-Allowlist aufloesen.
      const src = findSource(req.query.source);
      if (!src) return res.status(400).json({ ok: false, error: 'bad_source' });

      // 2) Zeilenzahl aus Whitelist, sonst Default.
      let lines = parseInt(req.query.lines, 10);
      if (!ALLOWED_LINES.includes(lines)) lines = 500;

      // 3) file-Param nur bei folder; muss ein Basename ohne `..`/`/`/`\` sein.
      let fileName = null;
      const rawFile = req.query.file != null ? String(req.query.file) : '';
      if (src.type === 'folder') {
        if (rawFile) {
          if (!/^[^/\\]+$/.test(rawFile) || rawFile.includes('..')) return res.status(400).json({ ok: false, error: 'bad_file' });
          fileName = rawFile;
        }
      } else if (rawFile) {
        return res.status(400).json({ ok: false, error: 'file_not_allowed' });
      }

      const cfg = sshCfg(get);
      if (!cfg) return res.status(503).json({ ok: false, error: 'not_configured' });

      // 4) Stream-Anzahl deckeln, BEVOR SSH aufgebaut wird.
      if (_activeStreams >= MAX_STREAMS) return res.status(429).json({ ok: false, error: 'too_many_streams' });
      _activeStreams++;
      let released = false;
      const release = () => { if (!released) { released = true; _activeStreams = Math.max(0, _activeStreams - 1); } };

      let conn = null;
      try {
        conn = await sshConnect(cfg, 8000);
      } catch (err) {
        release();
        return res.status(502).json({ ok: false, error: 'ssh_failed', message: err.message });
      }

      // 5) folder: Zieldatei bestimmen und (bei explizitem file) Mitgliedschaft
      //    in der gelisteten Menge pruefen. Fehler VOR den SSE-Headern -> JSON.
      let target = fileName;
      if (src.type === 'folder') {
        let listed;
        try { listed = await listFolderFiles(conn, src.path); }
        catch (err) { release(); try { conn.end(); } catch (_) {} return res.status(502).json({ ok: false, error: 'ssh_failed', message: err.message }); }
        if (fileName) {
          if (!listed.includes(fileName)) { release(); try { conn.end(); } catch (_) {} return res.status(400).json({ ok: false, error: 'unknown_file' }); }
          target = fileName;
        } else {
          target = listed[0] || null;
          if (!target) { release(); try { conn.end(); } catch (_) {} return res.status(404).json({ ok: false, error: 'no_file' }); }
        }
      }

      const cmd = followCmd(src, lines, target);

      // 6) SSE-Kopf senden.
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        // no-transform: die globale compression-Middleware (server.js) puffert
        // sonst text/event-stream und haelt Header + Live-Zeilen zurueck, bis
        // genug zum Komprimieren da ist -> die Browser-EventSource haengt ewig
        // im "connecting". no-transform schaltet die Kompression fuer diese
        // Antwort ab (Muster wie der Core-SSE-Stream in server.js).
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      res.write(': connected\n\n');

      let stream = null;
      let buffer = '';
      let closed = false;
      let pingTimer = null, rateTimer = null, maxTimer = null;

      // Zeilen-/Byte-Rate-Cap gegen Firehose: pro Sekunden-Fenster begrenzen,
      // ueberzaehlige verwerfen und einmalig `event: truncated` senden.
      let winLines = 0, winBytes = 0, truncNotified = false;
      const MAX_LINES_PER_SEC = 500;
      const MAX_BYTES_PER_SEC = 256 * 1024;

      const cleanup = () => {
        if (closed) return; closed = true;
        if (pingTimer) clearInterval(pingTimer);
        if (rateTimer) clearInterval(rateTimer);
        if (maxTimer) clearTimeout(maxTimer);
        try { if (stream) stream.close(); } catch (_) {}
        try { conn.end(); } catch (_) {}
        release();
        try { res.end(); } catch (_) {}
      };

      // Lifecycle: bei Client-Disconnect SSH schliessen.
      req.on('close', cleanup);
      res.on('close', cleanup);
      // Kommentar-Ping haelt die Verbindung offen.
      pingTimer = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) { cleanup(); } }, 25000);
      // Ratenfenster jede Sekunde zuruecksetzen.
      rateTimer = setInterval(() => { winLines = 0; winBytes = 0; truncNotified = false; }, 1000);
      // Harte Obergrenze der Stream-Dauer (Leak-Schutz); EventSource reconnectet.
      maxTimer = setTimeout(cleanup, 2 * 60 * 60 * 1000);

      const sendLine = (line) => {
        if (closed) return;
        winLines++; winBytes += Buffer.byteLength(line);
        if (winLines > MAX_LINES_PER_SEC || winBytes > MAX_BYTES_PER_SEC) {
          if (!truncNotified) { truncNotified = true; try { res.write('event: truncated\ndata: 1\n\n'); } catch (_) { cleanup(); } }
          return;
        }
        // Jede Log-Zeile als JSON-String (escaped). Kein Markup, keine Farbe aus Daten.
        try { res.write(`data: ${JSON.stringify(line)}\n\n`); } catch (_) { cleanup(); }
      };

      // Teilzeilen ueber Chunk-Grenzen puffern, bis `\n`.
      const onData = (d) => {
        if (closed) return;
        buffer += d.toString('utf8');
        // Schutz gegen eine endlose Zeile ohne Newline.
        if (buffer.length > 1024 * 1024) buffer = buffer.slice(-1024 * 1024);
        let idx;
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).replace(/\r$/, '');
          buffer = buffer.slice(idx + 1);
          sendLine(line);
        }
      };

      conn.exec(cmd, (err, s) => {
        if (err) { try { res.write('event: error\ndata: "exec_failed"\n\n'); } catch (_) {} cleanup(); return; }
        stream = s;
        s.on('data', onData);
        s.stderr.on('data', onData); // 2>&1 fuehrt bereits zusammen; Absicherung
        s.on('close', () => cleanup());
      });
    });
  },

  // Fuer Settings-Panel/Tests bereitgestellt (Registry ignoriert unbekannte Felder).
  PRESETS,
  CATALOG,
};
