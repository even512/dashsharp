'use strict';

const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH =
  process.env.CONFIG_PATH || path.join(__dirname, 'config', 'services.yaml');

function readConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return yaml.load(raw) || {};
}

const http  = require('http');
const https = require('https');
const { Client: SSHClient } = require('ssh2');
const { WebSocketServer } = require('ws');

/* ============================================================
   UniFi Cloud API — api.ui.com, X-API-Key, kein lokaler Zugriff nötig
   Connector-Proxy-Pfad:
     Network  → /v1/connector/consoles/{hostId}/proxy/network/integration/v1/...
     Protect  → /v1/connector/consoles/{hostId}/proxy/protect/integration/v1/...
   ============================================================ */
const UNIFI_BASE = 'https://api.ui.com';

function unifiCfg() {
  return {
    apiKey: getSecret('UNIFI_API_KEY')   || '',
    hostId: getSecret('UNIFI_HOST_ID')   || '',
    camId:  getSecret('UNIFI_CAMERA_ID') || '',
  };
}

function unifiFetch(cfg, urlPath, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (!cfg.apiKey) return reject(new Error('not_configured'));
    let parsed;
    try { parsed = new URL(UNIFI_BASE + urlPath); } catch (e) { return reject(e); }
    let settled = false;
    const req = https.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || 443,
        path:     parsed.pathname + parsed.search,
        method:   'GET',
        headers:  { 'X-API-Key': cfg.apiKey, Accept: 'application/json' },
      },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          if (settled) return; settled = true;
          clearTimeout(timer);
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
      }
    );
    const timer = setTimeout(() => {
      if (settled) return; settled = true;
      req.destroy();
      reject(new Error('timeout'));
    }, timeoutMs);
    req.on('error', e => { if (settled) return; settled = true; clearTimeout(timer); reject(e); });
    req.end();
  });
}

// Gecachte IDs — werden beim ersten erfolgreichen API-Call gesetzt
let _cachedHostId = null;
let _cachedNetSiteId = null;

async function getConsoleId(cfg) {
  if (cfg.hostId) return cfg.hostId;
  if (_cachedHostId) return _cachedHostId;
  const data = await unifiFetch(cfg, '/v1/hosts', 8000);
  const hosts = Array.isArray(data) ? data : (data.data || []);
  if (!hosts.length) throw new Error('no_host_found');
  _cachedHostId = hosts[0].id;
  console.log(`UniFi: Host-ID auto-discovered → ${_cachedHostId}`);
  return _cachedHostId;
}

async function getNetworkSiteId(cfg, hostId) {
  if (_cachedNetSiteId) return _cachedNetSiteId;
  const data = await unifiFetch(cfg, `/v1/connector/consoles/${hostId}/proxy/network/integration/v1/sites`, 6000);
  const sites = Array.isArray(data) ? data : (data.data || []);
  if (!sites.length) throw new Error('no_network_site_found');
  _cachedNetSiteId = sites[0].id;
  console.log(`UniFi: Network-Site-ID auto-discovered → ${_cachedNetSiteId}`);
  return _cachedNetSiteId;
}

const STATUS_CFG_PATH    = path.join(__dirname, 'config', 'status.json');
const SECRETS_PATH       = path.join(__dirname, 'config', 'secrets.json');
const QUICKLINKS_PATH    = path.join(__dirname, 'config', 'quicklinks.json');
const DISKS_CFG_PATH     = path.join(__dirname, 'config', 'disks.json');
const LAYOUT_CFG_PATH    = path.join(__dirname, 'config', 'dashboard-layout.json');
const DASHBOARD_CFG_PATH = path.join(__dirname, 'config', 'dashboard.json');
const VM_CFG_PATH        = path.join(__dirname, 'config', 'vms.json');

function readDiskCfg() {
  try {
    const d = JSON.parse(fs.readFileSync(DISKS_CFG_PATH, 'utf8'));
    return { labels: (d && d.labels && typeof d.labels === 'object') ? d.labels : {} };
  } catch { return { labels: {} }; }
}

// Per-VM-Einstellungen (Windows-Flag, erkanntes OS, RDP-Host/-User).
// { [vmId]: { win?: bool (manuelle Uebersteuerung), osAuto?: str, rdpHost?, rdpUser? } }
function readVmCfg() {
  try {
    const d = JSON.parse(fs.readFileSync(VM_CFG_PATH, 'utf8'));
    return (d && typeof d === 'object') ? d : {};
  } catch { return {}; }
}
function writeVmCfg(obj) {
  fs.mkdirSync(path.dirname(VM_CFG_PATH), { recursive: true });
  fs.writeFileSync(VM_CFG_PATH, JSON.stringify(obj, null, 2), 'utf8');
}
// Effektives Windows-Flag: manuelle Uebersteuerung schlaegt Auto-Erkennung.
function vmIsWindows(entry) {
  if (!entry) return null;
  if (typeof entry.win === 'boolean') return entry.win;
  if (entry.osAuto) return /windows/i.test(entry.osAuto);
  return null;
}

function readQuicklinks() {
  try { return JSON.parse(fs.readFileSync(QUICKLINKS_PATH, 'utf8')); }
  catch { return null; }
}

