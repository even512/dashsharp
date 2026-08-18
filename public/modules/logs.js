'use strict';

/* ============================================================================
   CSS-Injektion — das Modul liefert sein eigenes Styling
   ----------------------------------------------------------------------------
   Wie wow.js: /modules.js buendelt nur JS, styles.css ist tabu. Deshalb haengt
   das Modul sein <style> beim Laden EINMAL selbst in den <head> (idempotent
   ueber die feste id). Es nutzt durchgaengig die Theme-Variablen aus styles.css
   (--text-*, --red, --green, --border-*, --bg-modal, --accent-border, --overlay),
   damit Light-/Win9x-Theme mittragen. ANSI-Farben sind eine feste, kontrollierte
   Palette (nie ein Wert aus den Log-Daten als Farbe/Markup).
   ============================================================================ */
(function injectLogsStyles() {
  const ID = 'logs-module-styles';
  if (typeof document === 'undefined' || document.getElementById(ID)) return;
  const css = `
/* ---- Modul-Farbvariablen: nie nur fuer Dark definieren ----
   Der Pfad-/URL-Ton braucht pro Theme einen eigenen Wert, damit er auf hellem
   Grund lesbar bleibt. Alle uebrigen Token-Farben nutzen bestehende Theme-Vars. */
:root { --log-path: #b48ead; }
@media (prefers-color-scheme: light) { :root { --log-path: #8250df; } }
:root[data-theme="light"] { --log-path: #8250df; }
:root[data-theme="win9x"] { --log-path: #800080; }

/* ---- Kachel-Liste: Achsen setzen nur Variablen (analog wow) ---- */
.logs-list { --logs-fs: 12px; --logs-gap: 6px; gap: var(--logs-gap); }
.logs-list.logs-text-s  { --logs-fs: 11px; }
.logs-list.logs-text-m  { --logs-fs: 12px; }
.logs-list.logs-text-l  { --logs-fs: 13.5px; }
.logs-list.logs-text-xl { --logs-fs: 15px; }
.logs-list.logs-space-tight  { --logs-gap: 2px; }
.logs-list.logs-space-normal { --logs-gap: 6px; }
.logs-list.logs-space-wide   { --logs-gap: 12px; }

.logs-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 7px;
  font: 500 var(--logs-fs) 'JetBrains Mono', monospace;
  color: var(--text-15);
  cursor: pointer;
}
.logs-row:hover { background: rgba(120,150,200,0.08); }
.logs-row:focus-visible { outline: 1px solid var(--accent-border); outline-offset: 1px; }

.logs-dot { flex-shrink: 0; width: 9px; height: 9px; border-radius: 50%; background: var(--text-3); }
.logs-dot.green  { background: var(--green); }
.logs-dot.yellow { background: #ffb454; }
.logs-dot.red    { background: var(--red); }

.logs-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.logs-headline { display: flex; align-items: center; gap: 6px; min-width: 0; }
.logs-label {
  font-weight: 600; color: var(--text-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.logs-type {
  flex-shrink: 0;
  font: 600 0.72em 'JetBrains Mono', monospace;
  color: var(--text-3);
  background: rgba(120,150,200,0.12);
  border: 1px solid var(--border-1);
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.02em;
}
.logs-counts { flex-shrink: 0; font: 600 0.78em 'JetBrains Mono', monospace; color: #ffb454; }
.logs-counts .logs-err { color: var(--red); }
.logs-preview {
  font-size: 0.82em; color: var(--text-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.logs-empty { padding: 10px 6px; font: 500 11px 'JetBrains Mono', monospace; color: var(--text-dim); }
/* Der Viewer (fast bildschirmbreit) muss ueber der Dashboard-Suchleiste liegen:
   #searchBar hat inline z-index:1000 (Vorschlagsliste 1001), .picker-modal nur
   320 -> die Suche schien sonst durch das Modal. Nur dieses Modal anheben. */
#logsViewerModal { z-index: 1200; }

/* ---- Detailfenster / Live-Viewer ---- */
.logs-viewer-body { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.logs-toolbar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 16px; border-bottom: 1px solid var(--border-3);
}
.logs-chip {
  font: 600 10.5px 'JetBrains Mono', monospace;
  color: var(--text-3);
  background: transparent;
  border: 1px solid var(--border-1);
  border-radius: 5px;
  padding: 3px 8px;
  cursor: pointer;
  letter-spacing: 0.03em;
}
.logs-chip:hover { color: var(--text-1); border-color: var(--accent-border); }
.logs-chip.active { color: var(--text-1); border-color: var(--accent-border); background: rgba(120,150,200,0.14); }
.logs-chip.lvl-error.active { color: var(--red); border-color: var(--red); }
.logs-chip.lvl-warn.active  { color: #ffb454; border-color: #ffb454; }
.logs-chip.lvl-info.active  { color: #5b9dff; border-color: #5b9dff; }
.logs-chip.lvl-debug.active { color: var(--text-2); }

.logs-search {
  flex: 1 1 160px; min-width: 90px;
  font: 500 11.5px 'JetBrains Mono', monospace;
  color: var(--text-1);
  background: var(--bg-input, rgba(120,150,200,0.06));
  border: 1px solid var(--border-1);
  border-radius: 6px;
  padding: 4px 8px;
}
.logs-toggle-btn, .logs-copy-btn {
  font: 600 10.5px 'JetBrains Mono', monospace;
  color: var(--text-3);
  background: transparent;
  border: 1px solid var(--border-1);
  border-radius: 5px;
  padding: 4px 9px;
  cursor: pointer;
}
.logs-toggle-btn:hover, .logs-copy-btn:hover { color: var(--text-1); border-color: var(--accent-border); }
.logs-toggle-btn.active { color: var(--text-1); border-color: var(--accent-border); background: rgba(120,150,200,0.14); }
.logs-sel {
  font: 500 11px 'JetBrains Mono', monospace;
  color: var(--text-1);
  background: var(--bg-input, rgba(120,150,200,0.06));
  border: 1px solid var(--border-1);
  border-radius: 6px;
  padding: 3px 6px;
}
/* Aufgeklapptes Dropdown: die Optionen brauchen einen OPAKEN Grund. Der
   translucente Select-Hintergrund oben rendert im Popup als Weiss, und
   color:var(--text-1) ist im Dark-Theme hell -> weiss auf weiss. --bg-modal
   ist in allen Themes opak (dark/light/win9x) und --text-1 kontrastiert dazu. */
.logs-sel option { background: var(--bg-modal); color: var(--text-1); }
.logs-status { padding: 5px 16px; font: 500 11px 'JetBrains Mono', monospace; color: var(--text-dim); border-bottom: 1px solid var(--border-3); min-height: 0; }
.logs-status.err { color: var(--red); }
.logs-trunc { color: #ffb454; }

.logs-body {
  flex: 1; min-height: 200px;
  overflow: auto;
  padding: 8px 14px;
  background: var(--bg-modal);
  font: 500 12px 'JetBrains Mono', monospace;
  line-height: 1.5;
  /* Zeilen-Auswahlmodell statt nativer Zeichen-Selektion (zu fummelig). */
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
}
.log-line {
  white-space: pre;
  color: var(--text-15);
  padding: 1px 0 1px 8px;
  border-left: 3px solid transparent;
}
.logs-body.log-wrap .log-line { white-space: pre-wrap; word-break: break-all; }
.log-line.log-hidden { display: none; }

/* Ausgewaehlte Zeile: deutlicher Accent-Overlay + linker Balken, liegt sichtbar
   UEBER den Level-Washes (box-shadow-inset gewinnt gegen background). */
.log-line.log-selected {
  background: rgba(110,168,254,0.28);
  box-shadow: inset 3px 0 0 0 var(--accent, #6ea8fe);
  color: var(--text-1);
}

/* Ganze Zeile je Level einfaerben: kraeftiger 3px-Balken + rgba-Wash (theme-
   agnostisch, funktioniert auf hell/dunkel/win9x). Text NICHT dimmen — bei
   error/warn leicht anheben, damit der Wash den Text nie verschluckt. */
.log-line.log-lvl-error { border-left-color: var(--red);   background: rgba(244,63,94,0.14);  color: var(--text-1); }
.log-line.log-lvl-warn  { border-left-color: #ffb454;      background: rgba(255,180,84,0.14); color: var(--text-1); }
.log-line.log-lvl-info  { border-left-color: #5b9dff;      background: rgba(91,157,255,0.10); }
.log-line.log-lvl-debug { border-left-color: var(--text-3); background: rgba(120,150,200,0.06); color: var(--text-2); }

/* Level-Wort als deutliches, fettes Badge in der Level-Farbe. */
.log-lvl-token {
  font-weight: 700;
  border-radius: 4px;
  padding: 0 4px;
  letter-spacing: 0.02em;
}
.log-lvl-token.error { color: var(--red); background: rgba(244,63,94,0.16); }
.log-lvl-token.warn  { color: #ffb454;    background: rgba(255,180,84,0.16); }
.log-lvl-token.info  { color: #5b9dff;    background: rgba(91,157,255,0.14); }
.log-lvl-token.debug { color: var(--text-2); background: rgba(120,150,200,0.10); }

.log-ts { color: var(--text-3); }
.log-json { white-space: pre; }
.log-json-key { color: #5b9dff; }

.log-hl { background: #ffd54f; color: #1a1a1a; border-radius: 2px; }

/* ---- Token-Coloring (quellenunabhaengig, nach Namenskonventionen) ----
   Textfarben vorrangig aus vorhandenen Theme-Vars (pro Theme schon korrekt);
   der Pfad-Ton ist als eigene --log-path-Var definiert und pro Theme gesetzt. */
.log-ip     { color: var(--accent, #6ea8fe); }
.log-num    { color: var(--text-2); }
.log-method { color: var(--accent, #6ea8fe); font-weight: 700; }
.log-http-2 { color: var(--green); font-weight: 700; }
.log-http-3 { color: var(--text-2); font-weight: 700; }
.log-http-4 { color: #ffb454; font-weight: 700; }
.log-http-5 { color: var(--red); font-weight: 700; }
.log-url    { color: var(--log-path); text-decoration: underline; text-underline-offset: 2px; }
.log-path   { color: var(--log-path); }
.log-str    { color: var(--green); }
.log-bracket{ color: var(--text-3); }
.log-key    { color: #5b9dff; }
.log-val    { color: var(--text-2); }
.log-uuid   { color: var(--text-dim); }

/* ANSI-SGR — feste, kontrollierte Palette (Vordergrund 30-37/90-97, Hintergrund 40-47). */
.log-bold { font-weight: 700; }
.log-dim { opacity: 0.65; }
.log-ansi-30 { color: #5c6370; } .log-ansi-31 { color: #e06c75; }
.log-ansi-32 { color: #98c379; } .log-ansi-33 { color: #e5c07b; }
.log-ansi-34 { color: #61afef; } .log-ansi-35 { color: #c678dd; }
.log-ansi-36 { color: #56b6c2; } .log-ansi-37 { color: #cfd3d8; }
.log-ansi-90 { color: #7f848e; } .log-ansi-91 { color: #ff7b8a; }
.log-ansi-92 { color: #b5e890; } .log-ansi-93 { color: #f5d98b; }
.log-ansi-94 { color: #8cc4ff; } .log-ansi-95 { color: #e0a3f0; }
.log-ansi-96 { color: #7fd4de; } .log-ansi-97 { color: #ffffff; }
.log-ansi-bg-40 { background: #3b4048; } .log-ansi-bg-41 { background: #5a2a2f; }
.log-ansi-bg-42 { background: #2f4a2a; } .log-ansi-bg-43 { background: #4a412a; }
.log-ansi-bg-44 { background: #2a3a4a; } .log-ansi-bg-45 { background: #402a4a; }
.log-ansi-bg-46 { background: #2a4444; } .log-ansi-bg-47 { background: #4a4f55; }

/* ---- „An Claude senden": Button + Inline-Dialog ---- */
.logs-claude-btn { color: var(--accent, #6ea8fe); border-color: var(--border-1); }
.logs-claude-btn:hover { color: var(--accent, #6ea8fe); border-color: var(--accent-border); }

.logs-claude-dialog {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--overlay, rgba(0,0,0,0.4));
  opacity: 0;
  transition: opacity .15s ease;
}
.logs-claude-dialog.open { opacity: 1; }
.logs-claude-card {
  width: min(460px, 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--bg-modal);
  border: 1px solid var(--border-modal, var(--border-1));
  border-radius: 12px;
  box-shadow: 0 18px 60px rgba(0,0,0,0.5);
}
.logs-claude-title { font: 700 12.5px 'JetBrains Mono', monospace; color: var(--text-1); letter-spacing: 0.02em; }
/* Prominente Umfang-Zeile: was + wie viele Zeilen an Claude gehen. Accent-
   getoente Box (rgba theme-agnostisch), Text/Rand aus Theme-Vars. */
.logs-claude-scope {
  font: 600 11.5px 'JetBrains Mono', monospace;
  color: var(--text-1);
  background: rgba(110,168,254,0.12);
  border: 1px solid var(--accent-border, var(--border-1));
  border-radius: 8px;
  padding: 8px 10px;
}
.logs-claude-comment {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  font: 500 12px 'JetBrains Mono', monospace;
  color: var(--text-1);
  background: var(--bg-input, rgba(120,150,200,0.06));
  border: 1px solid var(--border-1);
  border-radius: 8px;
  padding: 8px 10px;
}
.logs-claude-hint { font: 500 11px 'JetBrains Mono', monospace; color: var(--text-dim); min-height: 0; }
.logs-claude-hint.err { color: var(--red); }
.logs-claude-actions { display: flex; justify-content: flex-end; gap: 8px; }

/* ---- Settings ---- */
.logs-cfg-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.logs-cfg-ssh { font: 500 11.5px 'JetBrains Mono', monospace; padding: 4px 0; }
.logs-cfg-ssh .ok { color: var(--green); }
.logs-cfg-ssh .no { color: #ffb454; }
`;
  const style = document.createElement('style');
  style.id = ID;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ============================================================================
   Logs — Kachel (Gegenstueck zu server/modules/logs.js)
   ----------------------------------------------------------------------------
   Uebersicht: je konfigurierter Quelle eine Zeile mit Ampel, Typ-Badge,
   Warn/Error-Zaehler und gedaempfter Vorschau der letzten Zeile. Klick oeffnet
   den Live-Viewer (.picker-modal), der ueber EventSource('/api/logs/stream…')
   Zeilen streamt. ALLE Log-Inhalte gehen ausschliesslich per textContent in die
   Seite; Farben nur ueber feste Klassen (ANSI/Level/JSON) — nie ein Wert aus den
   Daten als Markup/Farbe.

   Payload (aus server/modules/logs.js):
     { ok, fetchedAt, sources:[{id,label,type,ok,errorCount,warnCount,lastLine,error}] }
   Fehlerzustaende: { ok:false, error:'not_configured' } · { ok:false } · _stale.
   ============================================================================ */

const LOGS_SIZES = [
  { v: 's', l: 'Klein' },
  { v: 'm', l: 'Normal' },
  { v: 'l', l: 'Groß' },
  { v: 'xl', l: 'Sehr groß' },
];
const LOGS_SPACINGS = [
  { v: 'tight', l: 'Eng' },
  { v: 'normal', l: 'Normal' },
  { v: 'wide', l: 'Weit' },
];
// Muss zur Server-Whitelist ALLOWED_LINES passen.
const LOGS_LINE_COUNTS = [200, 500, 1000, 2000];
const LOGS_DEFAULT_LINES = 500;
const LOGS_MAX_DOM_LINES = 5000;

// Typ → kurzes Badge-Label. `command` deckt bei uns nur dmesg ab → „Kernel".
const LOGS_TYPE_LABELS = { docker: 'Docker', file: 'Datei', folder: 'Ordner', command: 'Kernel' };
function logsTypeLabel(t) { return LOGS_TYPE_LABELS[t] || String(t || '').toUpperCase(); }

// Chips fuer den Level-Filter (Mehrfachauswahl).
const LOGS_LEVELS = [
  { k: 'error', l: 'ERROR' },
  { k: 'warn', l: 'WARN' },
  { k: 'info', l: 'INFO' },
  { k: 'debug', l: 'DEBUG' },
];

let _logsData = null; // letzte Kachel-Payload (fuer Re-Render nach Options-Aenderung)

/* ---------- Layout ---------- */

function applyLogsLayout() {
  const list = $('logsList');
  if (!list) return;
  const pick = (prefix, key, options) => {
    const cur = String(_cfgVal('logs', key));
    for (const o of options) list.classList.toggle(prefix + o.v, o.v === cur);
  };
  pick('logs-text-', 'textSize', LOGS_SIZES);
  pick('logs-space-', 'spacing', LOGS_SPACINGS);
}

/* ---------- Zeilen ---------- */

function _logsCreateRow() {
  const row = document.createElement('div');
  row.className = 'logs-row';
  row.setAttribute('role', 'button');
  row.tabIndex = 0;
  // Statisches Markup — alle Fremddaten kommen ausschliesslich per textContent.
  row.innerHTML =
    '<span class="logs-dot"></span>'
    + '<div class="logs-main">'
    + '<div class="logs-headline">'
    + '<span class="logs-label"></span>'
    + '<span class="logs-type"></span>'
    + '<span class="logs-counts"></span>'
    + '</div>'
    + '<div class="logs-preview"></div>'
    + '</div>';
  row._dot = row.querySelector('.logs-dot');
  row._label = row.querySelector('.logs-label');
  row._type = row.querySelector('.logs-type');
  row._counts = row.querySelector('.logs-counts');
  row._preview = row.querySelector('.logs-preview');

  const open = () => { if (row._item) openLogsViewer(row._item); };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _logsUpdateRow(row, s) {
  row._item = s;
  const err = Number(s.errorCount) || 0;
  const warn = Number(s.warnCount) || 0;
  const stale = !!s._stale;
  const unreachable = s.ok === false;

  // Ampel: rot bei Fehler/Unerreichbar · gelb bei Warnung oder _stale · sonst gruen.
  let dot = 'green';
  if (unreachable || err > 0) dot = 'red';
  else if (warn > 0 || stale) dot = 'yellow';
  row._dot.className = 'logs-dot ' + dot;
  row._dot.title = unreachable ? (logsErrorText(s.error) || 'nicht erreichbar')
    : (stale ? 'letzter bekannter Stand' : '');

  if (row._label.textContent !== (s.label || '')) row._label.textContent = s.label || '';
  row.title = s.label || '';
  const typ = logsTypeLabel(s.type);
  if (row._type.textContent !== typ) row._type.textContent = typ;

  // Zaehler „3⚠ 1✕" — nur zeigen, was > 0 ist. ✕-Teil in eigener Klasse (rot).
  row._counts.textContent = '';
  if (warn > 0) row._counts.appendChild(document.createTextNode(warn + '⚠'));
  if (err > 0) {
    if (warn > 0) row._counts.appendChild(document.createTextNode(' '));
    const e = document.createElement('span');
    e.className = 'logs-err';
    e.textContent = err + '✕';
    row._counts.appendChild(e);
  }
  row._counts.style.display = (warn > 0 || err > 0) ? '' : 'none';

  // Vorschau der letzten Zeile (Option). Fremddaten → textContent.
  const showPreview = _cfgVal('logs', 'lastLine') !== false;
  let preview = '';
  if (unreachable) preview = logsErrorText(s.error) || 'nicht erreichbar';
  else if (showPreview) preview = String(s.lastLine || '');
  if (row._preview.textContent !== preview) row._preview.textContent = preview;
  row._preview.style.display = preview ? '' : 'none';
}

function logsErrorText(err) {
  switch (err) {
    case 'unreachable': return 'Quelle nicht erreichbar';
    case 'no_file': return 'keine Logdatei gefunden';
    case 'empty': return 'keine Ausgabe';
    case 'no_output': return 'keine Ausgabe';
    default: return '';
  }
}

/* ---------- Rendern ---------- */

function setLogsEmpty(text) {
  const el = $('logsEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

function renderLogs(d) {
  // Fehler-Payloads (ok:false, ausser not_configured) nicht ueber gute Daten
  // schreiben, sonst blinkt die Kachel bei einem Fehl-Tick.
  if (d && (d.ok || d.error === 'not_configured')) _logsData = d;
  else if (d && !_logsData) _logsData = d;

  applyLogsLayout();

  const badge = $('logsBadge');
  const list = $('logsList');
  const data = _logsData;

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : (data ? 'offline' : '…');
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg
        ? 'Einstellungen → Module → Logs'
        : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.id, _logsCreateRow, _logsUpdateRow);
    setLogsEmpty(notCfg
      ? 'Noch nicht eingerichtet — Einstellungen → Module → Logs.'
      : data ? 'Unraid-Host ist gerade nicht erreichbar.' : 'Wird geladen …');
    return;
  }

  const all = Array.isArray(data.sources) ? data.sources : [];
  const stale = !!data._stale;
  // _stale je Zeile mitgeben (Ampel wird sonst nicht gelb).
  for (const s of all) s._stale = stale;

  const items = _cfgLimit('logs', 'maxRows', all);
  if (list) diffList(list, items, (i) => i.id, _logsCreateRow, _logsUpdateRow);
  setLogsEmpty(all.length ? '' : 'Noch keine Quelle — in den Einstellungen hinzufügen.');

  if (badge) {
    const totalErr = all.reduce((a, s) => a + (Number(s.errorCount) || 0), 0);
    const totalWarn = all.reduce((a, s) => a + (Number(s.warnCount) || 0), 0);
    const unreach = all.filter((s) => s.ok === false).length;
    if (stale) {
      badge.textContent = 'stale';
      badge.style.color = '#ffb454';
      badge.title = 'Letzter bekannter Stand — Unraid gerade nicht erreichbar.';
    } else if (totalErr > 0 || unreach > 0) {
      badge.textContent = (totalErr > 0 ? totalErr + '✕' : unreach + '⚠');
      badge.style.color = 'var(--red)';
      badge.title = unreach ? `${unreach} Quelle(n) nicht erreichbar` : `${totalErr} Fehler`;
    } else if (totalWarn > 0) {
      badge.textContent = totalWarn + '⚠';
      badge.style.color = '#ffb454';
      badge.title = `${totalWarn} Warnungen`;
    } else {
      badge.textContent = String(all.length);
      badge.style.color = 'var(--text-3)';
      badge.title = `${all.length} Quelle(n)`;
    }
  }
}

// REST-Fallback: greift ohne SSE-Stream und nach einer Options-Aenderung.
async function pollLogs() {
  if (!state.liveOn || !widgetOnActivePage('logs')) return;
  try { renderLogs(await fetch('/api/logs', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

/* ============================================================================
   Formatierungs-Engine  formatLogLine(raw) -> HTMLElement
   ----------------------------------------------------------------------------
   Fremddaten — der Parser darf NIE werfen; im Zweifel weniger formatieren. Aller
   Text ausschliesslich per textContent; Farben nur ueber feste Klassen.
   Praezedenz: ANSI > Timestamp > Level > JSON.
   ============================================================================ */

const LOGS_ANSI_RE = /\x1b\[[0-9;]*m/g;
const LOGS_TS_RES = [
  // ISO-8601 / RFC3339Nano (docker -t): 2026-08-18T12:34:56.789Z / +02:00
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/,
  // Plex: Aug 18, 2026 22:18:09.610  (MMM dd, yyyy HH:mm:ss.SSS)
  /^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?/,
  // syslog: Aug 18 12:34:56
  /^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}/,
];
const LOGS_LEVEL_RE = /\b(ERROR|ERR|FATAL|CRITICAL|CRIT|EMERG|EMERGENCY|ALERT|SEVERE|WARN|WARNING|INFO|DEBUG|TRACE)\b/i;
// Alle harten Fehler-Level → log-lvl-error, damit sie auch der ERROR-Filter fasst.
const LOGS_ERROR_WORDS = new Set(['ERROR', 'ERR', 'FATAL', 'CRITICAL', 'CRIT', 'EMERG', 'EMERGENCY', 'ALERT', 'SEVERE']);

function logsLevelClass(word) {
  const w = String(word || '').toUpperCase();
  if (LOGS_ERROR_WORDS.has(w)) return 'error';
  if (w === 'WARN' || w === 'WARNING') return 'warn';
  if (w === 'INFO') return 'info';
  return 'debug'; // DEBUG / TRACE
}

/* ---------- Token-Coloring (quellenunabhaengig, nach Namenskonventionen) ----------
   EINE feste Regex-Kette pro Zeile (keine Nutzereingaben, keine katastrophalen
   Backtracking-Muster). Reihenfolge = Praezedenz: laengere/spezifischere Tokens
   zuerst, damit sie nicht von generischen (Zahl/Pfad) zerschnitten werden. Jede
   Alternative hat eigene Capture-Gruppe(n), an denen der Treffer klassifiziert
   wird. Text kommt IMMER per textContent in die Spans — Farbe nur ueber Klassen. */
const LOGS_TOKEN_RE = new RegExp([
  /(https?:\/\/[^\s"'<>()]+)/.source,                                        // 1  URL
  /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.source, // 2 UUID
  /(\b[0-9a-fA-F]{32,}\b)/.source,                                           // 3  Hash
  /(\b\d{1,3}(?:\.\d{1,3}){3}\b(?::\d{1,5})?)/.source,                       // 4  IPv4(:port)
  /((?:[0-9a-fA-F]{1,4}:){3,7}[0-9a-fA-F]{1,4})/.source,                     // 5  IPv6 (grob)
  /("(?:[^"\\]|\\.)*")/.source,                                              // 6  "string"
  /('(?:[^'\\]|\\.)*')/.source,                                              // 7  'string'
  /(\[[^\][\n]{0,120}\])/.source,                                           // 8  [bracket]
  /\b(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/.source,                     // 9  HTTP-Methode
  /\b([A-Za-z_][\w.\-]*)=([^\s"']+)/.source,                                 // 10 key = 11 value
  /(\bERROR\b|\bERR\b|\bFATAL\b|\bCRITICAL\b|\bCRIT\b|\bEMERG\b|\bEMERGENCY\b|\bALERT\b|\bSEVERE\b|\bWARNING\b|\bWARN\b|\bINFO\b|\bDEBUG\b|\bTRACE\b)/.source, // 12 Level
  /(\b\d+(?:\.\d+)?\s?(?:ms|ns|us|s|KB|MB|GB|kb|mb|gb|bytes|B|%)\b)/.source, // 13 Zahl+Einheit (opt. Leerzeichen)
  /((?:\/[\w.\-]+){2,}\/?)/.source,                                          // 14 /pfad/segmente
  /(\b\d+(?:\.\d+)?\b)/.source,                                              // 15 Zahl
].join('|'), 'g');

// Statuscodes nur im HTTP-Kontext einfaerben (sonst zu viele Falschtreffer).
const LOGS_HTTP_CTX_RE = /\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b|HTTP\/\d/i;

function logsTokenColor(text) {
  try {
    const frag = document.createDocumentFragment();
    const httpCtx = LOGS_HTTP_CTX_RE.test(text);
    const re = new RegExp(LOGS_TOKEN_RE.source, 'g'); // frischer lastIndex je Zeile
    const pushText = (s) => { if (s) frag.appendChild(document.createTextNode(s)); };
    const pushSpan = (s, cls) => {
      const sp = document.createElement('span');
      sp.className = cls;
      sp.textContent = s; // Fremddaten → textContent
      frag.appendChild(sp);
    };
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) pushText(text.slice(last, m.index));
      const tok = m[0];
      if (m[1]) pushSpan(tok, 'log-url');
      else if (m[2]) pushSpan(tok, 'log-uuid');
      else if (m[3]) pushSpan(tok, 'log-uuid');
      else if (m[4]) pushSpan(tok, 'log-ip');
      else if (m[5]) pushSpan(tok, 'log-ip');
      else if (m[6]) pushSpan(tok, 'log-str');
      else if (m[7]) pushSpan(tok, 'log-str');
      else if (m[8]) pushSpan(tok, 'log-bracket');
      else if (m[9]) pushSpan(tok, 'log-method');
      else if (m[10] !== undefined) { // key=value
        pushSpan(m[10], 'log-key');
        pushText('=');
        pushSpan(m[11], 'log-val');
      } else if (m[12]) {
        pushSpan(tok, 'log-lvl-token ' + logsLevelClass(tok));
      } else if (m[13]) pushSpan(tok, 'log-num');
      else if (m[14]) pushSpan(tok, 'log-path');
      else if (m[15]) {
        // 3-stellige 1xx–5xx im HTTP-Kontext = Statuscode, sonst normale Zahl.
        let cls = 'log-num';
        if (httpCtx && /^[1-5]\d\d$/.test(tok)) cls = 'log-http-' + tok[0];
        pushSpan(tok, cls);
      } else pushText(tok);
      last = re.lastIndex;
      if (re.lastIndex === m.index) re.lastIndex++; // Nullbreiten-Schutz
    }
    pushText(text.slice(last));
    return frag;
  } catch (_) {
    // Im Zweifel weniger faerben: Rohtext per textContent.
    const f = document.createDocumentFragment();
    f.appendChild(document.createTextNode(text));
    return f;
  }
}

// ANSI-SGR-Zustand auf ein Segment anwenden (Whitelist; alles andere ignoriert).
function logsApplySgr(st, params) {
  const codes = (params === '' ? '0' : params).split(';');
  for (const raw of codes) {
    const c = parseInt(raw, 10);
    if (!Number.isFinite(c)) continue;
    if (c === 0) { st.fg = null; st.bg = null; st.bold = false; st.dim = false; }
    else if (c === 1) st.bold = true;
    else if (c === 2) st.dim = true;
    else if (c === 22) { st.bold = false; st.dim = false; }
    else if (c === 39) st.fg = null;
    else if (c === 49) st.bg = null;
    else if ((c >= 30 && c <= 37) || (c >= 90 && c <= 97)) st.fg = c;
    else if (c >= 40 && c <= 47) st.bg = c;
    // andere Codes bewusst ignorieren
  }
}

function logsAnsiFragment(text) {
  const frag = document.createDocumentFragment();
  const st = { fg: null, bg: null, bold: false, dim: false };
  const re = new RegExp(LOGS_ANSI_RE.source, 'g');
  let last = 0, m;
  const emit = (str) => {
    if (!str) return;
    const cls = [];
    if (st.fg) cls.push('log-ansi-' + st.fg);
    if (st.bg) cls.push('log-ansi-bg-' + st.bg);
    if (st.bold) cls.push('log-bold');
    if (st.dim) cls.push('log-dim');
    if (cls.length) {
      const span = document.createElement('span');
      span.className = cls.join(' ');
      span.textContent = str;
      frag.appendChild(span);
    } else {
      frag.appendChild(document.createTextNode(str));
    }
  };
  while ((m = re.exec(text))) {
    emit(text.slice(last, m.index));
    logsApplySgr(st, m[0].slice(2, -1)); // Parameter zwischen "\x1b[" und "m"
    last = re.lastIndex;
  }
  emit(text.slice(last));
  return frag;
}

// Geparste JSON-Zeile als eingerueckter Block; Schluessel dezent hervorgehoben.
function logsJsonBlock(obj) {
  const block = document.createElement('span');
  block.className = 'log-json';
  const pretty = JSON.stringify(obj, null, 2);
  const keyRe = /^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)/;
  const lines = pretty.split('\n');
  lines.forEach((ln, i) => {
    const km = keyRe.exec(ln);
    if (km) {
      block.appendChild(document.createTextNode(km[1]));
      const k = document.createElement('span');
      k.className = 'log-json-key';
      k.textContent = km[2];
      block.appendChild(k);
      block.appendChild(document.createTextNode(ln.slice(km[1].length + km[2].length)));
    } else {
      block.appendChild(document.createTextNode(ln));
    }
    if (i < lines.length - 1) block.appendChild(document.createTextNode('\n'));
  });
  return block;
}

function formatLogLine(raw) {
  const line = document.createElement('div');
  line.className = 'log-line';
  try {
    const text = String(raw == null ? '' : raw);
    const hasAnsi = text.indexOf('\x1b[') >= 0;
    const plain = hasAnsi ? text.replace(LOGS_ANSI_RE, '') : text;

    // Level immer erkennen (fuers Filtern via data-level), auch bei ANSI.
    const lm = LOGS_LEVEL_RE.exec(plain);
    if (lm) line.dataset.level = logsLevelClass(lm[1]);

    // 1) ANSI gewinnt: Farb-Spans, KEINE Level-Toenung.
    if (hasAnsi) {
      line.classList.add('log-has-ansi');
      line.appendChild(logsAnsiFragment(text));
      return line;
    }

    // 3) Level-Toenung (nur ohne ANSI).
    if (line.dataset.level) line.classList.add('log-lvl-' + line.dataset.level);

    // 2) Timestamp am Anfang.
    let rest = text;
    for (const re of LOGS_TS_RES) {
      const tm = re.exec(text);
      if (tm) {
        const ts = document.createElement('span');
        ts.className = 'log-ts';
        ts.textContent = tm[0];
        line.appendChild(ts);
        rest = text.slice(tm[0].length);
        break;
      }
    }

    // 4) JSON-Zeile (Rest ist reines {…}/[…]).
    const trimmed = rest.trim();
    if (trimmed.length > 1 && (trimmed[0] === '{' || trimmed[0] === '[')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object') {
          const lead = rest.slice(0, rest.length - rest.replace(/^\s+/, '').length);
          if (lead) line.appendChild(document.createTextNode(lead));
          line.appendChild(logsJsonBlock(obj));
          return line;
        }
      } catch (_) { /* kein JSON → normale Zeile */ }
    }

    // 5) Token-Coloring auf dem Rest (IP/Zahl/Methode/Status/URL/Pfad/String/
    //    Klammer/key=value/UUID + Level-Badge). Nur hier — nie bei ANSI/JSON.
    line.appendChild(logsTokenColor(rest));
    return line;
  } catch (_) {
    // Im Zweifel: roher Text, aber immer per textContent.
    line.textContent = String(raw == null ? '' : raw);
    return line;
  }
}

// Suchtreffer in einer Zeile markieren (walkt Textknoten; robust ueber Spans).
function logsHighlightLine(lineEl, q) {
  // alte Markierungen entfernen
  const olds = lineEl.querySelectorAll('mark.log-hl');
  for (const mk of olds) {
    const t = document.createTextNode(mk.textContent);
    if (mk.parentNode) mk.parentNode.replaceChild(t, mk);
  }
  lineEl.normalize();
  if (!q) return;
  const lc = q.toLowerCase();
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    const txt = node.nodeValue;
    const low = txt.toLowerCase();
    if (low.indexOf(lc) < 0) continue;
    const frag = document.createDocumentFragment();
    let idx = 0, pos;
    while ((pos = low.indexOf(lc, idx)) >= 0) {
      if (pos > idx) frag.appendChild(document.createTextNode(txt.slice(idx, pos)));
      const mk = document.createElement('mark');
      mk.className = 'log-hl';
      mk.textContent = txt.slice(pos, pos + lc.length);
      frag.appendChild(mk);
      idx = pos + lc.length;
    }
    if (idx < txt.length) frag.appendChild(document.createTextNode(txt.slice(idx)));
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  }
}

/* ============================================================================
   Live-Viewer (.picker-modal, breit ~940px)
   ----------------------------------------------------------------------------
   EventSource('/api/logs/stream?source=<id>[&file=<name>][&lines=N]'). Jede
   message traegt evt.data = JSON-String einer Zeile → JSON.parse → formatieren
   → anhaengen. Named event `truncated` → dezenter Hinweis. Beim Schliessen /
   Wechseln von Quelle/Datei/Zeilenzahl wird der EventSource geschlossen, der
   Body geleert und (bei Wechsel) neu geoeffnet. KEIN EventSource bleibt offen,
   wenn das Modal zu ist.
   ============================================================================ */

// Zustand des aktuell offenen Viewers (nur einer zur Zeit).
const _logsV = {
  open: false,
  es: null,
  src: null,          // { id, label, type }
  file: null,         // Basename (nur folder) oder null
  lines: LOGS_DEFAULT_LINES,
  follow: true,
  wrap: false,
  search: '',
  levels: new Set(),  // aktive Level-Filter; leer = alle zeigen
  count: 0,
  lastFocus: null,
  // Zeilen-Auswahlmodell: Set der ausgewaehlten .log-line-ELEMENTE (nicht Text),
  // Anker fuer Bereichsauswahl und Drag-Flag.
  selRows: new Set(),
  selAnchor: null,
  selDragging: false,
};

function _buildLogsModal() {
  const modal = document.createElement('div');
  modal.id = 'logsViewerModal';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:96vw;max-width:none;height:88vh;position:relative">'
    + '<div class="picker-head">'
    + '<span class="picker-title" id="logsViewerTitle">Log</span>'
    + '<button class="picker-close" title="Schließen" aria-label="Schließen">✕</button>'
    + '</div>'
    + '<div class="logs-viewer-body">'
    + '<div class="logs-toolbar" id="logsToolbar"></div>'
    + '<div class="logs-status" id="logsViewerStatus"></div>'
    + '<div class="logs-body" id="logsViewerBody"></div>'
    + '</div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeLogsViewer(); });
  modal.querySelector('.picker-close').addEventListener('click', closeLogsViewer);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // ESC schliesst zuerst den Claude-Dialog, dann den Viewer.
    if (_logsV.claudeDialogOpen) { closeLogsClaudeDialog(); return; }
    if (_logsV.open) closeLogsViewer();
  });
  document.body.appendChild(modal);
  _buildLogsToolbar(modal.querySelector('#logsToolbar'));
  _wireLogsSelection(modal.querySelector('#logsViewerBody'));
  return modal;
}

/* ---------- Zeilen-Auswahlmodell (Klick = eine Zeile, Ziehen = Bereich) ----------
   Anker = Zeile beim mousedown; Ende = Zeile unter dem Cursor. Bereich wird in
   DOM-Reihenfolge zwischen Anker und Endzeile aufgespannt. Reiner Klick auf
   leere Flaeche hebt die Auswahl auf. Text-Selektion ist per CSS abgeschaltet. */
function _wireLogsSelection(body) {
  if (!body) return;

  body.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // nur linke Maustaste
    const row = e.target.closest && e.target.closest('.log-line');
    if (!row || !body.contains(row)) {
      // Klick auf leere Flaeche → Auswahl aufheben.
      logsClearSelection();
      _logsV.selAnchor = null;
      _logsV.selDragging = false;
      return;
    }
    _logsV.selAnchor = row;
    _logsV.selDragging = true;
    logsSelectSingle(row); // ersetzt bisherige Auswahl
  });

  body.addEventListener('mousemove', (e) => {
    if (!_logsV.selDragging || !_logsV.selAnchor) return;
    const row = e.target.closest && e.target.closest('.log-line');
    if (!row || !body.contains(row)) return;
    logsSelectRange(_logsV.selAnchor, row);
  });

  // mouseup document-weit: Ziehen zuverlaessig beenden (auch ausserhalb des Bodys).
  document.addEventListener('mouseup', () => { _logsV.selDragging = false; });
}

