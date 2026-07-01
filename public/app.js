'use strict';

/* ---------- Icon database ---------- */
const ICON_CDN = 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons@main/png/';
const ICON_DB = [
  // Media & Streaming
  { id:'plex',              name:'Plex',              cat:'Media' },
  { id:'jellyfin',          name:'Jellyfin',          cat:'Media' },
  { id:'emby',              name:'Emby',              cat:'Media' },
  { id:'kodi',              name:'Kodi',              cat:'Media' },
  { id:'navidrome',         name:'Navidrome',         cat:'Media' },
  { id:'audiobookshelf',    name:'Audiobookshelf',    cat:'Media' },
  { id:'kavita',            name:'Kavita',            cat:'Media' },
  { id:'komga',             name:'Komga',             cat:'Media' },
  { id:'calibre',           name:'Calibre',           cat:'Media' },
  { id:'calibre-web',       name:'Calibre Web',       cat:'Media' },
  { id:'stremio',           name:'Stremio',           cat:'Media' },
  { id:'tautulli',          name:'Tautulli',          cat:'Media' },
  // *arr Stack
  { id:'radarr',            name:'Radarr',            cat:'*arr' },
  { id:'sonarr',            name:'Sonarr',            cat:'*arr' },
  { id:'lidarr',            name:'Lidarr',            cat:'*arr' },
  { id:'readarr',           name:'Readarr',           cat:'*arr' },
  { id:'prowlarr',          name:'Prowlarr',          cat:'*arr' },
  { id:'bazarr',            name:'Bazarr',            cat:'*arr' },
  { id:'overseerr',         name:'Overseerr',         cat:'*arr' },
  { id:'jackett',           name:'Jackett',           cat:'*arr' },
  { id:'whisparr',          name:'Whisparr',          cat:'*arr' },
  // Download-Clients
  { id:'qbittorrent',       name:'qBittorrent',       cat:'Downloads' },
  { id:'deluge',            name:'Deluge',            cat:'Downloads' },
  { id:'transmission',      name:'Transmission',      cat:'Downloads' },
  { id:'sabnzbd',           name:'SABnzbd',           cat:'Downloads' },
  { id:'nzbget',            name:'NZBGet',            cat:'Downloads' },
  { id:'jdownloader-2',     name:'JDownloader',       cat:'Downloads' },
  // Home Automation
  { id:'home-assistant',    name:'Home Assistant',    cat:'Automation' },
  { id:'node-red',          name:'Node-RED',          cat:'Automation' },
  { id:'esphome',           name:'ESPHome',           cat:'Automation' },
  { id:'zigbee2mqtt',       name:'Zigbee2MQTT',       cat:'Automation' },
  { id:'mosquitto',         name:'Mosquitto',         cat:'Automation' },
  { id:'matter',            name:'Matter',            cat:'Automation' },
  // Network
  { id:'pi-hole',           name:'Pi-hole',           cat:'Network' },
  { id:'adguard-home',      name:'AdGuard Home',      cat:'Network' },
  { id:'nginx-proxy-manager', name:'Nginx Proxy Mgr', cat:'Network' },
  { id:'traefik',           name:'Traefik',           cat:'Network' },
  { id:'cloudflare',        name:'Cloudflare',        cat:'Network' },
  { id:'wireguard',         name:'WireGuard',         cat:'Network' },
  { id:'tailscale',         name:'Tailscale',         cat:'Network' },
  { id:'opnsense',          name:'OPNsense',          cat:'Network' },
  { id:'pfsense',           name:'pfSense',           cat:'Network' },
  { id:'unifi',             name:'UniFi',             cat:'Network' },
  // Infrastructure
  { id:'unraid',            name:'Unraid',            cat:'Infra' },
  { id:'proxmox',           name:'Proxmox',           cat:'Infra' },
  { id:'truenas',           name:'TrueNAS',           cat:'Infra' },
  { id:'truenas-scale',     name:'TrueNAS Scale',     cat:'Infra' },
  { id:'portainer',         name:'Portainer',         cat:'Infra' },
  { id:'docker',            name:'Docker',            cat:'Infra' },
  { id:'synology-dsm',      name:'Synology DSM',      cat:'Infra' },
  { id:'openmediavault',    name:'OpenMediaVault',    cat:'Infra' },
  // Monitoring
  { id:'grafana',           name:'Grafana',           cat:'Monitoring' },
  { id:'prometheus',        name:'Prometheus',        cat:'Monitoring' },
  { id:'glances',           name:'Glances',           cat:'Monitoring' },
  { id:'uptime-kuma',       name:'Uptime Kuma',       cat:'Monitoring' },
  { id:'netdata',           name:'Netdata',           cat:'Monitoring' },
  { id:'zabbix',            name:'Zabbix',            cat:'Monitoring' },
  { id:'alertmanager',      name:'Alertmanager',      cat:'Monitoring' },
  // Storage & Files
  { id:'nextcloud',         name:'Nextcloud',         cat:'Storage' },
  { id:'syncthing',         name:'Syncthing',         cat:'Storage' },
  { id:'filebrowser',       name:'File Browser',      cat:'Storage' },
  { id:'minio',             name:'MinIO',             cat:'Storage' },
  { id:'seafile',           name:'Seafile',           cat:'Storage' },
  { id:'duplicati',         name:'Duplicati',         cat:'Storage' },
  // Photos
  { id:'immich',            name:'Immich',            cat:'Photos' },
  { id:'photoprism',        name:'PhotoPrism',        cat:'Photos' },
  { id:'photoview',         name:'Photoview',         cat:'Photos' },
  // Security & Auth
  { id:'vaultwarden',       name:'Vaultwarden',       cat:'Security' },
  { id:'bitwarden',         name:'Bitwarden',         cat:'Security' },
  { id:'authentik',         name:'Authentik',         cat:'Security' },
  { id:'authelia',          name:'Authelia',          cat:'Security' },
  { id:'keycloak',          name:'Keycloak',          cat:'Security' },
  { id:'crowdsec',          name:'CrowdSec',          cat:'Security' },
  // Dev & Git
  { id:'gitea',             name:'Gitea',             cat:'Dev' },
  { id:'gitlab',            name:'GitLab',            cat:'Dev' },
  { id:'forgejo',           name:'Forgejo',           cat:'Dev' },
  { id:'code-server',       name:'Code Server',       cat:'Dev' },
  { id:'jenkins',           name:'Jenkins',           cat:'Dev' },
  { id:'drone',             name:'Drone CI',          cat:'Dev' },
  // Productivity
  { id:'paperless-ngx',     name:'Paperless-ngx',     cat:'Productivity' },
  { id:'mealie',            name:'Mealie',            cat:'Productivity' },
  { id:'bookstack',         name:'BookStack',         cat:'Productivity' },
  { id:'freshrss',          name:'FreshRSS',          cat:'Productivity' },
  { id:'joplin',            name:'Joplin',            cat:'Productivity' },
  { id:'wikijs',            name:'Wiki.js',           cat:'Productivity' },
  { id:'grocy',             name:'Grocy',             cat:'Productivity' },
  { id:'wordpress',         name:'WordPress',         cat:'Productivity' },
  { id:'n8n',               name:'n8n',               cat:'Productivity' },
  { id:'changedetection',   name:'Changedetection',   cat:'Productivity' },
  { id:'ntfy',              name:'ntfy',              cat:'Productivity' },
  // Databases
  { id:'postgresql',        name:'PostgreSQL',        cat:'Database' },
  { id:'mariadb',           name:'MariaDB',           cat:'Database' },
  { id:'mysql',             name:'MySQL',             cat:'Database' },
  { id:'redis',             name:'Redis',             cat:'Database' },
  { id:'influxdb',          name:'InfluxDB',          cat:'Database' },
  { id:'mongodb',           name:'MongoDB',           cat:'Database' },
];

let _iconPickInput = null;
let _iconPickWrap  = null;
let _iconActiveCat = 'All';