function readLayoutCfg() {
  try {
    const d = JSON.parse(fs.readFileSync(LAYOUT_CFG_PATH, 'utf8'));
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// Neues Dashboard-Modell: { version, pages:[{id,name,icon}],
// tiles:[{id,type,page,x,y,w,h,hidden,text?,config?}] }. Gibt null zurueck,
// wenn keine Datei existiert (Frontend faellt dann auf das alte
// dashboard-layout.json bzw. auf Defaults zurueck und migriert clientseitig).
function readDashboardCfg() {
  try {
    const d = JSON.parse(fs.readFileSync(DASHBOARD_CFG_PATH, 'utf8'));
    return (d && typeof d === 'object' && !Array.isArray(d)) ? d : null;
  } catch { return null; }
}

// Serverseitige Validierung/Begrenzung des Dashboard-Modells. Clampt Geometrie
// aufs 12-Spalten-Raster, erzwingt mind. eine Seite, deckelt Mengen und laesst
// unbekannte Felder weg. `config` bleibt fuer den spaeteren Inhalts-Editor
// erhalten (jetzt ungenutzt), aber groessenbegrenzt.
function sanitizeDashboard(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const clampInt = (v, min, max, dflt) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return dflt;
    return Math.min(max, Math.max(min, n));
  };
  const pages = [];
  const seenPage = new Set();
  for (const p of (Array.isArray(body.pages) ? body.pages : [])) {
    if (!p || typeof p !== 'object') continue;
    const id = String(p.id || '').trim().slice(0, 40);
    if (!id || seenPage.has(id)) continue;
    seenPage.add(id);
    pages.push({
      id,
      name: (String(p.name || '').trim().slice(0, 60)) || 'Page',
      icon: String(p.icon || '').trim().slice(0, 40),
    });
    if (pages.length >= 20) break;
  }
  if (!pages.length) pages.push({ id: 'home', name: 'Dashboard', icon: 'grid' });
  const pageIds = new Set(pages.map((p) => p.id));
  const tiles = [];
  for (const t of (Array.isArray(body.tiles) ? body.tiles : [])) {
    if (!t || typeof t !== 'object') continue;
    const id = String(t.id || '').trim().slice(0, 80);
    if (!id) continue;
    let page = String(t.page || '').trim().slice(0, 40);
    if (!pageIds.has(page)) page = pages[0].id;
    const type = t.type === 'heading' ? 'heading' : 'widget';
    const entry = {
      id, type, page,
      x: clampInt(t.x, 0, 11, 0),
      y: clampInt(t.y, 0, 1000, 0),
      w: clampInt(t.w, 1, 12, 4),
      h: clampInt(t.h, 1, 40, 2),
      hidden: !!t.hidden,
    };
    if (type === 'heading') entry.text = String(t.text || '').trim().slice(0, 80);
    if (t.config && typeof t.config === 'object' && !Array.isArray(t.config)) {
      try { if (JSON.stringify(t.config).length <= 4000) entry.config = t.config; } catch { /* skip */ }
    }
    tiles.push(entry);
    if (tiles.length >= 300) break;
  }
  return { version: 2, pages, tiles };
}

let _secrets = {};
function loadSecrets() {
  try { _secrets = JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf8')); }
  catch { _secrets = {}; }
}
loadSecrets();

function getSecret(key) {
  return _secrets[key] || process.env[key] || '';
}

function readStatusCfg() {
  try { return JSON.parse(fs.readFileSync(STATUS_CFG_PATH, 'utf8')); }
  catch { return { services: [] }; }
}

function checkService(name, url) {
  return new Promise((resolve) => {
    const t0  = Date.now();
    const lib = url.startsWith('https://') ? https : http;
    let done  = false;
    const finish = (result) => { if (!done) { done = true; resolve(result); } };
    try {
      const req = lib.get(url, { rejectUnauthorized: false, timeout: 5000 }, (res) => {
        res.resume();
        finish({ name, online: res.statusCode < 500, statusCode: res.statusCode, responseMs: Date.now() - t0 });
      });
      req.on('timeout', () => { req.destroy(); finish({ name, online: false, statusCode: null, responseMs: null, error: 'timeout' }); });
      req.on('error',   () => {              finish({ name, online: false, statusCode: null, responseMs: null, error: 'unreachable' }); });
    } catch {
      finish({ name, online: false, statusCode: null, responseMs: null, error: 'unreachable' });
    }
  });
}

app.use(compression());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Dienste-Konfiguration. Wird bei jedem Request frisch von der Platte gelesen
// -> Aenderungen an services.yaml sind nach einem Reload sofort sichtbar.
app.get('/api/config', (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const cfg = readConfig();
    const ql = readQuicklinks();
    if (ql !== null) cfg.quicklinks = ql;
    res.json(cfg);
  } catch (err) {
    console.error('Konfiguration konnte nicht gelesen werden:', err.message);
    res.status(500).json({ error: 'config_read_failed', message: err.message });
  }
});

/* ============================================================
   Glances-Integration
   Node holt die Werte serverseitig von der Glances-REST-API
   (kein CORS) und liefert ein schlankes, normalisiertes JSON.
   ============================================================ */

function glancesCfg() {
  const out = { url: null, label: null };
  const secretUrl = getSecret('GLANCES_URL');
  if (secretUrl) out.url = secretUrl;
  try {
    const g = (readConfig().integrations || {}).glances || {};
    if (!out.url && g.url) out.url = g.url;
    if (g.label) out.label = g.label;
  } catch (_) { /* ignore */ }
  const secretLabel = getSecret('GLANCES_LABEL');
  if (secretLabel) out.label = secretLabel;
  if (out.url) out.url = String(out.url).replace(/\/+$/, '');
  return out;
}

// Docker vergibt Containern ohne --uts=host eine 12-stellige Hex-Kurz-ID als
// Kernel-Hostname; taucht sowas in Glances' "system.hostname" auf, ist das
// der Glances-Container selbst, nicht der eigentliche Host.
function looksLikeContainerId(host) {
  return typeof host === 'string' && /^[0-9a-f]{12}$/i.test(host);
}
function hostFromUrl(url) {
  try { return new URL(url).hostname; } catch (_) { return null; }
}

async function gFetch(base, plugin) {
  const res = await fetch(`${base}/api/3/${plugin}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${plugin} HTTP ${res.status}`);
  return res.json();
}

// Circuit-Breaker: nach 3 Fehlern in Folge wird Glances für 15 s nicht mehr
// angefasst – gespeicherte Daten bleiben sichtbar, kein weiteres Haemmern.
let glancesFailStreak = 0;
const GLANCES_CB_THRESHOLD = 3;
const GLANCES_CB_TTL       = 15000; // ms – Abkuehlzeit wenn Circuit offen

// Pseudo-/virtuelle Dateisysteme, die nicht als "Disk" zaehlen.
const SKIP_FS = new Set([
  'squashfs', 'tmpfs', 'overlay', 'devtmpfs', 'proc', 'sysfs', 'cgroup', 'cgroup2',
  'mqueue', 'nsfs', 'tracefs', 'debugfs', 'securityfs', 'pstore', 'autofs',
  'binfmt_misc', 'configfs', 'fusectl', 'ramfs', 'rootfs', 'efivarfs', 'bpf', 'hugetlbfs',
]);

function pickCpuTemp(sensors) {
  if (!Array.isArray(sensors)) return null;
  const temps = sensors.filter(
    (s) => s.type === 'temperature_core' && s.unit === 'C' &&
      typeof s.value === 'number' && s.value > 0 && s.value < 110
  );
  if (!temps.length) return null;
  const find = (re) => temps.find((s) => re.test(s.label || ''));
  const pick =
    find(/package id 0/i) || find(/^cpu/i) || find(/tctl|tdie/i) ||
    find(/package/i) || find(/^core 0$/i) ||
    temps.reduce((a, b) => (b.value > a.value ? b : a));
  return pick ? Math.round(pick.value) : null;
}

function pickNet(net) {
  if (!Array.isArray(net)) return null;
  const cand = net.filter(
    (n) => n.is_up && !/^(lo|tunl|veth|docker|br-|virbr|cni|flannel)/.test(n.interface_name || '')
  );
  if (!cand.length) return null;
  const n = cand.reduce((a, b) => ((b.cumulative_cx || 0) > (a.cumulative_cx || 0) ? b : a));
  const dt = n.time_since_update || 1;
  const mbit = (bytes) => Math.max(0, +(((bytes || 0) / dt) * 8 / 1e6).toFixed(2));
  return {
    iface: n.interface_name,
    rxMbit: mbit(n.rx),
    txMbit: mbit(n.tx),
    speedMbit: n.speed ? Math.round(n.speed / 1e6) : null,
  };
}

// Wenn Host-Interfaces den Container-Traffic nicht sehen (Glances ohne Host-Networking),
// werden Container-Network-Stats summiert und als Fallback verwendet.
function sumContainerNet(containersRaw) {
  const list = containerList(containersRaw);
  let rx = 0, tx = 0, dt = 2;
  for (const c of list) {
    const net = c.network || {};
    if (typeof net.rx === 'number') { rx += net.rx; dt = net.time_since_update || dt; }
    if (typeof net.tx === 'number') tx += net.tx;
  }
  if (!rx && !tx) return null;
  const mbit = (b) => Math.max(0, +((b / dt) * 8 / 1e6).toFixed(2));
  return { iface: 'docker', rxMbit: mbit(rx), txMbit: mbit(tx), speedMbit: null };
}

function cleanDisks(fsList) {
  if (!Array.isArray(fsList)) return [];
  const groups = new Map();
  for (const d of fsList) {
    if (SKIP_FS.has(d.fs_type)) continue;
    const m = d.mnt_point || '';
    if (/\/(docker|containerd|libvirt|kubelet)(\/|$)/.test(m)) continue;
    if (/(resolv\.conf|hostname|hosts)$/.test(m)) continue;
    if (/^\/rootfs\/(usr|lib|lib64|bin|sbin|boot|etc|sys|proc|run|var)(\/|$)/.test(m)) continue;
    if (!d.size || d.size < 1e9) continue; // < 1 GB ignorieren
    const score = (x) => (/(^|\/)mnt(\/|$)/.test(x.mnt_point || '') ? 0 : 1000) + (x.mnt_point || '').length;
    const g = groups.get(d.device_name);
    if (!g || score(d) < score(g)) groups.set(d.device_name, d);
  }
  const baseName = (m) => {
    if (m === '/') return 'root';
    const parts = String(m).replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || 'root';
  };
  return [...groups.values()]
    .map((d) => ({
      name: baseName(d.mnt_point),
      mnt: d.mnt_point,
      fsType: d.fs_type,
      sizeBytes: d.size,
      usedBytes: d.used,
      percent: Math.round((d.percent || 0) * 10) / 10,
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, 6);
}

// Serverseitiger Cache: verhindert, dass Glances bei schnellem Polling
// oder mehreren offenen Browser-Tabs mehrfach pro Sekunde getroffen wird.
const cache = {
  glances:  { ts: 0, data: null },
  docker:   { ts: 0, data: null },
  adguard:  { ts: 0, data: null },
  plexLib:  { ts: 0, data: null },
  plexSess: { ts: 0, data: null },
  status:   { ts: 0, data: null },
  weather:  { ts: 0, data: null },
  unifi:    { ts: 0, data: null },
  nextcloud:{ ts: 0, data: null },
  unraid:   { ts: 0, data: null },
  unraidDocker: { ts: 0, data: null },
  unraidArray:  { ts: 0, data: null },
  unraidShares: { ts: 0, data: null },
  unraidNotif:  { ts: 0, data: null },
  unraidSystem: { ts: 0, data: null },
  unraidUps:    { ts: 0, data: null },
};
const GLANCES_TTL   = 500;    // ms – Glances-Metriken hoechstens 2x/s abrufen; muss unter dem
                              // kleinsten Client-Poll-Intervall (400 ms Slider-Minimum) liegen,
                              // sonst bekommen Clients periodisch identische Samples zurueck
const DOCKER_TTL    = 8000;   // ms – Container-Liste aendert sich selten
const ADGUARD_TTL   = 30000;  // ms – aggregierte Stats, aendern sich langsam
const PLEX_LIB_TTL  = 300000; // ms – Bibliothekszahlen (5 min)
const PLEX_SESS_TTL = 4000;   // ms – aktive Sessions (Frontend pollt alle 5s)
const STATUS_TTL    = 30000;  // ms – Dienste-Verfügbarkeit (30 s)
const WEATHER_TTL   = 600000; // ms – Wetterdaten (10 min)
const UNIFI_TTL     = 10000;  // ms – UniFi-Netzwerkdaten (10 s)
const NEXTCLOUD_TTL = 60000;  // ms – Nextcloud-Speicher/Nutzer (60 s)

app.get('/api/glances', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { url, label } = glancesCfg();
  if (!url) return res.json({ ok: false, error: 'not_configured' });

  // Circuit-Breaker: bei offenem Circuit gecachte Daten liefern, Glances in Ruhe lassen.
  const circuitOpen = glancesFailStreak >= GLANCES_CB_THRESHOLD;
  const effectiveTTL = circuitOpen ? GLANCES_CB_TTL : GLANCES_TTL;

  if (cache.glances.data && Date.now() - cache.glances.ts < effectiveTTL) {
    return res.json(cache.glances.data);
  }

  if (circuitOpen) {
    // TTL abgelaufen – ein Probe-Request; schlaegt er fehl, bleibt Circuit laenger offen
    console.warn(`Glances Circuit offen (${glancesFailStreak} Fehler), Probe-Versuch…`);
  }

  try {
    const [cpu, mem, sensors, fsList, net, uptime, system, load, containersRaw] = await Promise.all([
      gFetch(url, 'cpu'),
      gFetch(url, 'mem'),
      gFetch(url, 'sensors').catch(() => null),
      gFetch(url, 'fs'),
      gFetch(url, 'network'),
      gFetch(url, 'uptime').catch(() => null),
      gFetch(url, 'system').catch(() => null),
      gFetch(url, 'load').catch(() => null),
      gFetch(url, 'containers').catch(() => null),
    ]);

    glancesFailStreak = 0; // Erfolg → Circuit schliessen

    const disks = cleanDisks(fsList);
    // Benutzerdefinierte Labels (config/disks.json) je Mountpoint zuordnen.
    const diskLabels = readDiskCfg().labels;
    for (const dd of disks) dd.label = diskLabels[dd.mnt] || null;
    const sumSize = disks.reduce((s, d) => s + (d.sizeBytes || 0), 0);
    const sumUsed = disks.reduce((s, d) => s + (d.usedBytes || 0), 0);

    const hostNet = pickNet(net);
    const ctrNet = containersRaw ? sumContainerNet(containersRaw) : null;
    // Container-Stats nutzen wenn sie mehr Traffic zeigen (passiert wenn Glances ohne
    // Host-Networking im Container läuft und eth0 nur eigenen Traffic sieht)
    const hostTotal = hostNet ? hostNet.rxMbit + hostNet.txMbit : 0;
    const ctrTotal  = ctrNet  ? ctrNet.rxMbit  + ctrNet.txMbit  : 0;
    const netResult = ctrNet && ctrTotal > hostTotal ? ctrNet : (hostNet || ctrNet);

    let systemHost = system && system.hostname;
    if (looksLikeContainerId(systemHost)) systemHost = null;

    const result = {
      ok: true,
      // Sample-Timestamp: der Client dedupliziert damit Cache-Hits (gleicher
      // ts = gleiches Sample → kein neuer Graph-Punkt). Der _stale-Fallback
      // unten traegt den alten ts automatisch weiter.
      ts: Date.now(),
      label: label || systemHost || hostFromUrl(url) || 'host',
      os: system ? system.os_version || system.linux_distro : null,
      cpu: typeof cpu.total === 'number' ? +cpu.total.toFixed(1) : null,
      cores: cpu.cpucore || (load && load.cpucore) || null,
      cpuTemp: pickCpuTemp(sensors),
      mem: mem ? { percent: +(+mem.percent).toFixed(1), used: mem.used, total: mem.total } : null,
      net: netResult,
      disks,
      diskTotal: { used: sumUsed, size: sumSize },
      load: load ? { min1: load.min1, min5: load.min5, min15: load.min15 } : null,
      uptime: typeof uptime === 'string' ? uptime : (uptime && uptime.seconds) || null,
    };
    cache.glances = { ts: result.ts, data: result };
    res.json(result);
  } catch (err) {
    glancesFailStreak++;
    console.error(`Glances fehlgeschlagen (Streak ${glancesFailStreak}):`, err.message);
    // Gespeicherte Daten als Fallback – Dashboard bleibt sichtbar
    if (cache.glances.data) return res.json({ ...cache.glances.data, _stale: true });
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
});

/* ============================================================
   Docker-Integration (ueber Glances)
   Glances liefert die Container-Liste; je nach Version heisst das
   Plugin "containers" (>= 3.4) oder "docker" (aelter) -> beide
   werden versucht. Die Antwort wird auf das Noetige reduziert.
   ============================================================ */

function dockerVersion(raw) {
  const v = raw && raw.version;
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.Version || v.version || null;
}

function containerList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.containers)) return raw.containers;
  return [];
}

// Glances-Status -> grobe Kategorie (laeuft / pausiert / gestoppt).
function dockerState(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('paused')) return 'paused';
  if (s.includes('running') || s.startsWith('up')) return 'running';
  return 'stopped';
}

function mapContainer(c) {
  let cpu = null;
  if (c.cpu && typeof c.cpu.total === 'number') cpu = c.cpu.total;
  else if (typeof c.cpu_percent === 'number') cpu = c.cpu_percent;

  let mem = null;
  if (c.memory && typeof c.memory.usage === 'number') {
    // wie "docker stats": Seiten-Cache (inactive_file) abziehen
    mem = c.memory.usage - (c.memory.inactive_file || 0);
  } else if (typeof c.memory_usage === 'number') {
    mem = c.memory_usage;
  }

  return {
    name: c.name || c.Name || '?',
    state: dockerState(c.status || c.Status),
    cpu: typeof cpu === 'number' ? Math.max(0, +cpu.toFixed(1)) : null,
    mem: typeof mem === 'number' ? Math.max(0, Math.round(mem)) : null,
  };
}

app.get('/api/docker', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { url } = glancesCfg();
  if (!url) return res.json({ ok: false, error: 'not_configured' });

  if (cache.docker.data && Date.now() - cache.docker.ts < DOCKER_TTL) {
    return res.json(cache.docker.data);
  }

  try {
    let raw;
    try {
      raw = await gFetch(url, 'containers'); // Glances >= 3.4
    } catch (_) {
      raw = await gFetch(url, 'docker');      // aeltere Glances
    }

    const all = containerList(raw).map(mapContainer);
    const running = all.filter((c) => c.state === 'running');
    const paused = all.filter((c) => c.state === 'paused');
    const stopped = all.filter((c) => c.state === 'stopped');

    // Anzeige-Liste: laufende zuerst (CPU-hungrigste oben), dann der Rest.
    const sorted = running
      .slice()
      .sort((a, b) => (b.cpu || 0) - (a.cpu || 0))
      .concat(paused, stopped);

    const result = {
      ok: true,
      version: dockerVersion(raw),
      total: all.length,
      running: running.length,
      paused: paused.length,
      stopped: stopped.length,
      containers: sorted,
    };
    cache.docker = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error('Docker-Abruf (Glances) fehlgeschlagen:', err.message);
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
});

