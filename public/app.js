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

  /* ---------- Popular brand & website logos ---------- */
  // Web & Social
  { id:'github',                name:'GitHub',           cat:'Web & Social' },
  { id:'reddit',                name:'Reddit',           cat:'Web & Social' },
  { id:'discord',               name:'Discord',          cat:'Web & Social' },
  { id:'twitter',               name:'Twitter / X',      cat:'Web & Social', kw:'x' },
  { id:'mastodon',              name:'Mastodon',         cat:'Web & Social' },
  { id:'bluesky',               name:'Bluesky',          cat:'Web & Social' },
  { id:'facebook',              name:'Facebook',         cat:'Web & Social' },
  { id:'instagram',             name:'Instagram',        cat:'Web & Social' },
  { id:'linkedin',              name:'LinkedIn',         cat:'Web & Social' },
  { id:'telegram',              name:'Telegram',         cat:'Web & Social' },
  { id:'whatsapp',              name:'WhatsApp',         cat:'Web & Social' },
  { id:'signal',                name:'Signal',           cat:'Web & Social' },
  { id:'tiktok',                name:'TikTok',           cat:'Web & Social' },
  { id:'pinterest',             name:'Pinterest',        cat:'Web & Social' },
  { id:'snapchat',              name:'Snapchat',         cat:'Web & Social' },
  { id:'tumblr',                name:'Tumblr',           cat:'Web & Social' },
  { id:'threads',               name:'Threads',          cat:'Web & Social' },
  { id:'wikipedia',             name:'Wikipedia',        cat:'Web & Social' },
  { id:'medium-light',          name:'Medium',           cat:'Web & Social', kw:'medium' },
  { id:'patreon',               name:'Patreon',          cat:'Web & Social' },
  { id:'ko-fi',                 name:'Ko-fi',            cat:'Web & Social' },
  { id:'facebook-messenger',    name:'Messenger',        cat:'Web & Social', kw:'facebook messenger' },
  { id:'viber',                 name:'Viber',            cat:'Web & Social' },
  // Browsers
  { id:'firefox',               name:'Firefox',          cat:'Browsers' },
  { id:'brave',                 name:'Brave',            cat:'Browsers' },
  { id:'opera',                 name:'Opera',            cat:'Browsers' },
  { id:'vivaldi',               name:'Vivaldi',          cat:'Browsers' },
  { id:'duckduckgo',            name:'DuckDuckGo',       cat:'Browsers', kw:'ddg' },
  // Google
  { id:'google',                name:'Google',           cat:'Google' },
  { id:'gmail',                 name:'Gmail',            cat:'Google' },
  { id:'google-drive',          name:'Google Drive',     cat:'Google' },
  { id:'google-photos',         name:'Google Photos',    cat:'Google' },
  { id:'google-calendar',       name:'Google Calendar',  cat:'Google' },
  { id:'google-maps',           name:'Google Maps',      cat:'Google' },
  { id:'google-chrome',         name:'Chrome',           cat:'Google', kw:'google chrome' },
  { id:'youtube',               name:'YouTube',          cat:'Google' },
  { id:'youtube-music',         name:'YouTube Music',    cat:'Google' },
  { id:'android',               name:'Android',          cat:'Google' },
  { id:'google-play',           name:'Google Play',      cat:'Google' },
  { id:'google-keep',           name:'Google Keep',      cat:'Google' },
  { id:'google-translate',      name:'Google Translate', cat:'Google' },
  { id:'google-meet',           name:'Google Meet',      cat:'Google' },
  { id:'google-cloud-platform', name:'Google Cloud',     cat:'Google', kw:'gcp google cloud' },
  { id:'firebase',              name:'Firebase',         cat:'Google' },
  { id:'google-assistant',      name:'Google Assistant', cat:'Google' },
  // Microsoft
  { id:'microsoft',             name:'Microsoft',        cat:'Microsoft' },
  { id:'microsoft-outlook',     name:'Outlook',          cat:'Microsoft', kw:'microsoft outlook' },
  { id:'microsoft-onedrive',    name:'OneDrive',         cat:'Microsoft', kw:'microsoft onedrive' },
  { id:'microsoft-teams',       name:'Teams',            cat:'Microsoft', kw:'microsoft teams' },
  { id:'microsoft-office',      name:'Office 365',       cat:'Microsoft', kw:'microsoft office' },
  { id:'microsoft-excel',       name:'Excel',            cat:'Microsoft' },
  { id:'microsoft-word',        name:'Word',             cat:'Microsoft' },
  { id:'microsoft-powerpoint',  name:'PowerPoint',       cat:'Microsoft' },
  { id:'azure',                 name:'Azure',            cat:'Microsoft', kw:'microsoft azure' },
  { id:'microsoft-edge',        name:'Edge',             cat:'Microsoft', kw:'microsoft edge' },
  { id:'bing',                  name:'Bing',             cat:'Microsoft' },
  { id:'windows-11',            name:'Windows',          cat:'Microsoft', kw:'microsoft windows' },
  { id:'xbox',                  name:'Xbox',             cat:'Microsoft' },
  { id:'microsoft-sql-server',  name:'SQL Server',       cat:'Microsoft' },
  { id:'microsoft-sharepoint',  name:'SharePoint',       cat:'Microsoft' },
  { id:'skype',                 name:'Skype',            cat:'Microsoft' },
  // Apple
  { id:'apple',                 name:'Apple',            cat:'Apple' },
  { id:'apple-music',           name:'Apple Music',      cat:'Apple' },
  { id:'apple-tv-plus',         name:'Apple TV+',        cat:'Apple', kw:'apple tv' },
  { id:'apple-podcasts',        name:'Apple Podcasts',   cat:'Apple' },
  { id:'icloud',                name:'iCloud',           cat:'Apple' },
  { id:'safari',                name:'Safari',           cat:'Apple' },
  { id:'apple-maps',            name:'Apple Maps',       cat:'Apple' },
  // Cloud & Dev
  { id:'aws',                   name:'AWS',              cat:'Cloud & Dev', kw:'amazon web services' },
  { id:'digital-ocean',         name:'DigitalOcean',     cat:'Cloud & Dev' },
  { id:'linode',                name:'Linode',           cat:'Cloud & Dev' },
  { id:'vultr',                 name:'Vultr',            cat:'Cloud & Dev' },
  { id:'vercel',                name:'Vercel',           cat:'Cloud & Dev' },
  { id:'netlify',               name:'Netlify',          cat:'Cloud & Dev' },
  { id:'terraform',             name:'Terraform',        cat:'Cloud & Dev' },
  { id:'ansible',               name:'Ansible',          cat:'Cloud & Dev' },
  { id:'kubernetes',            name:'Kubernetes',       cat:'Cloud & Dev', kw:'k8s' },
  { id:'helm',                  name:'Helm',             cat:'Cloud & Dev' },
  { id:'argo-cd',               name:'Argo CD',          cat:'Cloud & Dev', kw:'argocd' },
  { id:'rancher',               name:'Rancher',          cat:'Cloud & Dev' },
  { id:'nginx',                 name:'NGINX',            cat:'Cloud & Dev' },
  { id:'apache',                name:'Apache',           cat:'Cloud & Dev' },
  { id:'nodejs',                name:'Node.js',          cat:'Cloud & Dev', kw:'node' },
  { id:'python',                name:'Python',           cat:'Cloud & Dev' },
  { id:'php',                   name:'PHP',              cat:'Cloud & Dev' },
  { id:'rust',                  name:'Rust',             cat:'Cloud & Dev' },
  { id:'go',                    name:'Go',               cat:'Cloud & Dev', kw:'golang' },
  { id:'angular',               name:'Angular',          cat:'Cloud & Dev' },
  { id:'svelte',                name:'Svelte',           cat:'Cloud & Dev' },
  { id:'reactjs',               name:'React',            cat:'Cloud & Dev', kw:'react' },
  { id:'vue-js',                name:'Vue',              cat:'Cloud & Dev', kw:'vuejs' },
  { id:'nextjs',                name:'Next.js',          cat:'Cloud & Dev', kw:'nextjs' },
  { id:'laravel',               name:'Laravel',          cat:'Cloud & Dev' },
  { id:'ruby-on-rails',         name:'Rails',            cat:'Cloud & Dev', kw:'ruby rails' },
  { id:'bootstrap',             name:'Bootstrap',        cat:'Cloud & Dev' },
  { id:'npm',                   name:'npm',              cat:'Cloud & Dev' },
  { id:'git',                   name:'Git',              cat:'Cloud & Dev' },
  { id:'bitbucket',             name:'Bitbucket',        cat:'Cloud & Dev' },
  { id:'visual-studio-code',    name:'VS Code',          cat:'Cloud & Dev', kw:'vscode visual studio code' },
  { id:'sentry',                name:'Sentry',           cat:'Cloud & Dev' },
  { id:'sonarqube',             name:'SonarQube',        cat:'Cloud & Dev' },
  { id:'coolify',               name:'Coolify',          cat:'Cloud & Dev' },
  { id:'dokploy',               name:'Dokploy',          cat:'Cloud & Dev' },
  { id:'rabbitmq',              name:'RabbitMQ',         cat:'Cloud & Dev' },
  { id:'elasticsearch',         name:'Elasticsearch',    cat:'Cloud & Dev' },
  { id:'vault',                 name:'Vault',            cat:'Cloud & Dev', kw:'hashicorp vault' },
  // AI
  { id:'openai',                name:'OpenAI',           cat:'AI' },
  { id:'chatgpt',               name:'ChatGPT',          cat:'AI', kw:'openai gpt' },
  { id:'claude-ai',             name:'Claude',           cat:'AI', kw:'anthropic claude' },
  { id:'google-gemini',         name:'Gemini',           cat:'AI', kw:'google bard' },
  { id:'microsoft-copilot',     name:'Copilot',          cat:'AI', kw:'microsoft copilot' },
  { id:'github-copilot',        name:'GitHub Copilot',   cat:'AI' },
  { id:'hugging-face',          name:'Hugging Face',     cat:'AI', kw:'huggingface' },
  { id:'ollama',                name:'Ollama',           cat:'AI' },
  { id:'midjourney',            name:'Midjourney',       cat:'AI' },
  { id:'mistral-ai',            name:'Mistral',          cat:'AI' },
  { id:'deepseek',              name:'DeepSeek',         cat:'AI' },
  { id:'grok',                  name:'Grok',             cat:'AI', kw:'xai' },
  { id:'perplexity-light',      name:'Perplexity',       cat:'AI', kw:'perplexity' },
  // Gaming
  { id:'steam',                 name:'Steam',            cat:'Gaming' },
  { id:'epic-games',            name:'Epic Games',       cat:'Gaming' },
  { id:'playstation',           name:'PlayStation',      cat:'Gaming' },
  { id:'nintendo-switch',       name:'Nintendo Switch',  cat:'Gaming' },
  { id:'twitch',                name:'Twitch',           cat:'Gaming' },
  { id:'minecraft',             name:'Minecraft',        cat:'Gaming' },
  { id:'romm',                  name:'RomM',             cat:'Gaming' },
  { id:'pterodactyl',           name:'Pterodactyl',      cat:'Gaming' },
  { id:'terraria',              name:'Terraria',         cat:'Gaming' },
  { id:'kick',                  name:'Kick',             cat:'Gaming' },
  // Streaming
  { id:'netflix',               name:'Netflix',          cat:'Streaming' },
  { id:'spotify',               name:'Spotify',          cat:'Streaming' },
  { id:'disney-plus',           name:'Disney+',          cat:'Streaming', kw:'disney' },
  { id:'prime-video',           name:'Prime Video',      cat:'Streaming', kw:'amazon prime' },
  { id:'max',                   name:'Max',              cat:'Streaming', kw:'hbo' },
  { id:'soundcloud',            name:'SoundCloud',       cat:'Streaming' },
  { id:'deezer',                name:'Deezer',           cat:'Streaming' },
  { id:'tidal',                 name:'Tidal',            cat:'Streaming' },
  { id:'crunchyroll',           name:'Crunchyroll',      cat:'Streaming' },
  { id:'bandcamp',              name:'Bandcamp',         cat:'Streaming' },
  // Shopping & Finance
  { id:'amazon',                name:'Amazon',           cat:'Shopping & Finance' },
  { id:'ebay',                  name:'eBay',             cat:'Shopping & Finance' },
  { id:'aliexpress',            name:'AliExpress',       cat:'Shopping & Finance' },
  { id:'paypal',                name:'PayPal',           cat:'Shopping & Finance' },
  { id:'shopify',               name:'Shopify',          cat:'Shopping & Finance' },
  { id:'woocommerce',           name:'WooCommerce',      cat:'Shopping & Finance' },
  { id:'bitcoin',               name:'Bitcoin',          cat:'Shopping & Finance', kw:'btc crypto' },
  { id:'ethereum',              name:'Ethereum',         cat:'Shopping & Finance', kw:'eth crypto' },
  { id:'firefly-iii',           name:'Firefly III',      cat:'Shopping & Finance' },
  { id:'actual-budget',         name:'Actual Budget',    cat:'Shopping & Finance' },
  { id:'ynab',                  name:'YNAB',             cat:'Shopping & Finance' },
  // Comms & Tools
  { id:'slack',                 name:'Slack',            cat:'Comms & Tools' },
  { id:'zoom',                  name:'Zoom',             cat:'Comms & Tools' },
  { id:'notion',                name:'Notion',           cat:'Comms & Tools' },
  { id:'obsidian',              name:'Obsidian',         cat:'Comms & Tools' },
  { id:'todoist',               name:'Todoist',          cat:'Comms & Tools' },
  { id:'atlassian-trello',      name:'Trello',           cat:'Comms & Tools', kw:'trello' },
  { id:'jira',                  name:'Jira',             cat:'Comms & Tools' },
  { id:'confluence',            name:'Confluence',       cat:'Comms & Tools' },
  { id:'figma',                 name:'Figma',            cat:'Comms & Tools' },
  { id:'excalidraw',            name:'Excalidraw',       cat:'Comms & Tools' },
  { id:'miro',                  name:'Miro',             cat:'Comms & Tools' },
  { id:'dropbox',               name:'Dropbox',          cat:'Comms & Tools' },
  { id:'airtable',              name:'Airtable',         cat:'Comms & Tools' },
  { id:'asana',                 name:'Asana',            cat:'Comms & Tools' },
  { id:'clickup',               name:'ClickUp',          cat:'Comms & Tools' },
  { id:'zapier',                name:'Zapier',           cat:'Comms & Tools' },
  { id:'thunderbird',           name:'Thunderbird',      cat:'Comms & Tools' },
  { id:'proton-mail',           name:'Proton Mail',      cat:'Comms & Tools', kw:'protonmail' },
  { id:'proton-drive',          name:'Proton Drive',     cat:'Comms & Tools' },
  { id:'proton-vpn',            name:'Proton VPN',       cat:'Comms & Tools', kw:'protonvpn' },
  { id:'nordvpn',               name:'NordVPN',          cat:'Comms & Tools' },
  { id:'mullvad',               name:'Mullvad',          cat:'Comms & Tools' },
  { id:'rocket-chat',           name:'Rocket.Chat',      cat:'Comms & Tools' },
  { id:'mattermost',            name:'Mattermost',       cat:'Comms & Tools' },
  { id:'matrix',                name:'Matrix',           cat:'Comms & Tools' },
  { id:'element',               name:'Element',          cat:'Comms & Tools' },
  { id:'1password',             name:'1Password',        cat:'Comms & Tools' },
  { id:'lastpass',              name:'LastPass',         cat:'Comms & Tools' },
  { id:'keepassxc',             name:'KeePassXC',        cat:'Comms & Tools', kw:'keepass' },
  // Hardware & OS
  { id:'raspberry-pi',          name:'Raspberry Pi',     cat:'Hardware & OS' },
  { id:'arduino',               name:'Arduino',          cat:'Hardware & OS' },
  { id:'nvidia',                name:'NVIDIA',           cat:'Hardware & OS' },
  { id:'amd',                   name:'AMD',              cat:'Hardware & OS' },
  { id:'linux',                 name:'Linux',            cat:'Hardware & OS' },
  { id:'fedora',                name:'Fedora',           cat:'Hardware & OS' },
  { id:'arch-linux',            name:'Arch Linux',       cat:'Hardware & OS', kw:'arch' },
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
    const inTerm = !q || ic.name.toLowerCase().includes(q) || ic.id.includes(q) || (ic.kw && ic.kw.includes(q));
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
  // Graph histories are arrays of { t, v } samples (t = performance.now() at
  // arrival). Each point's x position is derived purely from its own
  // timestamp, so uneven poll gaps can never shift already-drawn points
  // (see graphFrame).
  cpuHist: [],
  ramHist: [],
  netHist: [],
  upHist: [],
  dispDown: 0, dispUpVal: 0,
  netMaxDisp: 10, lastSampleTs: 0, glancesTs: null,
  // Network-Throughput-Kachel: anpassbarer Zeitraum & Skala
  netRangeMs: 60000,        // sichtbares Zeitfenster (10s/1m/10m/1h)
  netScaleMode: 'auto',     // 'auto' | 'line' | 'fixed'
  netScaleMax: 100,         // fester Max-Wert (Mbit/s) wenn netScaleMode='fixed'
  netLineSpeed: 0,          // Link-Speed (Mbit/s) fuer netScaleMode='line'
  netIfacePref: '',         // gewaehltes Interface ('' = automatisch)
  netIfaces: [],            // zuletzt gemeldete Interface-Liste (fuer Dropdown)
  netSource: null,          // 'ssh' | 'glances'
  // WAN (UniFi-Gateway): Internet-Durchsatz fuer die Durchsatz-Kachel
  wanDown: 0, wanUp: 0,             // Zielwerte aus SSE (Mbit/s)
  dispWanDown: 0, dispWanUp: 0,     // geglaettete Anzeigewerte
  wanHist: [], wanUpHist: [],       // Ringpuffer wie netHist/upHist
  wanStatus: null,                  // UniFi-WAN-Status ('ok'/'error'/... , null = nie empfangen)
  wanTs: 0,                         // Server-ts des letzten Samples (Dedupe wan-Event vs. net.wan)
  _wanRxAt: 0,                      // Empfangszeit (performance.now()) fuer Staleness
  _wanShown: false,                 // ob die WAN-Zeile gerade Werte (statt '–') zeigt
  netChartSeries: 'unraid',         // Chart-Datenquelle: 'unraid' | 'wan' | 'both'
  netFlowOn: true,                  // Spiegel der 'flow'-Option (kein DOM-Read im rAF)
  netPktShape: 'block',             // Paket-Form der Flow-Animation: 'block' | 'dot'
  netTrailOn: true,                 // Trail hinter Block-Paketen
  liveOn: true, gridOn: true, animOn: true, glassOn: true, searchOn: true,
  updateMs: 1600, accent: '#5b9dff',
  settingsCategory: 'general',
  settingsTab: null,
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
let vmTimer = null;
let udkTimer = null; // Unraid Docker
let uarTimer = null; // Unraid Array/Disks
let ushTimer = null; // Unraid Shares
let unoTimer = null; // Unraid Meldungen
let usyTimer = null; // Unraid System
let uupTimer = null; // Unraid USV

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
// Keeps one DOM node per item, keyed by keyFn(item), instead of tearing the
// whole list down and rebuilding it on every poll. Reuses existing nodes for
// keys that persist (patches in place via updateFn(node, item, prevItem) —
// updateFn is expected to compare against prevItem and only touch the DOM
// for fields that actually changed), creates nodes for new keys (createFn),
// removes nodes whose key disappeared, and reorders only when a node isn't
// already in the right position. This also makes an unchanged payload a
// cheap no-op walk (no DOM writes at all), so redundant polls stay cheap.
// Diff state lives on the container element itself (container._diffMap).
function diffList(container, items, keyFn, createFn, updateFn) {
  if (!container) return;
  let map = container._diffMap;
  if (!map) {
    // First time this container is diffed: purge any static placeholder
    // markup shipped in index.html (e.g. the demo disk rows) so it isn't
    // left behind alongside the real, diffed rows.
    container.innerHTML = '';
    map = container._diffMap = new Map();
  }
  const seen = new Set();
  let prevNode = null;
  for (const item of items) {
    const key = keyFn(item);
    seen.add(key);
    let entry = map.get(key);
    if (!entry) {
      entry = { node: createFn(item), data: undefined };
      map.set(key, entry);
    }
    updateFn(entry.node, item, entry.data);
    entry.data = item;
    const wantNext = prevNode ? prevNode.nextSibling : container.firstChild;
    if (wantNext !== entry.node) container.insertBefore(entry.node, wantNext);
    prevNode = entry.node;
  }
  for (const [key, entry] of map) {
    if (!seen.has(key)) { entry.node.remove(); map.delete(key); }
  }
}
// Assigns innerHTML only when the markup actually changed (cached on the
// element) — repeated polls with identical payloads become a string compare
// instead of a DOM teardown + layout pass.
function setHtmlIfChanged(el, html) {
  if (el._lastHtml === html) return;
  el._lastHtml = html;
  el.innerHTML = html;
}
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
/* Time-based sparklines: each history entry is { t, v } and its x position
   is w − (now − t) · (w / windowMs). A point's position depends only on its
   own timestamp, so the line scrolls left at constant speed and a new sample
   merely adds a vertex near the right edge — nothing already on screen ever
   shifts, no matter how early/late or irregular the samples arrive. (The
   previous model interpolated a progress value against an *estimated* poll
   interval and re-anchored the whole array on every sample; any mismatch
   between estimate and reality made the entire line jump once per poll.) */
const CPU_HIST_N = 46, NET_HIST_N = 40; // visual point density, as before
function histWindowMs(n) { return (n - 1) * (state.updateMs || 1600); }

// --- Network-Throughput: Zeitraum-Presets & Draw-Downsampling ---------------
// Der Netz-Verlauf wird bis NET_MAX_RANGE_MS (1h) im Speicher gehalten, das
// SICHTBARE Fenster (state.netRangeMs) davon aber entkoppelt. Beim Zeichnen
// wird auf NET_DRAW_POINTS reduziert -> konstante Zeichenkosten, auch bei 1h.
const NET_RANGES = [
  { id: '10s', ms: 10000,   label: '10s' },
  { id: '1m',  ms: 60000,   label: '1m'  },
  { id: '10m', ms: 600000,  label: '10m' },
  { id: '1h',  ms: 3600000, label: '1h'  },
];
const NET_MAX_RANGE_MS  = 3600000;
const NET_DRAW_POINTS   = 200;
const NET_SCALE_PRESETS = [100, 250, 500, 1000]; // Mbit/s
// Appends a sample. Seeds a flat line when the history is empty or the gap
// since the previous sample exceeds the window (tab was hidden, Glances was
// down) — otherwise that gap would render as one long diagonal. Prunes
// points that scrolled out on the left, keeping one beyond the edge so the
// polyline still crosses it (SVG clips the rest).
function pushSample(arr, t, v, windowMs) {
  const last = arr[arr.length - 1];
  if (last && t - last.t > windowMs) arr.length = 0;
  if (!arr.length) arr.push({ t: t - windowMs, v });
  arr.push({ t, v });
  const cutoff = t - windowMs;
  while (arr.length > 2 && arr[1].t < cutoff) arr.shift();
}
// Sichtbare Punkte im Fenster [now-windowMs, now] (plus einer links davor, damit
// die Linie den Rand erreicht), peak-preserving auf max. maxPts heruntergesampelt.
function netDrawArr(arr, now, windowMs, maxPts) {
  const n = arr.length;
  if (!n) return arr;
  const start = now - windowMs;
  let i0 = 0;
  while (i0 < n - 1 && arr[i0 + 1].t < start) i0++; // letzter Punkt vor dem Fenster
  const vis = arr.slice(i0);
  const m = vis.length;
  if (m <= maxPts) return vis;
  const out = [];
  const bucket = m / maxPts;
  for (let i = 0; i < maxPts; i++) {
    const s = Math.floor(i * bucket);
    const e = Math.min(m, Math.floor((i + 1) * bucket));
    let best = vis[s];
    for (let j = s + 1; j < e; j++) if (vis[j].v > best.v) best = vis[j];
    out.push(best);
  }
  return out;
}
function maxInArr(arr) { let m = 0; for (let i = 0; i < arr.length; i++) if (arr[i].v > m) m = arr[i].v; return m; }
// Ziel-Obergrenze der vertikalen Skala je nach Modus. `peak` = Maximum ueber
// alle aktuell GEZEICHNETEN Serien (Unraid und/oder WAN).
function netScaleTarget(peak) {
  if (state.netScaleMode === 'fixed' && state.netScaleMax > 0) return state.netScaleMax;
  if (state.netScaleMode === 'line'  && state.netLineSpeed > 0) return state.netLineSpeed;
  return Math.max(10, peak * 1.15); // auto
}
function sparkPoints(arr, w, h, max, pad, now, windowMs) {
  const n = arr.length;
  const mx = max || 1;
  const pd = pad || 0;
  const eff = h - pd;
  const pxPerMs = w / windowMs;
  const y = (v) => (pd + eff - (v / mx) * eff);
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `${(w - (now - arr[i].t) * pxPerMs).toFixed(2)},${y(arr[i].v).toFixed(2)} `;
  }
  return s + `${w},${y(arr[n - 1].v).toFixed(2)}`; // right edge: hold current value
}
function areaPoints(arr, w, h, max, pad, now, windowMs) {
  const x0 = (w - (now - arr[0].t) * (w / windowMs)).toFixed(2);
  return `${x0},${h} ${sparkPoints(arr, w, h, max, pad, now, windowMs)} ${w},${h}`;
}
function fmtNet(v) {
  if (v >= 100) return v.toFixed(0);
  if (v >= 10)  return v.toFixed(1);
  return v.toFixed(2);
}

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
   CPU/RAM and network lines scroll time-based continuously to the left
   (see sparkPoints). The big network numbers count up smoothly, the network
   scale is smoothed. With animations disabled nothing is written per frame;
   the graphs are drawn once per new sample instead (dirty flag). */