function openIconPicker(inputEl, wrapEl) {
  _iconPickInput = inputEl;
  _iconPickWrap  = wrapEl;
  _iconActiveCat = 'All';
  const el = $('iconPicker');
  if (!el) return;
  $('iconSearchInput').value = '';
  renderIconCats();
  renderIconGrid('', 'All');
  el.style.display = 'flex';
  setTimeout(() => $('iconSearchInput')?.focus(), 60);
}
function closeIconPicker() {
  const el = $('iconPicker');
  if (el) el.style.display = 'none';
  _iconPickInput = null;
  _iconPickWrap  = null;
}
function clearPickedIcon() {
  if (!_iconPickInput || !_iconPickWrap) return;
  _iconPickInput.value = '';
  _rebuildIconWrap(_iconPickWrap, _iconPickInput, '');
  closeIconPicker();
}
function filterIcons(term) { renderIconGrid(term, _iconActiveCat); }
function pickIconCat(cat) {
  _iconActiveCat = cat;
  document.querySelectorAll('.icon-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  renderIconGrid($('iconSearchInput')?.value || '', cat);
}
function renderIconCats() {
  const bar = $('iconCatBar');
  if (!bar) return;
  const cats = ['All', ...new Set(ICON_DB.map(i => i.cat))];
  bar.innerHTML = '';
  for (const cat of cats) {
    const btn = document.createElement('button');
    btn.className = 'icon-cat-btn' + (cat === _iconActiveCat ? ' active' : '');
    btn.dataset.cat = cat;
    btn.textContent = cat;
    btn.onclick = () => pickIconCat(cat);
    bar.appendChild(btn);
  }
}
function renderIconGrid(term, cat) {
  const grid = $('iconGrid');
  if (!grid) return;
  const q = term.toLowerCase();
  const list = ICON_DB.filter(ic => {
    const inCat  = cat === 'All' || ic.cat === cat;
    const inTerm = !q || ic.name.toLowerCase().includes(q) || ic.id.includes(q);
    return inCat && inTerm;
  });
  grid.innerHTML = '';
  for (const ic of list) {
    const url  = ICON_CDN + ic.id + '.png';
    const item = document.createElement('div');
    item.className = 'icon-item' + (_iconPickInput?.value === url ? ' selected' : '');
    const img = document.createElement('img');
    img.src = url; img.alt = ic.name; img.loading = 'lazy';
    img.onerror = () => { item.style.display = 'none'; };
    const lbl = document.createElement('span');
    lbl.textContent = ic.name;
    item.appendChild(img); item.appendChild(lbl);
    item.onclick = () => selectPickedIcon(url);
    grid.appendChild(item);
  }
}
function selectPickedIcon(url) {
  if (!_iconPickInput || !_iconPickWrap) return;
  _iconPickInput.value = url;
  _rebuildIconWrap(_iconPickWrap, _iconPickInput, url);
  closeIconPicker();
}
function _rebuildIconWrap(wrap, hiddenInput, val) {
  wrap.innerHTML = '';
  wrap.appendChild(hiddenInput);
  const isImg = val && (/^https?:\/\//.test(val) || /\.(png|svg|jpe?g|webp|gif)$/i.test(val));
  if (isImg) {
    const img = document.createElement('img');
    img.src = val; img.alt = '';
    img.style.cssText = 'width:28px;height:28px;object-fit:contain;border-radius:5px';
    img.onerror = () => { img.style.display = 'none'; };
    wrap.appendChild(img);
  } else {
    const txt = document.createElement('span');
    txt.style.cssText = "font:700 13px 'Space Grotesk',sans-serif;color:#7a8fa8";
    txt.textContent = val || '+';
    wrap.appendChild(txt);
  }
}

/* ------------------------------------------------------------------
   State. System values now come LIVE from Glances
   (backend proxy /api/glances). If Glances goes down, the last
   values are kept and the system panel shows "glances offline".
------------------------------------------------------------------ */
const state = {
  cpu: 0, ram: 0, cpuTemp: null,
  netDown: 0, netUp: 0,
  cpuHist: new Array(46).fill(0),
  ramHist: new Array(46).fill(0),
  netHist: new Array(40).fill(0),
  upHist: new Array(40).fill(0),
  dispDown: 0, dispUpVal: 0,
  netMaxDisp: 10, lastSampleTs: 0,
  liveOn: true, gridOn: true, animOn: true, glassOn: true, searchOn: true,
  updateMs: 1600, accent: '#5b9dff',
  settingsTab: 'darstellung',
  layoutEditOn: false,
  searchEngine: 'https://duckduckgo.com/?q=',
};

let clockTimer = null;
let dataTimer = null;
let dockerTimer = null;
let adguardTimer = null;
let plexTimer = null;
let statusTimer = null;
let weatherTimer = null;
let unifiTimer = null;
let unifiSnapTimer = null;
let nextcloudTimer = null;

const UNIFI_POLL_MS = 10000;
const UNIFI_SNAP_MS = 30000;
let _unifiState = null;
let seeded = false;

const STATUS_POLL_MS  = 30000;
const WEATHER_POLL_MS = 600000; // 10 min — weather changes slowly

let _weatherUnit = 'C';

/* ---------- small helpers ---------- */
const $ = (id) => document.getElementById(id);
function setText(id, v) { const el = $(id); if (el) el.textContent = v; }
function setAttr(id, a, v) { const el = $(id); if (el) el.setAttribute(a, v); }
function hexA(hex, a) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtSize(bytes) {
  const tb = (bytes || 0) / 1e12;
  if (tb >= 1) return (Math.round(tb * 10) / 10) + ' TB';
  const gb = (bytes || 0) / 1e9;
  return Math.round(gb) + ' GB';
}

/* ---------- Clock & greeting ---------- */
function tickClock() {
  const d = new Date();
  const h = d.getHours();
  const greeting = h < 5 ? 'still up?' : h < 11 ? 'good morning' : h < 18 ? 'good afternoon' : 'good evening';
  setText('time', d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
  setText('date', d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  setText('greeting', greeting);
}

/* ---------- Gauges & Sparklines ---------- */
const CIRC = 2 * Math.PI * 46;
function dash(p) { return `${(p / 100 * CIRC).toFixed(1)} ${(CIRC - p / 100 * CIRC + 0.5).toFixed(1)}`; }
// Sparkline that continuously scrolls left: the parameter p (0..1) is the
// progress since the last sample. Each point is shifted left by p*step;
// the current value is held at the right edge. On sample change
// (p jumps 1→0 while the array shifts by one) the transition is
// seamless → smooth 60fps motion instead of hard jumps.
function flowSpark(arr, w, h, max, pad, p) {
  const n = arr.length;
  const mx = (max || Math.max(...arr) * 1.15) || 1;
  const pd = pad || 0;
  const eff = h - pd;
  const step = w / (n - 1);
  const prog = p || 0;
  const y = (v) => (pd + eff - (v / mx) * eff);
  let s = '';
  for (let i = 0; i < n; i++) s += `${((i - prog) * step).toFixed(1)},${y(arr[i]).toFixed(1)} `;
  return s + `${w},${y(arr[n - 1]).toFixed(1)}`; // right edge: hold current value
}
function flowArea(arr, w, h, max, pad, p) {
  const step = w / (arr.length - 1);
  const x0 = (-(p || 0) * step).toFixed(1);
  return `${x0},${h} ${flowSpark(arr, w, h, max, pad, p)} ${w},${h}`;
}
function fmtNet(v) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10)  return v.toFixed(1);
  return v.toFixed(2);
}
function push(arr, v) { const a = arr.slice(1); a.push(v); return a; }

function renderData() {
  // Only rings + values (which run smoothly via CSS transition).
  // The line graphs are drawn continuously in the rAF loop.
  setText('cpuVal', Math.round(state.cpu));
  setText('ramVal', Math.round(state.ram));
  setText('cpuTemp', state.cpuTemp != null ? state.cpuTemp : '–');
  setAttr('cpuArc', 'stroke-dasharray', dash(state.cpu));
  setAttr('ramArc', 'stroke-dasharray', dash(state.ram));
}

/* ---------- Graphs: one shared rAF loop for smooth scrolling ----------
   CPU/RAM and network lines are redrawn every frame and scroll time-based
   continuously to the left (see flowSpark). The big network numbers count
   up smoothly, the network scale is smoothed. With animations disabled,
   values are set immediately. */
let graphRafStarted = false;
function graphFrame() {
  const anim = state.animOn;
  const interval = state.updateMs || 1600;
  const p = anim ? Math.min(1, Math.max(0, (performance.now() - state.lastSampleTs) / interval)) : 1;

  // System: CPU + RAM (feste Skala 0..100)
  setAttr('cpuArea', 'points', flowArea(state.cpuHist, 460, 64, 100, 0, p));
  setAttr('cpuLine', 'points', flowSpark(state.cpuHist, 460, 64, 100, 0, p));
  setAttr('ramLine', 'points', flowSpark(state.ramHist, 460, 64, 100, 0, p));

  // Network: auto-scaled, scale eases toward target (prevents height jumps)
  const targetMax = Math.max(10, Math.max(...state.netHist, ...state.upHist) * 1.15);
  state.netMaxDisp += (targetMax - state.netMaxDisp) * (anim ? 0.08 : 1);
  const nm = state.netMaxDisp || targetMax;
  setAttr('netArea', 'points', flowArea(state.netHist, 380, 80, nm, 6, p));
  setAttr('netLine', 'points', flowSpark(state.netHist, 380, 80, nm, 6, p));
  setAttr('upLine',  'points', flowSpark(state.upHist,  380, 80, nm, 6, p));

  // Smoothly count up the big ↓/↑ numbers
  const k = anim ? 0.12 : 1;
  state.dispDown  += (state.netDown - state.dispDown) * k;
  state.dispUpVal += (state.netUp   - state.dispUpVal) * k;
  if (Math.abs(state.netDown - state.dispDown)  < 0.04) state.dispDown  = state.netDown;
  if (Math.abs(state.netUp   - state.dispUpVal) < 0.04) state.dispUpVal = state.netUp;
  setText('netDown', fmtNet(state.dispDown));
  setText('netUp', fmtNet(state.dispUpVal));

  requestAnimationFrame(graphFrame);
}
function startGraphAnim() {
  if (graphRafStarted) return;
  graphRafStarted = true;
  requestAnimationFrame(graphFrame);
}

/* ---------- Storage tiles (disks) ----------
   Bars always keep the nice blue→green gradient; "nearly full" is only signaled
   via glow/pulse + warning color on the value & HDD icon (Settings: labels). */
const DISK_WARN = 85, DISK_CRIT = 95;
function diskIsSsd(d) {
  const s = `${d.label || ''} ${d.name || ''} ${d.mnt || ''} ${d.fsType || ''}`.toLowerCase();
  return /nvme|ssd|cache|flash|m\.?2/.test(s);
}
function diskIconSvg(d, color) {
  const c = color || '#6b7689';
  if (diskIsSsd(d)) {
    return `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round">` +
      `<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><line x1="5" y1="6" x2="11" y2="6"/>` +
      `<line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="10.2" x2="9" y2="10.2"/></svg>`;
  }
  return `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="${c}" stroke-width="1.3">` +
    `<rect x="1.5" y="3.5" width="13" height="9" rx="2"/><circle cx="8" cy="8" r="2.3"/>` +
    `<circle cx="8" cy="8" r="0.5" fill="${c}" stroke="none"/><line x1="11.4" y1="10.6" x2="12.2" y2="10.6" stroke-linecap="round"/></svg>`;
}
function renderDisks(disks, total) {
  const grid = $('diskGrid');
  if (grid) {
    grid.innerHTML = '';
    for (const d of disks) {
      const pct = Math.min(100, Math.max(0, d.percent || 0));
      const warnCls = pct >= DISK_CRIT ? 'disk-crit' : pct >= DISK_WARN ? 'disk-warn' : '';
      const accent  = pct >= DISK_CRIT ? '#f43f5e' : pct >= DISK_WARN ? '#ffb454' : null;
      const name = d.label || d.name;
      const wrap = document.createElement('div');
      if (warnCls) wrap.className = warnCls;
      wrap.innerHTML =
        `<div style="display:flex;align-items:center;gap:7px;font:500 11px 'JetBrains Mono',monospace;margin-bottom:5px">` +
          `<span style="flex-shrink:0;display:flex">${diskIconSvg(d, accent)}</span>` +
          `<span style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${name}<span style="color:var(--text-3)"> · ${d.fsType}</span></span>` +
          `<span style="margin-left:auto;flex-shrink:0;color:${accent || 'var(--text-3)'}">${fmtSize(d.usedBytes)} / ${fmtSize(d.sizeBytes)}</span>` +
        `</div>` +
        `<div class="disk-track"><div class="disk-fill" style="width:${pct}%"></div></div>`;
      grid.appendChild(wrap);
    }
  }
  if (total) setText('diskTotalLabel', `${fmtSize(total.used)} / ${fmtSize(total.size)}`);
}

/* ---------- Glances polling ---------- */
function setHost(text, color) {
  const el = $('sysHost');
  if (el) { el.textContent = text; el.style.color = color; }
}
function applyMetrics(d) {
  state.cpu = d.cpu != null ? d.cpu : state.cpu;
  state.ram = d.mem ? d.mem.percent : state.ram;
  state.cpuTemp = d.cpuTemp != null ? d.cpuTemp : state.cpuTemp;
  state.netDown = d.net ? d.net.rxMbit : 0;
  state.netUp = d.net ? d.net.txMbit : 0;
  if (d.net && d.net.iface) {
    setText('netHost', d.label || 'host');
    setText('netIface', d.net.iface);
    const sep = $('netIfaceSep'); if (sep) sep.style.display = '';
  }

  if (!seeded) {
    state.cpuHist = new Array(46).fill(state.cpu);
    state.ramHist = new Array(46).fill(state.ram);
    state.netHist = new Array(40).fill(state.netDown);
    state.upHist = new Array(40).fill(state.netUp);
    state.dispDown = state.netDown;
    state.dispUpVal = state.netUp;
    state.netMaxDisp = Math.max(10, Math.max(state.netDown, state.netUp) * 1.15);
    seeded = true;
  } else {
    state.cpuHist = push(state.cpuHist, state.cpu);
    state.ramHist = push(state.ramHist, state.ram);
    state.netHist = push(state.netHist, state.netDown);
    state.upHist = push(state.upHist, state.netUp);
  }
  state.lastSampleTs = performance.now(); // start time for frame-based scrolling

  renderData();
  renderDisks(d.disks || [], d.diskTotal);
  setHost(d.label || 'host', '#5b9dff');
  if (d.cores != null) setText('sysCores', d.cores);
  if (d.mem && d.mem.total) setText('sysRam', Math.round(d.mem.total / 1073741824) + ' GB');
}
async function pollGlances() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/glances', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      const msg = d && d.error === 'not_configured' ? 'glances not configured' : 'glances offline';
      setHost(msg, '#f43f5e');
      setText('glancesSettingsStatus', '● ' + msg);
      const gs = $('glancesSettingsStatus'); if (gs) gs.style.color = '#f43f5e';
      return;
    }
    applyMetrics(d);
    setText('glancesSettingsStatus', '● connected');
    const gs = $('glancesSettingsStatus'); if (gs) gs.style.color = '#3ddc97';
  } catch (err) {
    setHost('glances offline', '#f43f5e');
    setText('glancesSettingsStatus', '● offline');
    const gs = $('glancesSettingsStatus'); if (gs) gs.style.color = '#f43f5e';
    console.warn('Glances poll failed:', err.message);
  }
}
function startGlances() {
  clearInterval(dataTimer);
  pollGlances();
  dataTimer = setInterval(pollGlances, state.updateMs || 1600);
}

