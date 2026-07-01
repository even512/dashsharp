# Changelog

Alle nennenswerten Änderungen an Dash#.
Format orientiert an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [Unreleased]

### Added
- Dockerisierung: gehärtetes `Dockerfile` (Alpine, Healthcheck, Non-Build) + `docker-entrypoint.sh`
  mit First-Run-Seeding der Standardkonfiguration ins persistente Volume
- Unraid-Template (`unraid/dashsharp.xml`) für Installation per Template-URL / Community Applications
- GitHub-Actions-CI: Build & Push zu Docker Hub (`latest` + SemVer, multi-arch amd64/arm64)
- Branding **Dash#** inklusive Logo (`logo.svg`, `icon.png`, Favicon) und Render-Skript
- Repo-Hygiene: `.gitignore`, `.gitattributes`, dokumentierte `.env.example`

### Changed
- `config/services.yaml` auf eine generische, secrets-freie Standardkonfiguration reduziert