function maxOfTwo(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) if (a[i].v > m) m = a[i].v;
  for (let i = 0; i < b.length; i++) if (b[i].v > m) m = b[i].v;
  return m;
}

let graphRafStarted = false;
let _graphFrameHandle = null;
let _graphDirty = false; // set on new sample / animOn or updateMs change
function graphFrame() {
  const anim = state.animOn;
  if ((state.cpuHist.length || state.netHist.length || state.wanHist.length) && (anim || _graphDirty)) {
    _graphDirty = false;
    // With animations off, draw the static frame anchored at the last sample
    // so the newest point sits exactly on the right edge.
    const now = anim ? performance.now() : state.lastSampleTs;

    // System: CPU + RAM (feste Skala 0..100) – abgeleitetes Fenster wie bisher
    if (state.cpuHist.length) {
      const cpuWin = histWindowMs(CPU_HIST_N);
      setAttr('cpuArea', 'points', areaPoints(state.cpuHist, 460, 64, 100, 0, now, cpuWin));
      setAttr('cpuLine', 'points', sparkPoints(state.cpuHist, 460, 64, 100, 0, now, cpuWin));
      setAttr('ramLine', 'points', sparkPoints(state.ramHist, 460, 64, 100, 0, now, cpuWin));
    }

    // Network: eigenes, umschaltbares Zeitfenster + Downsampling auf NET_DRAW_POINTS.
    if (state.netHist.length || state.wanHist.length) {
      const netWin = state.netRangeMs || 60000;
      // Serienauswahl (Kachel-Option): Unraid / WAN / beides.
      // 'wan' ohne WAN-Daten faellt auf Unraid zurueck (kein leeres Chart).
      const sel = state.netChartSeries;
      const wantWan    = (sel === 'wan' || sel === 'both') && state.wanHist.length > 0;
      const wantUnraid = sel === 'unraid' || sel === 'both' || !wantWan;
      const dlArr  = wantUnraid && state.netHist.length ? netDrawArr(state.netHist,   now, netWin, NET_DRAW_POINTS) : [];
      const ulArr  = wantUnraid && state.upHist.length  ? netDrawArr(state.upHist,    now, netWin, NET_DRAW_POINTS) : [];
      const wdlArr = wantWan ? netDrawArr(state.wanHist,   now, netWin, NET_DRAW_POINTS) : [];
      const wulArr = wantWan ? netDrawArr(state.wanUpHist, now, netWin, NET_DRAW_POINTS) : [];
      // Skala: auto (geglaettet) / fest / Leitung — Peak ueber alle gezeichneten Serien
      const peak = Math.max(maxInArr(dlArr), maxInArr(ulArr), maxInArr(wdlArr), maxInArr(wulArr));
      const targetMax = netScaleTarget(peak);
      const ease = state.netScaleMode === 'auto' ? (anim ? 0.08 : 1) : 1;
      state.netMaxDisp += (targetMax - state.netMaxDisp) * ease;
      const nm = state.netMaxDisp || targetMax;
      // Flaeche folgt der Download-Linie der fuehrenden Serie (Unraid, sonst WAN).
      if (dlArr.length) {
        setAttr('netArea', 'points', areaPoints(dlArr, 380, 80, nm, 6, now, netWin));
        setAttr('netLine', 'points', sparkPoints(dlArr, 380, 80, nm, 6, now, netWin));
      } else {
        setAttr('netArea', 'points', wdlArr.length ? areaPoints(wdlArr, 380, 80, nm, 6, now, netWin) : '');
        setAttr('netLine', 'points', '');
      }
      setAttr('upLine',    'points', ulArr.length  ? sparkPoints(ulArr,  380, 80, nm, 6, now, netWin) : '');
      setAttr('wanLine',   'points', wdlArr.length ? sparkPoints(wdlArr, 380, 80, nm, 6, now, netWin) : '');
      setAttr('wanUpLine', 'points', wulArr.length ? sparkPoints(wulArr, 380, 80, nm, 6, now, netWin) : '');
      setText('netScaleMax', fmtNet(nm));
    }

    // Smoothly count up the big ↓/↑ numbers
    const k = anim ? 0.12 : 1;
    state.dispDown  += (state.netDown - state.dispDown) * k;
    state.dispUpVal += (state.netUp   - state.dispUpVal) * k;
    if (Math.abs(state.netDown - state.dispDown)  < 0.04) state.dispDown  = state.netDown;
    if (Math.abs(state.netUp   - state.dispUpVal) < 0.04) state.dispUpVal = state.netUp;
    setText('netDown', fmtNet(state.dispDown));
    setText('netUp', fmtNet(state.dispUpVal));

    // WAN-Zeile: langsameres Easing (Samples nur ~alle 3 s -> Wert gleitet dazwischen).
    const kw = anim ? 0.05 : 1;
    state.dispWanDown += (state.wanDown - state.dispWanDown) * kw;
    state.dispWanUp   += (state.wanUp   - state.dispWanUp)   * kw;
    if (Math.abs(state.wanDown - state.dispWanDown) < 0.04) state.dispWanDown = state.wanDown;
    if (Math.abs(state.wanUp   - state.dispWanUp)   < 0.04) state.dispWanUp   = state.wanUp;
    // Staleness ueber die Client-Uhr (immun gegen Server-/Client-Drift): nach 30 s
    // ohne frisches Sample zeigt die Zeile '–' und wird gedimmt.
    const wanFresh = state._wanRxAt > 0 && (performance.now() - state._wanRxAt) < 30000;
    if (wanFresh !== state._wanShown) {
      state._wanShown = wanFresh;
      const row = $('netRowWan'); if (row) row.classList.toggle('stale', !wanFresh && state._wanRxAt > 0);
      if (!wanFresh) { setText('wanDown', '–'); setText('wanUp', '–'); }
    }
    if (wanFresh) {
      setText('wanDown', fmtNet(state.dispWanDown));
      setText('wanUp',   fmtNet(state.dispWanUp));
    }

    // Paket-Animation (Y-Topologie) an die aktuellen Durchsaetze koppeln
    updateNetFlow();
  }

  _graphFrameHandle = requestAnimationFrame(graphFrame);
}
function startGraphAnim() {
  if (graphRafStarted) return;
  graphRafStarted = true;
  _graphFrameHandle = requestAnimationFrame(graphFrame);
}
// Counterpart to startGraphAnim(): stops the rAF loop entirely (used when
// the tab is hidden) instead of letting it run at full cost unseen.
function pauseGraphAnim() {
  if (!graphRafStarted) return;
  graphRafStarted = false;
  if (_graphFrameHandle != null) { cancelAnimationFrame(_graphFrameHandle); _graphFrameHandle = null; }
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
function createDiskRow(d) {
  const wrap = document.createElement('div');
  wrap.innerHTML =
    `<div style="display:flex;align-items:center;gap:7px;font:500 11px 'JetBrains Mono',monospace;margin-bottom:5px">` +
      `<span class="dr-icon" style="flex-shrink:0;display:flex"></span>` +
      `<span class="dr-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0"></span>` +
      `<span class="dr-size" style="margin-left:auto;flex-shrink:0"></span>` +
    `</div>` +
    `<div class="disk-track"><div class="disk-fill"></div></div>`;
  wrap._icon = wrap.querySelector('.dr-icon');
  wrap._name = wrap.querySelector('.dr-name');
  wrap._size = wrap.querySelector('.dr-size');
  wrap._fill = wrap.querySelector('.disk-fill');
  return wrap;
}
function updateDiskRow(wrap, d, prev) {
  const pct = Math.min(100, Math.max(0, d.percent || 0));
  const warnCls = pct >= DISK_CRIT ? 'disk-crit' : pct >= DISK_WARN ? 'disk-warn' : '';
  const accent  = pct >= DISK_CRIT ? '#f43f5e' : pct >= DISK_WARN ? '#ffb454' : null;
  const name = d.label || d.name;

  if (!prev || prev._warnCls !== warnCls) wrap.className = warnCls;
  if (!prev || prev.name !== name || prev.label !== d.label || prev._accent !== accent)
    wrap._icon.innerHTML = diskIconSvg(d, accent);
  if (!prev || prev.name !== name || prev.label !== d.label || prev.fsType !== d.fsType)
    wrap._name.innerHTML = `${name}<span style="color:var(--text-3)"> · ${d.fsType}</span>`;
  if (!prev || prev.usedBytes !== d.usedBytes || prev.sizeBytes !== d.sizeBytes || prev._accent !== accent) {
    wrap._size.style.color = accent || 'var(--text-3)';
    wrap._size.textContent = `${fmtSize(d.usedBytes)} / ${fmtSize(d.sizeBytes)}`;
  }
  if (!prev || prev.percent !== pct) wrap._fill.style.transform = `scaleX(${pct / 100})`;
  d._warnCls = warnCls; d._accent = accent; // stashed on the item for the next comparison
}
function renderDisks(disks, total) {
  const grid = $('diskGrid');
  diffList(grid, disks, (d) => d.mnt, createDiskRow, updateDiskRow);
  if (total) setText('diskTotalLabel', `${fmtSize(total.used)} / ${fmtSize(total.size)}`);
}

/* ---------- Glances polling ---------- */
function setHost(text, color) {
  const el = $('sysHost');
  if (el) { el.textContent = text; el.style.color = color; }
}
// Gemeinsame Netz-Aufnahme (Glances-Fallback ODER schneller SSH-Stream). Haelt
// den Verlauf 1h vor (NET_MAX_RANGE_MS), das sichtbare Fenster wird beim
// Zeichnen daraus geschnitten (state.netRangeMs).
function ingestNet(down, up, iface, hostLabel) {
  down = Math.max(0, +down || 0);
  up   = Math.max(0, +up   || 0);
  state.netDown = down;
  state.netUp = up;
  if (iface) {
    setText('netIface', iface);
    const sep = $('netIfaceSep'); if (sep) sep.style.display = '';
  }
  if (hostLabel) setText('netHost', hostLabel);
  const now = performance.now();
  pushSample(state.netHist, now, down, NET_MAX_RANGE_MS);
  pushSample(state.upHist,  now, up,   NET_MAX_RANGE_MS);
  if (!seeded) {
    state.dispDown = down;
    state.dispUpVal = up;
    state.netMaxDisp = Math.max(10, Math.max(down, up) * 1.15);
    seeded = true;
  }
  state.lastSampleTs = now;
  _graphDirty = true;
}

// Schnelles Netz-Event (SSE 'net') – primaere Live-Quelle (SSH /proc/net/dev).
function applyNet(d) {
  if (!d) return;
  state.netSource = d.source || 'ssh';
  if (Array.isArray(d.ifaces)) state.netIfaces = d.ifaces;
  let down = d.rxMbit, up = d.txMbit, iface = d.iface;
  // Client-seitige Interface-Auswahl (Override), falls im Event enthalten.
  if (state.netIfacePref && d.all && d.all[state.netIfacePref]) {
    down = d.all[state.netIfacePref].rxMbit;
    up   = d.all[state.netIfacePref].txMbit;
    iface = state.netIfacePref;
  }
  ingestNet(down, up, iface, null);
  if (d.wan) ingestWan(d.wan); // WAN-Huckepack am net-Sample
}

// WAN-Sample (UniFi-Gateway) aufnehmen. Kommt doppelt an (eigenes 'wan'-Event
// + Huckepack an 'net'-Events) -> Dedupe ueber den Server-Zeitstempel.
function ingestWan(w) {
  if (!w || !w.ts || w.ts === state.wanTs) return;
  state.wanTs = w.ts;
  state.wanStatus = w.status || null;
  if (w.rxMbit == null) return; // Fehler-/Leersample: Werte behalten, Staleness laeuft weiter
  state.wanDown = Math.max(0, +w.rxMbit || 0);
  state.wanUp   = Math.max(0, +w.txMbit || 0);
  const now = performance.now();
  state._wanRxAt = now;
  pushSample(state.wanHist,   now, state.wanDown, NET_MAX_RANGE_MS);
  pushSample(state.wanUpHist, now, state.wanUp,   NET_MAX_RANGE_MS);
  _graphDirty = true;
}

function applyMetrics(d) {
  // Dedupe: the server tags every real Glances fetch with a sample timestamp
  // and replays it for cache hits / stale fallbacks. An unchanged ts means
  // "same sample as last time" — pushing it again would insert duplicate
  // graph points and make rings/values only visibly change on every n-th
  // poll (the old rhythmic-stutter beat between poll rate and cache TTL).
  if (d.ts && d.ts === state.glancesTs) return;
  state.glancesTs = d.ts || null;

  state.cpu = d.cpu != null ? d.cpu : state.cpu;
  state.ram = d.mem ? d.mem.percent : state.ram;
  state.cpuTemp = d.cpuTemp != null ? d.cpuTemp : state.cpuTemp;

  const now = performance.now();
  pushSample(state.cpuHist, now, state.cpu, histWindowMs(CPU_HIST_N));
  pushSample(state.ramHist, now, state.ram, histWindowMs(CPU_HIST_N));
  // Netz nur aus Glances aufnehmen, wenn KEINE schnelle SSH-Quelle aktiv ist.
  if (state.netSource !== 'ssh' && d.net) {
    ingestNet(d.net.rxMbit, d.net.txMbit, d.net.iface, d.label || 'host');
    state.netSource = state.netSource || 'glances';
    if (d.net.speedMbit) state.netLineSpeed = d.net.speedMbit;
  }
  state.lastSampleTs = now;
  _graphDirty = true;

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
function markGlancesConnected() {
  setText('glancesSettingsStatus', '● connected');
  const gs = $('glancesSettingsStatus'); if (gs) gs.style.color = '#3ddc97';
}
function markGlancesError(d) {
  const msg = d && d.error === 'not_configured' ? 'glances not configured' : 'glances offline';
  setHost(msg, '#f43f5e');
  setText('glancesSettingsStatus', '● ' + msg);
  const gs = $('glancesSettingsStatus'); if (gs) gs.style.color = '#f43f5e';
}

/* ---------- Live-Metriken: SSE-Push (Primaer) + Polling-Fallback ----------
   Ein einziger Server-Sent-Events-Stream liefert schnelle 'net'-Events (SSH
   /proc/net/dev, ~0.5 s) und moderate 'glances'-Events (CPU/RAM/Disk). Kein
   Poll-Warten, ein Stream fuer alle Tabs. Faellt SSE aus (nie verbunden),
   wird transparent auf das bisherige /api/glances-Polling zurueckgeschaltet. */
let metricsEs = null;
let _esConnected = false;
let _esFails = 0;
function openMetricsStream() {
  closeMetricsStream();
  clearInterval(dataTimer); dataTimer = null;
  let es;
  try { es = new EventSource('/api/glances/stream'); }
  catch (_) { return startGlancesFallbackPoll(); }
  metricsEs = es;
  es.addEventListener('net', (e) => {
    try { applyNet(JSON.parse(e.data)); } catch (_) { return; }
    _esConnected = true; _esFails = 0; markGlancesConnected();
  });
  es.addEventListener('wan', (e) => {
    try { ingestWan(JSON.parse(e.data)); } catch (_) { /* ignore */ }
  });
  es.addEventListener('glances', (e) => {
    let d; try { d = JSON.parse(e.data); } catch (_) { return; }
    _esConnected = true; _esFails = 0;
    if (!d || !d.ok) { markGlancesError(d); return; }
    applyMetrics(d); markGlancesConnected();
  });
  es.onopen = () => { _esConnected = true; _esFails = 0; };
  es.onerror = () => {
    _esFails++;
    // Nie verbunden und mehrfach fehlgeschlagen -> Server kann kein SSE -> Polling.
    if (!_esConnected && _esFails >= 3) startGlancesFallbackPoll();
    // Andernfalls reconnectet EventSource selbsttaetig.
  };
}
function closeMetricsStream() {
  if (metricsEs) { try { metricsEs.close(); } catch (_) {} metricsEs = null; }
  _esConnected = false; _esFails = 0;
}
function startGlancesFallbackPoll() {
  closeMetricsStream();
  clearInterval(dataTimer);
  pollGlances();
  dataTimer = setInterval(pollGlances, state.updateMs || 1600);
}
function startGlances() {
  clearInterval(dataTimer); dataTimer = null;
  if (typeof window !== 'undefined' && window.EventSource) openMetricsStream();
  else startGlancesFallbackPoll();
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
function createDockerRow(c) {
  const row = document.createElement('div');
  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;font:500 12px 'JetBrains Mono',monospace";
  row.innerHTML =
    `<div style="display:flex;align-items:center;gap:9px;min-width:0">` +
    `<span class="dk-dot" style="width:6px;height:6px;border-radius:50%;flex-shrink:0"></span>` +
    `<span class="dk-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span></div>` +
    `<span class="dk-right" style="color:var(--text-3);flex-shrink:0;padding-left:10px"></span>`;
  row._dot = row.querySelector('.dk-dot');
  row._name = row.querySelector('.dk-name');
  row._right = row.querySelector('.dk-right');
  return row;
}
function updateDockerRow(row, c, prev) {
  const right = c.state === 'paused' ? 'paused'
    : c.state === 'stopped' ? 'stopped'
    : `${c.cpu != null ? c.cpu : 0}% · ${fmtMem(c.mem)}`;
  if (!prev || prev.state !== c.state) row._dot.style.background = DOCKER_DOT[c.state] || '#6b7689';
  if (!prev || prev.name !== c.name) row._name.textContent = c.name;
  if (!prev || prev.state !== c.state || prev.cpu !== c.cpu || prev.mem !== c.mem) row._right.textContent = right;
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
  let containers = d.containers || [];
  if (_cfgVal('docker', 'hideStopped')) containers = containers.filter((c) => c.state !== 'stopped');
  diffList(list, _cfgLimit('docker', 'maxRows', containers), (c) => c.name, createDockerRow, updateDockerRow);
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

/* ---------- Unraid VMs (via GraphQL API) ---------- */
const VM_DOT = { running: '#3ddc97', paused: '#ffb454', stopped: '#f43f5e' };
let _vmManageUrl = null;   // Unraid VM-Manager-URL (VNC-Fallback ohne SSH)
let _vmSshEnabled = false; // true -> eingebettete noVNC-Konsole verfuegbar
let _vmById = {};          // letzte VM-Daten je id (fuer Modal-Refresh)

// Aktions-Metadaten: Label + Button-Stil + ob eine Rueckfrage noetig ist.
const VM_ACTION_META = {
  start:     { label: '▶ Start',      cls: 'start', confirm: false },
  stop:      { label: '■ Stop',       cls: 'stop',  confirm: true  },
  pause:     { label: '⏸ Pause',      cls: '',      confirm: false },
  resume:    { label: '▶ Resume',     cls: 'start', confirm: false },
  reboot:    { label: '↻ Reboot',     cls: '',      confirm: true  },
  forceStop: { label: '⏻ Force-Stop', cls: 'stop',  confirm: true  },
};
// Primaere Inline-Aktion je Status (der prominente Button in der Kachel-Zeile).
const VM_PRIMARY = { stopped: 'start', running: 'stop', paused: 'resume' };
// Volle Aktionsliste je Status (fuer das Detail-Modal).
const VM_ACTIONS_BY_STATE = {
  stopped: ['start'],
  running: ['stop', 'pause', 'reboot', 'forceStop'],
  paused:  ['resume', 'stop', 'forceStop'],
};

function vmStateLabel(vm) {
  const raw = (vm.rawState || vm.state || '').toString().toLowerCase();
  return raw ? raw.replace(/_/g, ' ') : vm.state;
}
function setVmBadge(text, color) {
  const el = $('vmBadge');
  if (!el) return;
  el.style.color = color;
  el.innerHTML = `<span style="width:6px;height:6px;border-radius:2px;background:${color}"></span>${text}`;
}
function setVmSettingsStatus(text, color) {
  const el = $('unraidSettingsStatus');
  if (!el) return;
  el.textContent = '● ' + text;
  el.style.color = color;
}

function makeVmBtn(label, cls, onClick) {
  const b = document.createElement('button');
  b.className = 'vm-btn' + (cls ? ' ' + cls : '');
  b.textContent = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(b); });
  return b;
}

function createVmRow(vm) {
  const row = document.createElement('div');
  row.className = 'vm-row';
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
  row.innerHTML =
    `<div style="display:flex;align-items:center;gap:9px;min-width:0">` +
      `<span class="vm-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0"></span>` +
      `<div style="min-width:0">` +
        `<div class="vm-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:500 12px 'JetBrains Mono',monospace"></div>` +
        `<div class="vm-state" style="font:500 9px 'JetBrains Mono',monospace;color:var(--text-3);margin-top:1px;text-transform:capitalize"></div>` +
      `</div>` +
    `</div>`;
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0';
  const primary = makeVmBtn('', '', (btn) => {
    const a = VM_PRIMARY[row._vm.state];
    if (a) vmAction(row._vm.id, a, btn);
  });
  const rdp = makeVmBtn('RDP', '', () => openVmRdp(row._vm));
  rdp.style.display = 'none'; // nur fuer Windows-VMs
  const vnc = makeVmBtn('VNC', '', () => openVmConsole(row._vm));
  const details = makeVmBtn('⋯', 'vm-more', () => openVmDetails(row._vm)); // bleibt bei „Aktions-Buttons aus" sichtbar
  actions.append(primary, rdp, vnc, details);
  row.appendChild(actions);
  row._dot = row.querySelector('.vm-dot');
  row._name = row.querySelector('.vm-name');
  row._stateEl = row.querySelector('.vm-state');
  row._primary = primary;
  row._rdp = rdp;
  return row;
}
function updateVmRow(row, vm, prev) {
  row._vm = vm;
  if (!prev || prev.state !== vm.state) row._dot.style.background = VM_DOT[vm.state] || '#6b7689';
  if (!prev || prev.name !== vm.name) row._name.textContent = vm.name;
  const label = vmStateLabel(vm);
  if (!prev || vmStateLabel(prev) !== label) row._stateEl.textContent = label;
  if (!prev || prev.state !== vm.state) {
    const a = VM_PRIMARY[vm.state];
    const meta = a && VM_ACTION_META[a];
    row._primary.textContent = meta ? meta.label : '–';
    row._primary.className = 'vm-btn' + (meta && meta.cls ? ' ' + meta.cls : '');
    row._primary.disabled = !meta;
  }
  if (!prev || prev.isWindows !== vm.isWindows) row._rdp.style.display = vm.isWindows ? '' : 'none';
}
function renderVms(d) {
  _vmManageUrl = d.manageUrl || null;
  _vmSshEnabled = !!d.sshEnabled;
  _vmById = {};
  (d.vms || []).forEach((v) => { _vmById[v.id] = v; });
  setVmBadge(d._stale ? 'stale' : (d.running != null ? d.running + ' running' : 'unraid'), d._stale ? '#ffb454' : '#3ddc97');
  setText('vmCount', d.total != null ? d.total : '–');

  const parts = [`<span style="color:#3ddc97">${d.running || 0} running</span>`];
  if (d.paused) parts.push(`<span style="color:#ffb454">${d.paused} paused</span>`);
  if (d.stopped) parts.push(`<span style="color:#6b7689">${d.stopped} stopped</span>`);
  const sum = $('vmSummary');
  if (sum) sum.innerHTML = 'VMs · ' + parts.join(' · ');

  const list = $('vmList');
  if (list) diffList(list, _cfgLimit('unraid-vms', 'maxRows', d.vms || []), (v) => v.id, createVmRow, updateVmRow);
  if (_vmModalVm) refreshVmModal(); // offenes Modal aktualisieren
}
async function pollVms() {
  if (!state.liveOn) return;
  try {
    const res = await fetch('/api/vms', { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) {
      const msg = d && d.error === 'not_configured' ? 'not configured' : 'offline';
      setVmBadge(msg, '#f43f5e');
      setVmSettingsStatus(msg, '#f43f5e');
      return;
    }
    renderVms(d);
    setVmSettingsStatus(`${d.running || 0} running · ${d.total} VMs`, '#3ddc97');
  } catch (err) {
    setVmBadge('offline', '#f43f5e');
    setVmSettingsStatus('offline', '#f43f5e');
    console.warn('VM poll failed:', err.message);
  }
}
const VM_POLL_MS = 10000;
function startVms() {
  clearInterval(vmTimer);
  pollVms();
  vmTimer = setInterval(pollVms, VM_POLL_MS);
}

// Fuehrt eine VM-Aktion aus. `btn` (optional) wird bis zum Refresh deaktiviert.
async function vmAction(id, action, btn) {
  const meta = VM_ACTION_META[action];
  if (!meta) return;
  const vm = _vmById[id] || {};
  if (meta.confirm && !confirm(`VM „${vm.name || id}" wirklich ${meta.label.replace(/^[^ ]+ /, '').toLowerCase()}?`)) return;
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('/api/vm/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) console.warn('VM action failed:', action, d.error || r.status);
  } catch (err) {
    console.warn('VM action error:', err.message);
  } finally {
    if (btn) btn.disabled = false;
    pollVms(); // Status sofort neu holen (Server-Cache wurde invalidiert)
  }
}

// VNC: bei konfiguriertem SSH die eingebettete noVNC-Konsole (an Unraids Login
// vorbei), sonst Fallback auf Unraids VM-Manager in neuem Tab.
let _vmConsoleUrl = null;
function openVmConsole(vm) {
  if (!_vmSshEnabled) {
    if (_vmManageUrl) window.open(_vmManageUrl, '_blank', 'noopener');
    return;
  }
  const url = '/vnc.html?id=' + encodeURIComponent(vm.id) + '&name=' + encodeURIComponent(vm.name || '');
  _vmConsoleUrl = url;
  const frame = $('vmConsoleFrame');
  if (frame) frame.src = url;
  setText('vmConsoleName', vm.name || 'VNC');
  const m = $('vmConsoleModal');
  if (m) m.style.display = 'flex';
}
function closeVmConsole() {
  const m = $('vmConsoleModal');
  if (m) m.style.display = 'none';
  const frame = $('vmConsoleFrame');
  if (frame) frame.src = 'about:blank'; // WS-Sitzung beenden
  _vmConsoleUrl = null;
}

// RDP: laedt die .rdp-Datei vom Server (Gast-IP wird dort ermittelt) und startet
// den nativen RDP-Client. Fehlt der Host, Hinweis auf die Einstellungen.
async function openVmRdp(vm) {
  try {
    const r = await fetch('/api/vm/rdp?id=' + encodeURIComponent(vm.id), { cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('rdp')) {
      const d = await r.json().catch(() => ({}));
      if (d.error === 'needs_host') {
        alert('Keine IP-Adresse der VM gefunden.\n\nHinterlege den RDP-Host in den Einstellungen unter „Unraid VMs → VMs & RDP", oder installiere den QEMU-Gastagent in der VM.');
      } else {
        alert('RDP konnte nicht gestartet werden: ' + (d.error || r.status));
      }
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (vm.name || 'vm').replace(/[^a-zA-Z0-9 _.\-]/g, '_') + '.rdp';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch (err) {
    console.warn('RDP-Fehler:', err.message);
    alert('RDP-Datei konnte nicht geladen werden.');
  }
}
function setupVmConsoleModal() {
  const m = $('vmConsoleModal');
  if (m) m.addEventListener('click', closeVmConsole);
  const panel = $('vmConsolePanel');
  if (panel) panel.addEventListener('click', (e) => e.stopPropagation());
  const close = $('vmConsoleClose');
  if (close) close.addEventListener('click', closeVmConsole);
  const tab = $('vmConsoleTab');
  if (tab) tab.addEventListener('click', () => { if (_vmConsoleUrl) window.open(_vmConsoleUrl, '_blank', 'noopener'); });
  const fs = $('vmConsoleFs');
  if (fs) fs.addEventListener('click', () => {
    if (panel && panel.requestFullscreen) { const p = panel.requestFullscreen(); if (p && p.catch) p.catch(() => {}); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && m && m.style.display !== 'none' && !document.fullscreenElement) closeVmConsole();
  });
}

/* ---------- VM-Detail-/Steuerungs-Modal ---------- */
let _vmModalVm = null;
function openVmDetails(vm) {
  _vmModalVm = vm;
  refreshVmModal();
  const m = $('vmModal');
  if (m) m.style.display = 'flex';
}
function closeVmModal() {
  _vmModalVm = null;
  const m = $('vmModal');
  if (m) m.style.display = 'none';
}
function refreshVmModal() {
  if (!_vmModalVm) return;
  const vm = _vmById[_vmModalVm.id] || _vmModalVm; // frischer Status wenn vorhanden
  _vmModalVm = vm;
  const dot = $('vmModalDot');
  if (dot) dot.style.background = VM_DOT[vm.state] || '#6b7689';
  setText('vmModalName', vm.name || '–');
  const st = $('vmModalState');
  if (st) { st.textContent = vmStateLabel(vm); st.style.color = VM_DOT[vm.state] || 'var(--text-3)'; }

  const wrap = $('vmModalActions');
  if (wrap) {
    wrap.innerHTML = '';
    (VM_ACTIONS_BY_STATE[vm.state] || []).forEach((a) => {
      const meta = VM_ACTION_META[a];
      wrap.appendChild(makeVmBtn(meta.label, meta.cls, (btn) => vmAction(vm.id, a, btn)));
    });
  }
  const rdpBtn = $('vmModalRdp');
  if (rdpBtn) rdpBtn.style.display = vm.isWindows ? '' : 'none';
  const meta = $('vmModalMeta');
  if (meta) {
    const row = (k, v) => `<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--text-3)">${k}</span><span style="color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%" title="${v}">${v}</span></div>`;
    meta.innerHTML = row('Status', vmStateLabel(vm)) + row('UUID', vm.uuid || vm.id || '–');
  }
}
function setupVmModal() {
  const m = $('vmModal');
  if (m) m.addEventListener('click', closeVmModal);
  const panel = $('vmModalPanel');
  if (panel) panel.addEventListener('click', (e) => e.stopPropagation());
  const close = $('vmModalClose');
  if (close) close.addEventListener('click', closeVmModal);
  const vnc = $('vmModalVnc');
  if (vnc) vnc.addEventListener('click', () => { if (_vmModalVm) openVmConsole(_vmModalVm); });
  const rdp = $('vmModalRdp');
  if (rdp) rdp.addEventListener('click', () => { if (_vmModalVm) openVmRdp(_vmModalVm); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && _vmModalVm) closeVmModal(); });
}

/* ---------- Settings: VM-Config (Windows-Flag & RDP) ---------- */
let _vmCfgRows = [];
async function loadVmCfg() {
  const list = $('vmCfgList');
  if (!list) return;
  list.innerHTML = `<div style="font:500 11px 'JetBrains Mono',monospace;color:var(--text-dim)">Lade…</div>`;
  let vms = [], cfg = {};
  try {
    const [vd, cd] = await Promise.all([
      fetch('/api/vms', { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/vms/config', { cache: 'no-store' }).then(r => r.json()),
    ]);
    vms = (vd && vd.vms) || [];
    cfg = (cd && cd.config) || {};
  } catch (_) { /* ignore */ }
  if (!vms.length) {
    list.innerHTML = `<div style="font:500 11px 'JetBrains Mono',monospace;color:var(--text-dim)">Keine VMs gefunden (Unraid-URL & API-Key gesetzt?).</div>`;
    _vmCfgRows = [];
    return;
  }
  list.innerHTML = '';
  _vmCfgRows = vms.map((vm) => {
    const c = cfg[vm.id] || {};
    const winVal = (typeof c.win === 'boolean') ? (c.win ? 'yes' : 'no') : 'auto';
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1.3fr auto 1fr 0.9fr;gap:6px;align-items:center';
    row.innerHTML =
      `<span style="font:500 11px 'JetBrains Mono',monospace;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${vm.name}">${vm.name}${c.osAuto ? ` <span style="color:var(--text-dim)">· ${c.osAuto}</span>` : ''}</span>` +
      `<select class="cfg-input" style="width:92px"><option value="auto">Auto</option><option value="yes">Windows</option><option value="no">Kein Win</option></select>` +
      `<input class="cfg-input vm-rdphost" placeholder="RDP-Host (auto)" />` +
      `<input class="cfg-input vm-rdpuser" placeholder="RDP-User" />`;
    const sel = row.querySelector('select'); sel.value = winVal;
    const host = row.querySelector('.vm-rdphost'); host.value = c.rdpHost || '';
    const user = row.querySelector('.vm-rdpuser'); user.value = c.rdpUser || '';
    list.appendChild(row);
    return { id: vm.id, sel, host, user };
  });
}
async function saveVmCfg() {
  const config = {};
  _vmCfgRows.forEach((r) => {
    const win = r.sel.value === 'yes' ? true : r.sel.value === 'no' ? false : null;
    config[r.id] = { win, rdpHost: r.host.value.trim(), rdpUser: r.user.value.trim() };
  });
  try {
    const res = await fetch('/api/vms/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    startVms(); // Kacheln sofort mit neuen Flags aktualisieren
  } catch (err) { console.warn('VM-Config speichern fehlgeschlagen:', err.message); }
}
async function detectVmOs() {
  const btn = $('vmDetectBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⟳ …'; }
  try { await fetch('/api/vms/detect', { method: 'POST' }); await loadVmCfg(); startVms(); }
  catch (err) { console.warn('OS-Erkennung fehlgeschlagen:', err.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '⟳ OS erkennen'; } }
}

/* ---------- Unraid-Suite (Docker, Array, Disks, Shares, Meldungen, System, USV) ---------- */
// Gleiche GraphQL-API wie die VM-Kachel; je Bereich das bewährte
// poll/render/start-Dreigespann mit diffList.

// KB-Werte der Unraid-API menschenlesbar (fmtSize erwartet Bytes).
function fmtKb(kb) { return kb != null ? fmtSize(kb * 1024) : '–'; }

function setUnraidBadge(id, text, color) {
  const el = $(id);
  if (!el) return;
  el.style.color = color;
  el.innerHTML = `<span style="width:6px;height:6px;border-radius:2px;background:${color}"></span>${text}`;
}

// Gemeinsames Poll-Boilerplate: /api/unraid-Endpoint holen, Fehlerzustände
// in der Badge melden, sonst rendern.
async function pollUnraid(path, badgeId, render) {
  if (!state.liveOn) return;
  try {
    const d = await fetch(path, { cache: 'no-store' }).then(r => r.json());
    if (!d || !d.ok) {
      const unsupported = d && d.error === 'unsupported';
      const msg = d && d.error === 'not_configured' ? 'not configured'
                : unsupported ? 'nicht verfügbar' : 'offline';
      setUnraidBadge(badgeId, msg, unsupported ? '#6b7689' : '#f43f5e');
      return;
    }
    render(d);
  } catch (err) {
    setUnraidBadge(badgeId, 'offline', '#f43f5e');
    console.warn('Unraid poll failed:', path, err.message);
  }
}

// Aktions-POST mit optionaler Rückfrage; `btn` wird bis zum Refresh
// deaktiviert. 403 -> Hinweis auf die Gefahrenzone in den Einstellungen.
async function unraidAction(path, body, btn, confirmMsg, repoll) {
  if (confirmMsg && !confirm(confirmMsg)) return;
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403 && d.error === 'danger_disabled') {
      alert('Steuer-Aktionen sind gesperrt. In den Einstellungen unter „Unraid" zuerst die Gefahrenzone freischalten.');
    } else if (d.error === 'needs_ssh') {
      alert('Für Neustart/Herunterfahren wird der SSH-Zugang benötigt (Einstellungen → Unraid).');
    } else if (!r.ok || !d.ok) {
      console.warn('Unraid action failed:', path, body.action, d.error || r.status);
    }
  } catch (err) {
    console.warn('Unraid action error:', err.message);
  } finally {
    if (btn) btn.disabled = false;
    if (repoll) repoll();
  }
}

/* --- Docker-Container --- */
const UDK_POLL_MS = 10000;
const UDK_DOT = { running: '#3ddc97', paused: '#ffb454', exited: '#6b7689' };
const UDK_PRIMARY = { running: 'stop', paused: 'unpause', exited: 'start' };
const UDK_ACTION_META = {
  start:   { label: '▶ Start',  cls: 'start', confirm: false },
  stop:    { label: '■ Stop',   cls: 'stop',  confirm: true  },
  restart: { label: '↻',        cls: '',      confirm: true  },
  unpause: { label: '▶ Weiter', cls: 'start', confirm: false },
};

function unraidDockerAction(id, action, btn, name) {
  const meta = UDK_ACTION_META[action] || {};
  const verb = action === 'stop' ? 'stoppen' : 'neu starten';
  const msg = meta.confirm ? `Container „${name || id}" wirklich ${verb}?` : null;
  unraidAction('/api/unraid/docker/action', { id, action }, btn, msg, pollUnraidDocker);
}

function createUdkRow(c) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
  row.innerHTML =
    `<div style="display:flex;align-items:center;gap:9px;min-width:0">` +
      `<span class="udk-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0"></span>` +
      `<div style="min-width:0">` +
        `<div style="display:flex;align-items:center;gap:6px;min-width:0">` +
          `<span class="udk-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:500 12px 'JetBrains Mono',monospace"></span>` +
          `<span class="udk-upd" style="display:none;font:600 8px 'JetBrains Mono',monospace;letter-spacing:0.05em;color:#ffb454;background:rgba(255,180,84,0.14);border-radius:3px;padding:1px 4px;flex-shrink:0">UPDATE</span>` +
        `</div>` +
        `<div class="udk-status" style="font:500 9px 'JetBrains Mono',monospace;color:var(--text-3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>` +
      `</div>` +
    `</div>`;
  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;align-items:center;gap:4px;flex-shrink:0';
  const primary = makeVmBtn('', '', (btn) => {
    const a = UDK_PRIMARY[row._c.state];
    if (a) unraidDockerAction(row._c.id, a, btn, row._c.name);
  });
  const restart = makeVmBtn('↻', '', (btn) => unraidDockerAction(row._c.id, 'restart', btn, row._c.name));
  restart.title = 'Neu starten';
  actions.append(primary, restart);
  row.appendChild(actions);
  row._dot = row.querySelector('.udk-dot');
  row._name = row.querySelector('.udk-name');
  row._upd = row.querySelector('.udk-upd');
  row._status = row.querySelector('.udk-status');
  row._primary = primary;
  row._restart = restart;
  return row;
}
function updateUdkRow(row, c, prev) {
  row._c = c;
  if (!prev || prev.state !== c.state) row._dot.style.background = UDK_DOT[c.state] || '#6b7689';
  if (!prev || prev.name !== c.name) { row._name.textContent = c.name; row._name.title = c.image || c.name; }
  if (!prev || prev.status !== c.status || prev.state !== c.state) row._status.textContent = c.status || c.state;
  row._upd.style.display = (c.updateAvailable && _cfgVal('unraid-docker', 'updates') !== false) ? '' : 'none';
  if (!prev || prev.state !== c.state) {
    const a = UDK_PRIMARY[c.state];
    const meta = a && UDK_ACTION_META[a];
    row._primary.textContent = meta ? meta.label : '–';
    row._primary.className = 'vm-btn' + (meta && meta.cls ? ' ' + meta.cls : '');
    row._primary.disabled = !meta;
    row._restart.style.display = c.state === 'running' ? '' : 'none';
  }
}
function renderUnraidDocker(d) {
  setUnraidBadge('udkBadge', d._stale ? 'stale' : `${d.running || 0} running`, d._stale ? '#ffb454' : '#3ddc97');
  setText('udkCount', d.total != null ? d.total : '–');
  const parts = [`<span style="color:#3ddc97">${d.running || 0} läuft</span>`];
  if (d.paused) parts.push(`<span style="color:#ffb454">${d.paused} pausiert</span>`);
  if (d.exited) parts.push(`<span style="color:#6b7689">${d.exited} gestoppt</span>`);
  if (d.updates && _cfgVal('unraid-docker', 'updates') !== false) parts.push(`<span style="color:#ffb454">${d.updates} Update${d.updates > 1 ? 's' : ''}</span>`);
  const sum = $('udkSummary');
  if (sum) sum.innerHTML = 'Container · ' + parts.join(' · ');
  let items = d.containers || [];
  if (_cfgVal('unraid-docker', 'hideStopped') === true) items = items.filter((c) => c.state !== 'exited');
  const list = $('udkList');
  if (list) diffList(list, _cfgLimit('unraid-docker', 'maxRows', items), (c) => c.id, createUdkRow, updateUdkRow);
}
function pollUnraidDocker() { return pollUnraid('/api/unraid/docker', 'udkBadge', renderUnraidDocker); }
function startUnraidDocker() {
  clearInterval(udkTimer);
  pollUnraidDocker();
  udkTimer = setInterval(pollUnraidDocker, UDK_POLL_MS);
}

/* --- Array & Parity (eine Query bedient auch die Disks-Kachel) --- */
const UAR_POLL_MS = 30000;

function unraidArrayAction(action, btn) {
  const msgs = {
    stop:         'Array wirklich STOPPEN? Alle Shares, Container und VMs werden beendet.',
    start:        'Array jetzt starten?',
    parityStart:  'Parity-Check jetzt starten? Das kann viele Stunden dauern.',
    parityCancel: 'Laufenden Parity-Check wirklich abbrechen?',
  };
  unraidAction('/api/unraid/array/action', { action }, btn, msgs[action] || null, pollUnraidArray);
}

function renderUnraidArray(d) {
  const started = !!d.started;
  const color = started ? '#3ddc97' : d.state === 'STOPPED' ? '#f43f5e' : '#ffb454';
  setUnraidBadge('uarBadge', d._stale ? 'stale' : (d.state || '–'), d._stale ? '#ffb454' : color);
  const stateEl = $('uarState');
  if (stateEl) {
    stateEl.textContent = started ? 'Gestartet' : d.state === 'STOPPED' ? 'Gestoppt' : (d.state || '–');
    stateEl.style.color = color;
  }
  const cap = d.capacity || {};
  setText('uarSlots', cap.slotsUsed != null && cap.slotsTotal ? `${cap.slotsUsed}/${cap.slotsTotal} Slots` : '');
  setText('uarCapText', cap.totalKb ? `${fmtKb(cap.usedKb)} / ${fmtKb(cap.totalKb)} · ${cap.pctUsed}%` : '–');
  const capBar = $('uarCapBar');
  if (capBar) {
    capBar.style.width = (cap.pctUsed || 0) + '%';
    capBar.style.background = (cap.pctUsed || 0) >= 90
      ? 'linear-gradient(90deg,#f43f5e,#ff8a4c)'
      : 'linear-gradient(90deg,#ff7a30,#ffb454)';
  }
  const p = d.parity;
  const pEl = $('uarParity');
  if (pEl) {
    if (!p) setHtmlIfChanged(pEl, '<span style="color:var(--text-3)">unbekannt</span>');
    else if (p.running || p.paused) {
      const bits = [p.paused ? 'pausiert' : (p.correcting ? 'korrigiert' : 'läuft')];
      if (p.progress != null) bits.push(p.progress + '%');
      if (p.speed) bits.push(p.speed);
      setHtmlIfChanged(pEl, `<span style="color:${p.paused ? '#ffb454' : '#8b6dff'}">${bits.join(' · ')}</span>`);
    } else if (p.status === 'NEVER_RUN') {
      setHtmlIfChanged(pEl, '<span style="color:var(--text-3)">nie geprüft</span>');
    } else {
      const errs = p.errors || 0;
      const when = p.date ? new Date(p.date).toLocaleDateString('de-DE') : '';
      setHtmlIfChanged(pEl, `<span style="color:${errs ? '#f43f5e' : '#3ddc97'}">${errs ? errs + ' Fehler' : 'OK'}${when ? ' · ' + when : ''}</span>`);
    }
  }
  const barWrap = $('uarParityBarWrap');
  if (barWrap) {
    const active = !!(p && (p.running || p.paused) && p.progress != null);
    barWrap.style.display = active ? '' : 'none';
    if (active) $('uarParityBar').style.width = p.progress + '%';
  }
  // Aktions-Buttons je Zustand; nur bei freigeschalteter Gefahrenzone.
  const act = $('uarActions');
  if (act) {
    const sig = [d.dangerEnabled, started, p && p.running, p && p.paused].join('|');
    if (act._sig !== sig) {
      act._sig = sig;
      act.innerHTML = '';
      if (d.dangerEnabled) {
        act.appendChild(started
          ? makeVmBtn('■ Array stoppen', 'stop', (b) => unraidArrayAction('stop', b))
          : makeVmBtn('▶ Array starten', 'start', (b) => unraidArrayAction('start', b)));
        if (p && p.running) {
          act.appendChild(makeVmBtn('⏸ Parity', '', (b) => unraidArrayAction('parityPause', b)));
          act.appendChild(makeVmBtn('✕ Parity', 'stop', (b) => unraidArrayAction('parityCancel', b)));
        } else if (p && p.paused) {
          act.appendChild(makeVmBtn('▶ Parity', 'start', (b) => unraidArrayAction('parityResume', b)));
          act.appendChild(makeVmBtn('✕ Parity', 'stop', (b) => unraidArrayAction('parityCancel', b)));
        } else if (started) {
          act.appendChild(makeVmBtn('⟲ Parity-Check', '', (b) => unraidArrayAction('parityStart', b)));
        }
      } else {
        act.innerHTML = '<span style="font:500 10px \'JetBrains Mono\',monospace;color:var(--text-dim)">Steuerung gesperrt · Einstellungen → Unraid</span>';
      }
    }
  }
}

/* --- Disks (aus denselben Array-Daten) --- */
function udiDotColor(s) {
  if (s === 'DISK_OK') return '#3ddc97';
  if (/^DISK_NP/.test(String(s || ''))) return '#6b7689';
  return '#f43f5e';
}
function createUdiRow() {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:9px';
  row.innerHTML =
    `<span class="udi-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0"></span>` +
    `<div style="min-width:0;flex:1">` +
      `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">` +
        `<span class="udi-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:500 12px 'JetBrains Mono',monospace"></span>` +
        `<span class="udi-right" style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-3);flex-shrink:0"></span>` +
      `</div>` +
      `<div class="udi-barwrap" style="height:4px;border-radius:2px;background:rgba(120,150,200,0.12);overflow:hidden;margin-top:4px">` +
        `<div class="udi-bar" style="height:100%;width:0%;border-radius:2px;background:#5b9dff;transition:width 0.8s cubic-bezier(.4,0,.2,1)"></div>` +
      `</div>` +
    `</div>`;
  row._dot = row.querySelector('.udi-dot');
  row._name = row.querySelector('.udi-name');
  row._right = row.querySelector('.udi-right');
  row._barwrap = row.querySelector('.udi-barwrap');
  row._bar = row.querySelector('.udi-bar');
  return row;
}
function updateUdiRow(row, dk, prev) {
  row._dot.style.background = udiDotColor(dk.status);
  if (!prev || prev.name !== dk.name) {
    row._name.textContent = dk.name;
    row._name.title = [dk.device, dk.status].filter(Boolean).join(' · ');
  }
  const bits = [];
  if (_cfgVal('unraid-disks', 'temp') !== false && dk.temp != null) bits.push(dk.temp + '°C');
  if (dk.fsSizeKb) bits.push(`${fmtKb(dk.fsUsedKb)} / ${fmtKb(dk.fsSizeKb)}`);
  else if (dk.sizeKb) bits.push(fmtKb(dk.sizeKb));
  if (dk.errors) bits.push(`<span style="color:#f43f5e">${dk.errors} Fehler</span>`);
  setHtmlIfChanged(row._right, bits.join(' · '));
  const hasBar = dk.pctUsed != null;
  row._barwrap.style.display = hasBar ? '' : 'none';
  if (hasBar) {
    row._bar.style.width = dk.pctUsed + '%';
    row._bar.style.background = dk.pctUsed >= 90 ? '#f43f5e' : '#5b9dff';
  }
}
function renderUnraidDisks(d) {
  const all = [...(d.parities || []), ...(d.disks || []), ...(d.caches || [])];
  const present = all.filter((x) => x.present !== false);
  const bad = present.filter((x) => !x.ok).length;
  const maxTemp = present.reduce((m, x) => (x.temp != null && x.temp > m ? x.temp : m), null);
  const badge = bad ? `${bad} Problem${bad > 1 ? 'e' : ''}` : `${present.length} Disks${maxTemp != null ? ' · ' + maxTemp + '°C max' : ''}`;
  setUnraidBadge('udiBadge', d._stale ? 'stale' : badge, d._stale ? '#ffb454' : bad ? '#f43f5e' : '#3ddc97');
  let items = [];
  if (_cfgVal('unraid-disks', 'showParity') !== false) items = items.concat(d.parities || []);
  items = items.concat(d.disks || []);
  if (_cfgVal('unraid-disks', 'showCache') !== false) items = items.concat(d.caches || []);
  const list = $('udiList');
  if (list) diffList(list, _cfgLimit('unraid-disks', 'maxRows', items), (x) => x.id || x.name, createUdiRow, updateUdiRow);
}

function pollUnraidArray() {
  return pollUnraid('/api/unraid/array', 'uarBadge', (d) => { renderUnraidArray(d); renderUnraidDisks(d); });
}
function startUnraidArray() {
  clearInterval(uarTimer);
  pollUnraidArray();
  uarTimer = setInterval(pollUnraidArray, UAR_POLL_MS);
}

/* --- Shares --- */
const USH_POLL_MS = 120000;
function createUshRow() {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-direction:column;gap:4px';
  row.innerHTML =
    `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">` +
      `<span class="ush-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:500 12px 'JetBrains Mono',monospace"></span>` +
      `<span class="ush-right" style="font:500 10px 'JetBrains Mono',monospace;color:var(--text-3);flex-shrink:0"></span>` +
    `</div>` +
    `<div class="ush-barwrap" style="height:4px;border-radius:2px;background:rgba(120,150,200,0.12);overflow:hidden">` +
      `<div class="ush-bar" style="height:100%;width:0%;border-radius:2px;background:#ff7a30;transition:width 0.8s cubic-bezier(.4,0,.2,1)"></div>` +
    `</div>`;
  row._name = row.querySelector('.ush-name');
  row._right = row.querySelector('.ush-right');
  row._barwrap = row.querySelector('.ush-barwrap');
  row._bar = row.querySelector('.ush-bar');
  return row;
}
function updateUshRow(row, s, prev) {
  if (!prev || prev.name !== s.name || prev.comment !== s.comment) {
    row._name.textContent = s.name;
    row._name.title = s.comment || s.name;
  }
  const right = s.usedKb != null
    ? `${fmtKb(s.usedKb)}${s.sizeKb ? ' / ' + fmtKb(s.sizeKb) : ''}${s.freeKb != null ? ' · ' + fmtKb(s.freeKb) + ' frei' : ''}`
    : '–';
  if (!prev || row._right.textContent !== right) row._right.textContent = right;
  const showBar = _cfgVal('unraid-shares', 'bars') !== false && s.pctUsed != null;
  row._barwrap.style.display = showBar ? '' : 'none';
  if (showBar) {
    row._bar.style.width = s.pctUsed + '%';
    row._bar.style.background = s.pctUsed >= 90 ? '#f43f5e' : '#ff7a30';
  }
}
function renderUnraidShares(d) {
  setUnraidBadge('ushBadge', d._stale ? 'stale' : `${d.total || 0} Shares`, d._stale ? '#ffb454' : '#3ddc97');
  const list = $('ushList');
  if (list) diffList(list, _cfgLimit('unraid-shares', 'maxRows', d.shares || []), (s) => s.id || s.name, createUshRow, updateUshRow);
}
function pollUnraidShares() { return pollUnraid('/api/unraid/shares', 'ushBadge', renderUnraidShares); }
function startUnraidShares() {
  clearInterval(ushTimer);
  pollUnraidShares();
  ushTimer = setInterval(pollUnraidShares, USH_POLL_MS);
}

/* --- Meldungen (Notifications) --- */
const UNO_POLL_MS = 30000;
const UNO_DOT = { ALERT: '#f43f5e', WARNING: '#ffb454', INFO: '#5b9dff' };

function unraidNotifAction(id, action, btn) {
  const msg = action === 'archiveAll' ? 'Alle ungelesenen Meldungen archivieren?' : null;
  unraidAction('/api/unraid/notifications/action', { id, action }, btn, msg, pollUnraidNotifications);
}
function createUnoRow(n) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px';
  row.innerHTML =
    `<div style="display:flex;align-items:flex-start;gap:9px;min-width:0">` +
      `<span class="uno-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px"></span>` +
      `<div style="min-width:0">` +
        `<div class="uno-subject" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:500 12px 'JetBrains Mono',monospace"></div>` +
        `<div class="uno-desc" style="font:500 9px 'JetBrains Mono',monospace;color:var(--text-3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>` +
      `</div>` +
    `</div>`;
  const archive = makeVmBtn('✓', '', (btn) => unraidNotifAction(row._n.id, 'archive', btn));
  archive.title = 'Archivieren';
  row.appendChild(archive);
  row._dot = row.querySelector('.uno-dot');
  row._subject = row.querySelector('.uno-subject');
  row._desc = row.querySelector('.uno-desc');
  return row;
}
function updateUnoRow(row, n, prev) {
  row._n = n;
  if (!prev || prev.importance !== n.importance) row._dot.style.background = UNO_DOT[n.importance] || '#5b9dff';
  const subject = n.subject || n.title || '–';
  if (!prev || row._subject.textContent !== subject) {
    row._subject.textContent = subject;
    row._subject.title = [n.title, n.description].filter(Boolean).join(' — ');
  }
  const when = n.timestamp
    ? new Date(n.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
  const desc = [when, n.description].filter(Boolean).join(' · ');
  if (!prev || row._desc.textContent !== desc) row._desc.textContent = desc;
}
function renderUnraidNotifications(d) {
  const u = d.unread || {};
  const color = u.alert ? '#f43f5e' : u.warning ? '#ffb454' : u.total ? '#5b9dff' : '#3ddc97';
  setUnraidBadge('unoBadge', d._stale ? 'stale' : u.total ? `${u.total} ungelesen` : 'OK', d._stale ? '#ffb454' : color);
  const counts = $('unoCounts');
  if (counts) {
    setHtmlIfChanged(counts,
      `<span style="color:#f43f5e">${u.alert || 0} Alerts</span> · ` +
      `<span style="color:#ffb454">${u.warning || 0} Warnungen</span> · ` +
      `<span style="color:#5b9dff">${u.info || 0} Infos</span>`);
  }
  const archiveAll = $('unoArchiveAll');
  if (archiveAll) archiveAll.style.display = u.total ? '' : 'none';
  const list = $('unoList');
  if (list) diffList(list, _cfgLimit('unraid-notifications', 'maxRows', d.notifications || []), (n) => n.id, createUnoRow, updateUnoRow);
}
function pollUnraidNotifications() { return pollUnraid('/api/unraid/notifications', 'unoBadge', renderUnraidNotifications); }
function startUnraidNotifications() {
  clearInterval(unoTimer);
  pollUnraidNotifications();
  unoTimer = setInterval(pollUnraidNotifications, UNO_POLL_MS);
}

/* --- System-Info --- */
const USY_POLL_MS = 10000;

function unraidSystemAction(action, btn) {
  const verb = action === 'reboot' ? 'NEU STARTEN' : 'HERUNTERFAHREN';
  // Bewusst doppelte Rückfrage: die Aktion beendet den ganzen Server.
  if (!confirm(`Unraid-Server wirklich ${verb}? Alle Dienste, VMs und Container werden beendet.`)) return;
  if (!confirm(`Letzte Rückfrage: „OK" ${action === 'reboot' ? 'startet den Server jetzt neu' : 'fährt den Server jetzt herunter'}.`)) return;
  unraidAction('/api/unraid/system/action', { action }, btn, null, pollUnraidSystem);
}
function renderUnraidSystem(d) {
  const badge = d._stale ? 'stale' : d.online ? (d.unraidVersion ? 'v' + d.unraidVersion : 'online') : 'offline';
  setUnraidBadge('usyBadge', badge, d._stale ? '#ffb454' : d.online ? '#3ddc97' : '#f43f5e');
  setText('usyCpu', d.cpuPct != null ? Math.round(d.cpuPct) : '–');
  setText('usyRam', d.ramPct != null ? Math.round(d.ramPct) : '–');
  const up = [];
  if (d.uptimeSec != null) up.push('Uptime ' + fmtUptime(d.uptimeSec));
  if (d.ramUsed != null && d.ramTotal) up.push(`RAM ${fmtSize(d.ramUsed)} / ${fmtSize(d.ramTotal)}`);
  setText('usyUptime', up.join(' · ') || '–');
  const meta = $('usyMeta');
  if (meta) {
    const rowHtml = (k, v) => v
      ? `<div style="display:flex;justify-content:space-between;gap:10px;font:500 10px 'JetBrains Mono',monospace"><span style="color:var(--text-3);flex-shrink:0">${k}</span><span style="color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${v}">${v}</span></div>`
      : '';
    setHtmlIfChanged(meta,
      rowHtml('Host', d.hostname) +
      rowHtml('Unraid', d.unraidVersion) +
      rowHtml('API', d.apiVersion) +
      rowHtml('Kernel', d.kernel) +
      rowHtml('CPU', d.cpuBrand ? `${d.cpuBrand}${d.cores ? ` · ${d.cores}C/${d.threads || d.cores}T` : ''}` : null));
  }
  const act = $('usyActions');
  if (act) {
    const sig = [d.dangerEnabled, d.sshEnabled].join('|');
    if (act._sig !== sig) {
      act._sig = sig;
      act.innerHTML = '';
      if (d.dangerEnabled && d.sshEnabled) {
        act.appendChild(makeVmBtn('↻ Neustart', '', (b) => unraidSystemAction('reboot', b)));
        act.appendChild(makeVmBtn('⏻ Herunterfahren', 'stop', (b) => unraidSystemAction('shutdown', b)));
      } else if (d.dangerEnabled) {
        act.innerHTML = '<span style="font:500 10px \'JetBrains Mono\',monospace;color:var(--text-dim)">Neustart/Shutdown benötigt SSH · Einstellungen → Unraid</span>';
      } else {
        act.innerHTML = '<span style="font:500 10px \'JetBrains Mono\',monospace;color:var(--text-dim)">Steuerung gesperrt · Einstellungen → Unraid</span>';
      }
    }
  }
}
function pollUnraidSystem() { return pollUnraid('/api/unraid/system', 'usyBadge', renderUnraidSystem); }
function startUnraidSystem() {
  clearInterval(usyTimer);
  pollUnraidSystem();
  usyTimer = setInterval(pollUnraidSystem, USY_POLL_MS);
}

/* --- USV (UPS) --- */
const UUP_POLL_MS = 30000;
function renderUnraidUps(d) {
  const u = (d.devices || [])[0];
  if (!u) {
    setUnraidBadge('uupBadge', 'keine USV', '#6b7689');
    setText('uupCharge', '–');
    setText('uupRuntime', '–');
    setText('uupModel', '–');
    const bar0 = $('uupChargeBar');
    if (bar0) bar0.style.width = '0%';
    const power0 = $('uupPower');
    if (power0) setHtmlIfChanged(power0, '');
    return;
  }
  setUnraidBadge('uupBadge', d._stale ? 'stale' : (u.status || '–'), d._stale ? '#ffb454' : u.online ? '#3ddc97' : '#f43f5e');
  setText('uupCharge', u.chargePct != null ? u.chargePct : '–');
  const bar = $('uupChargeBar');
  if (bar) {
    const pct = u.chargePct || 0;
    bar.style.width = pct + '%';
    bar.style.background = pct < 20
      ? 'linear-gradient(90deg,#f43f5e,#ff8a4c)'
      : pct < 50 ? 'linear-gradient(90deg,#ffb454,#ffd27b)' : 'linear-gradient(90deg,#3ddc97,#7be3b8)';
  }
  setText('uupRuntime', u.runtimeSec != null ? `Restlaufzeit ${fmtUptime(u.runtimeSec)}` : '–');
  const power = $('uupPower');
  if (power) {
    const rowHtml = (k, v) => v == null ? '' :
      `<div style="display:flex;justify-content:space-between;gap:10px;font:500 10px 'JetBrains Mono',monospace"><span style="color:var(--text-3)">${k}</span><span style="color:var(--text-2)">${v}</span></div>`;
    setHtmlIfChanged(power,
      rowHtml('Last', u.loadPct != null ? u.loadPct + '%' : null) +
      rowHtml('Leistung', u.watts != null ? Math.round(u.watts) + ' W' : null) +
      rowHtml('Eingang', u.inputVoltage != null ? u.inputVoltage + ' V' : null) +
      rowHtml('Zustand', u.health));
  }
  setText('uupModel', [u.model || u.name, d.devices.length > 1 ? `+${d.devices.length - 1} weitere` : ''].filter(Boolean).join(' · '));
}
function pollUnraidUps() { return pollUnraid('/api/unraid/ups', 'uupBadge', renderUnraidUps); }
function startUnraidUps() {
  clearInterval(uupTimer);
  pollUnraidUps();
  uupTimer = setInterval(pollUnraidUps, UUP_POLL_MS);
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
function createAdguardDomainRow(item) {
  const row = document.createElement('div');
  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;font:500 11px 'JetBrains Mono',monospace";
  row.innerHTML =
    `<span class="ad-domain" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></span>` +
    `<span class="ad-count" style="color:var(--text-3);flex-shrink:0"></span>`;
  row._domain = row.querySelector('.ad-domain');
  row._count = row.querySelector('.ad-count');
  return row;
}
function updateAdguardDomainRow(row, item, prev) {
  if (!prev || prev.domain !== item.domain) row._domain.textContent = item.domain;
  if (!prev || prev.count !== item.count) row._count.textContent = fmtNum(item.count);
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

  const list = $('adguardTopList');
  if (list) {
    const top = d.topBlocked || [];
    if (!top.length) {
      list._diffMap = null; // reset diff state clobbered by the placeholder markup
      list.innerHTML = `<div style="font:500 11px 'JetBrains Mono',monospace;color:var(--text-3)">–</div>`;
    } else {
      diffList(list, _cfgLimit('adguard', 'topN', top), (item) => item.domain, createAdguardDomainRow, updateAdguardDomainRow);
    }
  }
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

/* Plex session cards are diffed in place (see diffList): one card per
   session key, only changed fields touch the DOM. The old code tore the
   whole tile down via innerHTML every 5s poll — recreating the poster
   <img>s forced image re-decodes and a layout pass, a periodic main-thread
   hitch that dropped animation frames. */
const PLEX_POSTER_PH_CSS = 'width:52px;height:76px;border-radius:7px;flex-shrink:0;background:repeating-linear-gradient(135deg,rgba(255,138,76,0.18),rgba(255,138,76,0.18) 6px,rgba(255,138,76,0.08) 6px,rgba(255,138,76,0.08) 12px);border:1px solid rgba(255,138,76,0.22);display:flex;align-items:center;justify-content:center;font:600 7px \'JetBrains Mono\',monospace;color:#ff8a4c;text-align:center';

function plexPosterEl(thumb) {
  if (thumb) {
    const img = document.createElement('img');
    img.src = thumb;
    img.alt = '';
    img.style.cssText = 'width:52px;height:76px;border-radius:7px;object-fit:cover;flex-shrink:0;background:rgba(255,138,76,0.1)';
    img.onerror = function () {
      const ph = document.createElement('div');
      ph.style.cssText = PLEX_POSTER_PH_CSS;
      ph.textContent = 'POSTER';
      this.replaceWith(ph);
    };
    return img;
  }
  const ph = document.createElement('div');
  ph.style.cssText = PLEX_POSTER_PH_CSS;
  ph.textContent = 'POSTER';
  return ph;
}

function createPlexCard(s) {
  const card = document.createElement('div');
  card.style.cssText = 'display:flex;gap:14px;align-items:flex-start';

  const poster = document.createElement('div');
  poster.className = 'plex-poster'; // per Kachel-Config ausblendbar (cfg-hide-posters)
  poster.style.cssText = 'flex-shrink:0;display:flex';
  card.appendChild(poster);

  // Textblock
  const txt = document.createElement('div');
  txt.style.cssText = 'flex:1;min-width:0';

  // Title row: title/show on the left, user chip highlighted on the right
  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:baseline;justify-content:space-between;gap:8px';

  const titleEl = document.createElement('div');
  titleEl.style.cssText = "font:600 14px/1.25 'Space Grotesk',sans-serif;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0";
  titleRow.appendChild(titleEl);

  const userChip = document.createElement('span');
  userChip.style.cssText = "font:700 10px 'JetBrains Mono',monospace;color:#5b9dff;background:rgba(91,157,255,0.14);border-radius:5px;padding:3px 8px;flex-shrink:0;white-space:nowrap";
  titleRow.appendChild(userChip);

  txt.appendChild(titleRow);

  const sub = document.createElement('div');
  sub.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#8b97a8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none";
  txt.appendChild(sub);

  const infoRows = document.createElement('div');
  txt.appendChild(infoRows);

  // Progress – directly from the viewOffset reported by Plex
  const barOuter = document.createElement('div');
  barOuter.style.cssText = 'height:3px;border-radius:3px;background:rgba(120,150,200,0.12);overflow:hidden';
  const barFill = document.createElement('div');
  barFill.style.cssText = `height:100%;width:0%;border-radius:3px;background:${PLEX_COLOR}`;
  barOuter.appendChild(barFill);

  const timeRow = document.createElement('div');
  timeRow.style.cssText = "display:flex;justify-content:space-between;font:500 10px 'JetBrains Mono',monospace;color:#6b7689;margin-top:5px";

  const prog = document.createElement('div');
  prog.style.cssText = 'margin-top:10px';
  prog.append(barOuter, timeRow);
  txt.appendChild(prog);

  card.appendChild(txt);
  card._poster = poster;
  card._title = titleEl;
  card._user = userChip;
  card._sub = sub;
  card._infoRows = infoRows;
  card._barFill = barFill;
  card._timeRow = timeRow;
  return card;
}

// All fields that feed the info token rows; rebuild them only when one changes.
function plexInfoSignature(s) {
  return [
    s.resolution, s.streamType, s.bandwidth, s.bitrate, s.transcodeSpeed,
    s.videoDisplayTitle, s.videoDecision, s.transVideoCodec,
    s.audioDisplayTitle, s.audioDecision, s.transAudioCodec, s.transAudioCh,
    s.product, s.device, s.platform, s.location, s.subtitle,
  ].join('|');
}

function rebuildPlexInfoRows(wrap, s) {
  wrap.innerHTML = '';

  // Row 1: resolution · stream type · bitrate (+ transcode speed if relevant)
  const speedToken = (s.transcodeSpeed && s.streamType !== 'directplay')
    ? { text: `×${s.transcodeSpeed}`, color: plexSpeedColor(s.transcodeSpeed), weight: '700' }
    : null;
  wrap.appendChild(plexInfoRow([
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
    wrap.appendChild(plexInfoRow([
      { text: videoChain, color: '#8b97a8' },
      { text: audioChain, color: '#8b97a8' },
    ]));
  }

  // Row 3: device / app · network
  const locToken = s.location
    ? { text: s.location.toUpperCase(), color: plexLocationColor(s.location), weight: '700' }
    : null;
  wrap.appendChild(plexInfoRow([
    { text: s.product || s.device, color: '#6b7689' },
    { text: s.platform && s.product && !s.product.toLowerCase().includes(s.platform.toLowerCase()) ? s.platform : null, color: '#6b7689' },
    locToken,
  ]));

  // Row 4: subtitle (only when active)
  if (s.subtitle) {
    wrap.appendChild(plexInfoRow([
      { text: 'SUB', color: '#8b6dff', weight: '700' },
      { text: s.subtitle, color: '#6b7689' },
    ]));
  }
}

function updatePlexCard(card, s, prev) {
  if (!prev || prev.thumb !== s.thumb) {
    card._poster.replaceChildren(plexPosterEl(s.thumb));
  }

  const title = s.type === 'episode' && s.showTitle ? s.showTitle : s.title;
  if (!prev || card._title.textContent !== title) card._title.textContent = title;
  if (!prev || prev.user !== s.user) card._user.textContent = s.user;

  const subText = s.type === 'episode' && s.showTitle
    ? (s.seasonEpisode ? s.seasonEpisode + ' · ' : '') + s.title
    : null;
  if (!prev || card._sub.textContent !== (subText || '')) {
    card._sub.textContent = subText || '';
    card._sub.style.display = subText ? '' : 'none';
  }

  if (!prev || plexInfoSignature(prev) !== plexInfoSignature(s)) {
    rebuildPlexInfoRows(card._infoRows, s);
  }

  const pct = s.duration > 0 ? Math.round(s.viewOffset / s.duration * 100) : 0;
  const prevPct = prev && prev.duration > 0 ? Math.round(prev.viewOffset / prev.duration * 100) : 0;
  if (!prev || prevPct !== pct) card._barFill.style.width = pct + '%';

  if (!prev || prev.viewOffset !== s.viewOffset || prev.duration !== s.duration || prev.state !== s.state) {
    const stateSpan = s.state === 'playing' ? `<span style="color:${PLEX_COLOR}">▶ playing</span>`
      : s.state === 'paused' ? `<span style="color:#ffb454">⏸ paused</span>`
      : `<span style="color:#6b7689">↺ buffering</span>`;
    card._timeRow.innerHTML = `<span>${fmtDuration(s.viewOffset)}</span>${stateSpan}<span>${fmtDuration(s.duration)}</span>`;
  }
}

function renderPlex(d) {
  const lib = d.library || {};
  setText('plexLibStats',
    `${fmtNum(lib.movies)} Movies · ${fmtNum(lib.shows)} Shows · ${fmtNum(lib.episodes)} Eps`
  );
  setPlexStatus('connected', PLEX_COLOR);

  const container = $('plexSessions');
  if (!container) return;

  if (!d.sessions || !d.sessions.length) {
    if (container._emptyShown) return;
    container._emptyShown = true;
    container._diffMap = null; // drop diff state so the next session list rebuilds cleanly
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:28px 0';
    empty.innerHTML = `<span style="font:500 11px 'JetBrains Mono',monospace;color:#3f4a5c">Nobody is streaming right now</span>`;
    container.appendChild(empty);
    return;
  }

  if (container._emptyShown) {
    container._emptyShown = false;
    container._diffMap = null; // diffList clears the empty-state markup on re-init
  }
  diffList(container, _cfgLimit('plex', 'maxSessions', d.sessions), (s) => s.key, createPlexCard, updatePlexCard);
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
function createServiceRow(s) {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 4px';
  row.innerHTML =
    `<div style="display:flex;align-items:center;gap:10px">` +
    `<span class="sv-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0"></span>` +
    `<span class="sv-name" style="font:500 12px 'JetBrains Mono',monospace;color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px"></span>` +
    `</div><span class="sv-ms" style="font:500 11px 'JetBrains Mono',monospace;flex-shrink:0"></span>`;
  row._dot = row.querySelector('.sv-dot');
  row._name = row.querySelector('.sv-name');
  row._ms = row.querySelector('.sv-ms');
  return row;
}
function updateServiceRow(row, s, prev) {
  const dotColor = s.online ? '#3ddc97' : '#f43f5e';
  const msText = s.online && s.responseMs != null ? `${s.responseMs} ms` : 'offline';
  const msColor = s.online ? '#6b7689' : '#f43f5e';
  if (!prev || prev.online !== s.online) {
    row._dot.style.background = dotColor;
    row._dot.style.boxShadow = s.online ? `0 0 6px ${dotColor}` : '';
  }
  if (!prev || prev.name !== s.name) row._name.textContent = s.name;
  if (!prev || prev.online !== s.online || prev.responseMs !== s.responseMs) {
    row._ms.textContent = msText;
    row._ms.style.color = msColor;
  }
}
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
    if (!d.total) {
      list._diffMap = null; // reset diff state clobbered by the placeholder markup
      list.innerHTML = '';
      const em = document.createElement('div');
      em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:12px 4px;text-align:center";
      em.textContent = 'No services configured';
      list.appendChild(em);
    } else {
      diffList(list, _cfgLimit('service-status', 'maxRows', d.services), (s) => s.name, createServiceRow, updateServiceRow);
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
  if (!state.liveOn) return;
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

const UNIFI_TYPE_LABEL = { ugw: 'UDM', udm: 'UDM', usg: 'USG', usw: 'SW', uap: 'AP', uvc: 'CAM' };
function createUnifiDeviceChip(dev) {
  const chip = document.createElement('div');
  chip.className = 'unifi-chip';
  chip.innerHTML = `<span class="ud-dot">●</span> <span class="ud-label"></span>`;
  chip._dot = chip.querySelector('.ud-dot');
  chip._label = chip.querySelector('.ud-label');
  return chip;
}
function updateUnifiDeviceChip(chip, dev, prev) {
  const dot = dev.online ? 'var(--green)' : 'var(--red)';
  const label = UNIFI_TYPE_LABEL[dev.type] || dev.type.toUpperCase();
  const extra = dev.type === 'uap'
    ? ` · ${dev.clients}cl`
    : dev.cpu != null ? ` · ${dev.cpu.toFixed(0)}%` : '';
  if (!prev || prev.online !== dev.online) chip._dot.style.color = dot;
  if (!prev || prev.type !== dev.type || prev.name !== dev.name || prev.clients !== dev.clients || prev.cpu !== dev.cpu) {
    chip._label.innerHTML = `${label}:&nbsp;${dev.name}${extra}`;
  }
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
    diffList(wrap, d.devices, (dev) => dev.mac, createUnifiDeviceChip, updateUnifiDeviceChip);
  }
}

function renderUnifiAps(devices) {
  const wrap = $('unifiAps');
  if (!wrap) return;
  const aps = _cfgLimit('unifi-aps', 'maxAps', devices.filter(d => d.type === 'uap'));
  if (!aps.length) {
    setHtmlIfChanged(wrap, '<div style="font:500 11px \'JetBrains Mono\',monospace;color:var(--text-3)">No access points found</div>');
    return;
  }

  const html = aps.map(ap => {
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

  // Skip the innerHTML teardown when nothing changed — the 10s poll usually
  // returns identical data, and a full rebuild costs a layout pass.
  setHtmlIfChanged(wrap, html);
}

async function pollUnifiSnapshot() {
  if (!state.liveOn) return;
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
    const swap = () => {
      img.src = url;
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
      setText('unifiSnapshotTs', 'Snapshot: ' + new Date().toLocaleTimeString('en-US', { hour12: false }));
      if (camSt) { camSt.textContent = '● online'; camSt.style.color = 'var(--green)'; }
      setText('unifiCamName', cam.name);
    };
    // Decode the JPEG off the paint path first; otherwise the swap forces a
    // synchronous full-image decode that drops animation frames every 30s.
    if (tmp.decode) tmp.decode().then(swap, swap);
    else swap();
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
    // Fallback-Feed fuer die Durchsatz-Kachel ohne SSE: nur einspeisen, wenn
    // laenger kein frisches WAN-Sample ueber den Stream kam (sonst doppelt).
    if (d.wan && d.wan.rxRate != null && performance.now() - state._wanRxAt > 15000)
      ingestWan({ ts: Date.now(), status: d.wan.status, rxMbit: d.wan.rxRate, txMbit: d.wan.txRate });
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

function createNcUserRow(u) {
  const row = document.createElement('div');
  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;font:500 12px 'JetBrains Mono',monospace";
  row.innerHTML =
    `<span class="nc-name" style="color:var(--text-15);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0"></span>` +
    `<span class="nc-right" style="color:var(--text-3);flex-shrink:0"></span>`;
  row._name = row.querySelector('.nc-name');
  row._right = row.querySelector('.nc-right');
  return row;
}
function updateNcUserRow(row, u, prev) {
  const right = u.quota ? `${fmtSize(u.used)} / ${fmtSize(u.quota)}` : fmtSize(u.used);
  if (!prev || prev.name !== u.name) row._name.textContent = u.name;
  if (!prev || prev.used !== u.used || prev.quota !== u.quota) row._right.textContent = right;
}
function renderNcUsers(users) {
  const list = $('ncUserList');
  if (!list) return;
  if (!users || !users.length) {
    list._diffMap = null; // reset diff state clobbered by the placeholder markup
    list.innerHTML = '';
    const em = document.createElement('div');
    em.style.cssText = "font:500 11px 'JetBrains Mono',monospace;color:#566073;padding:6px 4px";
    em.textContent = 'No users';
    list.appendChild(em);
    return;
  }
  diffList(list, users, (u) => u.name, createNcUserRow, updateNcUserRow);
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
  startVms();
  startUnraidDocker();
  startUnraidArray();
  startUnraidShares();
  startUnraidNotifications();
  startUnraidSystem();
  startUnraidUps();
}
// Counterpart to startLive(): actually clears every live timer (not just a
// flag-check) so a hidden tab or "Live updates" off truly stops polling.
function pauseLive() {
  closeMetricsStream();
  clearInterval(dataTimer);      dataTimer = null;
  clearInterval(dockerTimer);    dockerTimer = null;
  clearInterval(adguardTimer);   adguardTimer = null;
  clearInterval(plexTimer);      plexTimer = null;
  clearInterval(statusTimer);    statusTimer = null;
  clearInterval(weatherTimer);   weatherTimer = null;
  clearInterval(unifiTimer);     unifiTimer = null;
  clearInterval(unifiSnapTimer); unifiSnapTimer = null;
  clearInterval(nextcloudTimer); nextcloudTimer = null;
  clearInterval(vmTimer);        vmTimer = null;
  clearInterval(udkTimer);       udkTimer = null;
  clearInterval(uarTimer);       uarTimer = null;
  clearInterval(ushTimer);       ushTimer = null;
  clearInterval(unoTimer);       unoTimer = null;
  clearInterval(usyTimer);       usyTimer = null;
  clearInterval(uupTimer);       uupTimer = null;
}
// Pauses polling and the graph rAF loop while the tab is hidden; resumes
// (with an immediate refresh via startLive()) when it becomes visible again.
function setupVisibilityHandling() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseGraphAnim();
      pauseLive();
    } else {
      startGraphAnim();
      startLive();
    }
  });
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

/* ============================================================================
   Dashboard: Seiten, freies Raster (GridStack) & Design-Mode
   ----------------------------------------------------------------------------
   Modell (siehe server.js): { version, pages:[{id,name,icon}],
   tiles:[{id,type:'widget'|'heading',page,x,y,w,h,hidden,text?,config?}] }.
   Die Kachel-"Shells" (data-widget-id) werden statisch in index.html
   ausgeliefert und beim Aufbau aus #tilePool in die GridStack-Items der
   aktiven Seite verschoben — kein renderX() muss angefasst werden.
   ============================================================================ */
const DASHBOARD_WIDGETS = [
  { id: 'system-load',        section: 'system',          label: 'System Load',           defaultSize: { w: 5,  h: 6 }, minSize: { w: 3, h: 4 } },
  { id: 'network-throughput', section: 'system',          label: 'Network Throughput',    defaultSize: { w: 7,  h: 4 }, minSize: { w: 4, h: 3 } },
  { id: 'disk-storage',       section: 'system',          label: 'Storage · Unraid Array', defaultSize: { w: 7, h: 4 }, minSize: { w: 4, h: 3 } },
  { id: 'service-status',     section: 'dienste',         label: 'Service Status',        defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'docker',             section: 'dienste',         label: 'Docker',                defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'adguard',            section: 'dienste',         label: 'AdGuard Home',          defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 4 } },
  { id: 'unraid-vms',         section: 'dienste',         label: 'Unraid VMs',            defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  // Unraid-Suite: Sektion 'unraid' liegt bewusst nicht in LEGACY_SECTION_ORDER,
  // damit die Kacheln nur im Katalog erscheinen (reconcileDashboard legt sie
  // automatisch als versteckte Einträge an).
  { id: 'unraid-docker',        section: 'unraid',        label: 'Unraid Docker',         defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'unraid-array',         section: 'unraid',        label: 'Unraid Array',          defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 4 } },
  { id: 'unraid-disks',         section: 'unraid',        label: 'Unraid Disks',          defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'unraid-shares',        section: 'unraid',        label: 'Unraid Shares',         defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'unraid-notifications', section: 'unraid',        label: 'Unraid Meldungen',      defaultSize: { w: 4,  h: 5 }, minSize: { w: 3, h: 3 } },
  { id: 'unraid-system',        section: 'unraid',        label: 'Unraid System',         defaultSize: { w: 4,  h: 4 }, minSize: { w: 3, h: 3 } },
  { id: 'unraid-ups',           section: 'unraid',        label: 'Unraid USV',            defaultSize: { w: 3,  h: 4 }, minSize: { w: 3, h: 3 } },
  { id: 'plex',               section: 'media',           label: 'Plex',                  defaultSize: { w: 7,  h: 5 }, minSize: { w: 4, h: 3 } },
  { id: 'nextcloud',          section: 'media',           label: 'Nextcloud',             defaultSize: { w: 5,  h: 5 }, minSize: { w: 3, h: 4 } },
  { id: 'unifi-network',      section: 'netzwerk',        label: 'UniFi · Network',       defaultSize: { w: 12, h: 3 }, minSize: { w: 4, h: 3 } },
  { id: 'unifi-aps',          section: 'netzwerk-detail', label: 'WiFi · Access Points',  defaultSize: { w: 7,  h: 4 }, minSize: { w: 4, h: 3 } },
  { id: 'unifi-cameras',      section: 'netzwerk-detail', label: 'UniFi Protect',         defaultSize: { w: 5,  h: 5 }, minSize: { w: 3, h: 4 } },
];

/* Anpassbare Optionen je Widget (Kachel-Einstellungen, gespeichert in
   tile.config). „title" gibt es implizit für jede Kachel.
   type 'toggle' → blendet [data-cfg="key"]-Blöcke der Shell aus/ein
                   (bzw. setzt via `cls` eine Shell-Klasse für JS-Inhalte,
                   via `filter` nur einen Render-Filter).
   type 'count'  → Zahl, 0 = unbegrenzt (Zeilenlimit im Renderer). */
const WIDGET_OPTIONS = {
  'system-load': [
    { key: 'rings', label: 'CPU/RAM-Ringe',                 type: 'toggle', default: true },
    { key: 'stats', label: 'Kennzahlen (Temp/Threads/RAM)', type: 'toggle', default: true },
    { key: 'chart', label: 'Verlaufs-Chart',                type: 'toggle', default: true },
  ],
  'network-throughput': [
    { key: 'chart', label: 'Verlaufs-Chart',   type: 'toggle', default: true },
    { key: 'chartSeries', label: 'Chart-Datenquelle', type: 'select', default: 'unraid',
      options: [{ v: 'unraid', l: 'Unraid' }, { v: 'wan', l: 'Internet (WAN)' }, { v: 'both', l: 'Beide' }] },
    { key: 'flow',  label: 'Paket-Animation',  type: 'toggle', default: true },
    { key: 'range', label: 'Zeitraum',         type: 'select', default: '1m',
      options: [{ v: '10s', l: '10s' }, { v: '1m', l: '1m' }, { v: '10m', l: '10m' }, { v: '1h', l: '1h' }] },
    { key: 'scaleMode', label: 'Skala', type: 'select', default: 'auto',
      options: [
        { v: 'auto', l: 'Auto' }, { v: '100', l: '100 Mbit/s' }, { v: '250', l: '250 Mbit/s' },
        { v: '500', l: '500 Mbit/s' }, { v: '1000', l: '1 Gbit/s' }, { v: 'line', l: 'Leitung' },
        { v: 'custom', l: 'Eigener Wert…' },
      ] },
    { key: 'scaleMax', label: 'Max (Mbit/s)', type: 'number', default: 0 },
    { key: 'iface',    label: 'Interface',    type: 'select', default: '', options: 'ifaces' },
    { key: 'packetShape', label: 'Paket-Form', type: 'select', default: 'block',
      options: [{ v: 'block', l: 'Block' }, { v: 'dot', l: 'Punkt' }] },
    { key: 'flowTrail', label: 'Paket-Schweif', type: 'toggle', default: true },
    { key: 'ispName',  label: 'Internet-Name', type: 'text', default: 'willy.tel' },
    { key: 'srvName',  label: 'Server-Name',  type: 'text', default: 'Unraid' },
    { key: 'lanName',  label: 'Netzwerk-Name', type: 'text', default: 'Netzwerk' },
  ],
  'service-status': [
    { key: 'maxRows', label: 'Max. Einträge', type: 'count', default: 0 },
  ],
  'docker': [
    { key: 'summary',     label: 'Zusammenfassung (Anzahl)', type: 'toggle', default: true },
    { key: 'hideStopped', label: 'Gestoppte ausblenden',     type: 'toggle', default: false, filter: true },
    { key: 'maxRows',     label: 'Max. Container',           type: 'count',  default: 0 },
  ],
  'adguard': [
    { key: 'toplist', label: 'Top-Blocked-Liste', type: 'toggle', default: true },
    { key: 'topN',    label: 'Top-Einträge',      type: 'count',  default: 0 },
  ],
  'unraid-vms': [
    { key: 'summary', label: 'Zusammenfassung (Anzahl)', type: 'toggle', default: true },
    { key: 'actions', label: 'Aktions-Buttons',          type: 'toggle', default: true, cls: 'cfg-hide-actions' },
    { key: 'maxRows', label: 'Max. VMs',                 type: 'count',  default: 0 },
  ],
  'unraid-docker': [
    { key: 'summary',     label: 'Zusammenfassung (Anzahl)', type: 'toggle', default: true },
    { key: 'hideStopped', label: 'Gestoppte ausblenden',     type: 'toggle', default: false, filter: true },
    { key: 'updates',     label: 'Update-Hinweise',          type: 'toggle', default: true,  filter: true },
    { key: 'actions',     label: 'Aktions-Buttons',          type: 'toggle', default: true,  cls: 'cfg-hide-actions' },
    { key: 'maxRows',     label: 'Max. Container',           type: 'count',  default: 0 },
  ],
  'unraid-array': [
    { key: 'capacity', label: 'Kapazitätsbalken', type: 'toggle', default: true },
    { key: 'parity',   label: 'Parity-Status',    type: 'toggle', default: true },
    { key: 'actions',  label: 'Aktions-Buttons',  type: 'toggle', default: true, cls: 'cfg-hide-actions' },
  ],
  'unraid-disks': [
    { key: 'showParity', label: 'Parity-Disks',  type: 'toggle', default: true, filter: true },
    { key: 'showCache',  label: 'Cache-Pools',   type: 'toggle', default: true, filter: true },
    { key: 'temp',       label: 'Temperaturen',  type: 'toggle', default: true, filter: true },
    { key: 'maxRows',    label: 'Max. Disks',    type: 'count',  default: 0 },
  ],
  'unraid-shares': [
    { key: 'bars',    label: 'Füllstands-Balken', type: 'toggle', default: true, filter: true },
    { key: 'maxRows', label: 'Max. Shares',       type: 'count',  default: 0 },
  ],
  'unraid-notifications': [
    { key: 'summary', label: 'Zusammenfassung', type: 'toggle', default: true },
    { key: 'actions', label: 'Aktions-Buttons', type: 'toggle', default: true, cls: 'cfg-hide-actions' },
    { key: 'maxRows', label: 'Max. Meldungen',  type: 'count',  default: 0 },
  ],
  'unraid-system': [
    { key: 'live',    label: 'CPU/RAM live',     type: 'toggle', default: true },
    { key: 'meta',    label: 'Versionen & Host', type: 'toggle', default: true },
    { key: 'actions', label: 'Aktions-Buttons',  type: 'toggle', default: true, cls: 'cfg-hide-actions' },
  ],
  'unraid-ups': [
    { key: 'power', label: 'Leistungsdaten', type: 'toggle', default: true },
  ],
  'plex': [
    { key: 'posters',     label: 'Poster',        type: 'toggle', default: true, cls: 'cfg-hide-posters' },
    { key: 'maxSessions', label: 'Max. Sessions', type: 'count',  default: 0 },
  ],
  'nextcloud': [
    { key: 'users',   label: 'Nutzerliste',       type: 'toggle', default: true },
    { key: 'upload',  label: 'ToLeech-Upload',    type: 'toggle', default: true },
    { key: 'version', label: 'Versions-Fußzeile', type: 'toggle', default: true },
  ],
  'unifi-network': [
    { key: 'wan',        label: 'Spalte WAN',        type: 'toggle', default: true },
    { key: 'clients',    label: 'Spalte Clients',    type: 'toggle', default: true },
    { key: 'connection', label: 'Spalte Verbindung', type: 'toggle', default: true },
    { key: 'devices',    label: 'Spalte Geräte',     type: 'toggle', default: true },
  ],
  'unifi-aps': [
    { key: 'maxAps', label: 'Max. Access Points', type: 'count', default: 0 },
  ],
  'unifi-cameras': [
    { key: 'timestamp', label: 'Zeitstempel', type: 'toggle', default: true },
  ],
};
const WIDGET_BY_ID = new Map(DASHBOARD_WIDGETS.map((w) => [w.id, w]));
const GRID_COLUMNS = 12;
const GRID_CELL_HEIGHT = 66;
const LEGACY_SECTION_ORDER = ['system', 'dienste', 'media', 'netzwerk', 'netzwerk-detail'];
const LEGACY_SECTION_NAMES = {
  system: 'System & Resources', dienste: 'Services & Containers',
  media: 'Media & Cloud', netzwerk: 'Network', 'netzwerk-detail': 'Network',
};
const SIZE_PRESETS = [
  { key: 's',    label: 'Klein',  w: 3, h: 4 },
  { key: 'm',    label: 'Mittel', w: 4, h: 5 },
  { key: 'l',    label: 'Groß',   w: 6, h: 6 },
  { key: 'wide', label: 'Breit',  w: 8, h: 4 },
  { key: 'full', label: 'Voll',   w: 12, h: 4 },
  { key: 'tall', label: 'Hoch',   w: 4, h: 8 },
];

let _dashboard = { version: 2, pages: [], tiles: [] };
const _grids = new Map();     // pageId -> GridStack instance
const _builtPages = new Set();
let _activePage = null;
let _designOn = false;
let _designSnapshot = null;    // deep copy of _dashboard when entering design mode (for discard)
let _tabSortable = null;

function _uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function _clone(o) { return JSON.parse(JSON.stringify(o)); }
function _tilePool() { return $('tilePool'); }
function _shellFor(id) { return document.querySelector(`[data-widget-id="${id}"]`); }

/* ---------- Model builders / migration ---------- */

// Verteilt Kacheln zeilenweise (links→rechts) im 12-Spalten-Raster.
// Überschriften erzwingen eine neue, volle Zeile (wie eine Kategorie-Trennung).
function _packTiles(items) {
  let x = 0, y = 0, rowH = 0;
  const out = [];
  for (const it of items) {
    if (it.type === 'heading') {
      if (rowH > 0) { y += rowH; }
      out.push({ ...it, x: 0, y, w: GRID_COLUMNS, h: it.h || 1 });
      y += (it.h || 1); x = 0; rowH = 0;
    } else {
      const w = Math.min(GRID_COLUMNS, it.w || 4);
      const h = it.h || 3;
      if (x + w > GRID_COLUMNS) { y += rowH; x = 0; rowH = 0; }
      out.push({ ...it, x, y, w, h });
      x += w; rowH = Math.max(rowH, h);
    }
  }
  return out;
}

// Frische Installation: leeres Grid — alle Widgets warten (versteckt) im
// Katalog und werden per Rechtsklick aufs Grid oder im Design-Modus platziert.
function buildDefaultDashboard() {
  const page = 'home';
  const tiles = DASHBOARD_WIDGETS.map((w) => ({
    id: w.id, type: 'widget', page, x: 0, y: 0,
    w: w.defaultSize.w, h: w.defaultSize.h, hidden: true, config: {},
  }));
  return { version: 2, pages: [{ id: page, name: 'Dashboard', icon: 'grid' }], tiles };
}

// Migration vom alten Modell [{id,section,hidden}] auf das neue Seiten-Modell.
function migrateLegacy(arr) {
  const page = 'home';
  const bySection = new Map();
  const order = [];
  for (const e of arr) {
    if (!e || !WIDGET_BY_ID.has(e.id)) continue;
    const sec = e.section || WIDGET_BY_ID.get(e.id).section;
    if (!bySection.has(sec)) { bySection.set(sec, []); order.push(sec); }
    bySection.get(sec).push(e);
  }
  const secOrder = LEGACY_SECTION_ORDER.filter((s) => bySection.has(s))
    .concat(order.filter((s) => !LEGACY_SECTION_ORDER.includes(s)));
  const items = [];
  let lastHeading = null;
  for (const sec of secOrder) {
    const entries = bySection.get(sec);
    const name = LEGACY_SECTION_NAMES[sec] || sec;
    if (entries.some((e) => !e.hidden) && name !== lastHeading) {
      items.push({ id: _uid('heading:'), type: 'heading', page, text: name, h: 1, hidden: false });
      lastHeading = name;
    }
    for (const e of entries) {
      const w = WIDGET_BY_ID.get(e.id);
      items.push({ id: e.id, type: 'widget', page, w: w.defaultSize.w, h: w.defaultSize.h, hidden: !!e.hidden, config: {} });
    }
  }
  const visible = _packTiles(items.filter((t) => !t.hidden)).map((t) => ({ ...t, page }));
  const hidden = items.filter((t) => t.hidden).map((t) => ({ ...t, page, x: 0, y: 0 }));
  return { version: 2, pages: [{ id: page, name: 'Dashboard', icon: 'grid' }], tiles: visible.concat(hidden) };
}

// Selbstheilung: unbekannte Widgets droppen, Duplikate entfernen, Seiten prüfen,
// neue Registry-Widgets als (ausgeblendeter) Katalog-Eintrag ergänzen.
function reconcileDashboard(model) {
  const m = (model && typeof model === 'object' && Array.isArray(model.tiles)) ? model : buildDefaultDashboard();
  let pages = (Array.isArray(m.pages) && m.pages.length) ? m.pages : [{ id: 'home', name: 'Dashboard', icon: 'grid' }];
  const seenP = new Set();
  pages = pages.map((p) => ({
    id: (String(p.id || '').trim()) || _uid('page:'),
    name: (String(p.name || '').trim().slice(0, 60)) || 'Seite',
    icon: String(p.icon || '').trim().slice(0, 40),
  })).filter((p) => !seenP.has(p.id) && seenP.add(p.id));
  if (!pages.length) pages = [{ id: 'home', name: 'Dashboard', icon: 'grid' }];
  const pageIds = new Set(pages.map((p) => p.id));
  const tiles = [];
  const seenWidget = new Set();
  for (const t of m.tiles) {
    if (!t) continue;
    const type = t.type === 'heading' ? 'heading' : 'widget';
    const id = String(t.id || '').trim();
    if (!id) continue;
    if (type === 'widget') {
      if (!WIDGET_BY_ID.has(id) || seenWidget.has(id)) continue;
      seenWidget.add(id);
    }
    const wd = WIDGET_BY_ID.get(id);
    let page = String(t.page || '').trim();
    if (!pageIds.has(page)) page = pages[0].id;
    const entry = {
      id, type, page,
      x: Number.isFinite(+t.x) ? +t.x : 0,
      y: Number.isFinite(+t.y) ? +t.y : 0,
      w: +t.w || (wd ? wd.defaultSize.w : 4),
      h: +t.h || (wd ? wd.defaultSize.h : 2),
      hidden: !!t.hidden,
    };
    if (type === 'heading') entry.text = String(t.text || '').slice(0, 80);
    else entry.config = (t.config && typeof t.config === 'object') ? t.config : {};
    tiles.push(entry);
  }
  for (const wd of DASHBOARD_WIDGETS) {
    if (!seenWidget.has(wd.id)) tiles.push({ id: wd.id, type: 'widget', page: pages[0].id, x: 0, y: 0, w: wd.defaultSize.w, h: wd.defaultSize.h, hidden: true, config: {} });
  }
  return { version: 2, pages, tiles };
}

/* ---------- Model queries ---------- */
function _pageTiles(pageId) { return _dashboard.tiles.filter((t) => t.page === pageId && !t.hidden); }
function _catalogTiles() { return _dashboard.tiles.filter((t) => t.type === 'widget' && t.hidden); }
function _tileById(id, pageId) { return _dashboard.tiles.find((t) => t.id === id && (pageId == null || t.page === pageId)); }
function _bottomY(pageId, exceptId) {
  return _dashboard.tiles.filter((t) => t.page === pageId && !t.hidden && t.id !== exceptId)
    .reduce((m, t) => Math.max(m, (t.y || 0) + (t.h || 1)), 0);
}

/* ---------- Per-tile config (Kachel-Einstellungen) ---------- */
// Liefert den konfigurierten Wert einer Kachel-Option, sonst den Schema-Default.
function _cfgVal(widgetId, key) {
  const t = _tileById(widgetId);
  const v = t && t.config ? t.config[key] : undefined;
  if (v !== undefined && v !== null) return v;
  if (key === 'title') return '';
  const opt = (WIDGET_OPTIONS[widgetId] || []).find((o) => o.key === key);
  return opt ? opt.default : undefined;
}
// Zeilenlimit-Helfer für die Renderer: 0/ungültig = unbegrenzt.
function _cfgLimit(widgetId, key, items) {
  const n = Math.floor(+_cfgVal(widgetId, key)) || 0;
  return n > 0 ? items.slice(0, n) : items;
}

// Wendet die Kachel-Config auf die Shell an: Titel-Override + Ein-/Ausblenden
// der [data-cfg]-Blöcke (bzw. Shell-Klassen für JS-generierte Inhalte).
// Der ursprüngliche display-Wert wird beim ersten Ausblenden gemerkt, damit
// inline display:block/flex/grid korrekt wiederhergestellt wird.
function applyTileConfig(widgetId) {
  const shell = _shellFor(widgetId);
  const wd = WIDGET_BY_ID.get(widgetId);
  if (!shell || !wd) return;
  const titleEl = shell.querySelector('[data-tile-title]');
  if (titleEl) {
    const custom = String(_cfgVal(widgetId, 'title') || '').trim();
    titleEl.textContent = custom || wd.label;
  }
  for (const opt of (WIDGET_OPTIONS[widgetId] || [])) {
    if (opt.type !== 'toggle' || opt.filter) continue;
    const on = !!_cfgVal(widgetId, opt.key);
    if (opt.cls) { shell.classList.toggle(opt.cls, !on); continue; }
    shell.querySelectorAll(`[data-cfg="${opt.key}"]`).forEach((el) => {
      if (el.dataset.cfgDisplay === undefined) el.dataset.cfgDisplay = el.style.display || '';
      el.style.display = on ? el.dataset.cfgDisplay : 'none';
    });
  }
}
function applyAllTileConfigs() { DASHBOARD_WIDGETS.forEach((w) => applyTileConfig(w.id)); }

// Nach einer Config-Änderung die Live-Daten der Kachel einmal neu rendern
// (nur nötig für Optionen, die im Renderer greifen: Limits/Filter).
const WIDGET_REFRESH = {
  'network-throughput':   () => applyNetworkConfig(),
  'service-status':       () => pollServiceStatus(),
  'docker':               () => pollDocker(),
  'adguard':              () => pollAdGuard(),
  'unraid-vms':           () => pollVms(),
  'unraid-docker':        () => pollUnraidDocker(),
  'unraid-array':         () => pollUnraidArray(),
  'unraid-disks':         () => pollUnraidArray(),
  'unraid-shares':        () => pollUnraidShares(),
  'unraid-notifications': () => pollUnraidNotifications(),
  'unraid-system':        () => pollUnraidSystem(),
  'unraid-ups':           () => pollUnraidUps(),
  'plex':                 () => pollPlex(),
  'unifi-aps':            () => pollUnifi(),
};

// Außerhalb des Design-Modus gibt es kein „✓ Fertig" → Änderungen verzögert
// (leise) speichern; im Design-Modus greift die Snapshot-Logik und
// gespeichert wird erst über „✓ Fertig".
let _cfgSaveTimer = null;
function _saveIfLive() {
  if (_designOn) return;
  clearTimeout(_cfgSaveTimer);
  _cfgSaveTimer = setTimeout(() => saveDashboard({ silent: true }), 600);
}

// Setzt eine Option, wendet sie sofort an und speichert ggf. verzögert.
function _setTileCfg(widgetId, key, value) {
  const t = _tileById(widgetId);
  if (!t) return;
  if (!t.config || typeof t.config !== 'object') t.config = {};
  const dflt = key === 'title' ? '' : ((WIDGET_OPTIONS[widgetId] || []).find((o) => o.key === key) || {}).default;
  if (value === dflt) delete t.config[key];
  else t.config[key] = value;
  applyTileConfig(widgetId);
  try { WIDGET_REFRESH[widgetId]?.(); } catch { /* ignore */ }
  _saveIfLive();
}

/* ---------- DOM builders ---------- */
function _makeHeadingEl(t) {
  const el = document.createElement('div');
  el.className = 'gs-heading';
  el.innerHTML = '<span class="gs-heading-slash">//</span><span class="gs-heading-text"></span><span class="gs-heading-rule"></span>';
  el.querySelector('.gs-heading-text').textContent = t.text || 'Abschnitt';
  return el;
}

function _makeTileControls(t) {
  const c = document.createElement('div');
  c.className = 'gs-tile-controls';
  c.innerHTML = '<button class="gs-tile-btn gs-tile-menu-btn" title="Optionen" aria-label="Optionen">⋯</button>';
  // Interaktion mit den Controls darf keinen Drag der Kachel auslösen.
  ['mousedown', 'pointerdown', 'touchstart'].forEach((ev) => c.addEventListener(ev, (e) => e.stopPropagation()));
  c.querySelector('.gs-tile-menu-btn').addEventListener('click', (e) => { e.stopPropagation(); openTileMenu(t, e.currentTarget); });
  return c;
}

function _makeGridItem(t) {
  const item = document.createElement('div');
  item.className = 'grid-stack-item' + (t.type === 'heading' ? ' gs-item-heading' : '');
  item.setAttribute('gs-id', t.id);
  item.setAttribute('gs-x', t.x); item.setAttribute('gs-y', t.y);
  item.setAttribute('gs-w', t.w); item.setAttribute('gs-h', t.h);
  if (t.type === 'heading') { item.setAttribute('gs-no-resize', 'true'); }
  const min = t.type === 'widget' && WIDGET_BY_ID.get(t.id)?.minSize;
  if (min) { item.setAttribute('gs-min-w', min.w); item.setAttribute('gs-min-h', min.h); }
  const content = document.createElement('div');
  content.className = 'grid-stack-item-content';
  content.appendChild(_makeTileControls(t));
  if (t.type === 'heading') content.appendChild(_makeHeadingEl(t));
  else { const shell = _shellFor(t.id); if (shell) content.appendChild(shell); }
  item.appendChild(content);
  return item;
}

/* ---------- Grid lifecycle ---------- */
function buildGridForPage(pageId) {
  if (_builtPages.has(pageId)) return _grids.get(pageId);
  const host = $('dashGrids');
  if (!host) return null;
  const gridEl = document.createElement('div');
  gridEl.className = 'grid-stack';
  gridEl.dataset.page = pageId;
  host.appendChild(gridEl);
  _pageTiles(pageId).slice().sort((a, b) => (a.y - b.y) || (a.x - b.x))
    .forEach((t) => gridEl.appendChild(_makeGridItem(t)));
  const grid = GridStack.init({
    column: GRID_COLUMNS,
    cellHeight: GRID_CELL_HEIGHT,
    margin: 8,
    float: true,
    staticGrid: !_designOn,
    resizable: { handles: 'e, se, s, sw, w' },
  }, gridEl);
  // Zellhöhe als CSS-Variable → Rasterlinien im Design-Modus (styles.css).
  gridEl.style.setProperty('--gs-cell-h', GRID_CELL_HEIGHT + 'px');
  grid.on('change', () => { if (_designOn) _syncGridToModel(pageId); });
  // Schmales Fenster: selbst auf 1 Spalte stapeln (siehe Resize-Listener).
  // Gridstacks columnOpts/moveScale rundete beim Zurückschalten Breiten auf
  // und ließ Kacheln breiter werden als eingestellt — daher kein columnOpts.
  if (_isNarrowViewport()) grid.column(1, 'list');
  _grids.set(pageId, grid);
  _builtPages.add(pageId);
  return grid;
}

function _syncGridToModel(pageId) {
  const grid = _grids.get(pageId);
  if (!grid) return;
  // Im responsiven 1-Spalten-Modus (schmales Fenster) nie zurückschreiben —
  // sonst überschreibt die Mobil-Geometrie das gespeicherte 12-Spalten-Layout.
  if (typeof grid.getColumn === 'function' && grid.getColumn() !== GRID_COLUMNS) return;
  grid.save(false).forEach((n) => {
    const t = _tileById(n.id, pageId);
    if (t) { t.x = n.x; t.y = n.y; t.w = n.w; t.h = n.h; }
  });
}

// Responsive: unter 760px stapelt jedes Grid auf 1 Spalte (Liste), darüber
// gilt wieder exakt die im Modell gespeicherte 12-Spalten-Geometrie. Das
// Modell ist die einzige Wahrheit — beim Hin- und Herschalten driftet nichts.
const NARROW_VIEWPORT_PX = 760;
function _isNarrowViewport() { return window.innerWidth < NARROW_VIEWPORT_PX; }

function _applyModelGeometry(pageId) {
  const grid = _grids.get(pageId);
  if (!grid || grid.getColumn() !== GRID_COLUMNS) return;
  grid.batchUpdate();
  grid.getGridItems().forEach((el) => {
    const t = _tileById(el.getAttribute('gs-id'), pageId);
    if (t) grid.update(el, { x: t.x, y: t.y, w: t.w, h: t.h });
  });
  grid.batchUpdate(false);
}

let _viewportResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_viewportResizeTimer);
  _viewportResizeTimer = setTimeout(() => {
    const narrow = _isNarrowViewport();
    _grids.forEach((grid, pageId) => {
      const want = narrow ? 1 : GRID_COLUMNS;
      if (grid.getColumn() === want) return;
      grid.column(want, narrow ? 'list' : 'none');
      if (!narrow) _applyModelGeometry(pageId);
    });
  }, 120);
});

// Baut nur die aktive Seite neu (Shells zurück in den Pool, Grid verwerfen,
// aus dem Modell neu aufbauen). Robuster als Live-Manipulation bei add/hide.
function _rebuildActivePage() {
  const pid = _activePage;
  const gridEl = $('dashGrids').querySelector(`.grid-stack[data-page="${pid}"]`);
  if (gridEl) {
    gridEl.querySelectorAll('[data-widget-id]').forEach((el) => _tilePool().appendChild(el));
    const g = _grids.get(pid);
    if (g) { try { g.destroy(false); } catch { /* ignore */ } }
    _grids.delete(pid); _builtPages.delete(pid);
    gridEl.remove();
  }
  buildGridForPage(pid);
  _applyGridVisibility();
}

function _rebuildAllGrids() {
  document.querySelectorAll('#dashGrids [data-widget-id]').forEach((el) => _tilePool().appendChild(el));
  _grids.forEach((g) => { try { g.destroy(false); } catch { /* ignore */ } });
  _grids.clear(); _builtPages.clear();
  $('dashGrids').innerHTML = '';
  buildGridForPage(_activePage);
  _applyGridVisibility();
}

function _applyGridVisibility() {
  $('dashGrids').querySelectorAll('.grid-stack').forEach((g) => { g.style.display = (g.dataset.page === _activePage) ? '' : 'none'; });
  if (_designOn) _grids.get(_activePage)?.setStatic(false);
  _updateEmptyHint();
}

// Leere Seite: animierter Hinweis auf das Rechtsklick-Menü (pointer-events:
// none, damit der Rechtsklick durch das Overlay aufs Grid durchgeht).
function _updateEmptyHint() {
  const host = $('dashGrids');
  if (!host) return;
  const empty = _pageTiles(_activePage).length === 0;
  let hint = $('gridEmptyHint');
  if (!empty) { if (hint) hint.remove(); return; }
  if (hint) return;
  hint = document.createElement('div');
  hint.id = 'gridEmptyHint';
  hint.innerHTML =
    '<div class="empty-hint-mouse">' +
      '<svg width="46" height="64" viewBox="0 0 46 64" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<rect x="3" y="3" width="40" height="58" rx="20" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M23 5 V 23" stroke="currentColor" stroke-width="2"/>' +
        '<path class="empty-hint-btn" d="M23 3 A 20 20 0 0 1 43 23 L 23 23 Z" fill="currentColor"/>' +
      '</svg>' +
    '</div>' +
    '<div class="empty-hint-title">Rechtsklick auf das Grid, um Kacheln zu platzieren</div>' +
    '<div class="empty-hint-sub">Abschnitte &amp; weitere Seiten gibt es im Design-Modus (✎)</div>';
  host.appendChild(hint);
}

/* ---------- Load / save / page switching ---------- */
async function loadDashboard() {
  let model = null;
  try { model = await fetch('/api/dashboard', { cache: 'no-store' }).then((r) => r.json()); }
  catch { model = null; }
  if (!model || !Array.isArray(model.tiles) || !Array.isArray(model.pages) || !model.pages.length) {
    let legacy = [];
    try { legacy = await fetch('/api/dashboard/layout', { cache: 'no-store' }).then((r) => r.json()); }
    catch { legacy = []; }
    model = (Array.isArray(legacy) && legacy.length) ? migrateLegacy(legacy) : buildDefaultDashboard();
  }
  _dashboard = reconcileDashboard(model);
  _activePage = _restoreActivePage();
  renderPageTabs();
  showPage(_activePage);
}

function _restoreActivePage() {
  const saved = localStorage.getItem('dash.activePage');
  if (saved && _dashboard.pages.some((p) => p.id === saved)) return saved;
  return _dashboard.pages[0].id;
}

function showPage(pageId) {
  if (!_dashboard.pages.some((p) => p.id === pageId)) pageId = _dashboard.pages[0].id;
  _activePage = pageId;
  try { localStorage.setItem('dash.activePage', pageId); } catch { /* ignore */ }
  buildGridForPage(pageId);
  _applyGridVisibility();
  renderPageTabs();
}

async function saveDashboard(opts) {
  _builtPages.forEach((pid) => _syncGridToModel(pid));
  try {
    const r = await fetch('/api/dashboard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_dashboard),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    _designSnapshot = _clone(_dashboard);
    if (!opts || !opts.silent) toast('Layout gespeichert');
  } catch (err) {
    console.error('Failed to save dashboard:', err.message);
    toast('Speichern fehlgeschlagen', { type: 'error' });
  }
}

/* ---------- Page tabs ---------- */
function renderPageTabs() {
  const bar = $('dashPages');
  if (!bar) return;
  bar.style.display = (_dashboard.pages.length > 1 || _designOn) ? 'flex' : 'none';
  bar.innerHTML = '';
  _dashboard.pages.forEach((p) => {
    const tab = document.createElement('button');
    tab.className = 'dash-tab' + (p.id === _activePage ? ' active' : '');
    tab.dataset.page = p.id;
    tab.textContent = p.name;
    tab.title = _designOn ? 'Klicken zum Wechseln · Doppelklick zum Umbenennen' : p.name;
    tab.addEventListener('click', () => showPage(p.id));
    tab.addEventListener('dblclick', () => { if (_designOn) renamePage(p.id); });
    bar.appendChild(tab);
  });
  if (_designOn) {
    const add = document.createElement('button');
    add.className = 'dash-tab dash-tab-add';
    add.textContent = '+ Seite';
    add.title = 'Neue Seite anlegen';
    add.addEventListener('click', addPage);
    bar.appendChild(add);
    _initTabSortable();
  } else if (_tabSortable) {
    try { _tabSortable.destroy(); } catch { /* ignore */ }
    _tabSortable = null;
  }
}

function _initTabSortable() {
  if (typeof Sortable === 'undefined' || _tabSortable) return;
  _tabSortable = Sortable.create($('dashPages'), {
    animation: 150,
    filter: '.dash-tab-add',
    draggable: '.dash-tab:not(.dash-tab-add)',
    onEnd: () => {
      const ids = Array.from($('dashPages').querySelectorAll('.dash-tab:not(.dash-tab-add)')).map((el) => el.dataset.page);
      _dashboard.pages.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    },
  });
}

function addPage() {
  const name = (prompt('Name der neuen Seite:', 'Neue Seite') || '').trim();
  if (!name) return;
  const id = _uid('page:');
  _dashboard.pages.push({ id, name: name.slice(0, 60), icon: '' });
  showPage(id);
  toast(`Seite „${name}" angelegt`);
}

function renamePage(pageId) {
  const p = _dashboard.pages.find((x) => x.id === pageId);
  if (!p) return;
  const name = (prompt('Seite umbenennen:', p.name) || '').trim();
  if (!name) return;
  p.name = name.slice(0, 60);
  renderPageTabs();
}

function deletePage(pageId) {
  if (_dashboard.pages.length <= 1) { toast('Die letzte Seite kann nicht gelöscht werden', { type: 'error' }); return; }
  const p = _dashboard.pages.find((x) => x.id === pageId);
  if (!p || !confirm(`Seite „${p.name}" mit allen Kacheln löschen?`)) return;
  // Shells dieser Seite zurück in den Pool + zugehörige Widget-Kacheln ausblenden.
  const gridEl = $('dashGrids').querySelector(`.grid-stack[data-page="${pageId}"]`);
  if (gridEl) gridEl.querySelectorAll('[data-widget-id]').forEach((el) => _tilePool().appendChild(el));
  const g = _grids.get(pageId);
  if (g) { try { g.destroy(false); } catch { /* ignore */ } }
  _grids.delete(pageId); _builtPages.delete(pageId);
  if (gridEl) gridEl.remove();
  _dashboard.tiles.forEach((t) => { if (t.page === pageId && t.type === 'widget') t.hidden = true; });
  _dashboard.tiles = _dashboard.tiles.filter((t) => !(t.page === pageId && t.type === 'heading'));
  _dashboard.pages = _dashboard.pages.filter((x) => x.id !== pageId);
  _activePage = _dashboard.pages[0].id;
  showPage(_activePage);
  toast(`Seite „${p.name}" gelöscht`);
}

/* ---------- Design mode ---------- */
function enterDesignMode() {
  if (_designOn) return;
  _designOn = true;
  _designSnapshot = _clone(_dashboard);
  document.body.classList.add('design-mode');
  $('layoutEditBtn')?.classList.add('active');
  _grids.forEach((g) => g.setStatic(false));
  renderPageTabs();
  renderDesignBar();
  if (window.innerWidth < 760) {
    toast('Schmales Fenster: Kacheln sind auf 1 Spalte umgebrochen — Positionsänderungen werden erst in voller Breite gespeichert.', { ttl: 6000 });
  }
}

function exitDesignMode(save) {
  if (!_designOn) return;
  if (save) {
    saveDashboard();
  } else if (_designSnapshot) {
    _dashboard = _designSnapshot;
    _designSnapshot = null;
    if (!_dashboard.pages.some((p) => p.id === _activePage)) _activePage = _dashboard.pages[0].id;
    _rebuildAllGrids();
    applyAllTileConfigs(); // verworfene Kachel-Einstellungen zurücknehmen
    renderPageTabs();
  }
  _designOn = false;
  document.body.classList.remove('design-mode');
  $('layoutEditBtn')?.classList.remove('active');
  _grids.forEach((g) => g.setStatic(true));
  closeTileMenu();
  renderPageTabs();
}

function toggleDesignMode() { _designOn ? exitDesignMode(true) : enterDesignMode(); }

/* ---------- Tile add / hide / headings / size ---------- */
function addWidgetToActivePage(widgetId) {
  const wd = WIDGET_BY_ID.get(widgetId);
  const t = _tileById(widgetId);
  if (!wd || !t) return;
  _syncGridToModel(_activePage);
  const restore = t._wasPlaced && t.page === _activePage; // „Rückgängig" nach Ausblenden
  t.hidden = false; t.page = _activePage;
  if (!(+t.w > 0) || !(+t.h > 0)) { t.w = wd.defaultSize.w; t.h = wd.defaultSize.h; }
  if (!restore) { t.x = 0; t.y = _bottomY(_activePage, widgetId); }
  delete t._wasPlaced;
  _rebuildActivePage();
  renderCatalogIfOpen();
  _saveIfLive();
  toast(`${wd.label} hinzugefügt`);
}

// Wie addWidgetToActivePage, aber an einer konkreten Zelle (Rechtsklick-Menü).
function addWidgetAt(widgetId, x, y) {
  const wd = WIDGET_BY_ID.get(widgetId);
  const t = _tileById(widgetId);
  if (!wd || !t) return;
  _syncGridToModel(_activePage);
  t.hidden = false; t.page = _activePage;
  delete t._wasPlaced;
  if (!(+t.w > 0) || !(+t.h > 0)) { t.w = wd.defaultSize.w; t.h = wd.defaultSize.h; }
  t.x = Math.max(0, Math.min(GRID_COLUMNS - t.w, Math.round(x)));
  t.y = Math.max(0, Math.round(y));
  _rebuildActivePage();
  renderCatalogIfOpen();
  _saveIfLive();
  toast(`${wd.label} hinzugefügt`);
}

function hideTile(tileId) {
  const t = _tileById(tileId, _activePage) || _tileById(tileId);
  if (!t) return;
  if (t.type === 'heading') { removeHeading(tileId); return; }
  _syncGridToModel(_activePage);
  t.hidden = true;
  t._wasPlaced = true; // Geometrie merken → „Rückgängig" stellt die Position wieder her
  _rebuildActivePage();
  renderCatalogIfOpen();
  toast(`${WIDGET_BY_ID.get(tileId)?.label || 'Kachel'} ausgeblendet`, {
    actionLabel: 'Rückgängig', action: () => addWidgetToActivePage(tileId),
  });
}
// Rückwärtskompatibel: alte Inline-onclicks der Shell-Controls.
function hideTileNow(tileId) { hideTile(tileId); }

function addHeading() { addHeadingAt(_bottomY(_activePage)); }

function addHeadingAt(y) {
  _syncGridToModel(_activePage);
  const id = _uid('heading:');
  _dashboard.tiles.push({ id, type: 'heading', page: _activePage, x: 0, y: Math.max(0, Math.round(y)), w: GRID_COLUMNS, h: 1, text: 'Neuer Abschnitt' });
  _rebuildActivePage();
  _saveIfLive();
  // Neue Überschrift direkt zum Bearbeiten öffnen.
  const el = $('dashGrids').querySelector(`.grid-stack-item[gs-id="${id}"] .gs-heading-text`);
  if (el) startHeadingEdit(el, id);
  toast('Überschrift hinzugefügt');
}

function removeHeading(id) {
  _syncGridToModel(_activePage);
  _dashboard.tiles = _dashboard.tiles.filter((t) => t.id !== id);
  _rebuildActivePage();
  _saveIfLive();
  toast('Überschrift entfernt');
}

function startHeadingEdit(textEl, id) {
  if (!textEl) return;
  textEl.setAttribute('contenteditable', 'true');
  textEl.classList.add('editing');
  ['mousedown', 'pointerdown', 'touchstart'].forEach((ev) => textEl.addEventListener(ev, (e) => e.stopPropagation()));
  textEl.focus();
  const range = document.createRange(); range.selectNodeContents(textEl);
  const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  const commit = () => {
    textEl.removeAttribute('contenteditable');
    textEl.classList.remove('editing');
    const t = _tileById(id);
    if (t) { t.text = (textEl.textContent || '').trim().slice(0, 80) || 'Abschnitt'; textEl.textContent = t.text; }
    _saveIfLive();
  };
  textEl.addEventListener('blur', commit, { once: true });
  textEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
    if (e.key === 'Escape') { const t = _tileById(id); if (t) textEl.textContent = t.text; textEl.blur(); }
  });
}

function setTileSize(tileId, w, h) {
  const min = WIDGET_BY_ID.get(tileId)?.minSize;
  if (min) { w = Math.max(w, min.w); h = Math.max(h, min.h); }
  const grid = _grids.get(_activePage);
  const item = grid && grid.el.querySelector(`.grid-stack-item[gs-id="${tileId}"]`);
  if (grid && item) grid.update(item, { w, h });
  const t = _tileById(tileId, _activePage);
  if (t) { t.w = w; t.h = h; }
}

/* ---------- Tile options menu (popup) ---------- */
function closeTileMenu() {
  const m = $('tileMenu');
  if (m) m.remove();
  document.querySelectorAll('.gs-tile-controls.menu-open').forEach((c) => c.classList.remove('menu-open'));
  document.removeEventListener('mousedown', _tileMenuOutside);
}

function openTileMenu(t, anchor) {
  closeTileMenu();
  const menu = document.createElement('div');
  menu.id = 'tileMenu';
  menu.className = 'tile-menu';
  const add = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'tile-menu-item' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', (e) => { e.stopPropagation(); closeTileMenu(); fn(); });
    menu.appendChild(b);
  };
  if (t.type === 'heading') {
    add('Umbenennen', '', () => {
      const el = $('dashGrids').querySelector(`.grid-stack-item[gs-id="${t.id}"] .gs-heading-text`);
      startHeadingEdit(el, t.id);
    });
    add('Entfernen', 'danger', () => removeHeading(t.id));
  } else {
    add('⚙ Einstellungen', '', () => openTileSettings(t));
    // Größe & Ausblenden sind Layout-Aktionen → nur im Design-Modus.
    if (_designOn) {
      const sep0 = document.createElement('div'); sep0.className = 'tile-menu-sep'; menu.appendChild(sep0);
      const lbl = document.createElement('div');
      lbl.className = 'tile-menu-label';
      lbl.textContent = 'Größe';
      menu.appendChild(lbl);
      const sizeRow = document.createElement('div');
      sizeRow.className = 'tile-menu-sizes';
      SIZE_PRESETS.forEach((p) => {
        const b = document.createElement('button');
        b.className = 'tile-menu-size' + (t.w === p.w && t.h === p.h ? ' active' : '');
        b.textContent = p.label;
        b.title = `${p.w}×${p.h}`;
        b.addEventListener('click', (e) => { e.stopPropagation(); closeTileMenu(); setTileSize(t.id, p.w, p.h); });
        sizeRow.appendChild(b);
      });
      menu.appendChild(sizeRow);
      const sep = document.createElement('div'); sep.className = 'tile-menu-sep'; menu.appendChild(sep);
      add('Ausblenden', 'danger', () => hideTile(t.id));
    }
  }
  document.body.appendChild(menu);
  if (anchor instanceof Element) {
    anchor.closest('.gs-tile-controls')?.classList.add('menu-open');
    const r = anchor.getBoundingClientRect();
    _placeMenuAt(menu, r.left, r.bottom + 6);
  } else {
    // Rechtsklick: anchor ist ein {x,y}-Punkt in Viewport-Koordinaten.
    _placeMenuAt(menu, anchor.x, anchor.y);
  }
  setTimeout(() => document.addEventListener('mousedown', _tileMenuOutside), 0);
}

function _placeMenuAt(menu, x, y) {
  menu.style.left = Math.max(8, Math.min(x, window.innerWidth - menu.offsetWidth - 8)) + 'px';
  menu.style.top = Math.max(8, Math.min(y, window.innerHeight - menu.offsetHeight - 8)) + 'px';
}
function _tileMenuOutside(e) {
  const m = $('tileMenu');
  if (m && !m.contains(e.target)) closeTileMenu();
}

/* ---------- Grid-Kontextmenü (Rechtsklick: Kachel/Abschnitt platzieren) ---------- */

// Zelle unter dem Mauszeiger — bewusst selbst gerechnet (Spalte = 1/12 der
// Grid-Breite, Zeile = cellHeight), damit auch ein leeres Grid (Höhe 0) und
// Klicks unterhalb der letzten Zeile sinnvolle Koordinaten liefern.
function _cellFromEvent(e) {
  const gridEl = $('dashGrids').querySelector(`.grid-stack[data-page="${_activePage}"]`);
  const grid = _grids.get(_activePage);
  if (!gridEl || !grid || grid.getColumn() !== GRID_COLUMNS) return { x: 0, y: _bottomY(_activePage) };
  const r = gridEl.getBoundingClientRect();
  if (!(r.width > 0)) return { x: 0, y: _bottomY(_activePage) };
  const x = Math.max(0, Math.min(GRID_COLUMNS - 1, Math.floor((e.clientX - r.left) / (r.width / GRID_COLUMNS))));
  const y = Math.max(0, Math.floor((e.clientY - r.top) / GRID_CELL_HEIGHT));
  return { x, y };
}

function openGridContextMenu(e) {
  closeTileMenu();
  const cell = _cellFromEvent(e);
  const menu = document.createElement('div');
  menu.id = 'tileMenu';
  menu.className = 'tile-menu grid-ctx-menu';
  const add = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'tile-menu-item' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', (ev) => { ev.stopPropagation(); closeTileMenu(); fn(); });
    return b;
  };
  const lbl = document.createElement('div');
  lbl.className = 'tile-menu-label';
  lbl.textContent = 'Kachel platzieren';
  menu.appendChild(lbl);
  const list = document.createElement('div');
  list.className = 'tile-menu-scroll';
  const catalog = _catalogTiles()
    .map((t) => WIDGET_BY_ID.get(t.id))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  if (catalog.length) {
    catalog.forEach((wd) => list.appendChild(add(wd.label, '', () => addWidgetAt(wd.id, cell.x, cell.y))));
  } else {
    const none = document.createElement('div');
    none.className = 'tile-menu-empty';
    none.textContent = 'Alle Kacheln sind platziert';
    list.appendChild(none);
  }
  menu.appendChild(list);
  const sep = document.createElement('div'); sep.className = 'tile-menu-sep'; menu.appendChild(sep);
  menu.appendChild(add('＋ Abschnitt hinzufügen', '', () => addHeadingAt(cell.y)));
  if (!_designOn) menu.appendChild(add('✎ Design-Modus öffnen', '', enterDesignMode));
  document.body.appendChild(menu);
  _placeMenuAt(menu, e.clientX, e.clientY);
  setTimeout(() => document.addEventListener('mousedown', _tileMenuOutside), 0);
}

// Rechtsklick im Dashboard-Bereich abfangen: auf einer Kachel → deren
// Optionsmenü, auf freier Fläche → Platzierungsmenü an der Zelle.
function setupGridContextMenu() {
  const host = $('dashGrids');
  if (!host) return;
  host.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const item = e.target.closest('.grid-stack-item');
    if (item) {
      const t = _tileById(item.getAttribute('gs-id'), _activePage);
      if (t) { openTileMenu(t, { x: e.clientX, y: e.clientY }); return; }
    }
    openGridContextMenu(e);
  });
}

/* ---------- Tile settings modal (Kachel-Einstellungen) ---------- */
function _buildTileSettingsModal() {
  const modal = document.createElement('div');
  modal.id = 'tileSettings';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(480px,100%)">' +
      '<div class="picker-head"><span class="picker-title" id="tileSettingsTitle">Kachel-Einstellungen</span>' +
      '<button class="picker-close" title="Schließen">✕</button></div>' +
      '<div class="tile-settings-body" id="tileSettingsBody"></div>' +
    '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeTileSettings(); });
  modal.querySelector('.picker-close').addEventListener('click', closeTileSettings);
  document.body.appendChild(modal);
  return modal;
}

function openTileSettings(t) {
  const wd = WIDGET_BY_ID.get(t.id);
  if (!wd) return;
  let modal = $('tileSettings');
  if (!modal) modal = _buildTileSettingsModal();
  _renderTileSettings(t.id);
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}
function closeTileSettings() {
  const modal = $('tileSettings');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
}

// Optionen fuer ein 'select'-Control. 'ifaces' wird dynamisch aus der zuletzt
// gemeldeten Interface-Liste aufgebaut (plus "Auto").
function _tileSelectOptions(widgetId, opt) {
  if (opt.options === 'ifaces') {
    const list = [{ v: '', l: 'Auto' }];
    for (const n of (state.netIfaces || [])) list.push({ v: n, l: n });
    const cur = String(_cfgVal(widgetId, opt.key) || '');
    if (cur && !list.some((o) => o.v === cur)) list.push({ v: cur, l: cur });
    return list;
  }
  return Array.isArray(opt.options) ? opt.options : [];
}
function _renderTileSettings(widgetId) {
  const wd = WIDGET_BY_ID.get(widgetId);
  const body = $('tileSettingsBody');
  if (!wd || !body) return;
  setText('tileSettingsTitle', wd.label + ' · Einstellungen');
  body.innerHTML = '';
  const row = (labelText, control, hint) => {
    const r = document.createElement('div');
    r.className = 'tile-settings-row';
    const left = document.createElement('div');
    const key = document.createElement('div');
    key.className = 'tile-settings-key';
    key.textContent = labelText;
    left.appendChild(key);
    if (hint) {
      const h = document.createElement('div');
      h.className = 'tile-settings-hint';
      h.textContent = hint;
      left.appendChild(h);
    }
    r.append(left, control);
    body.appendChild(r);
  };

  // Titel-Override (implizit für jede Kachel)
  const titleInput = document.createElement('input');
  titleInput.className = 'cfg-input';
  titleInput.placeholder = wd.label;
  titleInput.value = String(_cfgVal(widgetId, 'title') || '');
  titleInput.addEventListener('input', () => _setTileCfg(widgetId, 'title', titleInput.value.trim().slice(0, 60)));
  row('Titel', titleInput, 'Leer lassen für den Standardnamen');

  for (const opt of (WIDGET_OPTIONS[widgetId] || [])) {
    if (opt.type === 'toggle') {
      const sw = document.createElement('div');
      sw.className = 'switch' + (_cfgVal(widgetId, opt.key) ? ' on' : '');
      sw.appendChild(document.createElement('span'));
      sw.addEventListener('click', () => {
        const on = !sw.classList.contains('on');
        sw.classList.toggle('on', on);
        _setTileCfg(widgetId, opt.key, on);
      });
      row(opt.label, sw);
    } else if (opt.type === 'count') {
      const inp = document.createElement('input');
      inp.className = 'cfg-input ts-count';
      inp.type = 'number';
      inp.min = '0';
      inp.placeholder = '0';
      const cur = Math.floor(+_cfgVal(widgetId, opt.key)) || 0;
      inp.value = cur > 0 ? String(cur) : '';
      inp.addEventListener('input', () => {
        const n = Math.max(0, Math.floor(+inp.value) || 0);
        _setTileCfg(widgetId, opt.key, n);
      });
      row(opt.label, inp, '0 oder leer = alle anzeigen');
    } else if (opt.type === 'number') {
      const inp = document.createElement('input');
      inp.className = 'cfg-input ts-count';
      inp.type = 'number';
      inp.min = '0';
      inp.placeholder = String(opt.default || 0);
      const cur = Math.floor(+_cfgVal(widgetId, opt.key)) || 0;
      inp.value = cur > 0 ? String(cur) : '';
      inp.addEventListener('input', () =>
        _setTileCfg(widgetId, opt.key, Math.max(0, Math.floor(+inp.value) || 0)));
      row(opt.label, inp);
    } else if (opt.type === 'text') {
      const inp = document.createElement('input');
      inp.className = 'cfg-input';
      inp.type = 'text';
      inp.placeholder = String(opt.default || '');
      inp.value = String(_cfgVal(widgetId, opt.key) || '');
      inp.addEventListener('input', () =>
        _setTileCfg(widgetId, opt.key, inp.value.trim().slice(0, 40)));
      row(opt.label, inp);
    } else if (opt.type === 'select') {
      const sel = document.createElement('select');
      sel.className = 'cfg-input';
      const cur = String(_cfgVal(widgetId, opt.key));
      for (const o of _tileSelectOptions(widgetId, opt)) {
        const el = document.createElement('option');
        el.value = o.v; el.textContent = o.l;
        if (String(o.v) === cur) el.selected = true;
        sel.appendChild(el);
      }
      sel.addEventListener('change', () => _setTileCfg(widgetId, opt.key, sel.value));
      row(opt.label, sel);
    }
  }

  // Fußzeile: alles zurücksetzen
  const reset = document.createElement('button');
  reset.className = 'cfg-btn cfg-btn-del';
  reset.textContent = 'Zurücksetzen';
  reset.style.marginTop = '12px';
  reset.style.alignSelf = 'flex-end';
  reset.addEventListener('click', () => {
    const t = _tileById(widgetId);
    if (t) t.config = {};
    applyTileConfig(widgetId);
    try { WIDGET_REFRESH[widgetId]?.(); } catch { /* ignore */ }
    if (!_designOn) {
      clearTimeout(_cfgSaveTimer);
      _cfgSaveTimer = setTimeout(() => saveDashboard({ silent: true }), 600);
    }
    _renderTileSettings(widgetId);
  });
  body.appendChild(reset);
}

/* ---------- Widget catalog / picker ---------- */
function _widgetBadge(label) {
  return (label.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '··').toUpperCase();
}

function openWidgetPicker() {
  let modal = $('widgetPicker');
  if (!modal) modal = _buildWidgetPicker();
  _renderCatalogGrid();
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('open'));
}
function closeWidgetPicker() {
  const modal = $('widgetPicker');
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
}
function renderCatalogIfOpen() {
  const modal = $('widgetPicker');
  if (modal && modal.style.display !== 'none') _renderCatalogGrid();
}