function logsMarkRow(row, on) {
  if (on) { row.classList.add('log-selected'); _logsV.selRows.add(row); }
  else { row.classList.remove('log-selected'); _logsV.selRows.delete(row); }
}

function logsClearSelection() {
  for (const row of _logsV.selRows) row.classList.remove('log-selected');
  _logsV.selRows.clear();
}

function logsSelectSingle(row) {
  logsClearSelection();
  logsMarkRow(row, true);
}

// Bereich zwischen zwei Zeilen (inklusive) in DOM-Reihenfolge auswaehlen; alles
// ausserhalb abwaehlen. Nutzt die Kindliste des Bodys fuer die Reihenfolge.
function logsSelectRange(a, b) {
  const body = $('logsViewerBody');
  if (!body) return;
  const kids = Array.prototype.slice.call(body.children);
  let ia = kids.indexOf(a);
  let ib = kids.indexOf(b);
  if (ia < 0 || ib < 0) return;
  if (ia > ib) { const t = ia; ia = ib; ib = t; }
  logsClearSelection();
  for (let i = ia; i <= ib; i++) logsMarkRow(kids[i], true);
}

// Toolbar einmalig bauen; Referenzen in V ablegen.
function _buildLogsToolbar(bar) {
  bar.textContent = '';

  // Level-Chips (Mehrfachauswahl).
  _logsV.chipEls = {};
  for (const lv of LOGS_LEVELS) {
    const chip = document.createElement('button');
    chip.className = 'logs-chip lvl-' + lv.k;
    chip.textContent = lv.l;
    chip.title = 'Level ' + lv.l + ' filtern';
    chip.addEventListener('click', () => {
      if (_logsV.levels.has(lv.k)) { _logsV.levels.delete(lv.k); chip.classList.remove('active'); }
      else { _logsV.levels.add(lv.k); chip.classList.add('active'); }
      logsApplyFilterAll();
    });
    _logsV.chipEls[lv.k] = chip;
    bar.appendChild(chip);
  }

  // Textsuche.
  const search = document.createElement('input');
  search.className = 'logs-search';
  search.type = 'text';
  search.placeholder = 'Suche …';
  search.autocomplete = 'off';
  let searchTimer = null;
  search.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      _logsV.search = search.value.trim();
      logsApplyHighlightAll();
    }, 140);
  });
  _logsV.searchEl = search;
  bar.appendChild(search);

  // Follow-Schalter (Auto-Scroll an/aus).
  const follow = document.createElement('button');
  follow.className = 'logs-toggle-btn active';
  follow.textContent = '▼ Folgen';
  follow.title = 'Auto-Scroll an/aus (Stream läuft weiter)';
  follow.addEventListener('click', () => {
    _logsV.follow = !_logsV.follow;
    follow.classList.toggle('active', _logsV.follow);
    if (_logsV.follow) logsScrollToBottom();
  });
  _logsV.followEl = follow;
  bar.appendChild(follow);

  // Zeilenumbruch-Schalter.
  const wrap = document.createElement('button');
  wrap.className = 'logs-toggle-btn';
  wrap.textContent = '↵ Umbruch';
  wrap.title = 'Lange Zeilen umbrechen';
  wrap.addEventListener('click', () => {
    _logsV.wrap = !_logsV.wrap;
    wrap.classList.toggle('active', _logsV.wrap);
    const body = $('logsViewerBody');
    if (body) body.classList.toggle('log-wrap', _logsV.wrap);
  });
  _logsV.wrapEl = wrap;
  bar.appendChild(wrap);

  // Zeilenzahl.
  const linesSel = document.createElement('select');
  linesSel.className = 'logs-sel';
  linesSel.title = 'Anzahl geladener Zeilen';
  for (const n of LOGS_LINE_COUNTS) {
    const o = document.createElement('option');
    o.value = String(n);
    o.textContent = n + ' Zeilen';
    if (n === LOGS_DEFAULT_LINES) o.selected = true;
    linesSel.appendChild(o);
  }
  linesSel.addEventListener('change', () => {
    const n = parseInt(linesSel.value, 10);
    _logsV.lines = LOGS_LINE_COUNTS.includes(n) ? n : LOGS_DEFAULT_LINES;
    logsRebuildStream(); // Zeilenzahl-Wechsel = Stream neu aufbauen
  });
  _logsV.linesEl = linesSel;
  bar.appendChild(linesSel);

  // Datei-Picker (nur folder) — anfangs versteckt.
  const fileSel = document.createElement('select');
  fileSel.className = 'logs-sel';
  fileSel.title = 'Datei im Ordner';
  fileSel.style.display = 'none';
  fileSel.addEventListener('change', () => {
    _logsV.file = fileSel.value || null;
    logsRebuildStream(); // Datei-Wechsel = Stream neu aufbauen
  });
  _logsV.fileEl = fileSel;
  bar.appendChild(fileSel);

  // Kopieren (sichtbare Zeilen).
  const copy = document.createElement('button');
  copy.className = 'logs-copy-btn';
  copy.textContent = '⧉ Kopieren';
  copy.title = 'Sichtbare Zeilen kopieren';
  copy.addEventListener('click', logsCopyVisible);
  _logsV.copyEl = copy;
  bar.appendChild(copy);

  // An Claude senden (App-Claude-Glyph ✱, KEINE fremde SVG). Uebergibt die
  // sichtbaren Zeilen + optionalen Kommentar an die Chat-Kachel (claude.js).
  const claude = document.createElement('button');
  claude.className = 'logs-copy-btn logs-claude-btn';
  claude.textContent = '✱ An Claude';
  claude.title = 'Sichtbare Zeilen an die Claude-Kachel senden';
  claude.addEventListener('click', openLogsClaudeDialog);
  _logsV.claudeBtn = claude;
  bar.appendChild(claude);
}

