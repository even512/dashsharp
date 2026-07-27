# Frontend-Module (Kacheln)

Eine Datei hier = eine Kachel. Der Server bündelt alles in diesem Verzeichnis
unter `/modules.js` und liefert es **vor** `app.js` aus — kein Build-Step, kein
Eintrag in `index.html`, keine Änderung an `app.js`.

Dateien mit `_`-Präfix werden übersprungen (`_example.js` ist eine Vorlage).

## Zusammenspiel mit dem Backend

Eine vollständige Integration besteht aus zwei Dateien:

| Datei | Aufgabe |
|---|---|
| `server/modules/<id>.js` | Daten holen, normalisieren, cachen, pushen |
| `public/modules/<id>.js` | Kachel darstellen |

Verbunden werden sie über den SSE-Event-Namen: Das Backend leitet ihn aus der
`id` ab (`unraid-docker` → `unraidDocker`), das Frontend gibt ihn als `event`
an. Der Push-Hub schickt die Daten dann automatisch an `handler`.

## Manifest

```js
Dash.registerModule({
  id:    'uptimekuma',              // muss zur Backend-Modul-id passen
  label: 'Uptime Kuma',             // Titel im Katalog und auf der Kachel
  section: 'dienste',               // Gruppe im Kachel-Katalog

  defaultSize: { w: 4, h: 5 },      // Startgröße im 12-Spalten-Raster
  minSize:     { w: 3, h: 3 },      // kleinste zulässige Größe

  event:   'uptimekuma',            // SSE-Event vom Backend-Modul
  handler: (d) => renderKuma(d),    // wird bei jedem Push aufgerufen
  refresh: () => pollKuma(),        // REST-Fallback + nach Options-Änderung

  template: () => `<div …>`,        // Kachel-Markup (siehe unten)

  options: [ … ],                   // Kachel-Einstellungen (⋯ → Einstellungen)
  settings: { badge: 'UK', color: '#5b9dff' },  // Eintrag in den Einstellungen
});
```

Alles außer `id`, `label` und `defaultSize` ist optional.

## Optionen

Erscheinen im ⋯-Menü der Kachel und landen in `tile.config`:

| `type` | Wirkung |
|---|---|
| `toggle` | blendet die `[data-cfg="<key>"]`-Blöcke des Templates aus/ein |
| `count` | Zahl; `0` = unbegrenzt, im Renderer über `_cfgLimit(id, key, items)` |
| `select` | Auswahl aus `options: [{ v, l }]` |
| `text` / `number` | freie Eingabe |

Ein `toggle` mit `cls: 'x'` setzt stattdessen eine Klasse auf der Kachel (für
Inhalte, die per JS entstehen); mit `filter: true` wirkt es nur im Renderer.
Einen Titel-Override gibt es implizit für jede Kachel — nicht selbst definieren.

## Template

Das Markup wird beim ersten Anzeigen der Kachel erzeugt. Zwei Konventionen:

- Der Kachel-Rahmen kommt über `class="tile"` — nicht selbst nachbauen, sonst
  weicht die Kachel bei Theme-Wechseln vom Rest ab.
- Der Titel gehört in ein Element mit `data-tile-title`, damit der
  Titel-Override greift.

```js
template: () => `
  <div class="tile">
    <div class="tile-head">
      <span data-tile-title>Uptime Kuma</span>
      <span id="kumaBadge" class="tile-badge"></span>
    </div>
    <div id="kumaList" data-cfg="list"></div>
  </div>`,
```

## Rendern

Nutze die vorhandenen Helfer aus `app.js`, statt `innerHTML` neu zu bauen:

- `diffList(container, items, keyFn, createRow, updateRow)` — aktualisiert nur,
  was sich geändert hat, statt die Liste jedes Mal neu zu erzeugen.
- `setHtmlIfChanged(el, html)` — schreibt `innerHTML` nur bei echter Änderung.
- `_cfgVal(id, key)` / `_cfgLimit(id, key, items)` — Werte der Kachel-Optionen.
- `esc(s)` — **immer** benutzen, wenn Fremddaten in ein Template-Literal für
  `innerHTML` fließen. Besser noch: `textContent` setzen.

Fehlerfälle des Backends abfangen — die Payload kann `{ok:false, error:…}` oder
`_stale: true` (letzter bekannter Stand, Upstream gerade nicht erreichbar) sein.

## Testen

Die Registry meldet fehlerhafte Manifeste in der Browser-Konsole
(`[Dash] Modul abgelehnt: …`) und überspringt sie, statt das Dashboard
abstürzen zu lassen. Ein Modul, dessen Datei einen Fehler wirft, wird ebenfalls
isoliert — die übrigen Kacheln laufen weiter.