function _buildWidgetPicker() {
  const modal = document.createElement('div');
  modal.id = 'widgetPicker';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel">' +
      '<div class="picker-head"><span class="picker-title">Kachel hinzufügen</span>' +
      '<button class="picker-close" title="Schließen">✕</button></div>' +
      '<div class="picker-grid" id="widgetPickerGrid"></div>' +
    '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeWidgetPicker(); });
  modal.querySelector('.picker-close').addEventListener('click', closeWidgetPicker);
  document.body.appendChild(modal);
  return modal;
}

function _renderCatalogGrid() {
  const grid = $('widgetPickerGrid');
  if (!grid) return;
  const available = _catalogTiles();
  grid.innerHTML = '';
  if (!available.length) {
    grid.innerHTML = '<div class="picker-empty">Alle Kacheln sind bereits platziert.</div>';
    return;
  }
  available.forEach((t) => {
    const wd = WIDGET_BY_ID.get(t.id);
    const card = document.createElement('button');
    card.className = 'picker-card';
    card.innerHTML =
      `<span class="picker-badge">${_widgetBadge(wd.label)}</span>` +
      `<span class="picker-name">${wd.label}</span>` +
      '<span class="picker-add">+ Hinzufügen</span>';
    card.addEventListener('click', () => addWidgetToActivePage(t.id));
    grid.appendChild(card);
  });
}