function logsScrollToBottom() {
  const body = $('logsViewerBody');
  if (body) body.scrollTop = body.scrollHeight;
}
function logsIsAtBottom() {
  const body = $('logsViewerBody');
  if (!body) return true;
  return (body.scrollHeight - body.scrollTop - body.clientHeight) < 40;
}

function setLogsViewerStatus(text, isErr) {
  const el = $('logsViewerStatus');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('err', !!isErr);
}

// Filter auf alle vorhandenen Zeilen anwenden.
function logsApplyFilterAll() {
  const body = $('logsViewerBody');
  if (!body) return;
  for (const line of body.children) logsApplyLineFilter(line);
  if (_logsV.follow && logsIsAtBottom()) logsScrollToBottom();
}
function logsApplyLineFilter(line) {
  let show = true;
  if (_logsV.levels.size) show = !!line.dataset.level && _logsV.levels.has(line.dataset.level);
  line.classList.toggle('log-hidden', !show);
}

// Highlight auf alle Zeilen neu anwenden (nach Suchaenderung).
function logsApplyHighlightAll() {
  const body = $('logsViewerBody');
  if (!body) return;
  for (const line of body.children) logsHighlightLine(line, _logsV.search);
}

function logsAppendLine(raw) {
  const body = $('logsViewerBody');
  if (!body) return;
  const atBottom = logsIsAtBottom();
  const line = formatLogLine(raw);
  if (_logsV.search) logsHighlightLine(line, _logsV.search);
  logsApplyLineFilter(line);
  body.appendChild(line);
  _logsV.count++;
  // DOM-Cap: aelteste Zeilen entfernen. Entfernte Knoten auch aus dem
  // Auswahl-Set loeschen (sonst haelt das Set tote Referenzen).
  while (_logsV.count > LOGS_MAX_DOM_LINES && body.firstChild) {
    const gone = body.firstChild;
    _logsV.selRows.delete(gone);
    if (_logsV.selAnchor === gone) _logsV.selAnchor = null;
    body.removeChild(gone);
    _logsV.count--;
  }
  if (_logsV.follow && atBottom) logsScrollToBottom();
}