/* ---------- Docker (via Glances) ---------- */
const DOCKER_DOT = { running: '#3ddc97', paused: '#ffb454', stopped: '#f43f5e' };
function fmtMem(bytes) {
  const mb = (bytes || 0) / 1048576;
  if (mb >= 1024) return (mb / 1024).toFixed(1) + ' GB';
  return Math.round(mb) + ' MB';
}
function setDockerBadge(text, color) {
  const el = $('dockerVersion');
  if (!el) return;
  el.style.color = color;
  el.innerHTML = `<span style="width:6px;height:6px;border-radius:2px;background:${color}"></span>${text}`;
}
function renderDocker(d) {
  setDockerBadge(d.version ? 'v' + d.version : 'docker', '#5b9dff');
  setText('dockerCount', d.total != null ? d.total : '–');

  const parts = [`<span style="color:#3ddc97">${d.running} active</span>`];
  if (d.paused) parts.push(`<span style="color:#ffb454">${d.paused} paused</span>`);
  if (d.stopped) parts.push(`<span style="color:#6b7689">${d.stopped} stopped</span>`);
  const sum = $('dockerSummary');
  if (sum) sum.innerHTML = 'Container · ' + parts.join(' · ');

  const list = $('dockerList');
  if (!list) return;
  list.innerHTML = '';
  for (const c of (d.containers || [])) {
    const dot = DOCKER_DOT[c.state] || '#6b7689';
    const right = c.state === 'paused' ? 'paused'
      : c.state === 'stopped' ? 'stopped'
      : `${c.cpu != null ? c.cpu : 0}% · ${fmtMem(c.mem)}`;
    const row = document.createElement('div');
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;font:500 12px 'JetBrains Mono',monospace";
    row.innerHTML =
      `<div style="display:flex;align-items:center;gap:9px;min-width:0">` +
      `<span style="width:6px;height:6px;border-radius:50%;background:${dot};flex-shrink:0"></span>` +
      `<span style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</span></div>` +
      `<span style="color:var(--text-3);flex-shrink:0;padding-left:10px">${right}</span>`;
    list.appendChild(row);
  }
}
async function pollDocker() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/docker', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      const msg = d && d.error === 'not_configured' ? 'not configured' : 'offline';
      setDockerBadge(msg, '#f43f5e');
      setText('dockerSettingsStatus', '● ' + msg);
      const ds = $('dockerSettingsStatus'); if (ds) ds.style.color = '#f43f5e';
      return;
    }
    renderDocker(d);
    setText('dockerSettingsStatus', `● ${d.running ?? 0} active`);
    const ds = $('dockerSettingsStatus'); if (ds) ds.style.color = '#3ddc97';
  } catch (err) {
    setDockerBadge('offline', '#f43f5e');
    setText('dockerSettingsStatus', '● offline');
    const ds = $('dockerSettingsStatus'); if (ds) ds.style.color = '#f43f5e';
    console.warn('Docker poll failed:', err.message);
  }
}
const DOCKER_POLL_MS = 10000; // Container status rarely changes – 10s is enough.
function startDocker() {
  clearInterval(dockerTimer);
  pollDocker();
  dockerTimer = setInterval(pollDocker, DOCKER_POLL_MS);
}

/* ---------- AdGuard Home ---------- */
const ADGUARD_POLL_MS = 30000;
const ADGUARD_CIRC    = 251.3; // 2 * π * 40

function setAdguardStatus(text, color) {
  ['adguardStatus', 'adguardSettingsStatus'].forEach((id) => {
    const el = $(id);
    if (el) { el.textContent = '● ' + text; el.style.color = color; }
  });
}
function adguardDash(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  return `${(p / 100 * ADGUARD_CIRC).toFixed(1)} ${(ADGUARD_CIRC * (1 - p / 100)).toFixed(1)}`;
}
function fmtNum(n) {
  return n != null ? Math.round(n).toLocaleString('de-DE') : '–';
}
function renderAdGuard(d) {
  const color = d.protection ? '#3ddc97' : '#ffb454';
  setAdguardStatus(d.protection ? 'active' : 'paused', color);
  setText('adguardBlockPct', d.blockedPct != null ? d.blockedPct : '–');
  const arc = $('adguardArc');
  if (arc) {
    arc.setAttribute('stroke', color);
    arc.style.filter = `drop-shadow(0 0 5px ${hexA(color, 0.5)})`;
    arc.setAttribute('stroke-dasharray', adguardDash(d.blockedPct));
  }
  setText('adguardTotal', fmtNum(d.total));
  const blockedEl = $('adguardBlocked');
  if (blockedEl) { blockedEl.textContent = fmtNum(d.blocked); blockedEl.style.color = color; }
  setText('adguardAvgMs', d.avgMs != null ? d.avgMs.toFixed(1) : '–');
  setText('adguardTopDomain', d.topDomain || '–');
}
async function pollAdGuard() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/adguard', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      setAdguardStatus(d && d.error === 'not_configured' ? 'not configured' : 'offline', '#f43f5e');
      return;
    }
    renderAdGuard(d);
  } catch (err) {
    setAdguardStatus('offline', '#f43f5e');
    console.warn('AdGuard poll failed:', err.message);
  }
}
function startAdGuard() {
  clearInterval(adguardTimer);
  pollAdGuard();
  adguardTimer = setInterval(pollAdGuard, ADGUARD_POLL_MS);
}

/* ---------- Plex Media Server ---------- */
const PLEX_POLL_MS = 5000;
const PLEX_COLOR   = '#ff8a4c';

function fmtDuration(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function plexStreamLabel(t) {
  if (t === 'directplay')   return 'Direct Play';
  if (t === 'directstream') return 'Direct Stream';
  return 'Transcode';
}

const CODEC_MAP = {
  h264:'H.264', hevc:'HEVC', av1:'AV1', vp9:'VP9', vc1:'VC-1', mpeg2video:'MPEG-2', mpeg4:'MPEG-4',
  truehd:'TrueHD', dts:'DTS', dca:'DTS', eac3:'EAC3', ac3:'AC3', aac:'AAC',
  flac:'FLAC', mp3:'MP3', opus:'Opus', vorbis:'Vorbis',
};
function fmtCodec(c) {
  if (!c) return null;
  return CODEC_MAP[c.toLowerCase()] || c.toUpperCase();
}
function fmtAudioCh(n) {
  const m = { 1:'Mono', 2:'Stereo', 6:'5.1', 8:'7.1' };
  return m[n] || (n ? `${n}ch` : null);
}
function plexLocationColor(loc) {
  if (loc === 'lan')      return '#3ddc97';
  if (loc === 'wan')      return '#ffb454';
  if (loc === 'cellular') return '#f43f5e';
  return '#6b7689';
}
function plexSpeedColor(speed) {
  if (speed >= 1.5) return '#3ddc97';
  if (speed >= 0.8) return '#ffb454';
  return '#f43f5e';
}

function fmtBitrate(kbps) {
  if (!kbps) return null;
  if (kbps >= 1000) return (kbps / 1000).toFixed(1) + ' Mbps';
  return Math.round(kbps) + ' kbps';
}

// Quality tiers color-coded: 4K purple, 1080p green, 720p amber, below that red.
function plexResColor(r) {
  if (!r) return '#6b7689';
  const v = String(r).toUpperCase();
  if (v === '4K')    return '#8b6dff';
  if (v === '1080P') return '#3ddc97';
  if (v === '720P')  return '#ffb454';
  return '#f43f5e';
}

// Builds a row of colored tokens, separated by gray dots.
function plexInfoRow(tokens) {
  const row = document.createElement('div');
  row.style.cssText = "display:flex;align-items:center;gap:6px;margin-top:5px;font:500 11px 'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden";
  tokens.filter((t) => t && t.text).forEach((t, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.style.color = '#3f4a5c';
      sep.textContent = '·';
      row.appendChild(sep);
    }
    const span = document.createElement('span');
    span.style.color = t.color || '#6b7689';
    if (t.weight) span.style.fontWeight = t.weight;
    span.textContent = t.text;
    row.appendChild(span);
  });
  return row;
}

function setPlexStatus(text, color) {
  ['plexSettingsStatus'].forEach((id) => {
    const el = $(id);
    if (el) { el.textContent = '● ' + text; el.style.color = color; }
  });
}