/* ---------- Design toolbar ---------- */
function renderDesignBar() {
  const bar = $('layoutEditBar');
  if (!bar) return;
  bar.innerHTML = '';
  const group = (nodes) => { const g = document.createElement('div'); g.className = 'design-bar-group'; nodes.forEach((n) => g.appendChild(n)); return g; };
  const btn = (label, cls, fn, title) => {
    const b = document.createElement('button');
    b.className = 'cfg-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener('click', fn);
    return b;
  };
  const hint = document.createElement('span');
  hint.className = 'design-bar-hint';
  hint.textContent = 'Design-Modus · Kacheln ziehen & an den Rändern skalieren';
  bar.appendChild(hint);
  bar.appendChild(group([
    btn('+ Kachel', 'design-primary', openWidgetPicker, 'Kachel aus dem Katalog hinzufügen'),
    btn('+ Überschrift', '', addHeading, 'Abschnitts-Überschrift hinzufügen'),
    btn('+ Seite', '', addPage, 'Neue Seite anlegen'),
    btn('Seite löschen', 'cfg-btn-del', () => deletePage(_activePage), 'Aktive Seite mit allen Kacheln löschen'),
  ]));
  bar.appendChild(group([
    btn('Grid leeren', 'cfg-btn-del', resetDashboardLayout, 'Alle Kacheln entfernen und mit leerem Grid starten'),
    btn('Verwerfen', '', () => exitDesignMode(false), 'Änderungen verwerfen'),
    btn('✓ Fertig', 'design-primary', () => exitDesignMode(true), 'Speichern & Design-Modus verlassen'),
  ]));
}