/* ============================================================
   AdGuard Home Integration
   Basic-Auth-Proxy gegen /control/status + /control/stats.
   Zugangsdaten kommen ausschliesslich aus Env-Vars.
   ============================================================ */

function adguardCfg() {
  return {
    url:  (getSecret('ADGUARD_URL')  || '').replace(/\/+$/, ''),
    user: getSecret('ADGUARD_USER')  || '',
    pass: getSecret('ADGUARD_PASS')  || '',
  };
}

function adguardAuth(user, pass) {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

async function agFetch(base, path, auth) {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: auth },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  return res.json();
}

function topBlockedList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .slice(0, 10)
    .map((item) => ({ domain: Object.keys(item)[0], count: Object.values(item)[0] }))
    .filter((item) => item.domain);
}

app.get('/api/adguard', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { url, user, pass } = adguardCfg();
  if (!url) return res.json({ ok: false, error: 'not_configured' });

  if (cache.adguard.data && Date.now() - cache.adguard.ts < ADGUARD_TTL) {
    return res.json(cache.adguard.data);
  }

  const auth = adguardAuth(user, pass);
  try {
    const [status, stats] = await Promise.all([
      agFetch(url, '/control/status', auth),
      agFetch(url, '/control/stats',  auth),
    ]);

    const total   = stats.num_dns_queries       || 0;
    const blocked = stats.num_blocked_filtering || 0;
    const result  = {
      ok:         true,
      version:    status.version || null,
      running:    !!status.running,
      protection: !!status.protection_enabled,
      total,
      blocked,
      blockedPct: total > 0 ? Math.round(blocked / total * 100) : 0,
      topBlocked: topBlockedList(stats.top_blocked_domains),
      avgMs:      typeof stats.avg_processing_time === 'number'
                    ? +(stats.avg_processing_time * 1000).toFixed(1) : null,
    };
    cache.adguard = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error('AdGuard-Abruf fehlgeschlagen:', err.message);
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
});

/* ============================================================
   Plex Media Server Integration
   Token bleibt serverseitig; Poster werden per Proxy geliefert.
   ============================================================ */

function plexCfg() {
  return {
    url:   (getSecret('PLEX_URL')   || '').replace(/\/+$/, ''),
    token: getSecret('PLEX_TOKEN')  || '',
  };
}

async function pFetch(base, path, token) {
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${base}${path}${sep}X-Plex-Token=${token}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Plex ${path.split('?')[0]} HTTP ${res.status}`);
  return res.json();
}

function plexRes(r) {
  if (!r) return null;
  const v = String(r).toLowerCase().replace(/\s/g, '');
  if (v === '4k' || v === '2160') return '4K';
  if (v === '1080') return '1080p';
  if (v === '720') return '720p';
  if (v === '480') return '480p';
  return r;
}

function normSessions(metadata) {
  if (!Array.isArray(metadata)) return [];
  return metadata.map((m) => {
    const media = (m.Media || [])[0] || {};
    const part  = (media.Part || [])[0] || {};
    const ts    = m.TranscodeSession || {};

    let streamType = 'directplay';
    if (part.decision === 'transcode') {
      streamType = ts.videoDecision === 'copy' ? 'directstream' : 'transcode';
    }

    let seasonEpisode = null;
    if (m.type === 'episode') {
      const s = String(m.parentIndex || '?').padStart(2, '0');
      const e = String(m.index        || '?').padStart(2, '0');
      seasonEpisode = `S${s}E${e}`;
    }

    const session = m.Session || {};
    const player  = m.Player  || {};

    // Stream-Details (Video, Audio, Untertitel)
    const streams   = part.Stream || [];
    const vStream   = streams.find((s) => +s.streamType === 1) || {};
    const aStream   = streams.find((s) => +s.streamType === 2 && s.selected) ||
                      streams.find((s) => +s.streamType === 2) || {};
    const subStream = streams.find((s) => +s.streamType === 3 && s.selected) || null;

    return {
      key:           m.sessionKey || session.id || `${m.ratingKey || ''}:${player.machineIdentifier || ''}`,
      type:          m.type,
      title:         m.title || '?',
      showTitle:     m.grandparentTitle || null,
      seasonEpisode,
      user:          (m.User || {}).title || 'Unbekannt',
      device:        player.title    || '?',
      platform:      player.platform || null,
      product:       player.product  || null,   // z.B. "Plex for Apple TV"
      location:      session.location || null,  // "lan", "wan", "cellular"
      state:         player.state    || 'playing',
      viewOffset:    m.viewOffset || 0,
      duration:      m.duration   || 0,
      resolution:    plexRes(media.videoResolution),
      streamType,
      bitrate:       media.bitrate    || null,  // Quell-Bitrate (kbps)
      bandwidth:     session.bandwidth || null, // Session-Bandbreite (kbps)

      // Video-Stream
      videoDisplayTitle: vStream.displayTitle || null,    // "2160p (HEVC HDR10 Main 10)"
      videoDecision:     ts.videoDecision || (part.decision !== 'transcode' ? 'directplay' : 'transcode'),
      transVideoCodec:   ts.videoCodec    || null,        // Ausgabe-Codec beim Transcode

      // Audio-Stream
      audioDisplayTitle: aStream.displayTitle || null,   // "TrueHD Atmos 7.1"
      audioDecision:     ts.audioDecision || (part.decision === 'transcode' ? 'copy' : 'directplay'),
      transAudioCodec:   ts.audioCodec    || null,
      transAudioCh:      ts.audioChannels || null,

      // Transcode-Performance
      transcodeSpeed:    ts.speed != null ? Math.round(ts.speed * 10) / 10 : null,

      // Untertitel
      subtitle:          subStream
        ? (subStream.extendedDisplayTitle || subStream.displayTitle || null)
        : null,

      thumb:         (() => {
        const t = m.type === 'episode'
          ? (m.parentThumb || m.grandparentThumb || m.thumb)
          : m.thumb;
        return t ? `/api/plex/thumb?path=${encodeURIComponent(t)}` : null;
      })(),
    };
  });
}

app.get('/api/plex', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { url, token } = plexCfg();
  if (!url || !token) return res.json({ ok: false, error: 'not_configured' });

  // Bibliothekszahlen (lange TTL – aendern sich kaum)
  let library = cache.plexLib.data;
  if (!library || Date.now() - cache.plexLib.ts >= PLEX_LIB_TTL) {
    try {
      const secs = await pFetch(url, '/library/sections', token);
      const dirs = ((secs.MediaContainer || {}).Directory) || [];
      const movieDirs = dirs.filter((d) => d.type === 'movie');
      const showDirs  = dirs.filter((d) => d.type === 'show');

      // totalSize aus einer paginierten Antwort lesen.
      // Fuer Episoden (type=4) liefern manche Plex-Versionen kein totalSize wenn
      // Container-Size=0 – deshalb dort Container-Size=1 (1 Item = garantiert paginiert).
      const cntOf = (r) => {
        const mc = (r && r.MediaContainer) || {};
        return Number(mc.totalSize) || Number(mc.size) || 0;
      };

      const [mC, sC, eC] = await Promise.all([
        Promise.all(movieDirs.map((d) =>
          pFetch(url, `/library/sections/${d.key}/all?X-Plex-Container-Size=0`, token).then(cntOf).catch(() => 0)
        )),
        Promise.all(showDirs.map((d) =>
          pFetch(url, `/library/sections/${d.key}/all?X-Plex-Container-Size=0`, token).then(cntOf).catch(() => 0)
        )),
        Promise.all(showDirs.map((d) =>
          // Container-Size=1 statt 0: stellt sicher dass totalSize immer im Response steht
          pFetch(url, `/library/sections/${d.key}/all?type=4&X-Plex-Container-Size=1`, token).then(cntOf).catch(() => 0)
        )),
      ]);

      library = {
        movies:   mC.reduce((a, b) => a + b, 0),
        shows:    sC.reduce((a, b) => a + b, 0),
        episodes: eC.reduce((a, b) => a + b, 0),
      };
      cache.plexLib = { ts: Date.now(), data: library };
    } catch (err) {
      console.error('Plex Bibliothek fehlgeschlagen:', err.message);
      library = cache.plexLib.data || { movies: 0, shows: 0, episodes: 0 };
    }
  }

  // Aktive Sessions (kurze TTL)
  let sessions = cache.plexSess.data || [];
  if (!cache.plexSess.data || Date.now() - cache.plexSess.ts >= PLEX_SESS_TTL) {
    try {
      const raw  = await pFetch(url, '/status/sessions', token);
      sessions   = normSessions((raw.MediaContainer || {}).Metadata);
      cache.plexSess = { ts: Date.now(), data: sessions };
    } catch (err) {
      console.error('Plex Sessions fehlgeschlagen:', err.message);
    }
  }

  res.json({ ok: true, library, sessions });
});

// Poster-Proxy: Plex-Token bleibt serverseitig.
app.get('/api/plex/thumb', async (req, res) => {
  const { url, token } = plexCfg();
  const path = decodeURIComponent(req.query.path || '');
  if (!url || !token || !path.startsWith('/library/')) return res.status(404).end();
  try {
    const r = await fetch(`${url}${path}?X-Plex-Token=${token}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return res.status(404).end();
    res.set('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.status(404).end();
  }
});

/* ============================================================
   Dienste-Status-Prüfung
   ============================================================ */
app.get('/api/status/config', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readStatusCfg());
});

app.post('/api/status/config', (req, res) => {
  const body = req.body || {};
  const services = Array.isArray(body.services) ? body.services : [];
  const clean = services
    .filter((s) => s && typeof s.name === 'string' && typeof s.url === 'string')
    .map((s) => ({ name: s.name.trim().slice(0, 80), url: s.url.trim().slice(0, 500) }))
    .filter((s) => s.name && s.url);
  try {
    fs.writeFileSync(STATUS_CFG_PATH, JSON.stringify({ services: clean }, null, 2), 'utf8');
    cache.status = { ts: 0, data: null }; // Cache invalidieren
    res.json({ ok: true, count: clean.length });
  } catch (err) {
    console.error('Status-Config konnte nicht gespeichert werden:', err.message);
    res.status(500).json({ error: 'write_failed' });
  }
});

app.get('/api/status', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (cache.status.data && Date.now() - cache.status.ts < STATUS_TTL) {
    return res.json(cache.status.data);
  }
  const { services } = readStatusCfg();
  if (!services.length) {
    const empty = { ok: true, online: 0, total: 0, services: [] };
    cache.status = { ts: Date.now(), data: empty };
    return res.json(empty);
  }
  try {
    const results = await Promise.all(services.map((s) => checkService(s.name, s.url)));
    const online = results.filter((r) => r.online).length;
    const data = { ok: true, online, total: results.length, services: results };
    cache.status = { ts: Date.now(), data };
    res.json(data);
  } catch (err) {
    console.error('Status-Check fehlgeschlagen:', err.message);
    res.status(500).json({ ok: false, error: 'check_failed' });
  }
});

/* ---------- Festplatten-Konfiguration (Labels) ---------- */
app.get('/api/disks', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { labels } = readDiskCfg();
  // Aktuell erkannte Disks aus dem letzten Glances-Poll (falls vorhanden).
  const disks = (cache.glances.data && Array.isArray(cache.glances.data.disks))
    ? cache.glances.data.disks.map((d) => ({
        name: d.name, mnt: d.mnt, fsType: d.fsType, sizeBytes: d.sizeBytes,
        percent: d.percent, label: labels[d.mnt] || null,
      }))
    : [];
  res.json({ ok: true, disks, labels });
});