function renderPlexSession(s) {
  const card = document.createElement('div');
  card.style.cssText = 'display:flex;gap:14px;align-items:flex-start';

  // Poster
  if (s.thumb) {
    const img = document.createElement('img');
    img.src = s.thumb;
    img.alt = '';
    img.style.cssText = 'width:52px;height:76px;border-radius:7px;object-fit:cover;flex-shrink:0;background:rgba(255,138,76,0.1)';
    img.onerror = function () {
      const ph = document.createElement('div');
      ph.style.cssText = 'width:52px;height:76px;border-radius:7px;flex-shrink:0;background:repeating-linear-gradient(135deg,rgba(255,138,76,0.18),rgba(255,138,76,0.18) 6px,rgba(255,138,76,0.08) 6px,rgba(255,138,76,0.08) 12px);border:1px solid rgba(255,138,76,0.22);display:flex;align-items:center;justify-content:center;font:600 7px \'JetBrains Mono\',monospace;color:#ff8a4c;text-align:center';
      ph.textContent = 'POSTER';
      this.replaceWith(ph);
    };
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.style.cssText = 'width:52px;height:76px;border-radius:7px;flex-shrink:0;background:repeating-linear-gradient(135deg,rgba(255,138,76,0.18),rgba(255,138,76,0.18) 6px,rgba(255,138,76,0.08) 6px,rgba(255,138,76,0.08) 12px);border:1px solid rgba(255,138,76,0.22);display:flex;align-items:center;justify-content:center;font:600 7px \'JetBrains Mono\',monospace;color:#ff8a4c;text-align:center';
    ph.textContent = 'POSTER';
    card.appendChild(ph);
  }

  // Textblock
  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0';

  // Title row: title/show on the left, user chip highlighted on the right
  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = "font:600 14px/1.25 'Space Grotesk',sans-serif;color:#eef3fa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0";
  titleEl.textContent = s.type === 'episode' && s.showTitle ? s.showTitle : s.title;
  titleRow.appendChild(titleEl);

  const userChip = document.createElement('span');
  userChip.style.cssText = "font:700 10px 'JetBrains Mono',monospace;color:#5b9dff;background:rgba(91,157,255,0.14);border-radius:5px;padding:3px 8px;flex-shrink:0;white-space:nowrap";
  userChip.textContent = s.user;
  titleRow.appendChild(userChip);

  txt.appendChild(titleRow);

  if (s.type === 'episode' && s.showTitle) {
    const sub = document.createElement('div');
    sub.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#8b97a8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    sub.textContent = (s.seasonEpisode ? s.seasonEpisode + ' · ' : '') + s.title;
    txt.appendChild(sub);
  }

  // Row 1: resolution · stream type · bitrate (+ transcode speed if relevant)
  const speedToken = (s.transcodeSpeed && s.streamType !== 'directplay')
    ? { text: `×${s.transcodeSpeed}`, color: plexSpeedColor(s.transcodeSpeed), weight: '700' }
    : null;
  txt.appendChild(plexInfoRow([
    { text: s.resolution || '?', color: plexResColor(s.resolution), weight: '700' },
    { text: plexStreamLabel(s.streamType), color: '#6b7689' },
    { text: fmtBitrate(s.bandwidth || s.bitrate), color: '#8b97a8' },
    speedToken,
  ]));

  // Row 2: video codec chain · audio codec chain
  const videoChain = (() => {
    if (!s.videoDisplayTitle) return null;
    if (s.videoDecision === 'transcode' && s.transVideoCodec) {
      return `${s.videoDisplayTitle} → ${fmtCodec(s.transVideoCodec)}`;
    }
    return s.videoDisplayTitle;
  })();
  const audioChain = (() => {
    if (!s.audioDisplayTitle) return null;
    if (s.audioDecision === 'transcode' && s.transAudioCodec) {
      const out = [fmtCodec(s.transAudioCodec), fmtAudioCh(s.transAudioCh)].filter(Boolean).join(' ');
      return `${s.audioDisplayTitle} → ${out}`;
    }
    return s.audioDisplayTitle;
  })();
  if (videoChain || audioChain) {
    txt.appendChild(plexInfoRow([
      { text: videoChain, color: '#8b97a8' },
      { text: audioChain, color: '#8b97a8' },
    ]));
  }

  // Row 3: device / app · network
  const locToken = s.location
    ? { text: s.location.toUpperCase(), color: plexLocationColor(s.location), weight: '700' }
    : null;
  txt.appendChild(plexInfoRow([
    { text: s.product || s.device, color: '#6b7689' },
    { text: s.platform && s.product && !s.product.toLowerCase().includes(s.platform.toLowerCase()) ? s.platform : null, color: '#6b7689' },
    locToken,
  ]));

  // Row 4: subtitle (only when active)
  if (s.subtitle) {
    txt.appendChild(plexInfoRow([
      { text: 'SUB', color: '#8b6dff', weight: '700' },
      { text: s.subtitle, color: '#6b7689' },
    ]));
  }

  // Progress – directly from the viewOffset reported by Plex
  const pct = s.duration > 0 ? Math.round(s.viewOffset / s.duration * 100) : 0;
  const barOuter = document.createElement('div');
  barOuter.style.cssText = 'height:3px;border-radius:3px;background:rgba(120,150,200,0.12);overflow:hidden';
  const barFill = document.createElement('div');
  barFill.style.cssText = `height:100%;width:${pct}%;border-radius:3px;background:${PLEX_COLOR}`;
  barOuter.appendChild(barFill);

  const stateSpan = s.state === 'playing' ? `<span style="color:${PLEX_COLOR}">▶ playing</span>`
    : s.state === 'paused' ? `<span style="color:#ffb454">⏸ paused</span>`
    : `<span style="color:#6b7689">↺ buffering</span>`;

  const timeRow = document.createElement('div');
  timeRow.style.cssText = "display:flex;justify-content:space-between;font:500 10px 'JetBrains Mono',monospace;color:#6b7689;margin-top:5px";
  timeRow.innerHTML = `<span>${fmtDuration(s.viewOffset)}</span>${stateSpan}<span>${fmtDuration(s.duration)}</span>`;

  const prog = document.createElement('div');
  prog.style.cssText = 'margin-top:10px';
  prog.append(barOuter, timeRow);
  txt.appendChild(prog);

  card.appendChild(txt);
  return card;
}

function renderPlex(d) {
  const lib = d.library || {};
  setText('plexLibStats',
    `${fmtNum(lib.movies)} Movies · ${fmtNum(lib.shows)} Shows · ${fmtNum(lib.episodes)} Eps`
  );
  setPlexStatus('connected', PLEX_COLOR);

  const container = $('plexSessions');
  if (!container) return;
  container.innerHTML = '';

  if (!d.sessions || !d.sessions.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:28px 0';
    empty.innerHTML = `<span style="font:500 11px 'JetBrains Mono',monospace;color:#3f4a5c">Nobody is streaming right now</span>`;
    container.appendChild(empty);
    return;
  }

  for (const s of d.sessions) {
    container.appendChild(renderPlexSession(s));
  }
}

async function pollPlex() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/plex', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      setPlexStatus(d && d.error === 'not_configured' ? 'not configured' : 'offline', '#f43f5e');
      setText('plexLibStats', '–');
      return;
    }
    renderPlex(d);
  } catch (err) {
    setPlexStatus('offline', '#f43f5e');
    console.warn('Plex poll failed:', err.message);
  }
}

function startPlex() {
  clearInterval(plexTimer);
  pollPlex();
  plexTimer = setInterval(pollPlex, PLEX_POLL_MS);
}

/* ---------- Service status ---------- */
function renderServiceStatus(d) {
  const allOk = d.total > 0 && d.online === d.total;
  const anyDown = d.total > 0 && d.online < d.total;

  // Tile header badge
  const countEl = $('serviceCount');
  if (countEl) {
    countEl.textContent = d.total > 0 ? `${d.online}/${d.total} ▲` : '– / –';
    countEl.style.color = allOk ? '#3ddc97' : anyDown ? '#f43f5e' : '#6b7689';
  }

  // Tile service list
  const list = $('serviceList');
  if (list) {
    list.innerHTML = '';
    if (!d.total) {
      const em = document.createElement('div');
      em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:12px 4px;text-align:center";
      em.textContent = 'No services configured';
      list.appendChild(em);
    } else {
      d.services.forEach((s, i) => {
        const dotColor = s.online ? '#3ddc97' : '#f43f5e';
        const msText = s.online && s.responseMs != null ? `${s.responseMs} ms` : 'offline';
        const msColor = s.online ? '#6b7689' : '#f43f5e';
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 4px;' +
          (i < d.services.length - 1 ? 'border-bottom:1px solid rgba(120,150,200,0.06)' : '');
        row.innerHTML =
          `<div style="display:flex;align-items:center;gap:10px">` +
          `<span style="width:7px;height:7px;border-radius:50%;background:${dotColor};flex-shrink:0;` +
          (s.online ? `box-shadow:0 0 6px ${dotColor}` : '') + `"></span>` +
          `<span style="font:500 12px 'JetBrains Mono',monospace;color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${s.name}</span>` +
          `</div><span style="font:500 11px 'JetBrains Mono',monospace;color:${msColor};flex-shrink:0">${msText}</span>`;
        list.appendChild(row);
      });
    }
  }

  // Header badge (top right of dashboard)
  if (d.total > 0) {
    const badge = $('systemStatusBadge');
    const dot   = $('systemStatusDot');
    const txt   = $('systemStatusText');
    const sub   = $('systemStatusSub');
    const col   = allOk ? '#3ddc97' : '#f43f5e';
    const bgCol = allOk ? 'rgba(61,220,151,0.07)' : 'rgba(244,63,94,0.07)';
    const brd   = allOk ? 'rgba(61,220,151,0.22)' : 'rgba(244,63,94,0.28)';
    if (badge) { badge.style.background = bgCol; badge.style.borderColor = brd; }
    if (dot)   { dot.style.background = col; dot.style.animationPlayState = allOk ? 'running' : 'paused'; }
    if (txt)   { txt.textContent = allOk ? 'All systems online' : `${d.total - d.online} service${d.total - d.online !== 1 ? 's' : ''} offline`; }
    if (sub)   { sub.textContent = `${d.total} services`; sub.style.color = allOk ? '#6b8a78' : '#9b6b78'; }
  }
}

async function pollServiceStatus() {
  if (!state.liveOn) return;
  try {
    const d = await fetch('/api/status', { cache: 'no-store' }).then((r) => r.json());
    renderServiceStatus(d);
  } catch { /* keep last known state */ }
}

function startServiceStatus() {
  clearInterval(statusTimer);
  pollServiceStatus();
  statusTimer = setInterval(pollServiceStatus, STATUS_POLL_MS);
}

function renderStatusSettingsList(services) {
  const el = $('statusServiceList');
  if (!el) return;
  el.innerHTML = '';
  if (!services.length) {
    const em = document.createElement('div');
    em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:8px 4px";
    em.textContent = 'No services added yet.';
    el.appendChild(em);
    return;
  }
  services.forEach((s, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 4px;border-bottom:1px solid rgba(120,150,200,0.06)';
    row.innerHTML =
      `<span style="font:500 11px 'JetBrains Mono',monospace;color:#dde5f0;flex:0 0 auto">${s.name}</span>` +
      `<span style="font:500 10px 'JetBrains Mono',monospace;color:#6b7689;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.url}</span>` +
      `<button data-idx="${i}" style="background:none;border:none;color:#566073;cursor:pointer;font-size:14px;flex-shrink:0;padding:0 4px" title="Remove">✕</button>`;
    el.appendChild(row);
  });
}

let _statusServices = [];

async function setupStatusSettings() {
  try {
    const cfg = await fetch('/api/status/config', { cache: 'no-store' }).then((r) => r.json());
    _statusServices = cfg.services || [];
    renderStatusSettingsList(_statusServices);
  } catch { _statusServices = []; }

  const addBtn = $('statusAddBtn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const nameEl = $('statusServiceName');
      const urlEl  = $('statusServiceUrl');
      const name = (nameEl?.value || '').trim();
      const url  = (urlEl?.value  || '').trim();
      if (!name || !url) return;
      _statusServices = [..._statusServices, { name, url }];
      if (nameEl) nameEl.value = '';
      if (urlEl)  urlEl.value  = '';
      await saveStatusServices();
    });
  }

  const listEl = $('statusServiceList');
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-idx]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      _statusServices = _statusServices.filter((_, i) => i !== idx);
      await saveStatusServices();
    });
  }
}

async function saveStatusServices() {
  try {
    await fetch('/api/status/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: _statusServices }),
    });
    renderStatusSettingsList(_statusServices);
    pollServiceStatus();
  } catch (err) { console.error('Failed to save status config:', err); }
}

/* ---------- Disk labels (Settings) ---------- */
let _diskCfg = [];
async function loadDiskSettings() {
  const el = $('diskCfgList');
  if (!el) return;
  try {
    const d = await fetch('/api/disks', { cache: 'no-store' }).then((r) => r.json());
    _diskCfg = (d && d.disks) || [];
  } catch { _diskCfg = []; }
  renderDiskSettings();
}
function renderDiskSettings() {
  const el = $('diskCfgList');
  if (!el) return;
  el.innerHTML = '';
  if (!_diskCfg.length) {
    const em = document.createElement('div');
    em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:8px 4px";
    em.textContent = 'No drives detected (connect Glances).';
    el.appendChild(em);
    return;
  }
  _diskCfg.forEach((d) => {
    const pct = Math.min(100, Math.max(0, d.percent || 0));
    const accent = pct >= DISK_CRIT ? '#f43f5e' : pct >= DISK_WARN ? '#ffb454' : null;
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1.2fr) auto;gap:8px;align-items:center';
    const ico = document.createElement('span');
    ico.style.cssText = 'display:flex;flex-shrink:0';
    ico.innerHTML = diskIconSvg(d, accent);
    const meta = document.createElement('span');
    meta.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#8b97a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    meta.title = d.mnt || '';
    meta.textContent = `${d.name} · ${d.fsType}`;
    const input = document.createElement('input');
    input.className = 'cfg-input';
    input.placeholder = d.name;
    input.value = d.label || '';
    input.dataset.mnt = d.mnt;
    const size = document.createElement('span');
    size.style.cssText = "font:500 10px 'JetBrains Mono',monospace;color:" + (accent || 'var(--text-3)') + ";text-align:right;white-space:nowrap";
    size.textContent = fmtSize(d.sizeBytes);
    row.append(ico, meta, input, size);
    el.appendChild(row);
  });
}
async function saveDiskLabels() {
  const el = $('diskCfgList');
  if (!el) return;
  const labels = {};
  el.querySelectorAll('input[data-mnt]').forEach((inp) => {
    const v = inp.value.trim();
    if (v) labels[inp.dataset.mnt] = v;
  });
  try {
    await fetch('/api/disks/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ labels }),
    });
    pollGlances();        // render dashboard disks immediately with new labels
    loadDiskSettings();   // reload editor
  } catch (err) { console.error('Failed to save disk labels:', err); }
}