/* ---------- Toast / snackbar ---------- */
function toast(msg, opts) {
  opts = opts || {};
  let host = $('toastHost');
  if (!host) { host = document.createElement('div'); host.id = 'toastHost'; host.className = 'toast-host'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = 'toast' + (opts.type === 'error' ? ' toast-error' : '');
  const span = document.createElement('span'); span.className = 'toast-msg'; span.textContent = msg; el.appendChild(span);
  if (opts.action && opts.actionLabel) {
    const b = document.createElement('button');
    b.className = 'toast-action'; b.textContent = opts.actionLabel;
    b.addEventListener('click', () => { try { opts.action(); } finally { el.remove(); } });
    el.appendChild(b);
  }
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const ttl = opts.ttl || (opts.action ? 6000 : 3000);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ttl);
}

/* ---------- Settings "Layout" tab + compatibility aliases ---------- */
function renderLayoutEditor() {
  const list = $('layoutEditList');
  if (!list) return;
  list.innerHTML = '';
  const intro = document.createElement('div');
  intro.className = 'cfg-hint';
  intro.textContent = 'Kacheln frei anordnen, skalieren, ein-/ausblenden und Seiten anlegen — direkt auf dem Dashboard.';
  list.appendChild(intro);
  const open = document.createElement('button');
  open.className = 'cfg-btn design-primary';
  open.textContent = '✎ Design-Modus öffnen';
  open.style.marginTop = '10px';
  open.addEventListener('click', () => {
    if ($('settingsModal')) closeSettings();
    enterDesignMode();
  });
  list.appendChild(open);
}

