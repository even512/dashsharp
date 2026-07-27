# Backend-Module

Ein Modul ist **eine Datei in diesem Verzeichnis**. Sie wird beim Start automatisch
geladen; `server.js` muss dafür nicht angefasst werden.

Aus dem Manifest leitet die Registry (`server/registry.js`) alles ab:

| Manifest-Feld | wird zu |
|---|---|
| `id` | Cache-Slot, Route `GET /api/<id>`, Default für `event` |
| `event` | SSE-Event-Name im Push-Hub |
| `ttl` | Cache-Dauer **und** Push-Intervall |
| `secrets[]` | `/api/secrets` (Lesen/Schreiben), Maskierung, `.env`-Keys |
| `configured()` | `not_configured`-Antwort, Status-Punkt in den Einstellungen |
| `fetch()` | der eigentliche Abruf |
| `routes()` | optionale Zusatz-Endpunkte (Aktionen wie Start/Stop) |

## Minimalbeispiel

```js
'use strict';

module.exports = {
  id: 'uptimekuma',
  label: 'Uptime Kuma',
  ttl: 30000,
  secrets: [
    { key: 'KUMA_URL',   label: 'URL' },
    { key: 'KUMA_TOKEN', label: 'API-Token', masked: true },
  ],
  configured: (get) => !!get('KUMA_URL'),
  async fetch(get, ctx) {
    const data = await ctx.httpJson(`${get('KUMA_URL')}/api/status`, {
      headers: { Authorization: `Bearer ${get('KUMA_TOKEN')}` },
    });
    return { ok: true, up: data.up, down: data.down };
  },
};
```

Das war's — Route, Cache, Push-Event, Secrets-Verwaltung und der
`_stale`-Fallback bei Upstream-Fehlern entstehen daraus automatisch.

## Was die Registry für dich erledigt

- **Cache + TTL** — ein Treffer innerhalb der TTL geht nie zum Upstream.
- **In-Flight-Dedupe** — parallele Cache-Misses (Push-Hub-Tick + REST-Fallback +
  zweiter Tab) teilen sich einen einzigen Abruf.
- **`_stale`-Fallback** — schlägt `fetch()` fehl, liefert die Registry die letzten
  erfolgreichen Daten mit `_stale: true`, statt die Kachel leer zu lassen.
- **`not_configured`** — solange `configured()` falsch ist, wird `fetch()` nie
  aufgerufen; die Kachel zeigt ihren „nicht eingerichtet"-Zustand.
- **Push** — der Hub pollt das Modul im `ttl`-Takt und schiebt das Ergebnis über
  denselben SSE-Stream wie alle anderen Kacheln.

## Kontext (`ctx`)

`fetch(get, ctx)` bekommt neben dem Secret-Getter:

- `ctx.httpJson(url, opts)` — GET/POST mit Timeout, akzeptiert self-signed Zertifikate
  im LAN (`opts.insecure`), wirft bei Status ≥ 400.
- `ctx.cache` — der eigene Cache-Slot, falls ein Modul mehrere TTLs braucht (Plex).
- `ctx.log(...)` — Logger mit Modul-Präfix.

## Aktions-Endpunkte

Module, die etwas auslösen (Container starten, Meldung archivieren), definieren
`routes`. Aktionen **immer** gegen eine Whitelist prüfen — nie einen Wert aus dem
Request in ein Kommando oder eine Mutation einsetzen:

```js
const ACTIONS = { start: 'startContainer', stop: 'stopContainer' };

routes(app, { get, run }) {
  app.post('/api/uptimekuma/action', async (req, res) => {
    const mutation = ACTIONS[String(req.body?.action || '')];
    if (!mutation) return res.status(400).json({ ok: false, error: 'bad_action' });
    // …
  });
}
```