// Aktuell sichtbare Zeilen (nach Level-Filter/Suche) als Text-Array einsammeln.
function logsGatherVisibleLines() {
  const body = $('logsViewerBody');
  const parts = [];
  if (!body) return parts;
  for (const line of body.children) {
    if (line.classList.contains('log-hidden')) continue;
    parts.push(line.textContent);
  }
  return parts;
}

// Text der ausgewaehlten .log-line-Knoten in DOM-Reihenfolge — oder null, wenn
// nichts ausgewaehlt ist. Reihenfolge kommt aus der Kindliste des Bodys.
function logsSelectedRowLines() {
  try {
    if (!_logsV.selRows || _logsV.selRows.size === 0) return null;
    const body = document.getElementById('logsViewerBody');
    if (!body) return null;
    const out = [];
    for (const row of body.children) {
      if (_logsV.selRows.has(row)) out.push(row.textContent);
    }
    return out.length ? out : null;
  } catch (_) { return null; }
}

function logsCopyVisible() {
  // Auswahl ZUERST bestimmen, sonst sichtbare Zeilen.
  const selLines = logsSelectedRowLines();
  const lines = selLines || logsGatherVisibleLines();
  const text = lines.join('\n');
  const okLabel = selLines
    ? `✓ Auswahl (${lines.length}) kopiert`
    : `✓ ${lines.length} Zeilen kopiert`;
  const done = () => { if (_logsV.copyEl) { _logsV.copyEl.textContent = okLabel; setTimeout(() => { _logsV.copyEl.textContent = '⧉ Kopieren'; }, 1400); } };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => {});
    } else {
      // Fallback ueber ein temporaeres Textfeld.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      document.body.removeChild(ta);
    }
  } catch (_) { /* Kopieren nicht moeglich */ }
}

