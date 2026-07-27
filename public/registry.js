'use strict';

/* ============================================================
   Dash — Frontend-Modul-Registry
   ------------------------------------------------------------
   Eine Kachel musste bisher an fuenf verteilten Stellen in app.js
   eingetragen werden:

     DASHBOARD_WIDGETS · WIDGET_OPTIONS · WIDGET_REFRESH ·
     PUSH_HANDLERS · SETTINGS_TREE

   Fehlte einer der Eintraege, gab es keinen Fehler — die Kachel
   war nur still kaputt (kein Live-Update, keine Optionen, kein
   Settings-Eintrag). Hier wird stattdessen ein Manifest je Kachel
   registriert und die fuenf Tabellen daraus abgeleitet.

   Wird VOR app.js geladen, damit Dateien aus public/modules/ sich
   bereits eintragen koennen. Die Callbacks (render/refresh) duerfen
   Funktionen aus app.js referenzieren: sie laufen erst zur Laufzeit,
   nicht beim Registrieren.
   ============================================================ */

window.Dash = (function () {
  const modules = [];
  const byId = new Map();
  const handlers = {};   // SSE-Event-Name -> Handler
  const settingsCats = new Map(); // Kategorie-Id -> { id, label, children[] }
  const tabLoadersById = {};      // Settings-Tab-Id -> Loader (beim Oeffnen)

  function fail(msg) {
    // Laut sein, aber den Rest des Dashboards nicht mitreissen: eine kaputte
    // Modul-Datei soll nicht die ganze Seite weiss lassen.
    console.error('[Dash] Modul abgelehnt:', msg);
  }

  function validate(m) {
    if (!m || typeof m !== 'object') return 'kein Objekt';
    if (!m.id || typeof m.id !== 'string') return 'Feld `id` fehlt';
    if (byId.has(m.id)) return `doppelte id "${m.id}"`;
    if (!m.label) return `Modul "${m.id}": Feld \`label\` fehlt`;
    const sz = m.defaultSize;
    if (!sz || !(sz.w > 0) || !(sz.h > 0)) return `Modul "${m.id}": \`defaultSize\` {w,h} fehlt`;
    if (m.options && !Array.isArray(m.options)) return `Modul "${m.id}": \`options\` muss ein Array sein`;
    return null;
  }

  function registerModule(m) {
    const problem = validate(m);
    if (problem) return fail(problem);
    const mod = {
      section: 'dienste',
      minSize: { w: 3, h: 3 },
      options: [],
      ...m,
    };
    modules.push(mod);
    byId.set(mod.id, mod);
    // Kurzform: Modul bringt seinen eigenen Push-Handler mit.
    if (mod.event && typeof mod.handler === 'function') registerHandler(mod.event, mod.handler);
    if (mod.settings) registerSettings(mod);
    return mod;
  }

  // Push-Handler koennen auch ohne Kachel registriert werden (z.B. das
  // Wetter in der Kopfzeile) oder eine Kachel mitbedienen, die kein eigenes
  // Event hat (Unraid Array speist Array- UND Disks-Kachel).
  function registerHandler(event, fn) {
    if (!event || typeof fn !== 'function') return fail(`Handler fuer "${event}" ungueltig`);
    handlers[event] = fn;
  }

  function registerSettings(mod) {
    const s = mod.settings;
    const catId = s.category || 'modules';
    if (!settingsCats.has(catId)) settingsCats.set(catId, { id: catId, label: catId, children: [] });
    settingsCats.get(catId).children.push({
      id: s.id || mod.id,
      label: s.label || mod.label,
      badge: s.badge, color: s.color, icon: s.icon, statusEl: s.statusEl,
    });
    // Panels, die ihren Inhalt erst beim Oeffnen holen (Quellenlisten, Kataloge),
    // bringen ihren Loader selbst mit — bisher ging das nur fuer die
    // Kern-Kategorien, die in app.js fest eingetragen sind.
    if (typeof s.load === 'function') tabLoadersById[s.id || mod.id] = s.load;
  }

  /* ---------- Abgeleitete Tabellen (von app.js konsumiert) ---------- */

  // [{ id, section, label, defaultSize, minSize }] — Kachel-Katalog
  function widgets() {
    return modules.map((m) => ({
      id: m.id, section: m.section, label: m.label,
      defaultSize: m.defaultSize, minSize: m.minSize,
    }));
  }

  // { widgetId: [option, …] } — Kachel-Einstellungen
  function options() {
    const out = {};
    for (const m of modules) if (m.options.length) out[m.id] = m.options;
    return out;
  }

  // { widgetId: () => void } — Nachladen nach Config-Aenderung / Seitenwechsel
  function refreshers() {
    const out = {};
    for (const m of modules) if (typeof m.refresh === 'function') out[m.id] = m.refresh;
    return out;
  }

  // { sseEvent: (data) => void }
  function pushHandlers() { return { ...handlers }; }

  // { settingsTabId: () => void } — beim Oeffnen des Tabs aufgerufen
  function tabLoaders() { return { ...tabLoadersById }; }

  // Baut den Settings-Baum: die Kern-Kategorien geben Reihenfolge und Labels
  // vor, die Module haengen ihre Eintraege in die passende Kategorie.
  function settingsTree(coreCategories) {
    return coreCategories.map((cat) => {
      const extra = settingsCats.get(cat.id);
      return { ...cat, children: (cat.children || []).concat(extra ? extra.children : []) };
    });
  }

  function get(id) { return byId.get(id); }
  function all() { return modules.slice(); }

  return {
    registerModule, registerHandler,
    widgets, options, refreshers, pushHandlers, settingsTree, tabLoaders,
    get, all,
  };
})();