app.post('/api/disks/config', (req, res) => {
  const body = req.body || {};
  const inLabels = (body.labels && typeof body.labels === 'object') ? body.labels : {};
  const labels = {};
  for (const [mnt, name] of Object.entries(inLabels)) {
    const v = String(name || '').trim().slice(0, 60);
    if (v) labels[String(mnt).slice(0, 200)] = v;
  }
  try {
    fs.mkdirSync(path.dirname(DISKS_CFG_PATH), { recursive: true });
    fs.writeFileSync(DISKS_CFG_PATH, JSON.stringify({ labels }, null, 2), 'utf8');
    cache.glances.ts = 0; // nächster Poll liefert Disks mit aktualisierten Labels
    res.json({ ok: true, count: Object.keys(labels).length });
  } catch (err) {
    console.error('Disk-Config konnte nicht gespeichert werden:', err.message);
    res.status(500).json({ ok: false, error: 'write_failed' });
  }
});

/* ---------- Dashboard-Layout (Kachel-Reihenfolge & Sichtbarkeit) ---------- */
app.get('/api/dashboard/layout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readLayoutCfg());
});

app.post('/api/dashboard/layout', (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) return res.status(400).json({ ok: false, error: 'expected array' });
  const clean = body
    .filter((e) => e && typeof e.id === 'string' && e.id.trim())
    .map((e) => ({
      id: String(e.id).trim().slice(0, 80),
      section: String(e.section || '').trim().slice(0, 40),
      hidden: !!e.hidden,
    }));
  try {
    fs.mkdirSync(path.dirname(LAYOUT_CFG_PATH), { recursive: true });
    fs.writeFileSync(LAYOUT_CFG_PATH, JSON.stringify(clean, null, 2), 'utf8');
    res.json({ ok: true, count: clean.length });
  } catch (err) {
    console.error('Dashboard-Layout konnte nicht gespeichert werden:', err.message);
    res.status(500).json({ ok: false, error: 'write_failed' });
  }
});

// Neues Dashboard-Modell (Seiten, freie Raster-Geometrie, Ueberschriften).
// GET liefert das gespeicherte Objekt oder null (dann migriert/initialisiert
// das Frontend). Das alte /api/dashboard/layout bleibt fuer die einmalige
// Migration lesbar.
app.get('/api/dashboard', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(readDashboardCfg());
});

app.post('/api/dashboard', (req, res) => {
  const clean = sanitizeDashboard(req.body);
  if (!clean) return res.status(400).json({ ok: false, error: 'expected object' });
  try {
    fs.mkdirSync(path.dirname(DASHBOARD_CFG_PATH), { recursive: true });
    fs.writeFileSync(DASHBOARD_CFG_PATH, JSON.stringify(clean, null, 2), 'utf8');
    res.json({ ok: true, pages: clean.pages.length, tiles: clean.tiles.length });
  } catch (err) {
    console.error('Dashboard konnte nicht gespeichert werden:', err.message);
    res.status(500).json({ ok: false, error: 'write_failed' });
  }
});

app.get('/api/version', (req, res) => {
  res.json({
    version: pkg.version,
    node: process.version,
    uptimeSec: Math.floor(process.uptime()),
    license: pkg.license || 'MIT',
  });
});

app.get('/api/quicklinks', (req, res) => {
  const ql = readQuicklinks();
  if (ql !== null) return res.json(ql);
  try { res.json((readConfig().quicklinks || [])); }
  catch { res.json([]); }
});