/* ---------- Weather (Open-Meteo, no API key needed) ---------- */
const WMO_DESC = {
  0: ['Clear', 'Clear (night)'],
  1: ['Partly cloudy', 'Partly cloudy'],
  2: ['Cloudy', 'Cloudy'],
  3: ['Overcast', 'Overcast'],
  45: ['Fog', 'Fog'],
  48: ['Rime fog', 'Rime fog'],
  51: ['Light drizzle', 'Light drizzle'],
  53: ['Drizzle', 'Drizzle'],
  55: ['Heavy drizzle', 'Heavy drizzle'],
  61: ['Light rain', 'Light rain'],
  63: ['Rain', 'Rain'],
  65: ['Heavy rain', 'Heavy rain'],
  71: ['Light snow', 'Light snow'],
  73: ['Snow', 'Snow'],
  75: ['Heavy snow', 'Heavy snow'],
  77: ['Ice pellets', 'Ice pellets'],
  80: ['Light rain showers', 'Light rain showers'],
  81: ['Rain showers', 'Rain showers'],
  82: ['Heavy rain showers', 'Heavy rain showers'],
  85: ['Snow showers', 'Snow showers'],
  86: ['Heavy snow showers', 'Heavy snow showers'],
  95: ['Thunderstorm', 'Thunderstorm'],
  96: ['Thunderstorm with hail', 'Thunderstorm with hail'],
  99: ['Severe thunderstorm', 'Severe thunderstorm'],
};

function wmoToDesc(code, isDay) {
  const e = WMO_DESC[code];
  if (e) return isDay ? e[0] : e[1];
  // Fallback for unlisted codes
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  return '–';
}

/* ---------- Weather icons: animated, filled inline SVG + glow ----------
   Types: sun, moon, psun/pmoon (partly cloudy), cloud, fog, drizzle,
   rain, snow, thunder. Animations via CSS classes (still under .no-anim). */
function wmoToType(code, isDay) {
  if (code === 0) return isDay ? 'sun' : 'moon';
  if (code === 1 || code === 2) return isDay ? 'psun' : 'pmoon';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloud';
}

const WI_GLOW = {
  sun:'rgba(255,170,70,0.55)',  moon:'rgba(165,185,215,0.4)',
  psun:'rgba(255,180,90,0.4)',  pmoon:'rgba(155,175,210,0.32)',
  cloud:'rgba(150,165,190,0.3)', fog:'rgba(150,165,190,0.26)',
  drizzle:'rgba(91,157,255,0.34)', rain:'rgba(91,157,255,0.45)',
  snow:'rgba(222,232,247,0.45)', thunder:'rgba(139,109,255,0.5)',
};

const WI_DEFS = `<defs>` +
  `<radialGradient id="wiSun" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffe7b0"/><stop offset="0.55" stop-color="#ffc463"/><stop offset="1" stop-color="#ff8a3c"/></radialGradient>` +
  `<linearGradient id="wiMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef4fd"/><stop offset="1" stop-color="#b4c2d8"/></linearGradient>` +
  `<linearGradient id="wiCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd7e6"/><stop offset="1" stop-color="#9aa7bc"/></linearGradient>` +
  `<linearGradient id="wiCloudDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b97ac"/><stop offset="1" stop-color="#5c6a80"/></linearGradient>` +
  `</defs>`;

function wiCloud(cls, fill, t) {
  return `<g class="${cls}" fill="${fill}"${t ? ` transform="${t}"` : ''}>` +
    `<circle cx="13.5" cy="22.5" r="5.5"/><circle cx="19" cy="18.5" r="7"/>` +
    `<circle cx="25" cy="22.5" r="5.5"/><rect x="8" y="22" width="22.5" height="7" rx="3.5"/></g>`;
}

function wiSun(cx, cy, r) {
  let rays = '';
  const n = 8, inner = r + 2.4, outer = r + 5.6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    rays += `<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}" x2="${(cx + Math.cos(a) * outer).toFixed(1)}" y2="${(cy + Math.sin(a) * outer).toFixed(1)}"/>`;
  }
  return `<g class="wi-spin" stroke="#ffcf72" stroke-width="2.1" stroke-linecap="round">${rays}</g>` +
    `<circle class="wi-pulse" cx="${cx}" cy="${cy}" r="${r}" fill="url(#wiSun)"/>`;
}

// Crescent moon path centered at (19,19), outer radius 8; scaled/moved via transform.
function wiMoon(cx, cy, scale) {
  const s = scale || 1;
  const tx = (cx - 19 * s).toFixed(2), ty = (cy - 19 * s).toFixed(2);
  return `<path class="wi-pulse" d="M27 19 a8 8 0 1 1 -8 -8 a6 6 0 1 0 8 8 z" fill="url(#wiMoon)" transform="translate(${tx} ${ty}) scale(${s})"/>`;
}

function wiDrops(color, count) {
  const xs = count <= 3 ? [13.5, 19, 24.5] : [12, 17.3, 22.6, 27.9];
  return xs.map((x, i) => `<line class="wi-drop" x1="${x}" y1="29.5" x2="${x}" y2="33.5" stroke="${color}" stroke-width="2" stroke-linecap="round" style="animation-delay:${(i * 0.28).toFixed(2)}s"/>`).join('');
}

function wiFlakes() {
  return [12.5, 18, 23.5, 28.5].map((x, i) => `<circle class="wi-flake" cx="${x}" cy="29.5" r="1.7" fill="#eef4fd" style="animation-delay:${(i * 0.55).toFixed(2)}s"/>`).join('');
}

function wiStars() {
  return `<g fill="#eef4fd">` +
    `<circle class="wi-star" cx="29" cy="11" r="1.4"/>` +
    `<circle class="wi-star" cx="32" cy="17" r="1" style="animation-delay:.7s"/>` +
    `<circle class="wi-star" cx="27" cy="6.5" r="0.9" style="animation-delay:1.3s"/></g>`;
}

function wiBody(type) {
  switch (type) {
    case 'sun':   return wiSun(19, 19, 7.3);
    case 'moon':  return wiMoon(18, 19, 1) + wiStars();
    case 'psun':  return wiSun(14, 13, 4.6) + wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 3)');
    case 'pmoon': return wiMoon(14, 12.5, 0.62) + wiStars() + wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 3)');
    case 'cloud': return `<g class="wi-cloud2" fill="#aeb9cb" opacity="0.7" transform="translate(4 -5) scale(0.62)"><circle cx="19" cy="19" r="8"/><circle cx="27" cy="21" r="6"/></g>` + wiCloud('wi-cloud', 'url(#wiCloud)');
    case 'fog':   return wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 -3)') +
      `<g class="wi-fog" stroke="#b3bfd0" stroke-width="2" stroke-linecap="round">` +
      `<line x1="9" y1="30" x2="29" y2="30"/><line x1="11" y1="34" x2="27" y2="34" style="animation-delay:.6s"/></g>`;
    case 'drizzle': return wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 -2.5)') + wiDrops('#8fc0f2', 3);
    case 'rain':    return wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 -2.5)') + wiDrops('#5b9dff', 4);
    case 'snow':    return wiCloud('wi-cloud', 'url(#wiCloud)', 'translate(0 -2.5)') + wiFlakes();
    case 'thunder': return wiCloud('wi-cloud', 'url(#wiCloudDark)', 'translate(0 -3)') +
      `<polygon class="wi-bolt" points="20.5,28 14.5,35 18.5,35 16,39.5 24.5,31.5 20,31.5 22.5,28" fill="#ffd24a"/>`;
    default:      return wiCloud('wi-cloud', 'url(#wiCloud)');
  }
}

function weatherIconSvg(type) {
  return `<svg class="wi" viewBox="0 0 38 38" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${WI_DEFS}${wiBody(type)}</svg>`;
}

function renderWeather(data) {
  const icon = $('weatherIcon');
  const temp = $('weatherTemp');
  const desc = $('weatherDesc');
  const st   = $('weatherSettingsStatus');

  if (!data || !data.configured) {
    if (temp) temp.textContent = '–°';
    if (desc) desc.textContent = 'Not configured';
    if (st)   { st.textContent = '● not configured'; st.style.color = '#6b7689'; }
    return;
  }
  if (data.error === 'city_not_found') {
    if (temp) temp.textContent = '–°';
    if (desc) desc.textContent = 'City not found';
    if (st)   { st.textContent = '● city not found'; st.style.color = '#f43f5e'; }
    return;
  }
  if (data.error) {
    if (st)   { st.textContent = '● offline'; st.style.color = '#f43f5e'; }
    return;
  }

  if (icon) {
    const type = wmoToType(data.wmoCode, data.isDay);
    icon.innerHTML = weatherIconSvg(type);
    icon.style.filter = `drop-shadow(0 0 8px ${WI_GLOW[type] || 'rgba(150,165,190,0.3)'})`;
  }
  if (temp) temp.textContent = `${data.temp}°`;
  if (desc) desc.textContent = `${data.city} · ${wmoToDesc(data.wmoCode, data.isDay)}`;
  if (st)   { st.textContent = `● ${data.temp}° · ${data.city}`; st.style.color = '#3ddc97'; }
}

async function pollWeather() {
  try {
    const d = await fetch('/api/weather', { cache: 'no-store' }).then(r => r.json());
    renderWeather(d);
  } catch { /* display remains unchanged */ }
}

function startWeather() {
  clearInterval(weatherTimer);
  pollWeather();
  weatherTimer = setInterval(pollWeather, WEATHER_POLL_MS);
}

function toggleWeatherUnit() {
  _weatherUnit = _weatherUnit === 'C' ? 'F' : 'C';
  const btn = $('weatherUnitBtn');
  if (btn) btn.textContent = `°${_weatherUnit}`;
}

/* ---------- UniFi Network + Protect ---------- */
function setUnifiStatus(text, color) {
  ['unifiStatus', 'unifiSettingsStatus'].forEach(id => {
    const el = $(id);
    if (el) { el.textContent = '● ' + text; el.style.color = color; }
  });
}

function dbmToBar(dbm) {
  const pct = Math.max(0, Math.min(100, (dbm + 100) * 2));
  const color = dbm > -60 ? 'var(--green)' : dbm > -75 ? 'var(--orange)' : 'var(--red)';
  return { pct, color };
}

