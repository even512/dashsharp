# Changelog

All notable changes to Dash# are documented here.
This project adheres to [Semantic Versioning](https://semver.org/), and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-07-01

First public iteration.

### Added
- Node/Express dashboard with drag-and-drop, hideable tiles (layout saved server-side)
- Live widgets: System (Glances), Docker, AdGuard Home, Plex, UniFi Network & Protect, Nextcloud, weather
- In-browser configuration under `/settings`; secrets stored in the mounted config volume
- Docker packaging: hardened `Dockerfile` + entrypoint that seeds the default config on first run
- Multi-arch images (amd64/arm64) published to Docker Hub via GitHub Actions (`latest` + SemVer tags)
- Unraid template (`unraid/dashsharp.xml`)
- "Dash#" branding: logo, icon and favicon
