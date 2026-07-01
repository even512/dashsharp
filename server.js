'use strict';

const express = require('express');
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

function readDiskCfg() {
  try {
    const d = JSON.parse(fs.readFileSync(DISKS_CFG_PATH, 'utf8'));
    return { labels: (d && d.labels && typeof d.labels === 'object') ? d.labels : {} };
  } catch { return { labels: {} }; }
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
};
const GLANCES_TTL   = 2000;   // ms – Glances-Metriken hoechstens 1x/2s abrufen
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
    cache.glances = { ts: Date.now(), data: result };
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

const SECRETS_KEYS = ['GLANCES_URL', 'GLANCES_LABEL', 'ADGUARD_URL', 'ADGUARD_USER', 'ADGUARD_PASS', 'PLEX_URL', 'PLEX_TOKEN', 'WEATHER_CITY', 'WEATHER_UNIT', 'UNIFI_API_KEY', 'UNIFI_HOST_ID', 'UNIFI_CAMERA_ID', 'NEXTCLOUD_URL', 'NEXTCLOUD_USER', 'NEXTCLOUD_PASS', 'NEXTCLOUD_SHARE_PATH'];
const SECRETS_MASKED = new Set(['ADGUARD_PASS', 'PLEX_TOKEN', 'UNIFI_API_KEY', 'NEXTCLOUD_PASS']);

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

// Healthcheck fuer Docker / Monitoring
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Homelab Dashboard running on http://localhost:${PORT}`);
  console.log(`Config: ${CONFIG_PATH}`);
});
