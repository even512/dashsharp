# Changelog

All notable changes to Dash# are documented here.
This project adheres to [Semantic Versioning](https://semver.org/), and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] - 2026-07-01

### Fixed
- Settings sidebar no longer gets clipped on landscape phones and portrait tablets/phablets (641-900px viewport width): the compact pill + icon-grid navigation now applies across that whole range instead of only below 640px, avoiding a narrow column that tried to hold the full desktop tree without room to scroll

## [0.2.0] - 2026-07-01

### Changed
- Settings menu rebuilt as an Explorer-style tree: top-level categories (General, Appearance, Modules) with nested sub-items in the sidebar; selecting a category shows its children as clickable icon-button cards, and every module (Glances, AdGuard Home, Plex, Nextcloud, Weather, UniFi/Protect, Disks, Service Monitoring) now has its own dedicated settings subpage
- Mobile settings layout reworked to match: category pills up top, icon-grid overview, and a "← Back" control to return from a module page

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