/* ============================================================================
   „An Claude senden" — Inline-Kommentar-Dialog + Uebergabe an die Chat-Kachel
   ----------------------------------------------------------------------------
   Uebergabe erfolgt so, wie ein Nutzer es taete: Nachricht ins Eingabefeld der
   Claude-Kachel schreiben, ein input-Event feuern (Auto-Resize/State-Sync),
   dann den Sende-Button klicken. Alle Zugriffe auf die fremde Kachel sind
   optional-chained/typeof-geprueft (sie kann fehlen). Kein innerHTML mit Daten.
   ============================================================================ */

const LOGS_CLAUDE_MAX_LINES = 800;
const LOGS_CLAUDE_MAX_BYTES = 48 * 1024;

// Zeilen fuer Claude einsammeln + deckeln (letzte N Zeilen / max Bytes).
// Nutzt die beim Klick gestashte Selektion, sonst die sichtbaren Zeilen.
function logsBuildClaudeBlock() {
  let lines = _logsV.claudeStashLines || logsGatherVisibleLines();
  let truncated = false;
  if (lines.length > LOGS_CLAUDE_MAX_LINES) {
    lines = lines.slice(-LOGS_CLAUDE_MAX_LINES);
    truncated = true;
  }
  let text = lines.join('\n');
  if (text.length > LOGS_CLAUDE_MAX_BYTES) {
    text = text.slice(-LOGS_CLAUDE_MAX_BYTES);
    // an der naechsten Zeilengrenze abschneiden, damit keine Halbzeile beginnt
    const nl = text.indexOf('\n');
    if (nl >= 0) text = text.slice(nl + 1);
    truncated = true;
  }
  return { text, truncated, count: lines.length };
}

// Endgueltige Nachricht (reiner String) fuer das Claude-Eingabefeld bauen.
function logsComposeClaudeMessage(comment) {
  const block = logsBuildClaudeBlock();
  const label = (_logsV.src && _logsV.src.label) || 'Log';
  const parts = [];
  if (comment && comment.trim()) parts.push(comment.trim());
  parts.push('Quelle: ' + label);
  const note = block.truncated
    ? `… (gekürzt, letzte ${block.count} Zeilen)\n`
    : '';
  parts.push('```log\n' + note + block.text + '\n```');
  return parts.join('\n\n');
}

// Referenzen auf die Claude-Kachel sammeln (alles defensiv, kann fehlen).
function logsClaudeRefs() {
  const widget = document.querySelector('[data-widget-id="claude"]');
  const root = document.querySelector('[data-widget-id="claude"] .claude-tile');
  const input = root ? root.querySelector('[data-claude-input]') : null;
  const sendBtn = root ? root.querySelector('.claude-send') : null;
  const configured = (typeof CL !== 'undefined') && !!(CL && CL.configured);
  return { widget, root, input, sendBtn, configured };
}

