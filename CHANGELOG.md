# Changelog

All notable changes to Dash# are documented here.
This project adheres to [Semantic Versioning](https://semver.org/), and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Per-tile settings** — every widget tile now has a ⋯ menu (appears on hover, no design mode required) with a settings dialog: override the tile title and toggle the tile's building blocks (e.g. System Load rings/stats/chart, Docker summary, Plex posters, Nextcloud user list/upload/footer, UniFi columns) or cap list lengths (services, containers, VMs, Plex sessions, AdGuard top list, access points). Settings are stored in the dashboard model (`tile.config`) and saved automatically; inside design mode they participate in save/discard.
- **Design mode** — a dedicated layout editor for the dashboard. Toggle it from the header (grid icon) or Settings → Layout. Tiles can be freely placed and resized on a 12-column grid (powered by a vendored, offline copy of GridStack), added from a tile catalog, hidden (with an undo snackbar), and arranged per page.
- **Pages / subpages** — group tiles onto multiple pages with a tab bar. Add, rename (double-click a tab), reorder (drag), and delete pages entirely from design mode. The active page is remembered per browser.

### Fixed
- Tiles no longer clip, overlap, or grow stray scrollbars when resized: tile bodies are now flex layouts whose lists stretch/shrink with the tile (instead of hard-coded `max-height`s), fixed-height blocks no longer squash into each other, and the tile shell itself never scrolls — only the inner lists do (the WiFi/Protect tiles previously scrolled the whole card).
- Widgets now have sensible minimum sizes, so they can't be shrunk below what their content needs.
- The per-tile ⋯ button no longer covers the tile header's status text — it only appears while hovering the tile.
- Editing the layout in a narrow window (responsive 1-column mode) no longer corrupts the saved 12-column layout: geometry is only written back while the full grid is active.
- "Undo" after hiding a tile now restores its previous position and size instead of re-adding it at the bottom with default dimensions.
- Pages can now actually be deleted from the design bar ("Seite löschen" — the function existed but was never reachable).
- **Renamable section headings** — categories are now free-floating heading tiles you can place anywhere and rename inline, replacing the previously hard-coded category labels.
- **Toast/snackbar** notifications (e.g. layout saved, tile hidden · undo), replacing silent `console`/`alert` feedback for layout actions.

### Changed
- Dashboard layout is now stored as a richer model (`config/dashboard.json`: pages + per-tile position, size, visibility) instead of the flat order/visibility list. Existing `config/dashboard-layout.json` layouts are migrated automatically on first load (nothing is written until you save, so read-only config volumes are safe).
- The accent-colour picker now recolours the whole interface consistently: the derived accent tints follow the chosen colour, and remaining hard-coded accent literals in the header were moved onto the accent token.

## [0.2.7] - 2026-07-02

### Fixed
- Sparkline freeze still occurring on larger/real-world setups despite #11: the scroll-progress `p` was soft-capped at 1.5x the estimated poll interval, so once a Glances round-trip took longer than that (plausible on a large real array, or a slow upstream response) `p` pinned at its cap and the line froze until the data arrived — the same class of bug #11 fixed, just requiring a longer delay to trigger. The cap is now 20x, effectively no longer a normal operating limit — the line keeps scrolling smoothly through realistic delays instead of stalling. Verified against a mock backend with variable 300-3200ms response latency (35% "slow" responses): a single isolated frame hiccup over 60s, no recurring pattern.

## [0.2.6] - 2026-07-01

### Fixed
- Rhythmic freeze in the sparklines (CPU/RAM/network) that persisted despite #10's precision increase: comparing the *rounded* scroll coordinates to decide whether to skip a redundant redraw is inherently unsafe while animating — at any fixed rounding precision there's a scroll speed/interval combination where genuinely-still-moving values round to an identical string, which was confirmed with a user-provided recording (clustered ~100-467ms freezes recurring every ~3.3s, independent of network load). The redraw is now only ever skipped while "Animations" is turned off, where the interpolation progress is an exact repeated constant rather than a rounded approximation, so the comparison is safe. While animating, every frame is always drawn.

## [0.2.5] - 2026-07-01

### Fixed
- Remaining micro-stutter in the CPU/RAM/network sparklines: their scroll coordinates were rounded to 0.1px, which is coarser than a single frame's movement at typical scroll speeds (a ~10px step spread over a multi-second poll interval). That made the rendered string stay identical for several consecutive frames, so the animation appeared to pause and then catch up — most noticeable with a mostly-flat line (e.g. idle network traffic). Coordinates now round to 0.01px so every frame's motion is reflected.

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