app.post('/api/quicklinks', (req, res) => {
  const links = req.body;
  if (!Array.isArray(links)) return res.status(400).json({ ok: false, error: 'expected array' });
  const clean = links.map(l => {
    const out = { name: String(l.name || ''), url: String(l.url || '') };
    if (l.label) out.label = String(l.label);
    if (l.color) out.color = String(l.color);
    if (l.icon)  out.icon  = String(l.icon);
    if (l.newTab) out.newTab = true;
    return out;
  }).filter(l => l.name && l.url);
  try {
    fs.mkdirSync(path.dirname(QUICKLINKS_PATH), { recursive: true });
    fs.writeFileSync(QUICKLINKS_PATH, JSON.stringify(clean, null, 2));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const SECRETS_KEYS = ['GLANCES_URL', 'GLANCES_LABEL', 'ADGUARD_URL', 'ADGUARD_USER', 'ADGUARD_PASS', 'PLEX_URL', 'PLEX_TOKEN', 'WEATHER_CITY', 'WEATHER_UNIT', 'UNIFI_API_KEY', 'UNIFI_HOST_ID', 'UNIFI_CAMERA_ID', 'NEXTCLOUD_URL', 'NEXTCLOUD_USER', 'NEXTCLOUD_PASS', 'NEXTCLOUD_SHARE_PATH', 'UNRAID_URL', 'UNRAID_API_KEY', 'UNRAID_SSH_HOST', 'UNRAID_SSH_PORT', 'UNRAID_SSH_USER', 'UNRAID_SSH_PASSWORD', 'UNRAID_SSH_KEY', 'UNRAID_DANGER_ACTIONS'];
const SECRETS_MASKED = new Set(['ADGUARD_PASS', 'PLEX_TOKEN', 'UNIFI_API_KEY', 'NEXTCLOUD_PASS', 'UNRAID_API_KEY', 'UNRAID_SSH_PASSWORD', 'UNRAID_SSH_KEY']);

app.get('/api/secrets', (req, res) => {
  const out = {};
  for (const k of SECRETS_KEYS) {
    const v = getSecret(k);
    out[k] = (v && SECRETS_MASKED.has(k)) ? '***' : v;
  }
  res.json(out);
});

app.post('/api/secrets', (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) {
    if (!SECRETS_KEYS.includes(k)) continue;
    if (v === '***') continue;
    if (v === '') delete _secrets[k];
    else _secrets[k] = String(v);
  }
  try {
    fs.mkdirSync(path.dirname(SECRETS_PATH), { recursive: true });
    fs.writeFileSync(SECRETS_PATH, JSON.stringify(_secrets, null, 2));
    // Caches invalidieren damit naechster Poll sofort mit neuen Creds laeuft
    for (const k of Object.keys(cache)) cache[k] = { ts: 0, data: null };
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ============================================================
   Wetter-Integration (Open-Meteo – kein API-Key noetig)
   Geocoding  → open-meteo Geocoding API  → lat/lon
   Wetterdaten → open-meteo Forecast API  → Temperatur + WMO-Code
   Cache: 10 Minuten (Wetter aendert sich langsam)
   ============================================================ */
app.get('/api/weather', async (req, res) => {
  res.set('Cache-Control', 'no-store');

  const city = getSecret('WEATHER_CITY');
  const unit = getSecret('WEATHER_UNIT') || 'C';

  if (!city) return res.json({ ok: false, configured: false });

  if (cache.weather.data && Date.now() - cache.weather.ts < WEATHER_TTL) {
    return res.json(cache.weather.data);
  }

  try {
    // 1) Geocoding: Stadtname → Koordinaten
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
    const geo = await geoRes.json();
    if (!geo.results || !geo.results.length) {
      return res.json({ ok: false, configured: true, error: 'city_not_found', city });
    }
    const { latitude, longitude, name, country } = geo.results[0];

    // 2) Wetterdaten: Koordinaten → aktuelles Wetter
    const tempUnit = unit === 'F' ? 'fahrenheit' : 'celsius';
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&temperature_unit=${tempUnit}&forecast_days=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!wRes.ok) throw new Error(`Forecast HTTP ${wRes.status}`);
    const w = await wRes.json();

    const cur = w.current;
    const data = {
      ok: true,
      configured: true,
      temp: Math.round(cur.temperature_2m),
      unit,
      wmoCode: cur.weather_code,
      isDay: cur.is_day === 1,
      city: name,
      country,
    };
    cache.weather = { ts: Date.now(), data };
    res.json(data);
  } catch (err) {
    console.error('Wetter-Fetch fehlgeschlagen:', err.message);
    if (cache.weather.data) return res.json({ ...cache.weather.data, _stale: true });
    res.status(502).json({ ok: false, configured: true, error: 'fetch_failed' });
  }
});

/* ============================================================
   UniFi Network Application + Protect  (Cloud API)
   ============================================================ */
app.get('/api/unifi', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const cfg = unifiCfg();
  if (!cfg.apiKey) return res.json({ ok: false, error: 'not_configured' });

  if (Date.now() - cache.unifi.ts < UNIFI_TTL && cache.unifi.data)
    return res.json(cache.unifi.data);

  try {
    const hostId = await getConsoleId(cfg);
    // Legacy Local API via Cloud-Connector: vollständige Daten (Signal, WAN-Throughput, CPU, Radios)
    const legBase = `/v1/connector/consoles/${hostId}/proxy/network/api/s/default`;

    const [healthRaw, devRaw, staRaw] = await Promise.all([
      unifiFetch(cfg, `${legBase}/stat/health`),
      unifiFetch(cfg, `${legBase}/stat/device`),
      unifiFetch(cfg, `${legBase}/stat/sta`),
    ]);

    // WAN aus stat/health — rx_bytes-r / tx_bytes-r = bytes/s (rolling rate)
    const wanRaw = ((healthRaw.data || healthRaw) || []).find(h => h.subsystem === 'wan') || {};
    const rxBytesR = wanRaw['rx_bytes-r'];
    const txBytesR = wanRaw['tx_bytes-r'];
    const wan = {
      status:    wanRaw.status || 'unknown',
      ip:        wanRaw.wan_ip || null,
      latencyMs: wanRaw.latency != null ? Number(wanRaw.latency) : null,
      rxRate:    rxBytesR != null ? parseFloat((rxBytesR * 8 / 1e6).toFixed(2)) : null,
      txRate:    txBytesR != null ? parseFloat((txBytesR * 8 / 1e6).toFixed(2)) : null,
    };

    // Clients aus stat/sta — volle Signal/Band/AP-MAC Daten
    const stas    = (staRaw.data || staRaw) || [];
    const wired   = stas.filter(s => s.is_wired);
    const wireless = stas.filter(s => !s.is_wired);
    const bands   = { '24': 0, '5': 0, '6': 0 };
    for (const s of wireless) {
      if (s.radio === 'ng')      bands['24']++;
      else if (s.radio === 'na') bands['5']++;
      else if (s.radio === '6e') bands['6']++;
    }
    const topClients = wireless
      .filter(s => s.signal != null)
      .sort((a, b) => b.signal - a.signal)
      .slice(0, 20)
      .map(s => ({
        name:   s.hostname || s.name || s.mac,
        ip:     s.ip   || null,
        mac:    s.mac  || null,
        signal: s.signal,
        band:   s.radio === 'ng' ? '24' : s.radio === 'na' ? '5' : '6',
        apMac:  s.ap_mac || null,
      }));

    // Devices aus stat/device — CPU/RAM, Uptime, Radio-Kanäle
    const RADIO_BAND = { ng: '2.4G', na: '5G', '6e': '6G' };
    const devs = ((devRaw.data || devRaw) || []).map(d => {
      const base = {
        name:    d.name   || d.model,
        model:   d.model  || '',
        type:    d.type   || '',
        mac:     d.mac    || '',
        online:  d.state  === 1,
        uptime:  d.uptime || 0,
        clients: d.num_sta || 0,
      };
      if (d.type === 'ugw' || d.type === 'udm' || d.type === 'usg') {
        const ss = d['system-stats'] || {};
        base.cpu = ss.cpu != null ? parseFloat(ss.cpu) : null;
        base.mem = ss.mem != null ? parseFloat(ss.mem) : null;
      }
      if (d.type === 'uap') {
        const radioStats = d.radio_table_stats || [];
        base.radios = (d.radio_table || []).map(r => {
          const st = radioStats.find(rs => rs.name === r.name) || {};
          return {
            band:    RADIO_BAND[r.radio] || r.radio,
            channel: r.channel,
            clients: st.num_sta || 0,
          };
        }).filter(r => r.band);
      }
      return base;
    });

    // Kameras (UniFi Protect via Cloud-Connector Integration-API)
    let cameras = [];
    let camError = null;
    try {
      const protBase = `/v1/connector/consoles/${hostId}/proxy/protect/integration/v1`;
      const camRaw = await unifiFetch(cfg, `${protBase}/cameras`, 5000);
      const camArr = Array.isArray(camRaw) ? camRaw : (camRaw.data || []);
      cameras = camArr.map(c => ({
        id:     c.id,
        name:   c.name || c.displayName || 'Kamera',
        online: c.state === 'CONNECTED',
        model:  c.type || c.modelKey || '',
      }));
    } catch (e) {
      camError = e.message;
      if (cfg.camId) cameras = [{ id: cfg.camId, name: 'Kamera', online: true, model: '' }];
    }

    const out = {
      ok: true,
      wan,
      clients: { total: stas.length, wired: wired.length, wireless: wireless.length, bands },
      devices: devs,
      topClients,
      cameras,
      camError,
    };

    cache.unifi = { ts: Date.now(), data: out };
    res.json(out);
  } catch (err) {
    if (cache.unifi.data) return res.json({ ...cache.unifi.data, _stale: true });
    res.json({ ok: false, error: err.message });
  }
});

app.get('/api/unifi/snapshot', (req, res) => {
  const cfg    = unifiCfg();
  const camId  = req.query.cam || cfg.camId;
  const hostId = cfg.hostId || _cachedHostId;
  if (!cfg.apiKey || !camId || !hostId)
    return res.status(400).json({ ok: false, error: 'not_configured' });

  let parsed;
  try {
    parsed = new URL(
      `${UNIFI_BASE}/v1/connector/consoles/${hostId}/proxy/protect/integration/v1/cameras/${camId}/snapshot`
    );
  }
  catch (e) { return res.status(400).end(); }

  let finished = false;
  const preq = https.request(
    {
      hostname: parsed.hostname, port: parsed.port || 443,
      path:     parsed.pathname + parsed.search, method: 'GET',
      headers:  { 'X-API-Key': cfg.apiKey, Accept: 'image/jpeg,*/*' },
    },
    (pres) => {
      if (finished) return;
      finished = true;
      if (pres.statusCode >= 400) {
        console.error(`UniFi Protect snapshot HTTP ${pres.statusCode}`);
        return res.status(pres.statusCode).end();
      }
      res.set('Content-Type', pres.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'no-store');
      pres.pipe(res);
    }
  );
  const timer = setTimeout(() => { if (!finished) { finished = true; preq.destroy(); res.status(504).end(); } }, 8000);
  preq.on('error', e => { clearTimeout(timer); if (!finished) { finished = true; res.status(503).end(); } });
  preq.on('close', () => clearTimeout(timer));
  preq.end();
});

/* ============================================================
   Nextcloud Integration
   - Speicher (serverinfo: freier Platz, Dateien gesamt, Version)
   - Nutzer + genutzter Speicher (OCS Provisioning API)
   - Upload in den ToLeech-Ordner (WebDAV PUT, serverseitig geproxied)
   Admin-Konto + App-Passwort. OCS verlangt Header "OCS-APIRequest".
   ============================================================ */
function nextcloudCfg() {
  return {
    url:       (getSecret('NEXTCLOUD_URL')  || '').replace(/\/+$/, ''),
    user:      getSecret('NEXTCLOUD_USER')  || '',
    pass:      getSecret('NEXTCLOUD_PASS')  || '',
    sharePath: (getSecret('NEXTCLOUD_SHARE_PATH') || 'ToLeech').replace(/^\/+|\/+$/g, ''),
  };
}

function ncAuth(cfg) {
  return 'Basic ' + Buffer.from(`${cfg.user}:${cfg.pass}`).toString('base64');
}

async function ncFetch(cfg, apiPath, timeoutMs = 6000) {
  const res = await fetch(`${cfg.url}${apiPath}`, {
    headers: {
      Authorization:    ncAuth(cfg),
      'OCS-APIRequest': 'true',
      Accept:           'application/json',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const ocs  = json && json.ocs;
  if (!ocs || !ocs.data) throw new Error('bad_ocs_response');
  return ocs.data;
}

app.get('/api/nextcloud', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const cfg = nextcloudCfg();
  if (!cfg.url || !cfg.user || !cfg.pass) return res.json({ ok: false, error: 'not_configured' });

  if (cache.nextcloud.data && Date.now() - cache.nextcloud.ts < NEXTCLOUD_TTL) {
    return res.json(cache.nextcloud.data);
  }

  try {
    // serverinfo (freier Platz, Dateien gesamt, Version) – optional, daher tolerant
    const info = await ncFetch(cfg, '/ocs/v2.php/apps/serverinfo/api/v1/info?format=json', 6000)
      .catch(() => null);
    const sys = (info && info.nextcloud && info.nextcloud.system)  || {};
    const sto = (info && info.nextcloud && info.nextcloud.storage) || {};
    const freeFromInfo = typeof sys.freespace === 'number' ? sys.freespace : null;
    const numFiles     = typeof sto.num_files === 'number' ? sto.num_files : null;
    const version      = sys.version || null;

    // Nutzerliste + Details (Speicherverbrauch pro User)
    const list = await ncFetch(cfg, '/ocs/v2.php/cloud/users?format=json', 6000);
    const ids  = (list.users || []);
    const details = await Promise.all(ids.map((id) =>
      ncFetch(cfg, `/ocs/v2.php/cloud/users/${encodeURIComponent(id)}?format=json`, 6000)
        .then((d) => ({ id, d }))
        .catch(() => null)
    ));

    let used = 0;
    let freeFallback = 0;
    const users = [];
    for (const entry of details) {
      if (!entry) continue;
      const d = entry.d;
      const q = d.quota || {};
      const u = typeof q.used === 'number' ? q.used : 0;
      used += u;
      if (typeof q.free === 'number' && q.free > freeFallback) freeFallback = q.free;
      // quota.quota: < 0 = unbegrenzt, sonst Limit in Bytes
      const limit = typeof q.quota === 'number' && q.quota > 0 ? q.quota : null;
      users.push({
        name:    d.displayname || entry.id,
        used:    u,
        quota:   limit,
        percent: limit ? Math.min(100, Math.round(u / limit * 100))
               : (typeof q.relative === 'number' ? Math.round(q.relative) : null),
      });
    }
    users.sort((a, b) => b.used - a.used);

    const free    = freeFromInfo != null ? freeFromInfo : freeFallback;
    const total   = used + free;
    const percent = total > 0 ? Math.round(used / total * 100) : 0;

    const result = {
      ok: true,
      used, free, total, percent,
      userCount: users.length,
      users,
      numFiles,
      version,
    };
    cache.nextcloud = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error('Nextcloud-Abruf fehlgeschlagen:', err.message);
    if (cache.nextcloud.data) return res.json({ ...cache.nextcloud.data, _stale: true });
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
});

// Datei-Upload in den ToLeech-Ordner. Body = rohe Datei, ?name=<dateiname>.
// express.raw nur fuer diese Route -> globales express.json bleibt unberuehrt.
app.post('/api/nextcloud/upload', express.raw({ type: () => true, limit: '64mb' }), async (req, res) => {
  const cfg = nextcloudCfg();
  if (!cfg.url || !cfg.user || !cfg.pass) return res.status(400).json({ ok: false, error: 'not_configured' });

  const name = path.basename(String(req.query.name || '').trim()); // verhindert Pfad-Ausbruch
  if (!name || name === '.' || name === '..') return res.status(400).json({ ok: false, error: 'bad_name' });
  const body = req.body;
  if (!body || !body.length) return res.status(400).json({ ok: false, error: 'empty' });

  const davUrl = `${cfg.url}/remote.php/dav/files/${encodeURIComponent(cfg.user)}/` +
    cfg.sharePath.split('/').filter(Boolean).map(encodeURIComponent).join('/') +
    '/' + encodeURIComponent(name);

  try {
    const r = await fetch(davUrl, {
      method:  'PUT',
      headers: { Authorization: ncAuth(cfg), 'Content-Type': 'application/octet-stream' },
      body,
      signal:  AbortSignal.timeout(30000),
    });
    if (r.status === 201 || r.status === 204) {
      cache.nextcloud.ts = 0; // Cache verfaellt -> naechster Poll zeigt die neue Datei
      return res.json({ ok: true, name });
    }
    const text = await r.text().catch(() => '');
    console.error(`Nextcloud-Upload HTTP ${r.status}: ${text.slice(0, 200)}`);
    return res.status(502).json({ ok: false, error: `http_${r.status}` });
  } catch (err) {
    console.error('Nextcloud-Upload fehlgeschlagen:', err.message);
    return res.status(502).json({ ok: false, error: 'upload_failed', message: err.message });
  }
});

/* ============================================================
   Unraid VM-Integration
   Offizielle Unraid-GraphQL-API (ab Unraid 7.2), Auth per API-Key
   (Header: x-api-key). Liefert die VM-Liste inkl. Status und steuert
   VMs (start/stop/pause/resume/reboot/forceStop/reset). Self-signed
   Zertifikate werden akzeptiert, da Unraid haeufig ein solches nutzt.
   ============================================================ */

function unraidCfg() {
  const base   = (getSecret('UNRAID_URL') || '').replace(/\/+$/, '');
  const apiKey =  getSecret('UNRAID_API_KEY') || '';
  if (!base || !apiKey) return null;
  return { base, apiKey };
}

// Ein GraphQL-Request gegen ${base}/graphql. http/https je nach URL,
// self-signed erlaubt. Wirft bei GraphQL-Errors, liefert sonst `data`.
function unraidGraphQL(cfg, query, variables, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    let parsed;
    try { parsed = new URL(cfg.base + '/graphql'); } catch (e) { return reject(e); }
    const lib = parsed.protocol === 'https:' ? https : http;
    const payload = JSON.stringify({ query, variables: variables || {} });
    let settled = false;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type':   'application/json',
          Accept:           'application/json',
          'x-api-key':      cfg.apiKey,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', c => raw += c);
        res.on('end', () => {
          if (settled) return; settled = true;
          clearTimeout(timer);
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
          let json;
          try { json = JSON.parse(raw); } catch (e) { return reject(e); }
          if (json.errors && json.errors.length) {
            return reject(new Error(json.errors[0].message || 'graphql_error'));
          }
          resolve(json.data || {});
        });
      }
    );
    const timer = setTimeout(() => {
      if (settled) return; settled = true;
      req.destroy();
      reject(new Error('timeout'));
    }, timeoutMs);
    req.on('error', e => { if (settled) return; settled = true; clearTimeout(timer); reject(e); });
    req.write(payload);
    req.end();
  });
}

// Unraid VmState-Enum -> grobe Kategorie fuer die UI.
function vmState(state) {
  const s = String(state || '').toUpperCase();
  if (s === 'RUNNING' || s === 'IDLE') return 'running';
  if (s === 'PAUSED'  || s === 'PMSUSPENDED') return 'paused';
  return 'stopped';
}

// VM-Liste holen. Aktuelle Unraid-API kennt `domains`, aeltere nur `domain`.
async function fetchVmDomains(cfg) {
  const fields = 'id name state uuid';
  try {
    const d = await unraidGraphQL(cfg, `query { vms { domains { ${fields} } } }`);
    return (d.vms && d.vms.domains) || [];
  } catch (e) {
    const d = await unraidGraphQL(cfg, `query { vms { domain { ${fields} } } }`);
    return (d.vms && d.vms.domain) || [];
  }
}

const VM_TTL = 5000; // ms – VM-Status hoechstens alle 5 s abrufen
// Erlaubte Aktionen -> Name des GraphQL-Mutation-Felds (Allowlist).
const VM_ACTIONS = {
  start:     'start',
  stop:      'stop',
  pause:     'pause',
  resume:    'resume',
  reboot:    'reboot',
  forceStop: 'forceStop',
  reset:     'reset',
};

// Roh-VM-Liste pro VM mit vms.json anreichern (isWindows, rdpHost) – guenstiger
// lokaler JSON-Read, unabhaengig vom GraphQL-Cache.
function enrichVmsResult(result) {
  if (!result || !Array.isArray(result.vms)) return result;
  const vmcfg = readVmCfg();
  const vms = result.vms.map((v) => {
    const c = vmcfg[v.id] || {};
    return { ...v, isWindows: vmIsWindows(c), rdpHost: c.rdpHost || null };
  });
  return { ...result, vms };
}

app.get('/api/vms', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const cfg = unraidCfg();
  if (!cfg) return res.json({ ok: false, error: 'not_configured' });

  if (cache.unraid.data && Date.now() - cache.unraid.ts < VM_TTL) {
    return res.json(enrichVmsResult(cache.unraid.data));
  }

  try {
    const domains = await fetchVmDomains(cfg);
    const vms = domains.map((v) => ({
      id:       v.id,
      name:     v.name || '?',
      state:    vmState(v.state),
      rawState: v.state || null,
      uuid:     v.uuid || v.id || null,
    }));
    // Anzeige-Reihenfolge: laufend -> pausiert -> gestoppt, dann alphabetisch.
    const order = { running: 0, paused: 1, stopped: 2 };
    vms.sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name));

    const result = {
      ok:        true,
      manageUrl: `${cfg.base}/VMs`,   // Unraid VM-Manager (Fallback, falls kein SSH)
      sshEnabled: !!unraidSshCfg(),   // true -> direkte noVNC-Konsole ueber /vnc.html
      total:     vms.length,
      running:   vms.filter(v => v.state === 'running').length,
      paused:    vms.filter(v => v.state === 'paused').length,
      stopped:   vms.filter(v => v.state === 'stopped').length,
      vms,
    };
    cache.unraid = { ts: Date.now(), data: result };
    res.json(enrichVmsResult(result));
  } catch (err) {
    console.error('Unraid-VM-Abruf fehlgeschlagen:', err.message);
    if (cache.unraid.data) return res.json(enrichVmsResult({ ...cache.unraid.data, _stale: true }));
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
});