// Alte Inline-onclicks aus index.html: auf die neuen Funktionen mappen.
function toggleLayoutEditMode() { toggleDesignMode(); }
function saveDashboardLayout() { saveDashboard(); }
function resetDashboardLayout() {
  if (!confirm('Alle Kacheln vom Dashboard entfernen und mit leerem Grid starten?')) return;
  _dashboard = reconcileDashboard(buildDefaultDashboard());
  _activePage = _dashboard.pages[0].id;
  _rebuildAllGrids();
  applyAllTileConfigs();
  renderPageTabs();
  toast('Grid geleert');
}

/* ---------- Secrets (credentials) ---------- */
async function loadSecrets() {
  try {
    const d = await fetch('/api/secrets', { cache: 'no-store' }).then(r => r.json());
    const set = (id, val) => { const el = $(id); if (el && val) el.value = val; };
    set('secretGlancesUrl',  d.GLANCES_URL);
    set('secretGlancesLabel', d.GLANCES_LABEL);
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
    set('secretUnraidUrl',    d.UNRAID_URL);
    set('secretUnraidApiKey', d.UNRAID_API_KEY);
    set('secretUnraidSshHost', d.UNRAID_SSH_HOST);
    set('secretUnraidSshPort', d.UNRAID_SSH_PORT);
    set('secretUnraidSshUser', d.UNRAID_SSH_USER);
    set('secretUnraidSshPass', d.UNRAID_SSH_PASSWORD);
    set('secretUnraidSshKey',  d.UNRAID_SSH_KEY);
    const danger = $('unraidDangerToggle');
    if (danger) danger.checked = d.UNRAID_DANGER_ACTIONS === 'true';
  } catch { /* ignore, fields stay empty */ }
}