function _buildLogsClaudeDialog() {
  const panel = document.querySelector('#logsViewerModal .picker-panel');
  if (!panel) return null;
  const box = document.createElement('div');
  box.id = 'logsClaudeDialog';
  box.className = 'logs-claude-dialog';
  box.style.display = 'none';
  // Statisches Geruest — Nutzereingabe/Logtext gehen NUR ueber .value/textContent.
  box.innerHTML =
    '<div class="logs-claude-card">'
    + '<div class="logs-claude-title">✱ An Claude senden</div>'
    + '<div class="logs-claude-scope" id="logsClaudeScope"></div>'
    + '<textarea class="logs-claude-comment" rows="3" placeholder="Kommentar für Claude … (optional)"></textarea>'
    + '<div class="logs-claude-hint" id="logsClaudeHint"></div>'
    + '<div class="logs-claude-actions">'
    + '<button class="cfg-btn logs-claude-cancel" type="button">Abbrechen</button>'
    + '<button class="cfg-btn logs-claude-do" type="button">Senden</button>'
    + '</div>'
    + '</div>';
  box.addEventListener('click', (e) => { if (e.target === box) closeLogsClaudeDialog(); });
  box.querySelector('.logs-claude-cancel').addEventListener('click', closeLogsClaudeDialog);
  box.querySelector('.logs-claude-do').addEventListener('click', logsSendToClaude);
  const ta = box.querySelector('.logs-claude-comment');
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeLogsClaudeDialog(); }
  });
  _logsV.claudeCommentEl = ta;
  _logsV.claudeScopeEl = box.querySelector('#logsClaudeScope');
  _logsV.claudeHintEl = box.querySelector('#logsClaudeHint');
  _logsV.claudeDoEl = box.querySelector('.logs-claude-do');
  panel.appendChild(box);
  return box;
}

function openLogsClaudeDialog() {
  // KRITISCH: Auswahl sofort im Click-Handler erfassen, BEVOR der Dialog
  // gebaut/geoeffnet und die Textarea fokussiert wird.
  const selLines = logsSelectedRowLines();
  _logsV.claudeStashLines = selLines; // null = sichtbare Zeilen verwenden

  const box = $('logsClaudeDialog') || _buildLogsClaudeDialog();
  if (!box) return;
  _logsV.claudeDialogOpen = true;

  // Vorbedingungen ehrlich abfangen — nicht senden, klar hinweisen.
  const refs = logsClaudeRefs();
  const hint = _logsV.claudeHintEl;
  const doBtn = _logsV.claudeDoEl;
  const scope = _logsV.claudeScopeEl;
  if (hint) { hint.textContent = ''; hint.classList.remove('err'); }
  if (!refs.widget || !refs.input) {
    if (hint) { hint.textContent = 'Claude-Kachel nicht auf dem Dashboard — bitte hinzufügen.'; hint.classList.add('err'); }
    if (doBtn) doBtn.disabled = true;
  } else if (!refs.configured) {
    if (hint) { hint.textContent = 'Claude ist nicht verbunden — Token in Einstellungen → Module setzen.'; hint.classList.add('err'); }
    if (doBtn) doBtn.disabled = true;
  } else {
    if (doBtn) doBtn.disabled = false;
  }

  // Prominente Umfang-Zeile: Anzahl + Quelle + evtl. Deckel-Hinweis. Zahlen aus
  // dem gestashten Satz; Quell-Label ist Fremddaten → textContent.
  if (scope) {
    const rawCount = (selLines || logsGatherVisibleLines()).length;
    const block = logsBuildClaudeBlock(); // nutzt denselben Stash
    const label = (_logsV.src && _logsV.src.label) || 'Log';
    const capNote = block.truncated ? ` (gekürzt auf ${block.count})` : '';
    scope.textContent = selLines
      ? `${rawCount} markierte Zeilen aus »${label}« werden an Claude gesendet.${capNote}`
      : `Alle ${rawCount} sichtbaren Zeilen aus »${label}« werden an Claude gesendet.${capNote}`;
  }

  if (_logsV.claudeCommentEl) _logsV.claudeCommentEl.value = '';
  box.style.display = 'flex';
  requestAnimationFrame(() => {
    box.classList.add('open');
    if (_logsV.claudeCommentEl) _logsV.claudeCommentEl.focus();
  });
}

function closeLogsClaudeDialog() {
  const box = $('logsClaudeDialog');
  _logsV.claudeDialogOpen = false;
  if (!box) return;
  box.classList.remove('open');
  box.style.display = 'none';
}

function logsSendToClaude() {
  try {
    const refs = logsClaudeRefs();
    const hint = _logsV.claudeHintEl;
    if (!refs.widget || !refs.input) {
      if (hint) { hint.textContent = 'Claude-Kachel nicht auf dem Dashboard — bitte hinzufügen.'; hint.classList.add('err'); }
      return;
    }
    if (!refs.configured) {
      if (hint) { hint.textContent = 'Claude ist nicht verbunden — Token in Einstellungen → Module setzen.'; hint.classList.add('err'); }
      return;
    }

    const comment = _logsV.claudeCommentEl ? _logsV.claudeCommentEl.value : '';
    const message = logsComposeClaudeMessage(comment);

    // Nachricht ins Feld schreiben + input-Event (Auto-Resize/State-Sync).
    refs.input.value = message;
    try { refs.input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}

    // Wie ein Nutzer absenden: Sende-Button klicken; sonst send() als Fallback.
    if (refs.sendBtn) refs.sendBtn.click();
    else if (typeof send === 'function') { try { send(); } catch (_) {} }

    closeLogsClaudeDialog();
    closeLogsViewer();

    // Claude-Kachel in den Blick holen + kurze Bestaetigung.
    const w = document.querySelector('[data-widget-id="claude"]');
    if (w && typeof w.scrollIntoView === 'function') w.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (_logsV.claudeBtn) {
      _logsV.claudeBtn.textContent = '✓ Gesendet';
      setTimeout(() => { if (_logsV.claudeBtn) _logsV.claudeBtn.textContent = '✱ An Claude'; }, 1500);
    }
  } catch (_) {
    const hint = _logsV.claudeHintEl;
    if (hint) { hint.textContent = 'Senden fehlgeschlagen.'; hint.classList.add('err'); }
  }
}

// Stream-URL aus dem aktuellen V-Zustand.
function logsStreamUrl() {
  let url = '/api/logs/stream?source=' + encodeURIComponent(_logsV.src.id) + '&lines=' + _logsV.lines;
  if (_logsV.src.type === 'folder' && _logsV.file) url += '&file=' + encodeURIComponent(_logsV.file);
  return url;
}

// Stream schliessen, Body leeren, neu oeffnen.
function logsRebuildStream() {
  logsCloseStream();
  const body = $('logsViewerBody');
  if (body) body.textContent = '';
  _logsV.count = 0;
  logsOpenStream();
}

function logsCloseStream() {
  if (_logsV.es) { try { _logsV.es.close(); } catch (_) {} _logsV.es = null; }
}

function logsOpenStream() {
  if (!_logsV.src) return;
  setLogsViewerStatus('Verbindung wird aufgebaut …', false);
  let es;
  try { es = new EventSource(logsStreamUrl()); }
  catch (_) { setLogsViewerStatus('Stream konnte nicht geöffnet werden.', true); return; }
  _logsV.es = es;

  es.onmessage = (e) => {
    setLogsViewerStatus('', false);
    let val = null;
    try { val = JSON.parse(e.data); } catch (_) { return; } // defensiv: keine Rohdaten ohne Parse
    logsAppendLine(typeof val === 'string' ? val : String(val));
  };
  // Named event `truncated` → dezenter Hinweis.
  es.addEventListener('truncated', () => {
    setLogsViewerStatus('… gekürzt (zu viele Zeilen pro Sekunde)', false);
    const el = $('logsViewerStatus');
    if (el) el.classList.add('logs-trunc');
  });
  // `error` faengt sowohl das serverseitige named-error-Event (mit data) als
  // auch reine Verbindungsabbrueche (EventSource reconnectet dann selbst).
  es.addEventListener('error', (e) => {
    if (e && e.data) setLogsViewerStatus('Stream-Fehler.', true);
    else if (_logsV.es && _logsV.es.readyState !== 1) setLogsViewerStatus('Verbindung unterbrochen — versucht erneut …', true);
  });
}

// Datei-Picker fuer folder-Quellen fuellen (neueste zuerst; Server liefert so).
async function logsLoadFiles() {
  const sel = _logsV.fileEl;
  if (!sel || !_logsV.src || _logsV.src.type !== 'folder') { if (sel) sel.style.display = 'none'; return; }
  sel.style.display = '';
  sel.textContent = '';
  const loading = document.createElement('option');
  loading.value = '';
  loading.textContent = 'Dateien …';
  sel.appendChild(loading);
  sel.disabled = true;
  try {
    const d = await fetch('/api/logs/files?source=' + encodeURIComponent(_logsV.src.id), { cache: 'no-store' })
      .then((r) => r.json());
    sel.textContent = '';
    const files = (d && d.ok && Array.isArray(d.files)) ? d.files : [];
    if (!files.length) {
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'neueste Datei';
      sel.appendChild(o);
      sel.disabled = true;
      return;
    }
    // Erste Option = Standard (neueste, Server-Auswahl).
    const first = document.createElement('option');
    first.value = '';
    first.textContent = 'neueste Datei';
    sel.appendChild(first);
    for (const f of files) {
      const name = f && f.name ? String(f.name) : '';
      if (!name) continue;
      const o = document.createElement('option');
      o.value = name;             // Basename ist der Stream-Parameter
      o.textContent = name;       // Fremddaten → textContent
      if (name === _logsV.file) o.selected = true;
      sel.appendChild(o);
    }
    sel.disabled = false;
  } catch (_) {
    sel.textContent = '';
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Dateien nicht ladbar';
    sel.appendChild(o);
    sel.disabled = true;
  }
}

function openLogsViewer(seed) {
  const modal = $('logsViewerModal') || _buildLogsModal();

  // Zustand fuer die neue Quelle zuruecksetzen (Filter/Suche bleiben nutzerfreundlich neutral).
  _logsV.open = true;
  _logsV.src = { id: seed.id, label: seed.label, type: seed.type };
  _logsV.file = null;
  _logsV.lines = LOGS_DEFAULT_LINES;
  _logsV.count = 0;
  _logsV.lastFocus = document.activeElement;

  // Titel: Label + Typ.
  setText('logsViewerTitle', (seed.label || 'Log') + ' · ' + logsTypeLabel(seed.type));
  const body = $('logsViewerBody');
  if (body) { body.textContent = ''; body.classList.toggle('log-wrap', _logsV.wrap); }
  if (_logsV.linesEl) _logsV.linesEl.value = String(_logsV.lines);
  setLogsViewerStatus('Verbindung wird aufgebaut …', false);

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });

  // Datei-Picker (folder) fuellen, dann Stream oeffnen.
  logsLoadFiles();
  logsOpenStream();
}