app.get('/api/vms/config', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, config: readVmCfg() });
});

app.post('/api/vms/config', (req, res) => {
  const body  = (req.body && typeof req.body === 'object') ? req.body : {};
  const inCfg = (body.config && typeof body.config === 'object') ? body.config : {};
  const cur = readVmCfg();
  const out = {};
  for (const [id, v] of Object.entries(inCfg)) {
    if (!id || !v || typeof v !== 'object') continue;
    const key = String(id).slice(0, 200);
    const entry = { ...(cur[key] || {}) }; // bewahrt osAuto
    if (v.win === true || v.win === false) entry.win = v.win; else delete entry.win;
    const host = String(v.rdpHost || '').trim().slice(0, 255);
    if (host) entry.rdpHost = host; else delete entry.rdpHost;
    const user = String(v.rdpUser || '').trim().slice(0, 120);
    if (user) entry.rdpUser = user; else delete entry.rdpUser;
    out[key] = entry;
  }
  // Nicht im Body enthaltene VMs unveraendert behalten.
  for (const [id, v] of Object.entries(cur)) { if (!(id in out)) out[id] = v; }
  try { writeVmCfg(out); res.json({ ok: true }); }
  catch (err) {
    console.error('VM-Config konnte nicht gespeichert werden:', err.message);
    res.status(500).json({ ok: false, error: 'write_failed' });
  }
});

// OS pro VM per SSH erkennen (Unraid-Metadaten) und in vms.json speichern.
app.post('/api/vms/detect', async (req, res) => {
  const sshCfg = unraidSshCfg();
  const gcfg   = unraidCfg();
  if (!sshCfg || !gcfg) return res.status(400).json({ ok: false, error: 'not_configured' });
  try {
    const domains = await fetchVmDomains(gcfg);
    const conn = await sshConnect(sshCfg);
    const cfg = readVmCfg();
    try {
      for (const v of domains) {
        const ref = (v.uuid && /^[0-9a-fA-F-]{8,}$/.test(v.uuid)) ? v.uuid : v.name;
        if (!ref) continue;
        try {
          const xml = await sshExec(conn, `virsh dumpxml ${shq(ref)}`);
          const { os } = parseVmOs(xml);
          if (os) cfg[v.id] = { ...(cfg[v.id] || {}), osAuto: os };
        } catch (_) { /* einzelne VM ueberspringen */ }
      }
    } finally { try { conn.end(); } catch (_) {} }
    writeVmCfg(cfg);
    res.json({ ok: true, config: cfg });
  } catch (err) {
    console.error('OS-Erkennung fehlgeschlagen:', err.message);
    res.status(502).json({ ok: false, error: 'detect_failed', message: err.message });
  }
});

app.post('/api/vm/action', async (req, res) => {
  const cfg = unraidCfg();
  if (!cfg) return res.status(400).json({ ok: false, error: 'not_configured' });

  const id     = String((req.body && req.body.id)     || '').trim();
  const action = String((req.body && req.body.action) || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });
  const mutation = VM_ACTIONS[action];
  if (!mutation) return res.status(400).json({ ok: false, error: 'bad_action' });

  try {
    const data = await unraidGraphQL(
      cfg,
      `mutation($id: PrefixedID!) { vm { ${mutation}(id: $id) } }`,
      { id },
      12000
    );
    const ok = !!(data.vm && data.vm[mutation]);
    cache.unraid.ts = 0; // Cache invalidieren -> naechster Poll zeigt neuen Status
    res.json({ ok });
  } catch (err) {
    console.error(`Unraid-VM-Aktion '${action}' fehlgeschlagen:`, err.message);
    res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
  }
});

/* ============================================================
   Unraid-Suite (weitere Kacheln ueber die GraphQL-API)
   Docker-Container, Array/Parity, Disks, Shares, Meldungen,
   System-Info und USV – gleiche API wie die VM-Kachel. Optionale
   Schema-Felder (abhaengig von der unraid-api-Version) werden per
   Fallback-Query abgefangen. Riskante Aktionen (Array-Stop/Start,
   Parity-Steuerung, Neustart/Shutdown) sind serverseitig hinter
   dem Opt-in UNRAID_DANGER_ACTIONS gesperrt.
   ============================================================ */

const UNRAID_DOCKER_TTL = 8000;   // ms – Container-Status
const UNRAID_ARRAY_TTL  = 15000;  // ms – Array/Disks (eine Query bedient beide Kacheln)
const UNRAID_SHARES_TTL = 60000;  // ms – Share-Fuellstaende aendern sich langsam
const UNRAID_NOTIF_TTL  = 20000;  // ms – Unraid-Meldungen
const UNRAID_SYSTEM_TTL = 5000;   // ms – Live-CPU/RAM
const UNRAID_UPS_TTL    = 15000;  // ms – USV-Status

function unraidDangerEnabled() { return getSecret('UNRAID_DANGER_ACTIONS') === 'true'; }