async function saveSecrets(card) {
  const val = (id) => ($(id) || {}).value || '';
  let body = {};
  if (card === 'glances') {
    body = { GLANCES_URL: val('secretGlancesUrl'), GLANCES_LABEL: val('secretGlancesLabel') };
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
  } else if (card === 'unraid') {
    body = {
      UNRAID_URL: val('secretUnraidUrl'), UNRAID_API_KEY: val('secretUnraidApiKey'),
      UNRAID_SSH_HOST: val('secretUnraidSshHost'), UNRAID_SSH_PORT: val('secretUnraidSshPort'),
      UNRAID_SSH_USER: val('secretUnraidSshUser'), UNRAID_SSH_PASSWORD: val('secretUnraidSshPass'),
      UNRAID_SSH_KEY: val('secretUnraidSshKey'),
      // Leerstring löscht den Key (Server-Semantik) -> Gefahrenzone aus.
      UNRAID_DANGER_ACTIONS: ($('unraidDangerToggle') || {}).checked ? 'true' : '',
    };
  }
  try {
    const r = await fetch('/api/secrets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await loadSecrets();
    if (card === 'glances' || card === 'adguard' || card === 'plex' || card === 'unifi' || card === 'nextcloud' || card === 'unraid') startLive();
    if (card === 'weather') startWeather();
  } catch (err) {
    console.error('Failed to save secrets:', err.message);
  }
}

/* ---------- Settings: category tree ---------- */
const SETTINGS_TREE = [
  {
    id: 'general', label: 'General',
    children: [
      { id: 'theme',          label: 'Theme & Colors', icon: '◐' },
      { id: 'effects',        label: 'Effects',        icon: '✦' },
      { id: 'livedata',       label: 'Live Data',      icon: '↻' },
      { id: 'schnellzugriff', label: 'Quick Access',   icon: '▤' },
      { id: 'layout',         label: 'Layout',         icon: '▦' },
      { id: 'ueber',          label: 'About',          icon: 'ℹ' },
    ],
  },
  {
    id: 'modules', label: 'Modules',
    children: [
      { id: 'glances',    label: 'Glances',           badge: 'GL', color: '#5b9dff', statusEl: 'glancesSettingsStatus' },
      { id: 'disks',      label: 'Disks',              icon: '▥' },
      { id: 'adguard',    label: 'AdGuard Home',       badge: 'AG', color: '#3ddc97', statusEl: 'adguardSettingsStatus' },
      { id: 'plex',       label: 'Plex',               badge: 'PX', color: '#ff8a4c', statusEl: 'plexSettingsStatus' },
      { id: 'nextcloud',  label: 'Nextcloud',          badge: 'NC', color: '#0082c9', statusEl: 'nextcloudSettingsStatus' },
      { id: 'weather',    label: 'Weather',            badge: 'WT', color: '#ffb454', statusEl: 'weatherSettingsStatus' },
      { id: 'unifi',      label: 'UniFi / Protect',    badge: 'UF', color: '#5b9dff', statusEl: 'unifiSettingsStatus' },
      { id: 'unraid',     label: 'Unraid',             badge: 'UN', color: '#ff7a30', statusEl: 'unraidSettingsStatus' },
      { id: 'monitoring', label: 'Service Monitoring', icon: '⏱' },
    ],
  },
];
const SETTINGS_LEAF_MAP = {};
SETTINGS_TREE.forEach((cat) => cat.children.forEach((child) => { SETTINGS_LEAF_MAP[child.id] = { ...child, catId: cat.id }; }));

const SETTINGS_TAB_LOADERS = {
  schnellzugriff: () => loadQlEditor(),
  layout:         () => renderLayoutEditor(),
  disks:          () => loadDiskSettings(),
  unraid:         () => loadVmCfg(),
};
function runTabLoader(tab) {
  const fn = SETTINGS_TAB_LOADERS[tab];
  if (fn) fn();
}

function leafIconHtml(leaf, size) {
  if (leaf.badge) {
    return `<span style="font:700 ${size <= 16 ? 10 : 12}px 'JetBrains Mono',monospace;color:${leaf.color};min-width:${size}px;height:${size}px;line-height:${size}px;background:${hexA(leaf.color, 0.12)};border-radius:5px;text-align:center;display:inline-block;flex-shrink:0">${leaf.badge}</span>`;
  }
  return `<span style="font-size:${size}px;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;opacity:.85">${leaf.icon || ''}</span>`;
}

function renderSettingsTree() {
  const root = $('settingsTree');
  if (!root) return;
  root.innerHTML = '';
  SETTINGS_TREE.forEach((cat) => {
    const catEl = document.createElement('div');
    catEl.className = 'tree-cat';
    catEl.dataset.cat = cat.id;
    catEl.textContent = cat.label;
    catEl.addEventListener('click', () => selectCategory(cat.id));
    root.appendChild(catEl);

    const childrenEl = document.createElement('div');
    childrenEl.className = 'tree-children';
    childrenEl.dataset.catChildren = cat.id;
    cat.children.forEach((child) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'tree-item';
      itemEl.dataset.tab = child.id;
      itemEl.innerHTML = `${leafIconHtml(child, 14)}<span>${child.label}</span>` +
        (child.statusEl ? '<span class="tree-status-dot" style="display:none"></span>' : '');
      itemEl.addEventListener('click', () => selectTab(child.id));
      childrenEl.appendChild(itemEl);
    });
    root.appendChild(childrenEl);
  });
  updateTreeActiveState();
  syncModuleStatusDots();
}

function renderCategoryGrid(catId) {
  const grid = $('categoryGrid');
  if (!grid) return;
  const cat = SETTINGS_TREE.find((c) => c.id === catId);
  grid.innerHTML = '';
  if (!cat) return;
  cat.children.forEach((child) => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.dataset.tab = child.id;
    card.innerHTML =
      `<div class="grid-card-icon">${leafIconHtml(child, 26)}</div>` +
      `<div class="grid-card-label">${child.label}</div>` +
      (child.statusEl ? '<span class="grid-card-status" style="display:none"></span>' : '');
    card.addEventListener('click', () => selectTab(child.id));
    grid.appendChild(card);
  });
  syncModuleStatusDots();
}

function updateTreeActiveState() {
  document.querySelectorAll('.tree-cat').forEach((el) =>
    el.classList.toggle('active', el.dataset.cat === state.settingsCategory));
  document.querySelectorAll('.tree-item').forEach((el) =>
    el.classList.toggle('active', el.dataset.tab === state.settingsTab));
}

function selectCategory(catId) {
  state.settingsCategory = catId;
  state.settingsTab = null;
  updateTreeActiveState();
  renderCategoryGrid(catId);
  const grid = $('categoryGrid');
  if (grid) grid.style.display = 'grid';
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  const panel = $('settingsPanel');
  if (panel) panel.classList.remove('settings-leaf-active');
  const cat = SETTINGS_TREE.find((c) => c.id === catId);
  setText('settingsBreadcrumb', cat ? cat.label : 'Settings');
}

function selectTab(tabId) {
  const leaf = SETTINGS_LEAF_MAP[tabId];
  if (!leaf) return;
  state.settingsCategory = leaf.catId;
  state.settingsTab = tabId;
  updateTreeActiveState();
  const grid = $('categoryGrid');
  if (grid) grid.style.display = 'none';
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
  const panel = $('settingsPanel');
  if (panel) panel.classList.add('settings-leaf-active');
  setText('settingsBreadcrumb', leaf.label);
  runTabLoader(tabId);
}

/* ---------- Settings: module status dots (derived from existing status spans) ---------- */
function statusColorToDotClass(color) {
  if (!color) return null;
  const c = color.toLowerCase();
  if (c === '#3ddc97') return 'dot-green';
  if (c === '#ffb454') return 'dot-orange';
  if (c === '#f43f5e') return 'dot-red';
  return null;
}
function syncModuleStatusDots() {
  Object.values(SETTINGS_LEAF_MAP).forEach((leaf) => {
    if (!leaf.statusEl) return;
    const src = $(leaf.statusEl);
    const cls = src ? statusColorToDotClass(src.style.color) : null;
    document.querySelectorAll(`.tree-item[data-tab="${leaf.id}"] .tree-status-dot, .grid-card[data-tab="${leaf.id}"] .grid-card-status`)
      .forEach((dot) => {
        dot.classList.remove('dot-green', 'dot-orange', 'dot-red');
        if (cls) { dot.classList.add(cls); dot.style.display = ''; }
        else { dot.style.display = 'none'; }
      });
  });
}

