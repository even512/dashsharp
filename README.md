<p align="center">
  <img src="icon.png" width="120" alt="Dash# logo">
</p>

<h1 align="center">Dash#</h1>

<p align="center">
  <b>A fast, self-hosted homelab dashboard</b> with drag-and-drop tiles and live widgets —<br>
  one small container, no database, nothing phoning home.
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/even512/dashsharp?label=version&sort=semver&color=7C6CFF" alt="Version">
  <img src="https://img.shields.io/docker/image-size/even512/dashsharp/latest?color=7C6CFF" alt="Image size">
  <img src="https://img.shields.io/docker/pulls/even512/dashsharp?color=7C6CFF" alt="Docker pulls">
  <img src="https://img.shields.io/badge/arch-amd64%20%7C%20arm64-7C6CFF" alt="Architectures">
</p>

---

> 🤖 **Built with Claude.** This project was designed and implemented with heavy help from
> [Claude](https://claude.com) (Anthropic's AI). I'm not a professional developer — I wanted a
> dashboard for my own homelab and used Claude as a pair-programmer to actually get it built.

## What is Dash#?

I run a small homelab and wanted one good-looking start page for it — a place to jump to my services
and see live status at a glance: system load, Docker containers, DNS filtering, media, network, storage.
I tried a few of the dashboards out there, and while they're solid projects, none of them quite gave me
the exact mix of integrations and workflow I was after. So I built Dash# to be the dashboard that fit
my setup — configurable entirely from the browser, one small container, nothing else to babysit.

Under the hood it's a plain **Node.js + Express** app that serves a static frontend and proxies every
integration **server-side**: the backend talks to your services with your stored credentials and returns
small, normalized JSON. So there's no CORS, your tokens never reach the browser, and there's no database
and no build step.

- 🧩 **Drag-and-drop tiles** — rearrange and hide widgets; the layout is saved server-side
- ⚡ **Live widgets** — System (via [Glances](https://nicolargo.github.io/glances/)), Docker, AdGuard Home, Plex, UniFi Network & Protect, Nextcloud, weather
- ⚙️ **Configure in the browser** — everything under `/settings`, no config files to hand-edit
- 🔒 **Private by design** — no telemetry, no tracking; secrets stay in your mounted config volume
- 🐳 **One container** — `node:20-alpine`, multi-arch (amd64/arm64), healthcheck, ~48 MB

> [!NOTE]
> **Dash# is at v0.1 — the first public iteration.** It works and is used daily, but expect rough edges
> and breaking changes before 1.0. Feedback and issues are very welcome.

## Screenshot

<!-- Add a screenshot at docs/screenshot.png and uncomment the line below: -->
<!-- <p align="center"><img src="docs/screenshot.png" width="820" alt="Dash# dashboard"></p> -->

_Coming soon._

## Quick start

```bash
docker run -d --name dashsharp \
  -p 8085:3000 \
  -v /path/to/appdata/dashsharp:/app/config \
  even512/dashsharp:latest
```

Open `http://<host>:8085`, then go to **⚙️ → Integrations** to connect your services. On first start a
default config is written into the mounted volume automatically.

Prefer Compose? See [`docker-compose.yml`](docker-compose.yml):

```bash
docker compose up -d
```

## Install on Unraid

1. Fetch the template on your Unraid box:
   ```bash
   wget -O /boot/config/plugins/dockerMan/templates-user/my-dashsharp.xml \
     https://raw.githubusercontent.com/even512/dashsharp/main/unraid/dashsharp.xml
   ```
2. **Docker → Add Container** → pick **Dash-Sharp** from the *Template* dropdown.
3. Check the WebUI port (`8085`) and appdata path (`/mnt/user/appdata/dashsharp`) → **Apply**.

## Configuration

Everything is configured from the web UI under **Settings → Integrations** and stored in
`config/secrets.json` **inside your mounted volume** — never baked into the image, never committed.

| Integration | Needs |
|---|---|
| System / Docker | Glances URL (`http://host:61208`) |
| AdGuard Home | URL, user, password |
| Plex | URL, X-Plex-Token |
| UniFi | Cloud API key (api.ui.com) |
| Nextcloud | URL, user, app password |
| Weather | City (Open-Meteo, no key) |

Any value can also be set as an environment variable (see [`.env.example`](.env.example)); env vars take
precedence over the UI values.

## Data & persistence

All mutable state lives in the mounted `/app/config` volume:

```
config/
├── services.yaml           # title, search, quicklinks (auto-created on first run)
├── secrets.json            # API keys / tokens (via UI)
├── dashboard-layout.json   # tile order & visibility
├── quicklinks.json         # quick-access tiles
├── disks.json              # custom disk names
└── status.json             # health-check URLs
```

Back up that folder and you've backed up everything. Image updates never touch it.

## Updating

- **Unraid:** Docker tab → *Check for Updates* → apply. Your config is preserved.
- **Compose:** `docker compose pull && docker compose up -d`.

## How it works

Dash# is a single Node/Express process. It serves the static frontend from `public/` and exposes a set
of same-origin `/api/*` endpoints the browser calls. Each integration is a **server-side proxy**: the
backend contacts Glances/AdGuard/Plex/etc. with your stored credentials and returns a trimmed JSON — no
CORS, no tokens in the browser. State is a handful of JSON/YAML files in the config volume; there is no
database and no build step.

## Security

The dashboard has **no built-in authentication** — anyone who can reach the port can use it. Keep it on
your LAN, or put it behind a VPN or an authenticated reverse proxy. **Do not** expose port 8085 directly
to the internet.

## Build from source

```bash
git clone https://github.com/even512/dashsharp.git
cd dashsharp
cp .env.example .env        # optional
npm install
npm run dev                 # http://localhost:3000
```

Build the image yourself: `docker build -t dashsharp .`

Regenerate the logo/icons after editing [`logo.svg`](logo.svg):

```bash
npm i -D sharp && node scripts/render-icon.mjs
```

## Contributing

This started as a personal project, so it's still a bit rough around the edges — but issues and PRs are
very welcome. Small, focused improvements are the easiest for me to review and land.

## License

No license chosen yet (default copyright applies). An OSI license such as MIT may be added later.