// BigInt-/String-Zahlenfelder der API robust in Number wandeln.
function unraidNum(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

// Gemeinsames GET-Boilerplate der Unraid-Endpoints:
// cfg-Check -> Cache-Hit -> Fetch -> bei Fehler letzte Daten als _stale.
async function serveUnraid(res, slot, ttl, fetchFn) {
  res.set('Cache-Control', 'no-store');
  const cfg = unraidCfg();
  if (!cfg) return res.json({ ok: false, error: 'not_configured' });
  if (cache[slot].data && Date.now() - cache[slot].ts < ttl) return res.json(cache[slot].data);
  try {
    const result = await fetchFn(cfg);
    cache[slot] = { ts: Date.now(), data: result };
    res.json(result);
  } catch (err) {
    console.error(`Unraid-Abruf (${slot}) fehlgeschlagen:`, err.message);
    if (cache[slot].data) return res.json({ ...cache[slot].data, _stale: true });
    res.json({ ok: false, error: 'fetch_failed', message: err.message });
  }
}

/* ---------- Docker-Container ---------- */

async function fetchUnraidDocker(cfg) {
  const fields = 'id names image state status autoStart';
  let list;
  try {
    // isUpdateAvailable gibt es erst in neueren unraid-api-Versionen
    const d = await unraidGraphQL(cfg, `query { docker { containers { ${fields} isUpdateAvailable } } }`);
    list = (d.docker && d.docker.containers) || [];
  } catch (e) {
    const d = await unraidGraphQL(cfg, `query { docker { containers { ${fields} } } }`);
    list = (d.docker && d.docker.containers) || [];
  }
  const stateOf = (s) => {
    const u = String(s || '').toUpperCase();
    if (u === 'RUNNING') return 'running';
    if (u === 'PAUSED')  return 'paused';
    return 'exited';
  };
  const containers = list.map((c) => ({
    id:        c.id,
    name:      String((c.names && c.names[0]) || '?').replace(/^\//, ''),
    image:     c.image || '',
    state:     stateOf(c.state),
    rawState:  c.state || null,
    status:    c.status || '',
    autoStart: !!c.autoStart,
    updateAvailable: c.isUpdateAvailable === true,
  }));
  const order = { running: 0, paused: 1, exited: 2 };
  containers.sort((a, b) => (order[a.state] - order[b.state]) || a.name.localeCompare(b.name));
  return {
    ok:      true,
    total:   containers.length,
    running: containers.filter(c => c.state === 'running').length,
    paused:  containers.filter(c => c.state === 'paused').length,
    exited:  containers.filter(c => c.state === 'exited').length,
    updates: containers.filter(c => c.updateAvailable).length,
    containers,
  };
}

app.get('/api/unraid/docker', (req, res) => serveUnraid(res, 'unraidDocker', UNRAID_DOCKER_TTL, fetchUnraidDocker));

// Erlaubte Container-Aktionen (Allowlist wie VM_ACTIONS).
const UNRAID_DOCKER_ACTIONS = { start: 'start', stop: 'stop', restart: 'restart', pause: 'pause', unpause: 'unpause' };

app.post('/api/unraid/docker/action', async (req, res) => {
  const cfg = unraidCfg();
  if (!cfg) return res.status(400).json({ ok: false, error: 'not_configured' });
  const id     = String((req.body && req.body.id)     || '').trim();
  const action = String((req.body && req.body.action) || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });
  const mutation = UNRAID_DOCKER_ACTIONS[action];
  if (!mutation) return res.status(400).json({ ok: false, error: 'bad_action' });
  try {
    // DockerMutations liefern DockerContainer -> Selection-Set noetig
    const data = await unraidGraphQL(
      cfg,
      `mutation($id: PrefixedID!) { docker { ${mutation}(id: $id) { id state } } }`,
      { id },
      20000
    );
    const ok = !!(data.docker && data.docker[mutation]);
    cache.unraidDocker.ts = 0;
    res.json({ ok });
  } catch (err) {
    console.error(`Unraid-Docker-Aktion '${action}' fehlgeschlagen:`, err.message);
    res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
  }
});

/* ---------- Array, Parity & Disks ---------- */

function mapUnraidDisk(d) {
  const fsSize = unraidNum(d.fsSize), fsUsed = unraidNum(d.fsUsed), fsFree = unraidNum(d.fsFree);
  return {
    id:     d.id,
    idx:    Number.isFinite(+d.idx) ? +d.idx : null,
    name:   d.name || d.device || '?',
    device: d.device || null,
    sizeKb: unraidNum(d.size),
    status: d.status || null,
    ok:     d.status === 'DISK_OK',
    present: !/^DISK_NP/.test(String(d.status || '')),
    temp:   Number.isFinite(+d.temp) ? +d.temp : null,
    errors: unraidNum(d.numErrors) || 0,
    type:   d.type || null,
    rotational: d.rotational !== false,
    fsSizeKb: fsSize, fsUsedKb: fsUsed, fsFreeKb: fsFree,
    pctUsed: (fsSize && fsUsed != null) ? Math.round(fsUsed / fsSize * 100) : null,
  };
}

function mapUnraidParity(p) {
  if (!p) return null;
  return {
    status:     p.status || null,
    running:    !!p.running,
    paused:     !!p.paused,
    correcting: !!p.correcting,
    progress:   Number.isFinite(+p.progress) ? +p.progress : null,
    speed:      p.speed || null,
    errors:     Number.isFinite(+p.errors) ? +p.errors : null,
    date:       p.date || null,
    duration:   Number.isFinite(+p.duration) ? +p.duration : null,
  };
}

async function fetchUnraidArray(cfg) {
  const diskFields = 'id idx name device size status temp numErrors type rotational';
  const fsFields   = 'fsSize fsFree fsUsed';
  const arrayCore  = `state
    capacity { kilobytes { free used total } disks { free used total } }
    parities { ${diskFields} }
    disks    { ${diskFields} ${fsFields} }
    caches   { ${diskFields} ${fsFields} }`;
  let arr, parity = null;
  try {
    // parityCheckStatus gibt es erst ab unraid-api 4.16
    const d = await unraidGraphQL(cfg, `query { array { ${arrayCore}
      parityCheckStatus { status progress speed errors correcting paused running date duration } } }`, null, 10000);
    arr = d.array;
    parity = mapUnraidParity(arr && arr.parityCheckStatus);
  } catch (e) {
    const d = await unraidGraphQL(cfg, `query { array { ${arrayCore} } }`, null, 10000);
    arr = d.array;
    // Fallback: laufenden Parity-Check aus den md-Variablen ableiten (aeltere API)
    try {
      const v = (await unraidGraphQL(cfg, `query { vars { mdResync mdResyncPos mdResyncSize mdResyncAction sbSyncErrs } }`)).vars || {};
      const size = unraidNum(v.mdResyncSize), pos = unraidNum(v.mdResyncPos);
      const running = (unraidNum(v.mdResync) || 0) > 0;
      parity = {
        status:     running ? 'RUNNING' : null,
        running,
        paused:     false,
        correcting: /correct/i.test(String(v.mdResyncAction || '')),
        progress:   (running && size) ? Math.round((pos || 0) / size * 100) : null,
        speed: null, errors: unraidNum(v.sbSyncErrs), date: null, duration: null,
      };
    } catch (_) { /* Parity-Status dann unbekannt */ }
  }
  if (!arr) throw new Error('array_missing');
  const kb    = (arr.capacity && arr.capacity.kilobytes) || {};
  const slots = (arr.capacity && arr.capacity.disks) || {};
  const totalKb = unraidNum(kb.total) || 0, usedKb = unraidNum(kb.used) || 0, freeKb = unraidNum(kb.free) || 0;
  return {
    ok: true,
    dangerEnabled: unraidDangerEnabled(),
    state:   arr.state || null,
    started: arr.state === 'STARTED',
    capacity: {
      totalKb, usedKb, freeKb,
      pctUsed:    totalKb ? Math.round(usedKb / totalKb * 100) : null,
      slotsUsed:  unraidNum(slots.used),
      slotsTotal: unraidNum(slots.total),
    },
    parity,
    parities: (arr.parities || []).map(mapUnraidDisk),
    disks:    (arr.disks    || []).map(mapUnraidDisk),
    caches:   (arr.caches   || []).map(mapUnraidDisk),
  };
}

app.get('/api/unraid/array', (req, res) => serveUnraid(res, 'unraidArray', UNRAID_ARRAY_TTL, fetchUnraidArray));

// Array-/Parity-Aktionen sind allesamt riskant -> Danger-Gate (403 wenn aus).
const UNRAID_ARRAY_ACTIONS = {
  start:        { kind: 'state',  state: 'START' },
  stop:         { kind: 'state',  state: 'STOP' },
  parityStart:  { kind: 'parity', field: 'start' },
  parityPause:  { kind: 'parity', field: 'pause' },
  parityResume: { kind: 'parity', field: 'resume' },
  parityCancel: { kind: 'parity', field: 'cancel' },
};

app.post('/api/unraid/array/action', async (req, res) => {
  const cfg = unraidCfg();
  if (!cfg) return res.status(400).json({ ok: false, error: 'not_configured' });
  const action = String((req.body && req.body.action) || '').trim();
  const spec = UNRAID_ARRAY_ACTIONS[action];
  if (!spec) return res.status(400).json({ ok: false, error: 'bad_action' });
  if (!unraidDangerEnabled()) return res.status(403).json({ ok: false, error: 'danger_disabled' });
  try {
    if (spec.kind === 'state') {
      await unraidGraphQL(
        cfg,
        'mutation($input: ArrayStateInput!) { array { setState(input: $input) { state } } }',
        { input: { desiredState: spec.state } },
        30000 // Array-Start/-Stop kann dauern
      );
    } else if (spec.field === 'start') {
      const correct = !!(req.body && req.body.correct);
      await unraidGraphQL(cfg, 'mutation($correct: Boolean!) { parityCheck { start(correct: $correct) } }', { correct }, 15000);
    } else {
      await unraidGraphQL(cfg, `mutation { parityCheck { ${spec.field} } }`, null, 15000);
    }
    cache.unraidArray.ts = 0;
    res.json({ ok: true });
  } catch (err) {
    console.error(`Unraid-Array-Aktion '${action}' fehlgeschlagen:`, err.message);
    res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
  }
});

/* ---------- Shares ---------- */

async function fetchUnraidShares(cfg) {
  const d = await unraidGraphQL(cfg, 'query { shares { id name comment free used size cache } }');
  const shares = (d.shares || []).map((s) => {
    const freeKb = unraidNum(s.free), usedKb = unraidNum(s.used);
    let sizeKb = unraidNum(s.size);
    // `size` ist bei User-Shares oft 0 -> aus used+free ableiten
    if (!sizeKb && usedKb != null && freeKb != null) sizeKb = usedKb + freeKb;
    return {
      id: s.id || s.name, name: s.name || '?', comment: s.comment || '',
      freeKb, usedKb, sizeKb,
      pctUsed: (sizeKb && usedKb != null) ? Math.round(usedKb / sizeKb * 100) : null,
      cached: s.cache === true,
    };
  }).sort((a, b) => (b.usedKb || 0) - (a.usedKb || 0));
  return { ok: true, total: shares.length, shares };
}

app.get('/api/unraid/shares', (req, res) => serveUnraid(res, 'unraidShares', UNRAID_SHARES_TTL, fetchUnraidShares));

/* ---------- Meldungen (Notifications) ---------- */

async function fetchUnraidNotifications(cfg) {
  const d = await unraidGraphQL(cfg, `query {
    notifications {
      overview { unread { info warning alert total } archive { total } }
      list(filter: { type: UNREAD, offset: 0, limit: 30 }) {
        id title subject description importance link timestamp
      }
    }
  }`);
  const n = d.notifications || {};
  const unread = (n.overview && n.overview.unread) || {};
  const notifications = (n.list || []).map((x) => ({
    id: x.id, title: x.title || '', subject: x.subject || '',
    description: x.description || '', importance: x.importance || 'INFO',
    link: x.link || null, timestamp: x.timestamp || null,
  }));
  return {
    ok: true,
    unread: {
      info: unread.info | 0, warning: unread.warning | 0,
      alert: unread.alert | 0, total: unread.total | 0,
    },
    archived: ((n.overview && n.overview.archive) || {}).total | 0,
    notifications,
  };
}

app.get('/api/unraid/notifications', (req, res) => serveUnraid(res, 'unraidNotif', UNRAID_NOTIF_TTL, fetchUnraidNotifications));

app.post('/api/unraid/notifications/action', async (req, res) => {
  const cfg = unraidCfg();
  if (!cfg) return res.status(400).json({ ok: false, error: 'not_configured' });
  const action = String((req.body && req.body.action) || '').trim();
  const id     = String((req.body && req.body.id)     || '').trim();
  try {
    if (action === 'archive') {
      if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });
      await unraidGraphQL(cfg, 'mutation($id: PrefixedID!) { archiveNotification(id: $id) { id } }', { id });
    } else if (action === 'archiveAll') {
      await unraidGraphQL(cfg, 'mutation { archiveAll { unread { total } } }');
    } else {
      return res.status(400).json({ ok: false, error: 'bad_action' });
    }
    cache.unraidNotif.ts = 0;
    res.json({ ok: true });
  } catch (err) {
    console.error(`Unraid-Meldungs-Aktion '${action}' fehlgeschlagen:`, err.message);
    res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
  }
});

/* ---------- System-Info ---------- */

async function fetchUnraidSystem(cfg) {
  const d = await unraidGraphQL(cfg, `query {
    info {
      os { hostname distro release kernel uptime }
      cpu { brand cores threads }
      versions { core { unraid api } }
    }
    online
  }`);
  const info = d.info || {};
  const os = info.os || {}, cpuInfo = info.cpu || {};
  const core = (info.versions && info.versions.core) || {};
  // os.uptime ist der Boot-Zeitpunkt als ISO-String
  let uptimeSec = null;
  if (os.uptime) {
    const t = Date.parse(os.uptime);
    if (Number.isFinite(t)) uptimeSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  }
  const result = {
    ok: true,
    dangerEnabled: unraidDangerEnabled(),
    sshEnabled: !!unraidSshCfg(),
    online: d.online !== false,
    hostname: os.hostname || null, distro: os.distro || null,
    release: os.release || null, kernel: os.kernel || null,
    unraidVersion: core.unraid || null, apiVersion: core.api || null,
    bootTime: os.uptime || null, uptimeSec,
    cpuBrand: cpuInfo.brand || null,
    cores: cpuInfo.cores || null, threads: cpuInfo.threads || null,
    cpuPct: null, ramPct: null, ramUsed: null, ramTotal: null,
  };
  try {
    // metrics gibt es erst in neueren unraid-api-Versionen
    const m = (await unraidGraphQL(cfg, 'query { metrics { cpu { percentTotal } memory { percentTotal total used } } }')).metrics || {};
    if (m.cpu && Number.isFinite(+m.cpu.percentTotal)) result.cpuPct = Math.round(+m.cpu.percentTotal * 10) / 10;
    if (m.memory) {
      if (Number.isFinite(+m.memory.percentTotal)) result.ramPct = Math.round(+m.memory.percentTotal * 10) / 10;
      result.ramUsed  = unraidNum(m.memory.used);
      result.ramTotal = unraidNum(m.memory.total);
    }
  } catch (_) { /* aeltere API ohne metrics */ }
  return result;
}

app.get('/api/unraid/system', (req, res) => serveUnraid(res, 'unraidSystem', UNRAID_SYSTEM_TTL, fetchUnraidSystem));

// Neustart/Shutdown: die GraphQL-API v4 hat keine solchen Mutationen mehr
// (nur VmMutations.reboot), deshalb ueber den vorhandenen SSH-Kanal.
// Doppelt gesperrt: Danger-Flag UND SSH-Zugang muessen konfiguriert sein.
const UNRAID_SYSTEM_ACTIONS = { reboot: 'reboot', shutdown: 'poweroff' };

app.post('/api/unraid/system/action', async (req, res) => {
  const action = String((req.body && req.body.action) || '').trim();
  const cmd = UNRAID_SYSTEM_ACTIONS[action];
  if (!cmd) return res.status(400).json({ ok: false, error: 'bad_action' });
  if (!unraidDangerEnabled()) return res.status(403).json({ ok: false, error: 'danger_disabled' });
  const sshCfg = unraidSshCfg();
  if (!sshCfg) return res.status(400).json({ ok: false, error: 'needs_ssh' });
  try {
    const conn = await sshConnect(sshCfg);
    // Fire-and-forget: die SSH-Session stirbt mit dem Host, daher nohup + &
    try { await sshExec(conn, `nohup ${cmd} >/dev/null 2>&1 &`); }
    finally { try { conn.end(); } catch (_) {} }
    res.json({ ok: true });
  } catch (err) {
    console.error(`Unraid-System-Aktion '${action}' fehlgeschlagen:`, err.message);
    res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
  }
});

/* ---------- USV (UPS) ---------- */