let _statusDotTimer = null;
function openSettings() {
  const m = $('settingsModal');
  if (!m) return;
  m.style.display = 'flex';
  requestAnimationFrame(() => m.classList.add('open'));
  selectCategory('general');
  loadSecrets();
  loadDiskSettings();
  clearInterval(_statusDotTimer);
  _statusDotTimer = setInterval(syncModuleStatusDots, 2000);
}
function closeSettings() {
  const m = $('settingsModal');
  if (!m) return;
  m.classList.remove('open');
  m.addEventListener('transitionend', () => { m.style.display = 'none'; }, { once: true });
  clearInterval(_statusDotTimer);
}

function applyToggleVisual(key) {
  document.querySelectorAll(`.switch[data-toggle="${key}"]`).forEach((sw) => sw.classList.toggle('on', !!state[key]));
}
function toggle(key) {
  state[key] = !state[key];
  applyToggleVisual(key);
  if (key === 'gridOn') { const g = $('gridOverlay'); if (g) g.style.display = state.gridOn ? 'block' : 'none'; }
  if (key === 'animOn') {
    document.body.classList.toggle('no-anim', !state.animOn);
    _graphDirty = true; // draw one static frame when animations get disabled
  }
  if (key === 'glassOn') document.body.classList.toggle('no-glass', !state.glassOn);
  if (key === 'searchOn') applySearchVisible();
  if (key === 'liveOn') { if (state.liveOn) startLive(); else pauseLive(); }
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
  _applyAccent(state.accent);
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
// Setzt Akzentfarbe + die davon abgeleiteten Töne, damit der Accent-Picker
// die gesamte (neue) Oberfläche konsistent umfärbt, nicht nur reine --accent-Stellen.
function _applyAccent(c) {
  const root = document.documentElement.style;
  root.setProperty('--accent', c);
  root.setProperty('--accent-subtle', `color-mix(in srgb, ${c} 9%, transparent)`);
  root.setProperty('--accent-border', `color-mix(in srgb, ${c} 22%, transparent)`);
}
function setAccent(c) {
  state.accent = c;
  _applyAccent(c);
  renderAccents();
  saveUiPrefs();
}

function setUpdateMs(v) {
  state.updateMs = parseInt(v, 10) || 1600;
  setText('updateSec', (state.updateMs / 1000).toFixed(1));
  _graphDirty = true;
  // Bei aktivem SSE-Stream kommt das Tempo vom Server; updateMs steuert nur den
  // Polling-Fallback. Daher NICHT den Stream/alle Poller neu aufbauen (Slider
  // feuert bei jedem Ziehen) – nur den Fallback-Timer anpassen, falls aktiv.
  if (dataTimer) { clearInterval(dataTimer); dataTimer = setInterval(pollGlances, state.updateMs || 1600); }
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

  document.querySelectorAll('.switch[data-toggle]').forEach((sw) =>
    sw.addEventListener('click', () => toggle(sw.dataset.toggle)));

  const range = $('updateRange');
  if (range) range.addEventListener('input', (e) => setUpdateMs(e.target.value));

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });

  renderSettingsTree();
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

/* ---------- Widget-Kachel-Deko: dezente animierte Ecken-Akzente ----------
   Ein kleines, zum jeweiligen Widget passendes Inline-SVG pro Karte
   (data-widget-id), unten rechts als ruhiger Watermark-Akzent. Aufbau exakt
   wie die Wetter-Icons: SVG-String + CSS-Klassen + @keyframes. Die Bewegung
   respektiert damit automatisch die globale "Animationen"-Einstellung
   (.no-anim). Farbe kommt aus den Theme-Variablen -> Hell/Dunkel passt. */
function _td(inner) {
  return `<svg class="td-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ` +
    `xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${inner}</svg>`;
}
const WIDGET_DECOR = {
  // CPU-Chip mit sanft pulsierendem Kern
  'system-load': { color: 'var(--accent)', svg: () => _td(
    `<rect x="7" y="7" width="10" height="10" rx="1.5"/>` +
    `<rect class="td-pulse" x="10" y="10" width="4" height="4" rx="0.6"/>` +
    `<path d="M9 4v2M12 4v2M15 4v2M9 18v2M12 18v2M15 18v2M4 9h2M4 12h2M4 15h2M18 9h2M18 12h2M18 15h2"/>`) },
  // Auf/ab fließende Pfeile (Durchsatz)
  'network-throughput': { color: 'var(--green)', svg: () => _td(
    `<path class="td-up" d="M8 16V8M5 11l3-3 3 3"/>` +
    `<path class="td-down" d="M16 8v8M13 13l3 3 3-3"/>`) },
  // Sich drehende Festplatte
  'disk-storage': { color: 'var(--accent)', svg: () => _td(
    `<rect x="3" y="5" width="18" height="14" rx="2"/>` +
    `<g class="td-spin"><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></g>` +
    `<circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`) },
  // Herzschlag-/Pulslinie
  'service-status': { color: 'var(--green)', svg: () => _td(
    `<path class="td-pulse" d="M3 12h4l2-5 3 10 2-6 2 3h5"/>`) },
  // Leicht schwebende Container
  'docker': { color: 'var(--accent)', svg: () => _td(
    `<g class="td-float">` +
    `<rect x="6" y="11" width="3" height="3"/><rect x="9.5" y="11" width="3" height="3"/><rect x="13" y="11" width="3" height="3"/>` +
    `<rect x="9.5" y="7.5" width="3" height="3"/><rect x="13" y="7.5" width="3" height="3"/>` +
    `<path d="M4 15h13.5a3.8 3.8 0 0 0 3.3-2"/></g>`) },
  // Schutzschild mit dezentem Puls
  'adguard': { color: 'var(--green)', svg: () => _td(
    `<path class="td-pulse" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>` +
    `<path d="M9 12l2 2 4-4"/>`) },
  // Plex-Chevron mit sanftem Puls/Glow
  'plex': { color: 'var(--yellow)', svg: () => _td(
    `<path class="td-pulse" d="M9 5l7 7-7 7" stroke-width="2.4"/>`) },
  // Driftende Wolke
  'nextcloud': { color: 'var(--accent)', svg: () => _td(
    `<path class="td-drift" d="M7 17a4 4 0 0 1 .3-8A5.5 5.5 0 0 1 17.5 10 3.5 3.5 0 0 1 17 17z"/>`) },
  // Pulsierende WLAN-Bögen
  'unifi-network': { color: 'var(--accent)', svg: () => _td(
    `<path class="td-ping" d="M4 9a12 12 0 0 1 16 0"/>` +
    `<path d="M7 12a8 8 0 0 1 10 0"/>` +
    `<circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/>`) },
  // Access-Point-Signal (Ping)
  'unifi-aps': { color: 'var(--accent)', svg: () => _td(
    `<path class="td-ping" d="M5 8a10 10 0 0 1 14 0"/>` +
    `<path d="M8 11a6 6 0 0 1 8 0"/>` +
    `<circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>`) },
  // Kamera-Linse mit dezentem Blinzeln
  'unifi-cameras': { color: 'var(--purple)', svg: () => _td(
    `<rect x="3" y="7" width="12" height="10" rx="2"/>` +
    `<path d="M15 10l6-2.5v9L15 14z"/>` +
    `<circle class="td-blink" cx="9" cy="12" r="2"/>`) },
};
function injectTileDecor() {
  document.querySelectorAll('[data-widget-id]').forEach(card => {
    const def = WIDGET_DECOR[card.getAttribute('data-widget-id')];
    if (!def) return;
    // Titel-Kopfzeile der Karte (erstes Element mit text-transform:uppercase)
    const title = card.querySelector('[style*="text-transform:uppercase"]');
    if (!title || title.querySelector(':scope > .tile-decor')) return;
    const d = document.createElement('span');
    d.className = 'tile-decor';
    d.setAttribute('aria-hidden', 'true');
    d.style.color = def.color;
    d.innerHTML = def.svg();
    title.insertBefore(d, title.firstChild);
  });
}

/* ============================================================
   Network-Throughput-Kachel: Konfiguration, Backfill, Paket-Animation.
   Die Knoten der Flow-Animation (Internet/Server/Netzwerk) werden design-pur
   als beschriftete Glow-Kreise im SVG dargestellt (siehe index.html) – keine
   Firmen-Logos/Icons mehr; nur die Namen sind konfigurierbar. */

// Liest tile.config der Netz-Kachel und wendet Zeitraum/Skala/Interface/Knoten an.
function applyNetworkConfig() {
  const id = 'network-throughput';
  const rId = String(_cfgVal(id, 'range') || '1m');
  const range = NET_RANGES.find((r) => r.id === rId) || NET_RANGES[1];
  const rangeChanged = state.netRangeMs !== range.ms;
  state.netRangeMs = range.ms;

  const sm = String(_cfgVal(id, 'scaleMode') || 'auto');
  if (sm === 'auto') state.netScaleMode = 'auto';
  else if (sm === 'line') state.netScaleMode = 'line';
  else if (sm === 'custom') { state.netScaleMode = 'fixed'; state.netScaleMax = Math.max(1, +_cfgVal(id, 'scaleMax') || 100); }
  else { state.netScaleMode = 'fixed'; state.netScaleMax = Math.max(1, +sm || 100); }

  state.netIfacePref = String(_cfgVal(id, 'iface') || '');

  // Chart-Datenquelle (Unraid / WAN / beides) + Legende nur bei 'both'.
  state.netChartSeries = String(_cfgVal(id, 'chartSeries') || 'unraid');
  const leg = $('netLegend'); if (leg) leg.style.display = state.netChartSeries === 'both' ? '' : 'none';
  // Flow-Toggle spiegeln: data-cfg blendet nur das DOM aus, das Flag spart
  // zusaetzlich die rAF-Arbeit (kein DOM-Read pro Frame noetig).
  state.netFlowOn = _cfgVal(id, 'flow') !== false;
  // Paket-Stil (Design-Optionen): Block/Dot + Trail.
  state.netPktShape = String(_cfgVal(id, 'packetShape') || 'block');
  state.netTrailOn  = _cfgVal(id, 'flowTrail') !== false;

  const srvName = String(_cfgVal(id, 'srvName') || 'Unraid');
  setText('netRowSrvName', srvName);
  // Knoten-Beschriftung im Flow-SVG (design-pur: nur Text, keine Icons mehr).
  setText('netFlowIspLbl', String(_cfgVal(id, 'ispName') || 'willy.tel'));
  setText('netFlowSrvLbl', srvName);
  setText('netFlowLanLbl', String(_cfgVal(id, 'lanName') || 'Netzwerk'));

  reflectNetControls(rId, sm);
  _graphDirty = true;
  // Verlauf fuer den gewaehlten Bereich nachladen (auch initial), damit 10m/1h
  // sofort gefuellt sind – nicht bei jedem winzigen Re-Apply mehrfach.
  if (rangeChanged || !state._netBackfilled) { state._netBackfilled = true; backfillNetHistory(range.ms); }
}
function reflectNetControls(rangeId, scaleMode) {
  const shell = _shellFor('network-throughput'); if (!shell) return;
  shell.querySelectorAll('[data-net-range]').forEach((b) =>
    b.classList.toggle('active', b.dataset.netRange === rangeId));
  const sc = shell.querySelector('#netScaleCtl');
  if (sc && sc.value !== scaleMode) sc.value = scaleMode;
}
function setupNetTileControls() {
  const shell = _shellFor('network-throughput'); if (!shell) return;
  const rangeCtl = shell.querySelector('#netRangeCtl');
  if (rangeCtl && !rangeCtl._wired) {
    rangeCtl._wired = true;
    rangeCtl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-net-range]');
      if (b) _setTileCfg('network-throughput', 'range', b.dataset.netRange);
    });
  }
  const sc = shell.querySelector('#netScaleCtl');
  if (sc && !sc._wired) {
    sc._wired = true;
    sc.addEventListener('change', () => _setTileCfg('network-throughput', 'scaleMode', sc.value));
  }
}
// Serverseitigen Verlauf fuer den gewaehlten Zeitraum holen und die Puffer seeden.
async function backfillNetHistory(ms) {
  try {
    const res = await fetch(`/api/net/history?ms=${ms}&points=${NET_DRAW_POINTS * 2}`, { cache: 'no-store' });
    const d = await res.json();
    if (!d || !d.ok) return;
    const offset = performance.now() - d.now; // Server- -> Client-Zeitachse
    if (Array.isArray(d.points) && d.points.length) {
      const dl = [], ul = [];
      for (const p of d.points) {
        const t = p.t + offset;
        dl.push({ t, v: Math.max(0, +p.rx || 0) });
        ul.push({ t, v: Math.max(0, +p.tx || 0) });
      }
      state.netHist = dl;
      state.upHist = ul;
      seeded = true;
    }
    // WAN-Verlauf (UniFi) mit derselben Offset-Logik seeden.
    if (Array.isArray(d.wan) && d.wan.length) {
      const wdl = [], wul = [];
      for (const p of d.wan) {
        const t = p.t + offset;
        wdl.push({ t, v: Math.max(0, +p.rx || 0) });
        wul.push({ t, v: Math.max(0, +p.tx || 0) });
      }
      state.wanHist = wdl;
      state.wanUpHist = wul;
    }
    _graphDirty = true;
  } catch (_) { /* Backfill ist optional */ }
}

/* ---- Paket-Animation (Y-Topologie, Look nach dem Claude-Design-Widget) ----
   Internet (oben Mitte) -> gerader Trunk -> Split-Punkt -> Bezier-Kurven zu
   Unraid (unten links) und Netzwerk (unten rechts); Upload laeuft rueckwaerts.
   Dargestellt wird NUR der WAN-Verkehr: der Unraid-Anteil wird als
   min(Unraid-NIC, WAN) geschaetzt, der Rest laeuft auf der Netzwerk-Kurve.
   Pakete sind SVG-Rects im skalierenden 220x250-viewBox: Bloecke rotieren zur
   Pfadtangente (optional mit Trail; alternativ Dots), leichtes Tempo-Jitter
   je Paket. Bewegungsmodell: feste Pools je Fluss, Phase 0..1 ueber den
   GESAMTEN Weg (Trunk = 0..0.5, Kurve = 0.5..1); einmal gestartete Pakete
   laufen IMMER bis zum Ziel, erst dort wird nachgeregelt (weiterlaufen oder
   stilllegen) -> ruhig, kein Verschwinden auf der Strecke. Tempo & Dichte
   skalieren LINEAR mit der Rate relativ zur GEMEINSAMEN Referenz (schnellster
   Fluss): 1 Gbit Download neben 20 Mbit Upload wirkt sichtbar drastisch
   schneller/dichter — nicht "etwas" schneller wie bei log-Skalierung. */
const NF_WAN   = { x: 110, y: 20 };
const NF_SPLIT = { x: 110, y: 84 };
const NF_END   = { srv: { x: 45,  y: 216 }, lan: { x: 175, y: 216 } };
const NF_C1    = { srv: { x: 110, y: 150 }, lan: { x: 110, y: 150 } };
const NF_C2    = { srv: { x: 72,  y: 216 }, lan: { x: 148, y: 216 } };
const NF_STREAMS = [
  { key: 'srvDl', branch: 'srv', up: false, slots: 12 },
  { key: 'lanDl', branch: 'lan', up: false, slots: 12 },
  { key: 'srvUl', branch: 'srv', up: true,  slots: 8 },
  { key: 'lanUl', branch: 'lan', up: true,  slots: 8 },
];

function nfLerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function nfBezier(branch, t) {
  const mt = 1 - t, p0 = NF_SPLIT, c1 = NF_C1[branch], c2 = NF_C2[branch], p3 = NF_END[branch];
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y,
  };
}
function nfBezierAngle(branch, t) {
  const mt = 1 - t, p0 = NF_SPLIT, c1 = NF_C1[branch], c2 = NF_C2[branch], p3 = NF_END[branch];
  const dx = 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x);
  const dy = 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y);
  return Math.atan2(dy, dx) * 180 / Math.PI;
}
// Position/Winkel in Download-Richtung; Upload = gespiegelte Phase + 180 Grad.
function nfPosDown(branch, ph)   { return ph < 0.5 ? nfLerp(NF_WAN, NF_SPLIT, ph / 0.5) : nfBezier(branch, (ph - 0.5) / 0.5); }
function nfAngleDown(branch, ph) { return ph < 0.5 ? 90 : nfBezierAngle(branch, (ph - 0.5) / 0.5); }
function nfPos(branch, ph, up)   { return up ? nfPosDown(branch, 1 - ph) : nfPosDown(branch, ph); }
function nfAngle(branch, ph, up) { return up ? nfAngleDown(branch, 1 - ph) + 180 : nfAngleDown(branch, ph); }

let _nfPools = null;  // key -> { defs:[{rect,trail,phase,initialPhase,speedVar,active,ever}], sRate }
let _nfLastTs = 0;
const _nfLbl = {};    // Wertelabel-Cache (nur bei Aenderung ins DOM schreiben)
function nfInitPools() {
  const g = $('netPkts'); if (!g) return null;
  const pools = {};
  for (const s of NF_STREAMS) {
    const defs = [];
    for (let i = 0; i < s.slots; i++) {
      const mk = () => {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('class', 'net-pkt');
        r.setAttribute('fill', s.up ? '#3ddc84' : '#4d8dff');
        r.setAttribute('opacity', '0');
        g.appendChild(r);
        return r;
      };
      defs.push({
        rect: mk(), trail: mk(),
        // Erstaktivierung gestaffelt ueber den Weg verteilen (kein Klumpen)
        initialPhase: (i + Math.random() * 0.6) / s.slots,
        phase: 0, speedVar: 0.82 + Math.random() * 0.36,
        active: false, ever: false,
      });
    }
    pools[s.key] = { defs, sRate: 0 };
  }
  return pools;
}
function nfHide(r) { if (r.getAttribute('opacity') !== '0') r.setAttribute('opacity', '0'); }
function nfSetLbl(id, txt) {
  if (_nfLbl[id] === txt) return;
  _nfLbl[id] = txt;
  setText(id, txt);
}
function nfDrawRect(r, s, ph, shape, isTrail) {
  const pos = nfPos(s.branch, ph, s.up);
  const edge = 0.03; // sanftes Ein-/Ausblenden an den Enden
  let op = 0.9 * Math.min(1, Math.min(ph / edge, (1 - ph) / edge));
  if (isTrail) op *= 0.35;
  let w, h;
  if (shape === 'dot') {
    w = isTrail ? 3 : 4; h = w;
    r.removeAttribute('transform');
  } else {
    w = isTrail ? 5 : 7.5; h = isTrail ? 2 : 3;
    r.setAttribute('transform', `rotate(${nfAngle(s.branch, ph, s.up).toFixed(1)} ${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`);
  }
  r.setAttribute('x', (pos.x - w / 2).toFixed(2));
  r.setAttribute('y', (pos.y - h / 2).toFixed(2));
  r.setAttribute('width', w);
  r.setAttribute('height', h);
  r.setAttribute('rx', h / 2);
  r.setAttribute('opacity', op.toFixed(2));
}

function updateNetFlow() {
  if (!state.netFlowOn) return; // Kachel-Option 'flow' aus -> keine rAF-Arbeit
  const pools = _nfPools || (_nfPools = nfInitPools());
  if (!pools) return;
  const now = performance.now();
  let dt = (now - _nfLastTs) / 1000; _nfLastTs = now;
  if (dt <= 0) return;
  if (dt > 0.05) dt = 0.05; // Tab-Wechsel/Ruckler abfangen

  // Aufteilung des WAN-Verkehrs auf die beiden Ziele (je Richtung):
  // Unraid-Anteil = min(NIC, WAN) — klemmt auch den Fall "NIC > WAN"
  // (lokaler Traffic) —, der Rest gehoert dem uebrigen Netzwerk.
  const wanFresh = state._wanRxAt > 0 && (now - state._wanRxAt) < 30000;
  let rates;
  if (wanFresh) {
    const srvDl = Math.min(state.dispDown,  state.dispWanDown);
    const srvUl = Math.min(state.dispUpVal, state.dispWanUp);
    rates = { srvDl, srvUl, lanDl: Math.max(0, state.dispWanDown - srvDl), lanUl: Math.max(0, state.dispWanUp - srvUl) };
  } else {
    // Ohne WAN-Daten: Legacy-Verhalten — Unraid-Durchsatz auf der Server-Kurve.
    rates = { srvDl: state.dispDown, srvUl: state.dispUpVal, lanDl: 0, lanUl: 0 };
  }

  // Wertelabels an den Knoten (laufen auch bei animOn=aus weiter — sind Daten).
  const fmt = (v) => Math.round(v) + ' Mb/s';
  nfSetLbl('netFlowWanDl', '↓ ' + fmt(rates.srvDl + rates.lanDl));
  nfSetLbl('netFlowWanUl', '↑ ' + fmt(rates.srvUl + rates.lanUl));
  nfSetLbl('netFlowSrvDl', '↓ ' + fmt(rates.srvDl));
  nfSetLbl('netFlowSrvUl', '↑ ' + fmt(rates.srvUl));
  nfSetLbl('netFlowLanDl', '↓ ' + fmt(rates.lanDl));
  nfSetLbl('netFlowLanUl', '↑ ' + fmt(rates.lanUl));

  // Animationen global aus -> Pakete stilllegen (CSS .no-anim versteckt zusaetzlich).
  if (!state.animOn) {
    for (const s of NF_STREAMS) {
      for (const d of pools[s.key].defs) {
        if (d.active) { d.active = false; nfHide(d.rect); nfHide(d.trail); }
      }
    }
    return;
  }

  // Gemeinsame Tempo-/Dichte-Referenz: der schnellste Fluss. Floor 20 Mbit/s,
  // damit Kleinverkehr (nachts) insgesamt gemaechlich wirkt.
  const ref = Math.max(20, rates.srvDl, rates.srvUl, rates.lanDl, rates.lanUl);
  const shape = state.netPktShape;
  const trailOn = state.netTrailOn && shape !== 'dot';

  for (const s of NF_STREAMS) {
    const pool = pools[s.key];
    // Rate glaetten (EMA, tau ~0.8s) -> ruhige Reaktion.
    pool.sRate += ((rates[s.key] || 0) - pool.sRate) * (1 - Math.exp(-dt / 0.8));
    const rate = pool.sRate;

    // Tempo & Dichte LINEAR zur Rate relativ zur gemeinsamen Referenz —
    // rate/ref statt log: 20 vs. 1000 Mbit sind 2% vs. 100%, nicht fast gleich.
    const ratio = Math.min(1, rate / ref);
    const speed = 0.10 + 0.55 * ratio;                                   // Phase/s
    const desired = rate > 0.05 ? Math.max(1, Math.round(s.slots * ratio)) : 0;

    let active = 0;
    for (const d of pool.defs) if (d.active) active++;

    // Aktive Pakete weiterbewegen; ERST AM ZIEL weiterlaufen lassen oder
    // stilllegen (nie mitten auf der Strecke entfernen).
    for (const d of pool.defs) {
      if (!d.active) { nfHide(d.rect); nfHide(d.trail); continue; }
      let p = d.phase + dt * speed * d.speedVar;
      if (p >= 1) {
        if (active > desired) { d.active = false; active--; nfHide(d.rect); nfHide(d.trail); continue; }
        p %= 1;
      }
      d.phase = p;
      nfDrawRect(d.rect, s, p, shape, false);
      if (trailOn) nfDrawRect(d.trail, s, (p - 0.025 + 1) % 1, shape, true);
      else nfHide(d.trail);
    }

    // Fehlende Pakete aus Idle-Slots aktivieren.
    if (active < desired) {
      let need = desired - active;
      for (const d of pool.defs) {
        if (need <= 0) break;
        if (!d.active) { d.active = true; d.phase = d.ever ? 0 : d.initialPhase; d.ever = true; need--; }
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  _applyTheme(localStorage.getItem('theme') || 'dark');
  loadUiPrefs();
  await loadDashboard();
  setupGridContextMenu();
  injectTileDecor();
  applyAllTileConfigs();
  setupNetTileControls();
  applyNetworkConfig();
  tickClock();
  clockTimer = setInterval(tickClock, 1000);
  renderData();
  startGraphAnim();
  startLive();
  setupVisibilityHandling();
  setupSearch();
  setupSettings();
  setupVmModal();
  setupVmConsoleModal();
  setupNextcloudUpload();
  loadConfig();
  loadVersionInfo();
});
