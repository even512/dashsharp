'use strict';

/* ============================================================================
   Vorlage fuer eine eigene Kachel — wird NICHT geladen (`_`-Praefix).
   Zum Verwenden kopieren nach public/modules/<id>.js und das Gegenstueck
   server/modules/<id>.js anlegen (siehe dortiges README).

   Beispiel: Uptime Kuma. Zeigt den aggregierten Status plus eine Liste der
   Monitore mit Ampelpunkt und Antwortzeit.
   ============================================================================ */

// --- Rendern -----------------------------------------------------------------
// Eine Zeile bauen bzw. aktualisieren. diffList() ruft createRow einmal je
// neuem Eintrag und updateRow bei jeder Aenderung — so wird nicht bei jedem
// Push die ganze Liste neu erzeugt (das wuerde CSS-Transitions verschlucken
// und den Scroll-Zustand verlieren).
function _exCreateRow() {
  const row = document.createElement('div');
  row.className = 'ex-row';
  // Statisches Markup, Daten kommen ueber textContent -> kein XSS moeglich.
  row.innerHTML = '<span class="ex-dot"></span><span class="ex-name"></span><span class="ex-ms"></span>';
  row._dot  = row.querySelector('.ex-dot');
  row._name = row.querySelector('.ex-name');
  row._ms   = row.querySelector('.ex-ms');
  return row;
}

function _exUpdateRow(row, m, prev) {
  if (!prev || prev.up !== m.up) row._dot.style.background = m.up ? 'var(--green)' : 'var(--red)';
  if (!prev || prev.name !== m.name) row._name.textContent = m.name;
  const ms = m.responseMs != null ? `${m.responseMs} ms` : '–';
  if (!prev || row._ms.textContent !== ms) row._ms.textContent = ms;
}

function renderExample(d) {
  const badge = document.getElementById('exBadge');
  // Immer erst den Fehlerfall abhandeln: not_configured, fetch_failed und
  // _stale (letzter bekannter Stand) kommen alle vom generischen Registry-Pfad.
  if (!d || !d.ok) {
    if (badge) {
      badge.textContent = d && d.error === 'not_configured' ? 'nicht eingerichtet' : 'offline';
      badge.style.color = 'var(--red)';
    }
    return;
  }
  if (badge) {
    badge.textContent = d._stale ? 'stale' : `${d.up}/${d.total} online`;
    badge.style.color = d._stale ? '#ffb454' : (d.up === d.total ? 'var(--green)' : '#ffb454');
  }
  const list = document.getElementById('exList');
  if (list) {
    // _cfgLimit wendet die Kachel-Option „Max. Monitore" an (0 = unbegrenzt).
    diffList(list, _cfgLimit('example', 'maxRows', d.monitors || []),
             (m) => m.id, _exCreateRow, _exUpdateRow);
  }
}

// REST-Fallback: greift nur, wenn der SSE-Stream nicht verfuegbar ist, und
// nach einer Aenderung der Kachel-Optionen.
async function pollExample() {
  if (!state.liveOn || !widgetOnActivePage('example')) return;
  try { renderExample(await fetch('/api/example', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

// --- Registrierung -----------------------------------------------------------
Dash.registerModule({
  id: 'example',
  label: 'Uptime Kuma',
  section: 'dienste',
  defaultSize: { w: 4, h: 5 },
  minSize:     { w: 3, h: 3 },

  // `event` muss dem SSE-Event des Backend-Moduls entsprechen; die Registry
  // dort leitet ihn aus der id ab (mein-modul -> meinModul).
  event:   'example',
  handler: renderExample,
  refresh: () => pollExample(),

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>Uptime Kuma</span>
        <span id="exBadge" class="tile-badge"></span>
      </div>
      <div id="exList" class="tile-list" data-cfg="list"></div>
    </div>`,

  options: [
    { key: 'list',    label: 'Monitor-Liste', type: 'toggle', default: true },
    { key: 'maxRows', label: 'Max. Monitore', type: 'count',  default: 0 },
  ],

  // Eigener Eintrag unter Einstellungen -> Module.
  settings: { badge: 'UK', color: '#5b9dff', statusEl: 'exSettingsStatus' },
});