function renderUnifi(d) {
  const fmt = (v, dec) => v != null ? Number(v).toFixed(dec ?? 0) : '–';
  setText('unifiRxRate',   d.wan.rxRate  != null ? fmt(d.wan.rxRate, 1)  : '–');
  setText('unifiTxRate',   d.wan.txRate  != null ? fmt(d.wan.txRate, 1)  : '–');
  setText('unifiWanIp',    d.wan.ip      || '–');
  setText('unifiLatency',  d.wan.latencyMs != null ? d.wan.latencyMs : '–');
  setText('unifiTotal',    d.clients.total);
  setText('unifiWireless', d.clients.wireless);
  setText('unifiWired',    d.clients.wired);
  const b = d.clients.bands;
  setText('unifi24', b['24'] || 0);
  setText('unifi5',  b['5']  || 0);
  setText('unifi6',  b['6']  || 0);

  const wrap = $('unifiDevices');
  if (wrap) {
    const typeLabel = { ugw: 'UDM', udm: 'UDM', usg: 'USG', usw: 'SW', uap: 'AP', uvc: 'CAM' };
    wrap.innerHTML = d.devices.map(dev => {
      const dot   = dev.online ? 'var(--green)' : 'var(--red)';
      const label = typeLabel[dev.type] || dev.type.toUpperCase();
      const extra = dev.type === 'uap'
        ? ` · ${dev.clients}cl`
        : dev.cpu != null ? ` · ${dev.cpu.toFixed(0)}%` : '';
      return `<div class="unifi-chip"><span style="color:${dot}">●</span> ${label}:&nbsp;${dev.name}${extra}</div>`;
    }).join('');
  }
}

function renderUnifiAps(devices) {
  const wrap = $('unifiAps');
  if (!wrap) return;
  const aps = devices.filter(d => d.type === 'uap');
  if (!aps.length) {
    wrap.innerHTML = '<div style="font:500 11px \'JetBrains Mono\',monospace;color:var(--text-3)">No access points found</div>';
    return;
  }

  wrap.innerHTML = aps.map(ap => {
    const onlineDot = ap.online ? 'var(--green)' : 'var(--red)';
    const radiosHtml = (ap.radios || []).map(r =>
      `<div style="display:flex;align-items:center;gap:10px;margin-top:6px">
        <span style="font:600 10px 'JetBrains Mono',monospace;color:var(--accent);min-width:36px">${r.band}</span>
        <span style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-4)">CH&nbsp;${r.channel}</span>
        <span style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-2)">${r.clients}&nbsp;Clients</span>
        ${r.txPower != null ? `<span style="font:400 10px 'JetBrains Mono',monospace;color:var(--text-3)">${r.txPower}&nbsp;dBm&nbsp;TX</span>` : ''}
      </div>`
    ).join('');

    const apClients = (_unifiState?.topClients || [])
      .filter(c => c.apMac === ap.mac)
      .slice(0, 8)
      .map(c => {
        if (c.signal != null) {
          const bar = dbmToBar(c.signal);
          return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--border-4)">
            <span style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
            <span style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-4);min-width:36px;text-align:right">${c.signal}&nbsp;dBm</span>
            <div style="width:50px;height:4px;border-radius:4px;background:var(--track)"><div style="width:${bar.pct}%;height:100%;border-radius:4px;background:${bar.color}"></div></div>
          </div>`;
        }
        return `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--border-4)">
          <span style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</span>
          <span style="font:400 10px 'JetBrains Mono',monospace;color:var(--text-4)">${c.ip || ''}</span>
        </div>`;
      }).join('');

    return `<div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font:600 12px 'JetBrains Mono',monospace;color:var(--text-15)">${ap.name}</span>
        <span style="color:${onlineDot};font-size:10px">●</span>
        <span style="font:400 10px 'JetBrains Mono',monospace;color:var(--text-3)">${ap.model}</span>
      </div>
      ${radiosHtml}
      ${apClients ? `<div style="margin-top:8px">${apClients}</div>` : ''}
    </div>`;
  }).join('<div style="height:1px;background:var(--border-4);margin:4px 0"></div>');
}

async function pollUnifiSnapshot() {
  const img   = $('unifiSnapshot');
  const ph    = $('unifiSnapshotPlaceholder');
  const camSt = $('unifiCamStatus');
  if (!img) return;
  // No state yet → wait until pollUnifi finishes
  if (!_unifiState) return;
  const cam = _unifiState?.cameras?.[0];
  if (!cam?.id) {
    // Distinguish: Protect error vs. no camera present
    const hint = _unifiState.camError
      ? '● Protect unreachable'
      : '● no camera found';
    if (camSt) { camSt.textContent = hint; camSt.style.color = 'var(--orange)'; }
    // Adjust placeholder text
    if (ph) ph.textContent = _unifiState.camError
      ? `Protect API error: ${_unifiState.camError}`
      : 'No camera found via Protect — enter Camera ID manually';
    return;
  }
  if (!cam.online) {
    if (camSt) { camSt.textContent = '● offline'; camSt.style.color = 'var(--red)'; }
    return;
  }
  const url = `/api/unifi/snapshot?cam=${encodeURIComponent(cam.id)}&_t=${Date.now()}`;
  const tmp = new Image();
  tmp.onload = () => {
    img.src = url;
    img.style.display = 'block';
    if (ph) ph.style.display = 'none';
    setText('unifiSnapshotTs', 'Snapshot: ' + new Date().toLocaleTimeString('en-US', { hour12: false }));
    if (camSt) { camSt.textContent = '● online'; camSt.style.color = 'var(--green)'; }
    setText('unifiCamName', cam.name);
  };
  tmp.onerror = () => {
    if (camSt) { camSt.textContent = '● snapshot error'; camSt.style.color = 'var(--orange)'; }
  };
  tmp.src = url;
}

async function pollUnifi() {
  if (!state.liveOn) return;
  try {
    const d = await fetch('/api/unifi', { cache: 'no-store' }).then(r => r.json());
    if (!d?.ok) {
      setUnifiStatus(
        d?.error === 'not_configured' ? 'not configured' : 'offline',
        d?.error === 'not_configured' ? 'var(--text-3)' : 'var(--red)'
      );
      return;
    }
    _unifiState = d;
    renderUnifi(d);
    renderUnifiAps(d.devices);
    setText('unifiCamName', d.cameras?.[0]?.name || '–');
    setUnifiStatus(
      d.wan.status === 'ok' ? 'online' : 'degraded',
      d.wan.status === 'ok' ? 'var(--green)' : 'var(--orange)'
    );
  } catch {
    setUnifiStatus('offline', 'var(--red)');
  }
}

function startUnifi() {
  clearInterval(unifiTimer);
  clearInterval(unifiSnapTimer);
  pollUnifi().then(() => {
    // Only start snapshot polling after the first successful poll (Camera ID comes from state)
    pollUnifiSnapshot();
    unifiSnapTimer = setInterval(pollUnifiSnapshot, UNIFI_SNAP_MS);
  });
  unifiTimer = setInterval(pollUnifi, UNIFI_POLL_MS);
}

/* ---------- Nextcloud ---------- */
const NEXTCLOUD_POLL_MS = 60000;

function setNextcloudStatus(text, color) {
  ['ncStatus', 'nextcloudSettingsStatus'].forEach((id) => {
    const el = $(id);
    if (el) { el.textContent = '● ' + text; el.style.color = color; }
  });
}

function renderNcUsers(users) {
  const list = $('ncUserList');
  if (!list) return;
  list.innerHTML = '';
  if (!users || !users.length) {
    const em = document.createElement('div');
    em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:6px 4px";
    em.textContent = 'No users';
    list.appendChild(em);
    return;
  }
  for (const u of users) {
    const right = u.quota ? `${fmtSize(u.used)} / ${fmtSize(u.quota)}` : fmtSize(u.used);
    const row = document.createElement('div');
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;font:500 12px 'JetBrains Mono',monospace";
    row.innerHTML =
      `<span style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${u.name}</span>` +
      `<span style="color:var(--text-3);flex-shrink:0">${right}</span>`;
    list.appendChild(row);
  }
}

function renderNextcloud(d) {
  setText('ncUsed', fmtSize(d.used));
  setText('ncUserCount', `${d.userCount} Users`);
  renderNcUsers(d.users);
  setText('ncVersion', d.version || '–');
  setNextcloudStatus('connected', '#3ddc97');
}

async function pollNextcloud() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/nextcloud', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      setNextcloudStatus(d && d.error === 'not_configured' ? 'not configured' : 'offline', '#f43f5e');
      return;
    }
    renderNextcloud(d);
  } catch (err) {
    setNextcloudStatus('offline', '#f43f5e');
    console.warn('Nextcloud poll failed:', err.message);
  }
}

function startNextcloud() {
  clearInterval(nextcloudTimer);
  pollNextcloud();
  nextcloudTimer = setInterval(pollNextcloud, NEXTCLOUD_POLL_MS);
}

/* ToLeech upload: push files into the folder via drag&drop / click */
function ncUploadFiles(files) {
  const box = $('ncDropStatus');
  if (!box || !files || !files.length) return;
  const ell = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  Array.from(files).forEach((file) => {
    const row = document.createElement('div');
    row.style.cssText = "display:flex;align-items:center;gap:8px;font:500 11px 'JetBrains Mono',monospace;color:var(--text-3)";
    row.innerHTML = `<span style="color:#5b9dff">⏳</span><span style="${ell}">${file.name}</span><span style="flex-shrink:0">uploading…</span>`;
    box.appendChild(row);
    fetch(`/api/nextcloud/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file })
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok) {
          row.innerHTML = `<span style="color:#3ddc97">✓</span><span style="${ell};color:var(--text-15)">${file.name}</span><span style="color:#3ddc97;flex-shrink:0">uploaded</span>`;
          pollNextcloud();
        } else {
          const e = res && res.error ? res.error : 'Error';
          row.innerHTML = `<span style="color:#f43f5e">✗</span><span style="${ell}">${file.name}</span><span style="color:#f43f5e;flex-shrink:0">${e}</span>`;
        }
      })
      .catch(() => {
        row.innerHTML = `<span style="color:#f43f5e">✗</span><span style="${ell}">${file.name}</span><span style="color:#f43f5e;flex-shrink:0">offline</span>`;
      });
  });
}

function setupNextcloudUpload() {
  const drop  = $('ncDrop');
  const input = $('ncDropInput');
  if (!drop || !input) return;
  const reset = () => { drop.style.borderColor = 'var(--border-1)'; drop.style.background = 'var(--bg-panel)'; };
  const hover = () => { drop.style.borderColor = '#5b9dff'; drop.style.background = 'rgba(91,157,255,0.06)'; };
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { ncUploadFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); hover(); }));
  drop.addEventListener('dragleave', (e) => { e.preventDefault(); reset(); });
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    reset();
    if (e.dataTransfer && e.dataTransfer.files) ncUploadFiles(e.dataTransfer.files);
  });
}

// Starts/refreshes all live polls (shared interval).
function startLive() {
  startGlances();
  startDocker();
  startAdGuard();
  startPlex();
  startServiceStatus();
  startWeather();
  startUnifi();
  startNextcloud();
}