function closeLogsViewer() {
  const modal = $('logsViewerModal');
  _logsV.open = false;
  if (_logsV.claudeDialogOpen) closeLogsClaudeDialog();
  logsCloseStream(); // EventSource IMMER schliessen, wenn das Modal zu ist
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_logsV.lastFocus && typeof _logsV.lastFocus.focus === 'function') _logsV.lastFocus.focus();
  _logsV.lastFocus = null;
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'logs',
  label: 'Logs',
  section: 'system',
  defaultSize: { w: 4, h: 5 },
  minSize: { w: 3, h: 3 },

  event: 'logs',
  handler: renderLogs,
  // renderLogs() traegt die Darstellungs-Optionen mit — reine Design-Aenderungen
  // wirken sofort, auch ohne frische Daten. pollLogs() ist der REST-Fallback.
  refresh: () => { renderLogs(null); pollLogs(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>Logs</span>
        <span id="logsBadge" class="tile-badge"></span>
      </div>
      <div id="logsList" class="tile-list logs-list"></div>
      <div id="logsEmpty" class="logs-empty" style="display:none"></div>
    </div>`,

  options: [
    { key: 'maxRows', label: 'Max. Quellen', type: 'count', default: 0, group: 'Auswahl' },
    { key: 'lastLine', label: 'Letzte Zeile zeigen', type: 'toggle', default: true, filter: true, group: 'Anzeige' },
    { key: 'textSize', label: 'Schriftgröße', type: 'select', default: 'm', options: LOGS_SIZES, group: 'Darstellung' },
    { key: 'spacing', label: 'Abstand', type: 'select', default: 'normal', options: LOGS_SPACINGS, group: 'Darstellung' },
  ],

  settings: {
    badge: 'LOG', color: '#8ea1b5',
    statusEl: 'logsSettingsStatus',
    load: loadLogsSettings,
  },
});

/* ============================================================================
   Einstellungen (Settings → Module → Logs)
   ----------------------------------------------------------------------------
   Baut sich selbst (Muster wow _ensureWowTab/loadWowSettings). Laedt
   GET /api/logs/config → { sources, presets, catalog, sshReady }. Abschnitte:
     1. SSH-Status (aus sshReady) — KEINE Cred-Felder, nur ein Hinweis.
     2. Quellenverwaltung: aktuelle Quellen mit Entfernen; Hinzufuegen je Typ
        (Docker-Dropdown, Preset, Katalog-Vorfuellung, Custom).
   Speichern ersetzt die Liste ueber POST /api/logs/config; danach pollLogs().
   ============================================================================ */

let _logsCfg = { sources: [], presets: [], catalog: [] };
let _logsSources = []; // Arbeitskopie der Quellenliste
let _logsContainers = null; // Cache der docker-ps-Liste

function setLogsSettingsStatus(text, color) {
  const el = $('logsSettingsStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

function _ensureLogsTab() {
  let tab = document.querySelector('.tab[data-tab="logs"]');
  if (!tab) {
    const grid = $('categoryGrid');
    const host = grid && grid.parentElement;
    if (!host) return null;
    tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tab = 'logs';
    tab.innerHTML =
      '<div class="cfg-row">'
      + '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">'
      + '<span style="font:700 11px \'JetBrains Mono\',monospace;color:#8ea1b5;min-width:22px;'
      + 'background:rgba(142,161,181,0.14);border-radius:4px;padding:2px 5px;text-align:center">LOG</span>'
      + '<div><div class="cfg-key">Logs</div>'
      + '<div style="font:500 10px \'JetBrains Mono\',monospace;color:var(--text-dim);margin-top:2px">'
      + 'Logviewer per SSH · Docker/Datei/Ordner/Kernel</div></div></div>'
      + '<span id="logsSettingsStatus" style="font:500 11px \'JetBrains Mono\',monospace;color:var(--text-status)">● –</span>'
      + '</div>'
      + '<div id="logsSettingsBody"></div>';
    host.appendChild(tab);
  }
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  return tab;
}

async function loadLogsSettings() {
  const tab = _ensureLogsTab();
  if (!tab) return;
  const body = $('logsSettingsBody');
  if (!body) return;
  body.innerHTML = '';
  setLogsSettingsStatus('● lädt …', 'var(--text-3)');

  let cfg = null;
  try {
    cfg = await fetch('/api/logs/config', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    body.textContent = 'Konfiguration konnte nicht geladen werden.';
    setLogsSettingsStatus('● Fehler', '#f43f5e');
    return;
  }
  _logsCfg = {
    sources: Array.isArray(cfg && cfg.sources) ? cfg.sources : [],
    presets: Array.isArray(cfg && cfg.presets) ? cfg.presets : [],
    catalog: Array.isArray(cfg && cfg.catalog) ? cfg.catalog : [],
  };
  _logsSources = _logsCfg.sources.slice();
  const sshReady = !!(cfg && cfg.sshReady);

  renderLogsSshStatus(body, sshReady);
  renderLogsSourceList(body);
  renderLogsAddForms(body);

  setLogsSettingsStatus(
    sshReady ? '● SSH bereit' : '● SSH nicht eingerichtet',
    sshReady ? '#3ddc97' : '#ffb454',
  );

  // Ehrlicher SSH-Status: sshReady heisst nur „Creds vorhanden". Erst diese
  // Probe testet eine echte Verbindung (falscher Key/Login wird sonst nicht
  // erkannt). Laeuft asynchron, nachdem der schnelle Erstzustand schon steht.
  if (sshReady) logsProbeSsh();
}

/* ---------- Abschnitt 1: SSH-Status ---------- */

function renderLogsSshStatus(body, sshReady) {
  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Unraid-SSH';
  body.appendChild(head);

  const line = document.createElement('div');
  line.className = 'logs-cfg-ssh';
  line.appendChild(document.createTextNode('Status: '));
  const val = document.createElement('span');
  val.id = 'logsSshVal';
  // Erstzustand aus /config: bei vorhandenen Creds folgt gleich die echte Probe.
  val.className = sshReady ? 'ok' : 'no';
  val.textContent = sshReady ? 'prüft …' : 'nicht eingerichtet';
  line.appendChild(val);
  body.appendChild(line);

  const hint = document.createElement('div');
  hint.id = 'logsSshHint';
  hint.className = 'tile-settings-hint';
  hint.style.lineHeight = '1.7';
  hint.textContent = sshReady
    ? 'Zugangsdaten (UNRAID_SSH_*) stehen und werden mit dem VNC-/System-Teil geteilt. Verbindung wird geprüft …'
    : 'Es fehlen Zugangsdaten. Setze UNRAID_SSH_HOST und ein Passwort oder einen Key in den System-Einstellungen — hier gibt es bewusst keine eigenen Cred-Felder.';
  body.appendChild(hint);
}

// Setzt die SSH-Statuszeile (Text + Farbklasse) und den Hinweistext.
function setLogsSshLine(text, cls, hint) {
  const val = $('logsSshVal');
  if (val) { val.textContent = text; val.className = cls; }
  const h = $('logsSshHint');
  if (h) h.textContent = hint;
}

// Echte Verbindungsprobe (GET /api/logs/ssh-check). `message` NICHT roh anzeigen
// (koennte Cred-Fragmente enthalten) — nur fester, kurzer Text.
async function logsProbeSsh() {
  let d = null;
  try {
    d = await fetch('/api/logs/ssh-check', { cache: 'no-store' }).then((r) => r.json());
  } catch {
    setLogsSshLine('Prüfung fehlgeschlagen', 'no',
      'Die Verbindungsprüfung konnte nicht ausgeführt werden.');
    return;
  }
  const state = d && d.state;
  if (state === 'connected') {
    setLogsSshLine('verbunden', 'ok',
      'Zugangsdaten stehen und die Verbindung zum Unraid-Host funktioniert. Gesetzt werden sie in den System-Einstellungen.');
  } else if (state === 'auth_failed') {
    setLogsSshLine('Login fehlgeschlagen — Key/Passwort prüfen', 'no',
      'Der Host ist erreichbar, aber Login/Key wurde abgelehnt. UNRAID_SSH_USER/_PASSWORD/_KEY in den System-Einstellungen prüfen.');
  } else if (state === 'unreachable') {
    setLogsSshLine('Host nicht erreichbar', 'no',
      'Der Unraid-Host antwortet nicht (UNRAID_SSH_HOST/_PORT prüfen; ist SSH aktiv?).');
  } else if (state === 'not_configured') {
    setLogsSshLine('nicht eingerichtet', 'no',
      'Es fehlen Zugangsdaten. Setze UNRAID_SSH_HOST und ein Passwort oder einen Key in den System-Einstellungen.');
  } else {
    setLogsSshLine('unbekannt', 'no', 'Der Verbindungsstatus konnte nicht bestimmt werden.');
  }
}

/* ---------- Abschnitt 2: Quellenverwaltung ---------- */

// Ganze Liste ersetzen (Server saniert/verwirft — mit seiner Antwort weiterarbeiten).
async function saveLogsSources(nextSources, statusOk) {
  setLogsSettingsStatus('● speichert …', 'var(--text-3)');
  try {
    const r = await fetch('/api/logs/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: nextSources }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d && d.ok) {
      _logsSources = Array.isArray(d.sources) ? d.sources : [];
      renderLogsSourceList($('logsSettingsBody'), true);
      setLogsSettingsStatus(statusOk || '● gespeichert', '#3ddc97');
      pollLogs();
      return true;
    }
    setLogsSettingsStatus('● Speichern fehlgeschlagen', '#f43f5e');
    return false;
  } catch (err) {
    console.error('Logs-Konfiguration konnte nicht gespeichert werden:', err && err.message);
    setLogsSettingsStatus('● Fehler', '#f43f5e');
    return false;
  }
}

function logsAddSource(entry) {
  return saveLogsSources(_logsSources.concat([entry]), '● hinzugefügt');
}
function logsRemoveSource(id) {
  return saveLogsSources(_logsSources.filter((s) => s.id !== id), '● entfernt');
}

// Liste der aktuellen Quellen (mit Entfernen). Bei Re-Render (afterSave) nur den
// Listencontainer neu zeichnen.
function renderLogsSourceList(body, afterSave) {
  let list = $('logsSourceList');
  if (!afterSave || !list) {
    const head = document.createElement('div');
    head.className = 'cfg-section';
    head.textContent = 'Quellen';
    body.appendChild(head);
    list = document.createElement('div');
    list.id = 'logsSourceList';
    list.className = 'logs-cfg-list';
    body.appendChild(list);
  }
  list.textContent = '';

  if (!_logsSources.length) {
    const empty = document.createElement('div');
    empty.className = 'news-cfg-empty';
    empty.textContent = 'Noch keine Quelle — unten eine hinzufügen.';
    list.appendChild(empty);
    return;
  }
  for (const s of _logsSources) {
    const row = document.createElement('div');
    row.className = 'news-cfg-row';

    const info = document.createElement('div');
    info.className = 'news-cfg-info';
    const name = document.createElement('div');
    name.className = 'news-cfg-name';
    name.textContent = s.label || '';                 // Fremddaten → textContent
    const sub = document.createElement('div');
    sub.className = 'news-cfg-url';
    sub.textContent = logsTypeLabel(s.type) + ' · ' + (s.container || s.path || s.cmd || '');
    info.append(name, sub);

    const actions = document.createElement('div');
    actions.className = 'news-cfg-actions';
    const del = document.createElement('button');
    del.className = 'cfg-btn cfg-btn-del';
    del.textContent = '×';
    del.title = 'Quelle entfernen';
    del.addEventListener('click', () => { del.disabled = true; logsRemoveSource(s.id); });
    actions.appendChild(del);

    row.append(info, actions);
    list.appendChild(row);
  }
}

// Alle Hinzufuegen-Formulare (Docker · Preset · Katalog → Custom · Custom).
function renderLogsAddForms(body) {
  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Quelle hinzufügen';
  body.appendChild(head);

  // --- Docker ---
  const dockerLbl = document.createElement('div');
  dockerLbl.className = 'tile-settings-hint';
  dockerLbl.textContent = 'Docker-Container';
  body.appendChild(dockerLbl);

  const dockerRow = document.createElement('div');
  dockerRow.className = 'news-cfg-add';
  const dockerSel = document.createElement('select');
  dockerSel.className = 'cfg-input';
  dockerSel.style.flex = '1 1 200px';
  const dl = document.createElement('option');
  dl.value = ''; dl.textContent = 'Container laden …';
  dockerSel.appendChild(dl);
  dockerSel.disabled = true;
  const dockerName = document.createElement('input');
  dockerName.className = 'cfg-input';
  dockerName.placeholder = 'Label (optional)';
  dockerName.autocomplete = 'off';
  const dockerBtn = document.createElement('button');
  dockerBtn.className = 'cfg-btn';
  dockerBtn.textContent = '+ Docker';
  dockerBtn.addEventListener('click', async () => {
    const container = dockerSel.value;
    if (!container) { setLogsSettingsStatus('● Container wählen', '#ffb454'); return; }
    dockerBtn.disabled = true;
    await logsAddSource({ type: 'docker', container, label: dockerName.value.trim() || container });
    dockerName.value = '';
    dockerBtn.disabled = false;
  });
  dockerRow.append(dockerSel, dockerName, dockerBtn);
  body.appendChild(dockerRow);
  logsFillContainers(dockerSel);

  // --- Preset ---
  if (_logsCfg.presets.length) {
    const presetLbl = document.createElement('div');
    presetLbl.className = 'tile-settings-hint';
    presetLbl.textContent = 'Vorlage (System-Logs)';
    body.appendChild(presetLbl);

    const presetRow = document.createElement('div');
    presetRow.className = 'news-cfg-add';
    const presetSel = document.createElement('select');
    presetSel.className = 'cfg-input';
    presetSel.style.flex = '1 1 200px';
    const pf = document.createElement('option');
    pf.value = ''; pf.textContent = 'Vorlage wählen …';
    presetSel.appendChild(pf);
    for (const p of _logsCfg.presets) {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.label + ' (' + logsTypeLabel(p.type) + ')';
      presetSel.appendChild(o);
    }
    const presetBtn = document.createElement('button');
    presetBtn.className = 'cfg-btn';
    presetBtn.textContent = '+ Vorlage';
    presetBtn.addEventListener('click', async () => {
      const p = _logsCfg.presets.find((x) => x.id === presetSel.value);
      if (!p) { setLogsSettingsStatus('● Vorlage wählen', '#ffb454'); return; }
      const entry = { type: p.type, label: p.label };
      if (p.path) entry.path = p.path;
      if (p.cmd) entry.cmd = p.cmd;
      if (p.id) entry.preset = p.id;
      presetBtn.disabled = true;
      await logsAddSource(entry);
      presetBtn.disabled = false;
    });
    presetRow.append(presetSel, presetBtn);
    body.appendChild(presetRow);
  }

  // --- Custom (mit Katalog-Vorfuellung) ---
  const customLbl = document.createElement('div');
  customLbl.className = 'tile-settings-hint';
  customLbl.textContent = 'Eigene Quelle (Katalog füllt Pfad/Typ vor — bitte prüfen)';
  body.appendChild(customLbl);

  // Katalog-Dropdown fuellt die Felder darunter vor.
  const catRow = document.createElement('div');
  catRow.className = 'news-cfg-add';
  const catSel = document.createElement('select');
  catSel.className = 'cfg-input';
  catSel.style.flex = '1 1 260px';
  const cf = document.createElement('option');
  cf.value = ''; cf.textContent = 'App aus Katalog … (optional)';
  catSel.appendChild(cf);
  for (const c of _logsCfg.catalog) {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = c.name + (c.unsure ? ' ⚠' : '');
    catSel.appendChild(o);
  }
  catRow.appendChild(catSel);
  body.appendChild(catRow);

  const catHint = document.createElement('div');
  catHint.className = 'tile-settings-hint';
  catHint.style.color = '#ffb454';
  body.appendChild(catHint);

  // Custom-Felder: Typ · Label · Pfad/Container.
  const custRow = document.createElement('div');
  custRow.className = 'news-cfg-add';
  const typeSel = document.createElement('select');
  typeSel.className = 'cfg-input';
  typeSel.style.flex = '0 0 auto';
  for (const t of [['file', 'Datei'], ['folder', 'Ordner'], ['docker', 'Docker']]) {
    const o = document.createElement('option');
    o.value = t[0]; o.textContent = t[1];
    typeSel.appendChild(o);
  }
  const custLabel = document.createElement('input');
  custLabel.className = 'cfg-input';
  custLabel.placeholder = 'Label';
  custLabel.autocomplete = 'off';
  const custTarget = document.createElement('input');
  custTarget.className = 'cfg-input';
  custTarget.placeholder = '/mnt/user/appdata/… (Pfad)';
  custTarget.autocomplete = 'off';
  const custBtn = document.createElement('button');
  custBtn.className = 'cfg-btn';
  custBtn.textContent = '+ Quelle';

  const updateTargetPlaceholder = () => {
    custTarget.placeholder = typeSel.value === 'docker'
      ? 'Container-Name'
      : '/mnt/user/appdata/… (Pfad)';
  };
  typeSel.addEventListener('change', updateTargetPlaceholder);

  // Katalog-Auswahl fuellt Typ/Label/Ziel vor (editierbar).
  catSel.addEventListener('change', () => {
    const c = _logsCfg.catalog.find((x) => x.id === catSel.value);
    if (!c) { catHint.textContent = ''; return; }
    typeSel.value = c.type || 'file';
    updateTargetPlaceholder();
    custLabel.value = c.name || '';
    if (c.type === 'docker') {
      // stdout-Apps: Container-Name vorbelegen (App-id als grobe Annahme).
      custTarget.value = c.id || '';
    } else {
      // Pfad relativ zu /mnt/user/appdata/<app>/ — <app>-Ordnername ggf. anpassen.
      custTarget.value = '/mnt/user/appdata/' + (c.id || '') + '/' + (c.path || '');
    }
    catHint.textContent = 'Pfad prüfen: ' + (c.note || '')
      + ' — der <app>-Ordnername (z. B. plex vs. binhex-plex) bleibt Sache des Nutzers.';
  });

  custBtn.addEventListener('click', async () => {
    const type = typeSel.value;
    const label = custLabel.value.trim();
    const target = custTarget.value.trim();
    if (!target) { setLogsSettingsStatus('● Pfad/Container fehlt', '#ffb454'); return; }
    const entry = { type, label: label || target };
    if (type === 'docker') entry.container = target;
    else entry.path = target;
    custBtn.disabled = true;
    const ok = await logsAddSource(entry);
    if (ok) {
      custLabel.value = ''; custTarget.value = ''; catSel.value = ''; catHint.textContent = '';
    } else {
      // Server hat die Quelle verworfen (z. B. Pfad ausserhalb der Allowlist).
      setLogsSettingsStatus('● verworfen — Pfad/Container prüfen', '#f43f5e');
    }
    custBtn.disabled = false;
  });

  custRow.append(typeSel, custLabel, custTarget, custBtn);
  body.appendChild(custRow);
}

// Docker-Container-Dropdown fuellen (Cache je Panel-Sitzung).
async function logsFillContainers(sel) {
  const apply = (containers) => {
    sel.textContent = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = containers.length ? 'Container wählen …' : 'Keine Container';
    sel.appendChild(first);
    for (const c of containers) {
      if (!c || !c.name) continue;
      const o = document.createElement('option');
      o.value = c.name;                                 // ^[A-Za-z0-9._-]+$ serverseitig geprueft
      const st = c.state ? ' (' + c.state + ')' : '';
      o.textContent = c.name + st;                      // Fremddaten → textContent
      sel.appendChild(o);
    }
    sel.disabled = containers.length === 0;
  };

  if (_logsContainers) { apply(_logsContainers); return; }
  try {
    const d = await fetch('/api/logs/containers', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok && Array.isArray(d.containers)) {
      _logsContainers = d.containers;
      apply(d.containers);
    } else {
      sel.textContent = '';
      const o = document.createElement('option');
      o.value = '';
      o.textContent = d && d.error === 'not_configured' ? 'SSH nicht eingerichtet' : 'Container nicht ladbar';
      sel.appendChild(o);
      sel.disabled = true;
    }
  } catch {
    sel.textContent = '';
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Container nicht erreichbar';
    sel.appendChild(o);
    sel.disabled = true;
  }
}