async function fetchUnraidUps(cfg) {
  const fields = 'id name model status battery { chargeLevel estimatedRuntime health }';
  let list;
  try {
    // power-Block gibt es erst ab unraid-api 4.30
    const d = await unraidGraphQL(cfg, `query { upsDevices { ${fields} power { inputVoltage outputVoltage loadPercentage nominalPower currentPower } } }`);
    list = d.upsDevices || [];
  } catch (e) {
    try {
      const d = await unraidGraphQL(cfg, `query { upsDevices { ${fields} } }`);
      list = d.upsDevices || [];
    } catch (e2) {
      // upsDevices gibt es erst ab unraid-api 4.12
      return { ok: false, error: 'unsupported' };
    }
  }
  const devices = list.map((u) => {
    const b = u.battery || {}, p = u.power || {};
    return {
      id: u.id, name: u.name || u.model || 'USV', model: u.model || '',
      status: u.status || '', online: /online/i.test(String(u.status || '')),
      chargePct: Number.isFinite(+b.chargeLevel) ? +b.chargeLevel : null,
      // Hinweis: vor unraid-api 4.28 lieferte estimatedRuntime Minuten statt Sekunden
      runtimeSec: Number.isFinite(+b.estimatedRuntime) ? +b.estimatedRuntime : null,
      health: b.health || null,
      loadPct: Number.isFinite(+p.loadPercentage) ? +p.loadPercentage : null,
      watts: Number.isFinite(+p.currentPower) ? +p.currentPower : null,
      inputVoltage: Number.isFinite(+p.inputVoltage) ? +p.inputVoltage : null,
    };
  });
  return { ok: true, total: devices.length, devices };
}

app.get('/api/unraid/ups', (req, res) => serveUnraid(res, 'unraidUps', UNRAID_UPS_TTL, fetchUnraidUps));

/* ============================================================
   Direkter VNC-Zugriff (ohne Unraid-Login)
   Dash# liest den VNC-Port der VM per SSH (`virsh dumpxml`) von Unraid,
   tunnelt die RFB-Verbindung durch SSH zum QEMU-VNC-Port und stellt sie
   dem Browser als WebSocket bereit (Websockify). Die Konsole rendert
   die gevendorte noVNC-Seite unter /vnc.html – komplett an Unraids
   Weblogin vorbei.
   ============================================================ */

function unraidSshCfg() {
  let host = getSecret('UNRAID_SSH_HOST');
  if (!host) { try { host = new URL(getSecret('UNRAID_URL')).hostname; } catch (_) { host = ''; } }
  const user = getSecret('UNRAID_SSH_USER') || 'root';
  const port = parseInt(getSecret('UNRAID_SSH_PORT') || '22', 10) || 22;
  const password = getSecret('UNRAID_SSH_PASSWORD') || '';
  const key = getSecret('UNRAID_SSH_KEY') || '';
  if (!host || (!password && !key)) return null;
  return { host, user, port, password, key };
}

// Shell-sicheres Single-Quoting fuer Remote-Kommandos (verhindert Injection).
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

function sshConnect(cfg, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
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

function sshExec(conn, cmd, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '', errout = '';
      const t = setTimeout(() => { try { stream.close(); } catch (_) {} reject(new Error('exec_timeout')); }, timeoutMs);
      stream.on('data', (d) => { out += d; });
      stream.stderr.on('data', (d) => { errout += d; });
      stream.on('close', (code) => {
        clearTimeout(t);
        if (code === 0) return resolve(out);
        reject(new Error('virsh_exit_' + code + (errout ? ': ' + errout.trim().slice(0, 120) : '')));
      });
    });
  });
}

// <graphics type='vnc' port='59xx' ... passwd='...'> aus dumpxml parsen.
function parseVncGraphics(xml) {
  const m = String(xml).match(/<graphics\b[^>]*type=['"]vnc['"][^>]*>/i);
  if (!m) return null;
  const tag = m[0];
  const port   = (tag.match(/\bport=['"](-?\d+)['"]/)   || [])[1];
  const passwd = (tag.match(/\bpasswd=['"]([^'"]*)['"]/) || [])[1] || '';
  const p = parseInt(port, 10);
  if (!p || p < 0) return null; // -1 = kein Port (VM nicht gestartet)
  return { vncPort: p, password: passwd };
}

// Gast-OS aus Unraids <vmtemplate ... os='...' icon='...'>-Metadaten lesen.
function parseVmOs(xml) {
  const m = String(xml).match(/<vmtemplate\b[^>]*>/i);
  const tag = m ? m[0] : '';
  const os   = (tag.match(/\bos=['"]([^'"]*)['"]/)   || [])[1] || '';
  const icon = (tag.match(/\bicon=['"]([^'"]*)['"]/) || [])[1] || '';
  return { os, icon, isWindows: /windows/i.test(os) || /windows/i.test(icon) };
}

// Erkanntes OS opportunistisch in vms.json merken (manuelle Uebersteuerung bleibt unberuehrt).
function learnVmOs(id, xml) {
  try {
    const { os } = parseVmOs(xml);
    if (!os) return;
    const cfg = readVmCfg();
    const cur = cfg[id] || {};
    if (typeof cur.win === 'boolean') return;
    if (cur.osAuto === os) return;
    cfg[id] = { ...cur, osAuto: os };
    writeVmCfg(cfg);
  } catch (_) { /* nicht kritisch */ }
}

// id (PrefixedID) -> Domain-Referenz fuer virsh (bevorzugt uuid, sonst Name).
async function resolveVmRef(id) {
  const pick = (list) => {
    const vm = (list || []).find((v) => v.id === id);
    if (!vm) return null;
    if (vm.uuid && /^[0-9a-fA-F-]{8,}$/.test(vm.uuid)) return vm.uuid;
    return vm.name;
  };
  let ref = pick(cache.unraid.data && cache.unraid.data.vms);
  if (ref) return ref;
  const cfg = unraidCfg();
  if (cfg) {
    try {
      const domains = await fetchVmDomains(cfg);
      ref = pick(domains.map((v) => ({ id: v.id, name: v.name, uuid: v.uuid })));
    } catch (_) { /* ignore */ }
  }
  return ref || null;
}

// Kleiner Cache, damit vnc-info + vnc-ws nicht zweimal per SSH abfragen.
const _vncCache = new Map(); // id -> { ts, data }
async function getVncGraphics(id) {
  const cfg = unraidSshCfg();
  if (!cfg) { const e = new Error('not_configured'); e.code = 'not_configured'; throw e; }
  const hit = _vncCache.get(id);
  if (hit && Date.now() - hit.ts < 5000) return hit.data;

  const ref = await resolveVmRef(id);
  if (!ref) throw new Error('unknown_vm');

  const conn = await sshConnect(cfg);
  try {
    const xml = await sshExec(conn, `virsh dumpxml --security-info ${shq(ref)}`);
    learnVmOs(id, xml); // OS beim Konsolen-Oeffnen mitlernen
    const g = parseVncGraphics(xml);
    if (!g) throw new Error('no_vnc_or_not_running');
    _vncCache.set(id, { ts: Date.now(), data: g });
    return g;
  } finally {
    try { conn.end(); } catch (_) {}
  }
}

app.get('/api/vm/vnc-info', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const id = String(req.query.id || '');
  if (!id) return res.json({ ok: false, error: 'missing_id' });
  try {
    const g = await getVncGraphics(id);
    // Passwort noetig, damit noVNC die RFB-Challenge beantworten kann (LAN, same-origin).
    res.json({ ok: true, hasPassword: !!g.password, password: g.password || '' });
  } catch (e) {
    if (e.code === 'not_configured') return res.json({ ok: false, error: 'not_configured' });
    console.error('VNC-Info fehlgeschlagen:', e.message);
    res.json({ ok: false, error: 'unavailable', message: e.message });
  }
});

// Erste "echte" IPv4 aus virsh-domifaddr-Output (Loopback/Link-Local ueberspringen).
function parseGuestIpv4(text) {
  const ips = String(text).match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [];
  return ips.find((ip) => !/^127\./.test(ip) && !/^169\.254\./.test(ip) && ip !== '0.0.0.0') || null;
}
function isValidRdpHost(h) { return /^[a-zA-Z0-9.\-]{1,255}$/.test(h); }

// RDP: erzeugt eine .rdp-Datei fuer eine (Windows-)VM. Host = manuelle
// Uebersteuerung, sonst per SSH (virsh domifaddr) ermittelt.
app.get('/api/vm/rdp', async (req, res) => {
  const id = String(req.query.id || '');
  if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });

  const vmcfg = readVmCfg()[id] || {};
  let host = String(vmcfg.rdpHost || '').trim();

  let name = 'vm';
  const vmEntry = ((cache.unraid.data && cache.unraid.data.vms) || []).find((v) => v.id === id);
  if (vmEntry && vmEntry.name) name = vmEntry.name;

  if (!host) {
    const sshCfg = unraidSshCfg();
    const ref = await resolveVmRef(id);
    if (sshCfg && ref) {
      try {
        const conn = await sshConnect(sshCfg);
        try {
          let out = '';
          try { out = await sshExec(conn, `virsh domifaddr ${shq(ref)} --source agent`); } catch (_) {}
          host = parseGuestIpv4(out) || '';
          if (!host) {
            try { out = await sshExec(conn, `virsh domifaddr ${shq(ref)} --source lease`); } catch (_) {}
            host = parseGuestIpv4(out) || '';
          }
        } finally { try { conn.end(); } catch (_) {} }
      } catch (_) { /* faellt unten auf needs_host */ }
    }
  }

  if (!host || !isValidRdpHost(host)) return res.json({ ok: false, error: 'needs_host' });

  const lines = ['full address:s:' + host + ':3389'];
  if (vmcfg.rdpUser) lines.push('username:s:' + String(vmcfg.rdpUser).replace(/[\r\n]/g, ''));
  lines.push('prompt for credentials:i:1', 'screen mode id:i:2', 'use multimon:i:0', 'authentication level:i:2');
  const rdp = lines.join('\r\n') + '\r\n';

  const safeName = (name.replace(/[^a-zA-Z0-9 _.\-]/g, '_').slice(0, 40) || 'vm');
  res.set('Content-Type', 'application/x-rdp');
  res.set('Content-Disposition', `attachment; filename="${safeName}.rdp"`);
  res.send(rdp);
});

// Websockify: Browser-WebSocket <-> SSH-Tunnel zum QEMU-VNC-Port (roher RFB).
const vncWss = new WebSocketServer({ noServer: true, perMessageDeflate: false });
async function handleVncWs(ws, id) {
  const cfg = unraidSshCfg();
  if (!cfg) { try { ws.close(1011, 'not_configured'); } catch (_) {} return; }

  let conn = null, stream = null, closed = false;
  const cleanup = () => {
    closed = true;
    try { if (ws.readyState === ws.OPEN) ws.close(); } catch (_) {}
    try { if (stream) stream.destroy(); } catch (_) {}
    try { if (conn) conn.end(); } catch (_) {}
  };

  // Message-Listener sofort registrieren und fruehe Bytes puffern, damit
  // waehrend des SSH-Setups gesendete Daten nicht verloren gehen.
  const pending = [];
  ws.on('message', (data) => { if (stream) { try { stream.write(data); } catch (_) {} } else pending.push(data); });
  ws.on('close', cleanup);
  ws.on('error', cleanup);

  try {
    const g = await getVncGraphics(id);
    conn = await sshConnect(cfg);
    stream = await new Promise((resolve, reject) => {
      conn.forwardOut('127.0.0.1', 0, '127.0.0.1', g.vncPort, (err, s) => err ? reject(err) : resolve(s));
    });
  } catch (e) {
    console.error('VNC-Tunnel fehlgeschlagen:', e.message);
    try { ws.close(1011, String(e.message || 'error').slice(0, 60)); } catch (_) {}
    if (conn) { try { conn.end(); } catch (_) {} }
    return;
  }
  if (closed) { cleanup(); return; } // ws bereits waehrend Setup geschlossen

  stream.on('data',  (d) => { try { if (ws.readyState === ws.OPEN) ws.send(d); } catch (_) {} });
  stream.on('close', cleanup);
  stream.on('error', cleanup);
  for (const d of pending) { try { stream.write(d); } catch (_) {} }
  pending.length = 0;
}

// Healthcheck fuer Docker / Monitoring
app.get('/healthz', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (_) { socket.destroy(); return; }
  if (url.pathname === '/api/vm/vnc-ws') {
    try { socket.setNoDelay(true); } catch (_) {} // Eingabe-Latenz senken (kein Nagle)
    const id = url.searchParams.get('id') || '';
    vncWss.handleUpgrade(req, socket, head, (ws) => handleVncWs(ws, id));
  } else {
    socket.destroy();
  }
});
server.listen(PORT, () => {
  console.log(`Homelab Dashboard running on http://localhost:${PORT}`);
  console.log(`Config: ${CONFIG_PATH}`);
});