/* ---------- Quick access from /api/config ---------- */
async function loadConfig() {
  try {
    const res = await fetch('/api/config', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const cfg = await res.json();
    if (cfg.title) {
      document.title = cfg.title;
      setText('brandName', cfg.title);
    }
    if (cfg.search && cfg.search.engine) state.searchEngine = cfg.search.engine;
    renderQuickLinks(cfg.quicklinks || []);
  } catch (err) {
    console.error('Failed to load configuration:', err);
  }
}

function renderQuickLinks(items) {
  const grid = $('quicklinks');
  if (!grid) return;
  grid.innerHTML = '';
  for (const s of items) {
    const color = s.color || '#5b9dff';
    const a = document.createElement('a');
    a.href = s.url || '#';
    a.className = 'ql-tile';
    a.style.cssText =
      'text-decoration:none;display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:12px';
    if (s.newTab) { a.target = '_blank'; a.rel = 'noopener'; }

    const badge = document.createElement('div');
    badge.style.cssText =
      `width:34px;height:34px;border-radius:9px;background:${hexA(color, 0.16)};color:${color};display:flex;align-items:center;justify-content:center;font:700 15px 'Space Grotesk',sans-serif;flex-shrink:0`;
    const isImg = typeof s.icon === 'string' && (/^https?:\/\//.test(s.icon) || /\.(png|svg|jpe?g|webp|gif)$/i.test(s.icon));
    if (isImg) {
      const img = document.createElement('img');
      img.src = s.icon; img.alt = ''; img.style.cssText = 'width:100%;height:100%;object-fit:contain;border-radius:9px';
      badge.appendChild(img);
    } else {
      badge.textContent = s.icon || (s.name ? s.name[0].toUpperCase() : '?');
    }

    const tx = document.createElement('div');
    tx.style.cssText = 'min-width:0';
    const nm = document.createElement('div');
    nm.className = 'ql-name';
    nm.style.cssText = "font:600 13px 'JetBrains Mono',monospace;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis";
    nm.textContent = s.name || '';
    const lb = document.createElement('div');
    lb.style.cssText = "font:500 10px 'JetBrains Mono',monospace;color:var(--text-3)";
    lb.textContent = s.label || '';
    tx.appendChild(nm);
    tx.appendChild(lb);

    a.appendChild(badge);
    a.appendChild(tx);
    grid.appendChild(a);
  }
}

/* ---------- Suche ---------- */
function setupSearch() {
  const input = $('search');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q) window.location.href = state.searchEngine + encodeURIComponent(q);
    }
  });
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ---------- Quick access editor ---------- */
let _qlItems = [];

function _qlMkInput(value, placeholder, field) {
  const el = document.createElement('input');
  el.value = value || '';
  el.placeholder = placeholder;
  el.dataset.field = field;
  el.style.cssText = "background:var(--bg-info-card);border:1px solid var(--border-1);border-radius:7px;padding:7px 9px;color:var(--text-2);font:500 11px 'JetBrains Mono',monospace;outline:none;width:100%;box-sizing:border-box";
  return el;
}

function _qlMkBtn(label, fg, onClick, disabled) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.disabled = !!disabled;
  btn.style.cssText = `background:${fg}18;border:1px solid ${fg}38;border-radius:7px;padding:6px 10px;color:${fg};font:600 12px 'JetBrains Mono',monospace;cursor:pointer;white-space:nowrap;flex-shrink:0${disabled ? ';opacity:0.3;cursor:default' : ''}`;
  btn.addEventListener('click', onClick);
  return btn;
}

function _qlCollect() {
  const list = $('qlEditList');
  if (!list) return;
  list.querySelectorAll('[data-ql-idx]').forEach(wrap => {
    const i = +wrap.dataset.qlIdx;
    if (!_qlItems[i]) return;
    wrap.querySelectorAll('[data-field]').forEach(el => {
      _qlItems[i][el.dataset.field] = el.type === 'color' ? el.value : el.value.trim();
    });
  });
}

function renderQlEditor() {
  const list = $('qlEditList');
  if (!list) return;
  list.innerHTML = '';
  _qlItems.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'ql-row';
    row.dataset.qlIdx = i;

    const colorEl = document.createElement('input');
    colorEl.type = 'color';
    colorEl.value = item.color || '#5b9dff';
    colorEl.dataset.field = 'color';
    colorEl.title = 'Color';
    colorEl.style.cssText = 'width:20px;height:20px;border:none;border-radius:3px;cursor:pointer;padding:1px;background:transparent;flex-shrink:0';

    const mkIn = (val, ph, field) => {
      const el = document.createElement('input');
      el.value = val || ''; el.placeholder = ph; el.dataset.field = field;
      el.className = 'cfg-input';
      return el;
    };

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑'; upBtn.className = 'cfg-btn'; upBtn.disabled = i === 0;
    upBtn.style.cssText += ';padding:3px 6px;font-size:10px';
    upBtn.addEventListener('click', () => { _qlCollect(); if (i > 0) { [_qlItems[i], _qlItems[i-1]] = [_qlItems[i-1], _qlItems[i]]; renderQlEditor(); } });

    const delBtn = document.createElement('button');
    delBtn.textContent = '×'; delBtn.className = 'cfg-btn cfg-btn-del';
    delBtn.style.cssText += ';padding:3px 6px;font-size:11px';
    delBtn.addEventListener('click', () => { _qlCollect(); _qlItems.splice(i, 1); renderQlEditor(); });

    const btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:3px';
    btns.appendChild(upBtn); btns.appendChild(delBtn);

    // Icon picker widget
    const iconInput = document.createElement('input');
    iconInput.type = 'hidden'; iconInput.value = item.icon || ''; iconInput.dataset.field = 'icon';
    const iconWrap = document.createElement('div');
    iconWrap.title = 'Select icon';
    iconWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:7px;border:1px solid rgba(120,150,200,0.18);background:rgba(8,12,20,0.6);height:36px;transition:border-color .1s,background .1s;overflow:hidden';
    iconWrap.appendChild(iconInput);
    _rebuildIconWrap(iconWrap, iconInput, item.icon || '');
    iconWrap.addEventListener('click', () => openIconPicker(iconInput, iconWrap));
    iconWrap.addEventListener('mouseenter', () => { iconWrap.style.borderColor='rgba(91,157,255,0.4)'; iconWrap.style.background='rgba(91,157,255,0.06)'; });
    iconWrap.addEventListener('mouseleave', () => { iconWrap.style.borderColor='rgba(120,150,200,0.18)'; iconWrap.style.background='rgba(8,12,20,0.6)'; });

    row.appendChild(colorEl);
    row.appendChild(mkIn(item.name, 'Name', 'name'));
    row.appendChild(mkIn(item.url, 'http://...', 'url'));
    row.appendChild(iconWrap);
    row.appendChild(mkIn(item.label, 'Label', 'label'));
    row.appendChild(btns);
    list.appendChild(row);
  });
}

