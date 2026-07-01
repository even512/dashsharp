<p align="center">
  <img src="icon.png" width="112" alt="Dash# Logo">
</p>
<h1 align="center">Dash#</h1>
<p align="center">
  Selfhosted Homelab-Dashboard mit frei verschieb- und ausblendbaren Kacheln und Live-Widgets.<br>
  Ein Node/Express-Container – keine Datenbank, kein Docker-Socket nötig.
</p>

---

## Features

- 🧩 **Frei anordbare Kacheln** – verschieben & ausblenden, Layout wird serverseitig gespeichert
- 📊 **Live-Widgets** – System (Glances), Docker, AdGuard Home, Plex, UniFi Network & Protect, Nextcloud, Wetter
- ⚙️ **Konfiguration in der Weboberfläche** – alles unter `/settings`, keine Config-Dateien nötig
- 🔒 **Sicher by design** – Integrationen laufen als serverseitiger Proxy (kein CORS, keine Tokens im Browser)
- 🐳 **Ein Container** – schlankes `node:20-alpine`, Healthcheck, persistenter Config-Ordner

## Schnellstart (Docker)

```bash
docker run -d --name dashsharp \
  -p 8085:3000 \
  -v /pfad/zu/appdata/dashsharp:/app/config \
  YOUR_DOCKERHUB_USER/dashsharp:latest
```

→ Dashboard unter `http://<host>:8085`. Beim ersten Start wird automatisch eine
Standard-`services.yaml` in den Config-Ordner geschrieben.

Oder per Compose (siehe [`docker-compose.yml`](docker-compose.yml)):

```bash
docker compose up -d
```

## Installation auf Unraid

### Jetzt – privat per Template
1. Platzhalter ersetzen und Repo/Image veröffentlichen (siehe [Veröffentlichen](#veröffentlichen-platzhalter-ersetzen)).
2. [`unraid/dashsharp.xml`](unraid/dashsharp.xml) auf den Server kopieren nach
   `/boot/config/plugins/dockerMan/templates-user/my-dashsharp.xml`.
3. Unraid → **Docker → Add Container** → oben im Dropdown **Template** „Dash-Sharp" wählen.
4. Host-Port (`8085`) und Appdata-Pfad (`/mnt/user/appdata/dashsharp`) prüfen → **Apply**.

### Später – Community Applications
Wenn das Image stabil und garantiert secrets-frei ist, kann das Template-Repo bei den
[Community Applications](https://forums.unraid.net/topic/38582-plug-in-community-applications/)
zur Aufnahme eingereicht werden. Danach ist Dash# unter **Apps** suchbar und mit einem Klick installierbar.

## Konfiguration

Alles über **⚙️ → Integrationen** in der Weboberfläche. Die Werte (URLs, Tokens) werden in
`config/secrets.json` **im gemappten Volume** gespeichert – nichts davon steckt im Image.
Optional lassen sich alle Werte auch als Umgebungsvariablen setzen (siehe [`.env.example`](.env.example));
gesetzte Env-Vars haben Vorrang.

| Integration | Benötigt |
|---|---|
| System / Docker | Glances-URL (`http://host:61208`) |
| AdGuard Home | URL, Benutzer, Passwort |
| Plex | URL, X-Plex-Token |
| UniFi | API-Key (api.ui.com) |
| Nextcloud | URL, Benutzer, App-Passwort |
| Wetter | Stadt (Open-Meteo, kein Key nötig) |

## Daten & Persistenz

Der gemappte Ordner `/app/config` enthält alle veränderlichen Daten:

```
config/
├── services.yaml           # Titel, Suche, Quicklinks (auto-erzeugt beim 1. Start)
├── secrets.json            # API-Keys/Tokens (per UI)
├── dashboard-layout.json   # Kachel-Reihenfolge & Sichtbarkeit
├── quicklinks.json         # Schnellzugriff-Kacheln
├── disks.json              # eigene Disk-Namen
└── status.json             # Healthcheck-URLs
```

**Backup** = diesen Ordner sichern. Ein Image-Update lässt ihn unangetastet.

## Update

Unraid: im Docker-Tab **Check for Updates** → Update. Deine Konfiguration bleibt erhalten
(liegt im Appdata-Volume). Bei Docker/Compose: `docker compose pull && docker compose up -d`.

## Lokale Entwicklung

```bash
git clone https://github.com/YOUR_GITHUB_USER/dashsharp.git
cd dashsharp
cp .env.example .env        # optional, für Env-Overrides
npm install
npm run dev                 # http://localhost:3000
```

Image selbst bauen: `docker build -t dashsharp . && docker run -d -p 8085:3000 -v $PWD/config:/app/config dashsharp`.

### Logo neu erzeugen
Design in [`logo.svg`](logo.svg) anpassen, dann:
```bash
npm i -D sharp
node scripts/render-icon.mjs     # erzeugt icon.png + public/favicon.png
```

## Veröffentlichen (Platzhalter ersetzen)

Ersetze in folgenden Dateien `YOUR_GITHUB_USER` bzw. `YOUR_DOCKERHUB_USER`:
`unraid/dashsharp.xml`, `Dockerfile` (LABEL), `docker-compose.yml` (Kommentar), dieses README.
*(Der CI-Workflow braucht keine Anpassung – der Image-Name wird aus dem Secret abgeleitet.)*

1. **GitHub:** öffentliches Repo `dashsharp` anlegen und pushen.
2. **Docker Hub:** Repo `dashsharp` + Access-Token erstellen. In GitHub → *Settings → Secrets and
   variables → Actions* anlegen: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.
3. Push auf `main` baut & pusht `:latest`. Für eine Version: `git tag v1.0.0 && git push --tags`.

## Sicherheit

- `.env` und `config/secrets.json` werden **nie** committet (in `.gitignore`) und **nie** ins Image gebacken.
- Falls doch einmal Zugangsdaten in Git/Registry gelandet sind: **rotieren** (neu erzeugen).

## Lizenz

Noch offen – bei Bedarf eine `LICENSE` (z. B. MIT) ergänzen.
