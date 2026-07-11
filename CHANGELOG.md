# Changelog

All notable changes to Dash# are documented here.
This project adheres to [Semantic Versioning](https://semver.org/), and the format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Live-WAN über lokalen UniFi-Zugriff** — der WAN-Sampler kann den Internet-Durchsatz jetzt direkt von der UniFi-OS-Console im LAN lesen statt über die Cloud-API (`api.ui.com`). Der Cloud-Weg liefert nur einen geglätteten Wert, der alle ~5–10 s frisch wird; die lokale Quelle hält — wie das native UniFi-Panel — eine dauerhafte Websocket-Subscription offen und aktualisiert im echten Sekundentakt. Konfiguration über die UI (Einstellungen → UniFi) oder Env (`UNIFI_LOCAL_URL`/`UNIFI_LOCAL_USER`/`UNIFI_LOCAL_PASS`, optional `UNIFI_LOCAL_SITE`); empfohlen wird ein dediziertes read-only Konto (Viewer). Der Zugriff bleibt im LAN, akzeptiert das self-signed Zertifikat der Console und meldet sich per Session-Cookie an (Re-Login bei Ablauf). Ist kein lokaler Zugang gesetzt, nutzt der Sampler weiterhin die Cloud-API.
- **WAN-Traffic in der Durchsatz-Kachel** — die „Network Throughput"-Kachel zeigt jetzt zusätzlich den Internet-Durchsatz des UniFi-Gateways: eine prominente „Internet (WAN)"-Zeile über den (kleineren) Unraid-NIC-Werten, gespeist von einem neuen serverseitigen WAN-Sampler (UniFi `stat/health`, ~1 s Takt, adaptives Leerlauf-Intervall, Fehler-Backoff) über denselben SSE-Stream wie die Unraid-Werte — inklusive WAN-Verlauf mit Backfill. Das Verlaufs-Chart ist per Kachel-Option umschaltbar (Unraid / WAN / beides, mit Legende), und die Paket-Animation ist als Y-Topologie im Look des Claude-Design-Widgets aufgebaut: ein skalierendes SVG mit Internet-Knoten oben, geradem Trunk zum Split-Punkt und zwei Bézier-Kurven hinab zum Unraid-Server (unten links) und ins übrige Netzwerk (unten rechts); die Pakete sind glühende Blöcke, die sich zur Pfadtangente drehen und einen Schweif ziehen (umschaltbar auf Punkte / ohne Schweif), Download blau abwärts, Upload grün rückwärts. An jedem Knoten stehen die ↓/↑-Werte (WAN gesamt, Server- und Netzwerk-Anteil). Tempo und Dichte der Pakete skalieren linear mit der Rate relativ zum jeweils schnellsten Fluss — 1 Gbit Download neben 20 Mbit Upload sieht damit auch so aus. Neue Kachel-Optionen: Chart-Datenquelle, Paket-Form und -Schweif sowie die Knoten-Namen (Internet/Server/Netzwerk); die Knoten sind design-pur beschriftete Glow-Kreise (Icon-/Logo-Auswahl entfällt). Neue Env-Variablen `WAN_SAMPLE_MS`/`WAN_IDLE_MS`.
- **Rechtsklick-Kontextmenü im Grid** — ein Rechtsklick auf freie Dashboard-Fläche öffnet ein Menü, das alle noch nicht platzierten Kacheln sowie „Abschnitt hinzufügen" anbietet; die Kachel landet direkt in der angeklickten Rasterzelle. Funktioniert auch außerhalb des Design-Modus (Änderungen werden dann sofort gespeichert). Rechtsklick auf eine vorhandene Kachel öffnet deren Options-Menü am Mauszeiger.
- **Animierter Hinweis bei leerem Grid** — eine leere Dashboard-Seite zeigt eine pulsierende Maus-Grafik mit Hinweis auf das Rechtsklick-Menü, statt einfach leer zu bleiben.
- **Sichtbares Raster im Design-Modus** — die Rasterlinien des 12-Spalten-Grids werden im Design-Modus dezent eingeblendet und fluchten exakt mit den Zellgrenzen, sodass sich Kacheln präzise ausrichten lassen.
- **Unraid-Suite** — sieben neue Kacheln über die offizielle GraphQL-API (zusätzlich zur bestehenden VM-Kachel): **Docker-Container** (Status, Uptime, Update-Hinweise; Start/Stop/Restart/Pause), **Array & Parity** (Zustand, Kapazitätsbalken, Parity-Check-Fortschritt und -Steuerung), **Disks** (Status, Temperatur, Füllstand, Fehlerzähler je Disk/Parity/Cache), **Shares** (Belegung mit Füllbalken), **Meldungen** (ungelesene Unraid-Notifications nach Wichtigkeit, einzeln oder gesamt archivierbar), **System** (CPU/RAM live, Uptime, Unraid-/API-Version, Kernel; Neustart/Herunterfahren über den optionalen SSH-Zugang) und **USV** (Ladestand, Restlaufzeit, Last/Leistung). Ältere `unraid-api`-Versionen ohne einzelne Felder (Live-Metriken, Parity-Status, USV-Leistungsdaten, Update-Flags) werden per Fallback-Query abgefangen.
- **Gefahrenzone in den Unraid-Einstellungen** — riskante Aktionen (Array stoppen/starten, Parity-Steuerung, Server-Neustart/-Shutdown) sind standardmäßig gesperrt und müssen per Opt-in-Schalter mit Disclaimer freigeschaltet werden (`UNRAID_DANGER_ACTIONS`). Die Sperre wird serverseitig durchgesetzt (403 ohne Freischaltung), destruktive Aktionen fragen zusätzlich im Browser nach (Neustart/Shutdown doppelt).
- **Per-tile settings** — every widget tile now has a ⋯ menu (appears on hover, no design mode required) with a settings dialog: override the tile title and toggle the tile's building blocks (e.g. System Load rings/stats/chart, Docker summary, Plex posters, Nextcloud user list/upload/footer, UniFi columns) or cap list lengths (services, containers, VMs, Plex sessions, AdGuard top list, access points). Settings are stored in the dashboard model (`tile.config`) and saved automatically; inside design mode they participate in save/discard.
- **Design mode** — a dedicated layout editor for the dashboard. Toggle it from the header (grid icon) or Settings → Layout. Tiles can be freely placed and resized on a 12-column grid (powered by a vendored, offline copy of GridStack), added from a tile catalog, hidden (with an undo snackbar), and arranged per page.
- **Pages / subpages** — group tiles onto multiple pages with a tab bar. Add, rename (double-click a tab), reorder (drag), and delete pages entirely from design mode. The active page is remembered per browser.

### Fixed
- **WAN-Durchsatz jetzt echter Sekundentakt (lokaler UniFi-Websocket)** — trotz 1-s-Polling blieb die „Internet (WAN)"-Zeile bei ~5–10 s hängen. Ursache: die `-r`-Ratenfelder von `stat/health` (und `stat/device`) werden von der UniFi-Console nur dann sekündlich neu berechnet, wenn eine aktive Websocket-Session zuschaut — sichtbar daran, dass die Kachel nur flüssig lief, solange das native UniFi-Panel in einem Tab offen war; nach dem Schließen fiel sie auf den groben Rollup zurück. Bei konfiguriertem lokalen Zugang hält der Server jetzt selbst eine dauerhafte Subscription auf `wss://<console>/proxy/network/wss/s/<site>/events` offen (dieselbe Login-Session/Cookie wie die lokale REST-Abfrage) und liest die Gateway-Uplink-Rate direkt aus den gepushten `device`-Nachrichten — unabhängig davon, ob das native Panel offen ist. Verbindung nur solange ein Browser die Kachel anschaut (Realtime nur bei aktiver Subscription), mit Reconnect/Backoff und Ping-Heartbeat. Das langsame `stat/health`-Polling entfällt bei lokalem Zugang und bleibt nur als Fallback für reine Cloud-Setups (`api.ui.com` bietet keinen lokalen Websocket). Optionale Diagnose der Nachrichtentypen per `WAN_WS_DEBUG=1`.
- **WAN-Geschwindigkeit läuft flüssig** — die „Internet (WAN)"-Zeile der Netzwerkdurchsatz-Kachel aktualisierte sich nur gefühlt alle 5–10 s, während die Unraid/LAN-Zeile flüssig lief. Der WAN-Sampler pollt jetzt im ~1 s Takt statt alle 3 s (Env-Untergrenze von 2000 ms auf 500 ms gesenkt), das Fehler-Backoff ist entschärft (ein einzelner Cloud-API-Hänger streckt das Intervall nicht mehr sofort auf 6–60 s, sondern backt erst ab dem zweiten Fehler in Folge und deckelt bei 15 s), und das Anzeige-Easing der WAN-Zeile im Frontend zieht die neuen 1-s-Samples zügig nach, statt zäh dazwischen zu gleiten.
- Kacheln behalten ihre eingestellte Größe jetzt zuverlässig: Gridstacks responsives Spalten-Umschalten (`columnOpts`/`moveScale`) rundete Breiten beim Wechsel 12 → 1 → 12 Spalten auf und ließ Kacheln (z. B. Service Status) schleichend breiter werden, was das ganze Layout verschob. Das Umschalten übernimmt jetzt die App selbst; beim Zurückschalten auf die volle Breite wird exakt die gespeicherte Geometrie aus dem Modell angewendet.
- Beim Verschieben einer Kachel „springt" das Layout nicht mehr wild umher: die Verschiebe-Animationen der weggedrückten Nachbarn sind deutlich kürzer und der Ablage-Platzhalter ist kräftiger markiert, sodass die Zielzelle klar erkennbar ist.
- Tiles no longer clip, overlap, or grow stray scrollbars when resized: tile bodies are now flex layouts whose lists stretch/shrink with the tile (instead of hard-coded `max-height`s), fixed-height blocks no longer squash into each other, and the tile shell itself never scrolls — only the inner lists do (the WiFi/Protect tiles previously scrolled the whole card).
- Widgets now have sensible minimum sizes, so they can't be shrunk below what their content needs.
- The per-tile ⋯ button no longer covers the tile header's status text — it only appears while hovering the tile.
- Editing the layout in a narrow window (responsive 1-column mode) no longer corrupts the saved 12-column layout: geometry is only written back while the full grid is active.
- "Undo" after hiding a tile now restores its previous position and size instead of re-adding it at the bottom with default dimensions.
- Pages can now actually be deleted from the design bar ("Seite löschen" — the function existed but was never reachable).
- **Renamable section headings** — categories are now free-floating heading tiles you can place anywhere and rename inline, replacing the previously hard-coded category labels.
- **Toast/snackbar** notifications (e.g. layout saved, tile hidden · undo), replacing silent `console`/`alert` feedback for layout actions.

### Changed
- **Leerer Erststart** — eine frische Installation beginnt mit einem leeren Grid (alle Kacheln warten im Katalog) statt eines voll bestückten Standard-Layouts; der animierte Hinweis führt zum Rechtsklick-Menü. „Zurücksetzen" im Design-Modus heißt jetzt „Grid leeren" und leert das Dashboard entsprechend. Bestehende Installationen mit gespeichertem Layout sind nicht betroffen.
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