function addQlItem() {
  _qlCollect();
  _qlItems.push({ name: '', url: '', label: '', color: '#5b9dff', icon: '' });
  renderQlEditor();
  const list = $('qlEditList');
  if (list) list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadQlEditor() {
  try {
    _qlItems = await fetch('/api/quicklinks', { cache: 'no-store' }).then(r => r.json());
    renderQlEditor();
  } catch { _qlItems = []; renderQlEditor(); }
}

async function saveQlItems() {
  _qlCollect();
  const payload = _qlItems.filter(l => l.name && l.url);
  try {
    const r = await fetch('/api/quicklinks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    renderQuickLinks(payload);
  } catch (err) {
    console.error('Failed to save quicklinks:', err.message);
  }
}

/* ---------- Dashboard layout (tile order & visibility) ---------- */
const DASHBOARD_WIDGETS = [
  { id: 'system-load',        section: 'system',          label: 'System Load' },
  { id: 'network-throughput', section: 'system',          label: 'Network Throughput' },
  { id: 'disk-storage',       section: 'system',          label: 'Storage · Unraid Array' },
  { id: 'service-status',     section: 'dienste',         label: 'Service Status' },
  { id: 'docker',             section: 'dienste',         label: 'Docker' },
  { id: 'adguard',            section: 'dienste',         label: 'AdGuard Home' },
  { id: 'plex',               section: 'media',           label: 'Plex' },
  { id: 'nextcloud',          section: 'media',           label: 'Nextcloud' },
  { id: 'unifi-network',      section: 'netzwerk',        label: 'UniFi · Network' },
  { id: 'unifi-aps',          section: 'netzwerk-detail', label: 'WiFi · Access Points' },
  { id: 'unifi-cameras',      section: 'netzwerk-detail', label: 'UniFi Protect' },
];

let _layoutState = [];
let _sortableInstances = [];

function _layoutSectionContainers() {
  return Array.from(document.querySelectorAll('[data-section-id]'));
}

function _collectLayoutFromDom() {
  const out = [];
  _layoutSectionContainers().forEach((container) => {
    const sectionId = container.dataset.sectionId;
    container.querySelectorAll(':scope > [data-widget-id]').forEach((el) => {
      out.push({ id: el.dataset.widgetId, section: sectionId, hidden: el.style.display === 'none' });
    });
  });
  return out;
}

function _applyLayoutToDom(layout) {
  const bySection = {};
  layout.forEach((entry) => { (bySection[entry.section] = bySection[entry.section] || []).push(entry); });
  _layoutSectionContainers().forEach((container) => {
    const sectionId = container.dataset.sectionId;
    (bySection[sectionId] || []).forEach((entry) => {
      const el = document.querySelector(`[data-widget-id="${entry.id}"]`);
      if (el) {
        container.appendChild(el);
        el.style.display = entry.hidden ? 'none' : '';
      }
    });
  });
  applySectionAutoHide();
}

function applySectionAutoHide() {
  const hasVisible = (sectionId) => {
    const c = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!c) return false;
    return Array.from(c.querySelectorAll('[data-widget-id]')).some((el) => el.style.display !== 'none');
  };
  const setLabelVisible = (sectionId, visible) => {
    const c = document.querySelector(`[data-section-id="${sectionId}"]`);
    const label = c && c.previousElementSibling;
    if (label) label.style.display = visible ? '' : 'none';
  };
  setLabelVisible('system', hasVisible('system'));
  setLabelVisible('dienste', hasVisible('dienste'));
  setLabelVisible('media', hasVisible('media'));
  setLabelVisible('netzwerk', hasVisible('netzwerk') || hasVisible('netzwerk-detail'));
}

function _reconcileLayout(saved) {
  const knownIds = new Set(DASHBOARD_WIDGETS.map((w) => w.id));
  const out = saved.filter((e) => e && knownIds.has(e.id)).map((e) => ({ id: e.id, section: e.section, hidden: !!e.hidden }));
  const seen = new Set(out.map((e) => e.id));
  DASHBOARD_WIDGETS.forEach((w) => { if (!seen.has(w.id)) out.push({ id: w.id, section: w.section, hidden: false }); });
  return out;
}

function initLayoutSortable() {
  if (typeof Sortable === 'undefined' || _sortableInstances.length) return;
  _layoutSectionContainers().forEach((container) => {
    _sortableInstances.push(Sortable.create(container, {
      group: 'dashboard-tiles',
      handle: '.tile-drag-handle',
      animation: 150,
      disabled: true,
      onEnd: () => applySectionAutoHide(),
    }));
  });
}

async function loadDashboardLayout() {
  let saved = [];
  try { saved = await fetch('/api/dashboard/layout', { cache: 'no-store' }).then((r) => r.json()); }
  catch { saved = []; }
  if (!Array.isArray(saved)) saved = [];
  _layoutState = _reconcileLayout(saved);
  _applyLayoutToDom(_layoutState);
  initLayoutSortable();
}

async function saveDashboardLayout() {
  _layoutState = _collectLayoutFromDom();
  try {
    const r = await fetch('/api/dashboard/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_layoutState),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    renderLayoutEditor();
  } catch (err) {
    console.error('Failed to save dashboard layout:', err.message);
  }
}

function toggleLayoutEditMode() {
  state.layoutEditOn = !state.layoutEditOn;
  document.body.classList.toggle('layout-edit-mode', state.layoutEditOn);
  const btn = $('layoutEditBtn');
  if (btn) btn.classList.toggle('active', state.layoutEditOn);
  _sortableInstances.forEach((s) => s.option('disabled', !state.layoutEditOn));
}

function hideTileNow(widgetId) {
  const el = document.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!el) return;
  el.style.display = 'none';
  applySectionAutoHide();
}

function renderLayoutEditor() {
  const list = $('layoutEditList');
  if (!list) return;
  const byId = new Map(_collectLayoutFromDom().map((e) => [e.id, e]));
  list.innerHTML = '';
  DASHBOARD_WIDGETS.forEach((w) => {
    const entry = byId.get(w.id) || { hidden: false };
    const row = document.createElement('div');
    row.className = 'cfg-row';
    const key = document.createElement('span');
    key.className = 'cfg-key';
    key.textContent = w.label;
    const sw = document.createElement('div');
    sw.className = 'switch' + (entry.hidden ? '' : ' on');
    sw.innerHTML = '<span></span>';
    sw.addEventListener('click', () => {
      const el = document.querySelector(`[data-widget-id="${w.id}"]`);
      if (!el) return;
      const nowHidden = el.style.display !== 'none';
      el.style.display = nowHidden ? 'none' : '';
      sw.classList.toggle('on', !nowHidden);
      applySectionAutoHide();
    });
    row.appendChild(key);
    row.appendChild(sw);
    list.appendChild(row);
  });
}

function resetDashboardLayout() {
  _layoutState = DASHBOARD_WIDGETS.map((w) => ({ id: w.id, section: w.section, hidden: false }));
  _applyLayoutToDom(_layoutState);
  renderLayoutEditor();
}

/* ---------- Secrets (credentials) ---------- */
async function loadSecrets() {
  try {
    const d = await fetch('/api/secrets', { cache: 'no-store' }).then(r => r.json());
    const set = (id, val) => { const el = $(id); if (el && val) el.value = val; };
    set('secretGlancesUrl',  d.GLANCES_URL);
    set('secretAdguardUrl',  d.ADGUARD_URL);
    set('secretAdguardUser', d.ADGUARD_USER);
    set('secretAdguardPass', d.ADGUARD_PASS);
    set('secretPlexUrl',     d.PLEX_URL);
    set('secretPlexToken',   d.PLEX_TOKEN);
    set('secretWeatherCity', d.WEATHER_CITY);
    if (d.WEATHER_UNIT) {
      _weatherUnit = d.WEATHER_UNIT;
      const btn = $('weatherUnitBtn');
      if (btn) btn.textContent = `°${_weatherUnit}`;
    }
    set('secretUnifiApiKey', d.UNIFI_API_KEY);
    set('secretUnifiHostId', d.UNIFI_HOST_ID);
    set('secretUnifiCamId',  d.UNIFI_CAMERA_ID);
    set('secretNextcloudUrl',  d.NEXTCLOUD_URL);
    set('secretNextcloudUser', d.NEXTCLOUD_USER);
    set('secretNextcloudPass', d.NEXTCLOUD_PASS);
    set('secretNextcloudPath', d.NEXTCLOUD_SHARE_PATH);
  } catch { /* ignore, fields stay empty */ }
}

async function saveSecrets(card) {
  const val = (id) => ($(id) || {}).value || '';
  let body = {};
  if (card === 'glances') {
    body = { GLANCES_URL: val('secretGlancesUrl') };
  } else if (card === 'adguard') {
    body = { ADGUARD_URL: val('secretAdguardUrl'), ADGUARD_USER: val('secretAdguardUser'), ADGUARD_PASS: val('secretAdguardPass') };
  } else if (card === 'plex') {
    body = { PLEX_URL: val('secretPlexUrl'), PLEX_TOKEN: val('secretPlexToken') };
  } else if (card === 'weather') {
    body = { WEATHER_CITY: val('secretWeatherCity'), WEATHER_UNIT: _weatherUnit };
  } else if (card === 'unifi') {
    body = { UNIFI_API_KEY: val('secretUnifiApiKey'), UNIFI_HOST_ID: val('secretUnifiHostId'), UNIFI_CAMERA_ID: val('secretUnifiCamId') };
  } else if (card === 'nextcloud') {
    body = { NEXTCLOUD_URL: val('secretNextcloudUrl'), NEXTCLOUD_USER: val('secretNextcloudUser'), NEXTCLOUD_PASS: val('secretNextcloudPass'), NEXTCLOUD_SHARE_PATH: val('secretNextcloudPath') };
  }
  try {
    const r = await fetch('/api/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await loadSecrets();
    if (card === 'glances' || card === 'adguard' || card === 'plex' || card === 'unifi' || card === 'nextcloud') startLive();
    if (card === 'weather') startWeather();
  } catch (err) {
    console.error('Failed to save secrets:', err.message);
  }
}

/* ---------- Settings ---------- */
function openSettings() {
  const m = $('settingsModal');
  if (!m) return;
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
  const t = state.settingsTab;
  if (t === 'integrationen') { loadSecrets(); loadDiskSettings(); }
  if (t === 'schnellzugriff') loadQlEditor();
  if (t === 'layout') renderLayoutEditor();
}
function closeSettings() {
  const m = $('settingsModal');
  if (!m) return;
  m.classList.remove('open');
  m.addEventListener('transitionend', () => { m.style.display = 'none'; }, { once: true });
}

function setTab(tab) {
  state.settingsTab = tab;
  const navItems = document.querySelectorAll('.nav-item');
  const tabs = document.querySelectorAll('.tab');
  navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  if (tab === 'integrationen') { loadSecrets(); loadDiskSettings(); }
  if (tab === 'schnellzugriff') loadQlEditor();
  if (tab === 'layout') renderLayoutEditor();
}

function applyToggleVisual(key) {
  document.querySelectorAll(`.switch[data-toggle="${key}"]`).forEach((sw) => sw.classList.toggle('on', !!state[key]));
}
function toggle(key) {
  state[key] = !state[key];
  applyToggleVisual(key);
  if (key === 'gridOn') { const g = $('gridOverlay'); if (g) g.style.display = state.gridOn ? 'block' : 'none'; }
  if (key === 'animOn') document.body.classList.toggle('no-anim', !state.animOn);
  if (key === 'glassOn') document.body.classList.toggle('no-glass', !state.glassOn);
  if (key === 'searchOn') applySearchVisible();
  if (key === 'liveOn' && state.liveOn) startLive();
  saveUiPrefs();
}
function applySearchVisible() {
  const el = $('searchBar');
  if (el) el.style.display = state.searchOn ? '' : 'none';
}

/* ---------- UI prefs (localStorage) — persist appearance settings ---------- */
const UI_PREF_KEYS = ['accent', 'gridOn', 'glassOn', 'animOn', 'liveOn', 'updateMs', 'searchOn'];
function saveUiPrefs() {
  try {
    const out = {};
    for (const k of UI_PREF_KEYS) out[k] = state[k];
    localStorage.setItem('homelab.ui', JSON.stringify(out));
  } catch { /* localStorage possibly unavailable */ }
}
function loadUiPrefs() {
  let prefs = null;
  try { prefs = JSON.parse(localStorage.getItem('homelab.ui') || 'null'); } catch { prefs = null; }
  if (prefs && typeof prefs === 'object') {
    for (const k of UI_PREF_KEYS) {
      if (prefs[k] !== undefined && prefs[k] !== null) state[k] = prefs[k];
    }
  }
  applyUiPrefs();
}
function applyUiPrefs() {
  ['gridOn', 'glassOn', 'animOn', 'liveOn', 'searchOn'].forEach(applyToggleVisual);
  const g = $('gridOverlay'); if (g) g.style.display = state.gridOn ? 'block' : 'none';
  document.body.classList.toggle('no-anim', !state.animOn);
  document.body.classList.toggle('no-glass', !state.glassOn);
  applySearchVisible();
  document.documentElement.style.setProperty('--accent', state.accent);
  renderAccents();
  const range = $('updateRange');
  if (range) range.value = state.updateMs;
  setText('updateSec', (state.updateMs / 1000).toFixed(1));
}

function renderAccents() {
  const row = $('accentRow');
  if (!row) return;
  row.innerHTML = '';
  ['#5b9dff', '#3ddc97', '#8b6dff', '#ff8a4c', '#f43f5e'].forEach((c) => {
    const d = document.createElement('div');
    d.style.cssText =
      `width:32px;height:32px;border-radius:9px;background:${c};cursor:pointer;border:2px solid ${state.accent === c ? '#eef3fa' : 'transparent'};box-shadow:0 0 0 1px rgba(0,0,0,.3);transition:all .15s`;
    d.addEventListener('click', () => setAccent(c));
    row.appendChild(d);
  });
}
function setAccent(c) {
  state.accent = c;
  document.documentElement.style.setProperty('--accent', c);
  renderAccents();
  saveUiPrefs();
}

function setUpdateMs(v) {
  state.updateMs = parseInt(v, 10) || 1600;
  setText('updateSec', (state.updateMs / 1000).toFixed(1));
  startLive();
  saveUiPrefs();
}

function setupSettings() {
  const btn = $('settingsBtn');
  if (btn) btn.addEventListener('click', openSettings);
  const modal = $('settingsModal');
  if (modal) modal.addEventListener('click', closeSettings);
  const panel = $('settingsPanel');
  if (panel) panel.addEventListener('click', (e) => e.stopPropagation());
  const close = $('settingsClose');
  if (close) close.addEventListener('click', closeSettings);

  document.querySelectorAll('.nav-item').forEach((n) =>
    n.addEventListener('click', () => setTab(n.dataset.tab)));

  document.querySelectorAll('.switch[data-toggle]').forEach((sw) =>
    sw.addEventListener('click', () => toggle(sw.dataset.toggle)));

  const range = $('updateRange');
  if (range) range.addEventListener('input', (e) => setUpdateMs(e.target.value));

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });

  renderAccents();
  setupStatusSettings();
}

/* ---------- Start ---------- */
function fmtUptime(sec) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
async function loadVersionInfo() {
  try {
    const d = await fetch('/api/version', { cache: 'no-store' }).then(r => r.json());
    setText('aboutVersion', 'v' + d.version);
    setText('aboutNode', d.node);
    setText('aboutUptime', fmtUptime(d.uptimeSec));
    setText('aboutLicense', d.license);
    setText('navVersion', d.version);
  } catch { /* stays '–' */ }
}

/* ---------- Theme (Light / Dark) ---------- */
const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function _applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = $('themeToggle');
  if (!btn) return;
  const isLight = theme === 'light';
  btn.innerHTML = isLight ? MOON_SVG : SUN_SVG;
  btn.title     = isLight ? 'Dark Mode' : 'Light Mode';
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  _applyTheme(next);
  localStorage.setItem('theme', next);
}

document.addEventListener('DOMContentLoaded', async () => {
  _applyTheme(localStorage.getItem('theme') || 'dark');
  loadUiPrefs();
  await loadDashboardLayout();
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  renderData();
  startGraphAnim();
  startLive();
  setupSearch();
  setupSettings();
  setupNextcloudUpload();
  loadConfig();
  loadVersionInfo();
});
