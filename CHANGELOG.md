# Changelog

All notable changes to Dash# are documented here.
This project adheres to [Semantic Versioning](https://semver.org/), and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.4] - 2026-07-01

### Fixed
- Rhythmic stutter in the CPU/RAM/network sparklines: the scroll animation interpolated against the configured update interval, but the real gap between samples is uneven (server cache TTL beating against the poll cadence, network jitter) — a late sample left the line frozen until it landed, then snapped. The animation now tracks the actually observed sample interval and can drift slightly past a full step instead of freezing, so it keeps moving smoothly through the variance.

## [0.2.3] - 2026-07-01

### Changed
- Performance pass across all live widgets: disk, Docker, AdGuard, service-status, Nextcloud-user and UniFi-device lists now diff and patch existing DOM nodes instead of tearing the list down and rebuilding it on every poll — this also un-breaks the disk-bar fill transition, which previously never had an "old" width to animate from
- The shared graph animation loop now skips redundant DOM writes once eased values have settled (e.g. with animations off or between polls), instead of re-writing identical SVG data 60×/sec forever
- Disk fill bar now animates via `transform: scaleX()` instead of `width`, so the browser can composite it instead of triggering layout
- Polling and the graph animation loop now pause while the browser tab is hidden and resume with an immediate refresh when it becomes visible again; the existing "Live updates" toggle now actually stops its timers instead of leaving them ticking
- API responses and static assets are now gzip-compressed (`compression` middleware)

### Fixed
- Weather and UniFi camera-snapshot polling now correctly stop when "Live updates" is turned off (previously kept polling regardless)

## [0.2.2] - 2026-07-01

### Fixed
- Settings modal on mobile no longer gets its top covered by the browser's address bar: the fullscreen panel now sizes itself from its already-viewport-synced fixed parent (`width/height: 100%`) instead of `100vw/100vh`, which mobile browsers compute against the address-bar-collapsed viewport and can leave taller than the actually visible area

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
