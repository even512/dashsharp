'use strict';

/* ============================================================================
   CSS-Injektion — das Modul liefert sein eigenes Styling
   ----------------------------------------------------------------------------
   Der Server buendelt unter /modules.js NUR JavaScript; einen CSS-Kanal fuer
   Module gibt es nicht, und die Kern-Datei public/styles.css darf nicht
   angefasst werden. Also haengt das Modul sein <style> beim Laden EINMAL selbst
   in den <head> (idempotent ueber die feste id). Es nutzt durchgaengig die
   vorhandenen Theme-Variablen aus styles.css (--text-*, --green, --red,
   --border-*, --bg-modal, --accent-border), damit Light-/Win9x-Theme mittragen.
   Klassen-/Qualitaetsfarben setzt das JS inline — die kommen hier nicht vor.
   ============================================================================ */
(function injectWowStyles() {
  const ID = 'wow-module-styles';
  if (typeof document === 'undefined' || document.getElementById(ID)) return;
  const css = `
/* ---- Kachel-Liste: Achsen setzen nur Variablen (analog tmdb-xrel) ---- */
.wow-list { --wow-fs: 12.5px; --wow-gap: 8px; --wow-av: 40px; gap: var(--wow-gap); }
.wow-list.wow-text-s  { --wow-fs: 11px;   --wow-av: 34px; }
.wow-list.wow-text-m  { --wow-fs: 12.5px; --wow-av: 40px; }
.wow-list.wow-text-l  { --wow-fs: 14px;   --wow-av: 46px; }
.wow-list.wow-text-xl { --wow-fs: 15.5px; --wow-av: 52px; }
.wow-list.wow-space-tight  { --wow-gap: 3px; }
.wow-list.wow-space-normal { --wow-gap: 8px; }
.wow-list.wow-space-wide   { --wow-gap: 14px; }

/* ---- Zeile: Avatar links · Name/Unterzeile mittig · iLvl rechts ---- */
.wow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  border-radius: 8px;
  font: 500 var(--wow-fs) 'JetBrains Mono', monospace;
  color: var(--text-15);
}
.wow-row.wow-clickable { cursor: pointer; }
.wow-row.wow-clickable:hover { background: rgba(120,150,200,0.08); }
.wow-row:focus-visible { outline: 1px solid var(--accent-border); outline-offset: 1px; }
.wow-row.wow-unreachable { opacity: 0.55; }
.wow-row.wow-unreachable .wow-name { color: var(--text-3); }

.wow-avatar {
  position: relative;
  flex-shrink: 0;
  width: var(--wow-av);
  height: var(--wow-av);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(120,150,200,0.10);
  border: 1px solid var(--border-1);
}
.wow-avatar img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Kuerzel liegt HINTER dem img und wird sichtbar, sobald das Bild fehlt. */
.wow-avatar-fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font: 700 calc(var(--wow-fs) + 1px) 'JetBrains Mono', monospace;
  color: var(--text-3);
  letter-spacing: 0.04em;
}

.wow-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.wow-name {
  font-weight: 600;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wow-sub {
  font-size: 0.82em;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wow-ilvl {
  flex-shrink: 0;
  font: 600 0.8em 'JetBrains Mono', monospace;
  color: var(--text-2);
  background: rgba(120,150,200,0.10);
  border: 1px solid var(--border-1);
  border-radius: 5px;
  padding: 2px 6px;
  letter-spacing: 0.02em;
}

.wow-empty { padding: 10px 6px; font: 500 11px 'JetBrains Mono', monospace; color: var(--text-dim); }

/* ---- Detailfenster: Grundgeruest ist .picker-modal/.picker-panel ---- */
.wow-detail-body {
  padding: 14px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.wow-detail-status { padding: 8px 2px; font: 500 12px 'JetBrains Mono', monospace; color: var(--text-dim); }
.wow-detail-content { display: flex; flex-direction: column; gap: 18px; }

/* Block 1: grosser Render — zentriert, hoehenbegrenzt. */
.wow-detail-render { display: flex; justify-content: center; }
.wow-detail-render img {
  max-width: 100%;
  max-height: 260px;
  object-fit: contain;
  border-radius: 10px;
}

.wow-detail-block { display: flex; flex-direction: column; gap: 8px; }

/* Block 2: Stammdaten als zweispaltiges Definitions-Gitter. */
.wow-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 4px 18px;
}
.wow-def {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font: 500 12px 'JetBrains Mono', monospace;
  padding: 2px 0;
  border-bottom: 1px solid var(--border-3);
}
.wow-def-label { color: var(--text-3); flex-shrink: 0; }
.wow-def-val { color: var(--text-15); text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Block 3: Ausruestung — kompakte Zeilen (Slot · Name · iLvl). */
.wow-detail-equip { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 2px 18px; }
.wow-equip-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font: 500 11.5px 'JetBrains Mono', monospace;
  padding: 2px 0;
}
.wow-equip-slot { flex-shrink: 0; width: 84px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wow-equip-name { flex: 1; min-width: 0; color: var(--text-15); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wow-equip-ilvl { flex-shrink: 0; color: var(--text-2); font-weight: 600; }

/* Block 4: Mythic+. */
.wow-detail-mythic { font: 600 15px 'JetBrains Mono', monospace; color: var(--text-1); }

/* Block 5: Raid-Fortschritt. */
.wow-detail-raids { display: flex; flex-direction: column; gap: 4px; }
.wow-raid-exp { font: 600 11px 'JetBrains Mono', monospace; color: var(--text-3); margin-bottom: 2px; }
.wow-raid-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font: 500 12px 'JetBrains Mono', monospace;
  padding: 2px 0;
  border-bottom: 1px solid var(--border-3);
}
.wow-raid-name { color: var(--text-15); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wow-raid-modes { flex-shrink: 0; color: var(--text-3); text-align: right; }

/* Block 6: Berufe. */
.wow-detail-profs { display: flex; flex-direction: column; gap: 4px; }
.wow-prof-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font: 500 12px 'JetBrains Mono', monospace;
  padding: 2px 0;
  border-bottom: 1px solid var(--border-3);
}
.wow-prof-name { color: var(--text-15); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wow-prof-skill { flex-shrink: 0; color: var(--text-3); text-align: right; }

/* ---- Settings: Container fuer die gespeicherte Charakterliste ----
   Die Zeilen selbst nutzen die vorhandenen .news-cfg-*-Klassen aus styles.css;
   hier nur der Stapel-Abstand. */
.wow-cfg-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
`;
  const style = document.createElement('style');
  style.id = ID;
  style.textContent = css;
  document.head.appendChild(style);
})();

/* ============================================================================
   WoW-Charaktere — Kachel (Gegenstueck zu server/modules/wow.js)
   ----------------------------------------------------------------------------
   Zeigt eine vom Nutzer gepflegte Liste von WoW-Charakteren: pro Zeile Avatar,
   Name in Klassenfarbe, „Lvl {level} · {spec}-{klasse}" und optional ein
   iLvl-Badge. Ein Klick auf eine erreichbare Zeile oeffnet ein Detailfenster
   (.picker-modal-Muster wie tmdb-xrel/news) mit sechs Bloecken: grosser Render,
   Stammdaten, Ausruestung, Mythic+, Raid-Fortschritt und Berufe.

   Alle Inhalte sind Fremddaten und gehen ausschliesslich ueber textContent in
   die Seite. Bilder (avatarUrl/renderUrl) kommen vom eigenen Server-Proxy
   (/api/wow/image/<id>) — der Browser spricht also nur mit Dash#. Die src wird
   trotzdem immer per Property gesetzt, nie per innerHTML-Konkatenation.

   Die Zugangsdaten (BLIZZARD_CLIENT_ID/_SECRET/_REGION) und die
   Charakterverwaltung baut das Settings-Panel unten selbst — Zugangsdaten ueber
   das generische /api/secrets (Muster tmdb-xrel), die Charakterliste ueber die
   Zusatzrouten /api/wow/realms, /api/wow/config, /api/wow/add, /api/wow/remove.
   ============================================================================ */

const WOW_SIZES = [
  { v: 's', l: 'Klein' },
  { v: 'm', l: 'Normal' },
  { v: 'l', l: 'Groß' },
  { v: 'xl', l: 'Sehr groß' },
];
const WOW_SPACINGS = [
  { v: 'tight', l: 'Eng' },
  { v: 'normal', l: 'Normal' },
  { v: 'wide', l: 'Weit' },
];

// Fraktions-Label (das Backend liefert nur den Typ ALLIANCE/HORDE).
const WOW_FACTIONS = { ALLIANCE: 'Allianz', HORDE: 'Horde' };
function wowFaction(type) {
  return WOW_FACTIONS[String(type || '').toUpperCase()] || (type || '');
}

let _wowData = null;      // letzte Kachel-Payload (fuer Re-Render nach Options-Aenderung)
let _wowDetail = null;    // gerade geoeffneter Charakter-key
let _wowLastFocus = null; // Fokus vor dem Oeffnen des Detailfensters

/* ---------- Formatierung ---------- */

function wowLastLogin(ms) {
  if (!ms) return '';
  const t = Number(ms);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// „Lvl 80 · Vergeltung-Paladin" — jeder Teil faellt weg, wenn er fehlt.
function wowSubline(c) {
  const parts = [];
  if (Number.isFinite(Number(c.level))) parts.push(`Lvl ${c.level}`);
  const specClass = [c.spec, c.className].filter(Boolean).join('-');
  if (specClass) parts.push(specClass);
  return parts.join(' · ');
}

/* ---------- Layout ----------
   Wie bei den anderen Kacheln setzt jede Achse eine Klasse auf #wowList, die in
   styles.css nur CSS-Variablen umschreibt. Modul-eigene Klassen sind mit
   „wow-" praefixiert; das Grundlayout stuetzt sich auf .tile / .tile-list. */
function applyWowLayout() {
  const list = $('wowList');
  if (!list) return;
  const pick = (prefix, key, options) => {
    const cur = String(_cfgVal('wow', key));
    for (const o of options) list.classList.toggle(prefix + o.v, o.v === cur);
  };
  pick('wow-text-', 'textSize', WOW_SIZES);
  pick('wow-space-', 'spacing', WOW_SPACINGS);
}

/* ---------- Zeilen ---------- */

function _wowCreateRow() {
  const row = document.createElement('div');
  row.className = 'wow-row';
  // Statisches Markup — alle Fremddaten kommen ueber textContent / src-Property.
  row.innerHTML =
    '<div class="wow-avatar"><img alt="" loading="lazy"><span class="wow-avatar-fallback"></span></div>'
    + '<div class="wow-main">'
    + '<div class="wow-name"></div>'
    + '<div class="wow-sub"></div>'
    + '</div>'
    + '<span class="wow-ilvl tile-badge"></span>';
  row._avatar = row.querySelector('.wow-avatar');
  row._img = row.querySelector('.wow-avatar img');
  row._fallback = row.querySelector('.wow-avatar-fallback');
  row._name = row.querySelector('.wow-name');
  row._sub = row.querySelector('.wow-sub');
  row._ilvl = row.querySelector('.wow-ilvl');

  // Ein Avatar, den der Proxy nicht liefern kann, faellt auf das Namenskuerzel
  // zurueck — so bleibt die Bildspalte ueber alle Zeilen gleich breit.
  row._img.addEventListener('error', () => { row._img.style.display = 'none'; });

  const open = () => {
    const c = row._item;
    if (c && c.ok !== false) openWowDetail(c);
  };
  row.addEventListener('click', open);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  return row;
}

function _wowUpdateRow(row, c, prev) {
  row._item = c;
  const reachable = c.ok !== false;

  // Nur erreichbare Zeilen sind anklickbar; nicht erreichbare werden grau
  // dargestellt und tragen ein Ersatz-Label statt Spec/Level.
  if (!prev || (prev.ok !== false) !== reachable) {
    row.classList.toggle('wow-unreachable', !reachable);
    row.setAttribute('role', reachable ? 'button' : 'presentation');
    if (reachable) row.tabIndex = 0; else row.removeAttribute('tabindex');
    row.classList.toggle('wow-clickable', reachable);
  }

  // Name in Klassenfarbe (classColor ist ein vom Backend kontrollierter Hex —
  // dennoch als style-Property gesetzt, nie per innerHTML).
  if (!prev || prev.name !== c.name || prev.realm !== c.realm) {
    row._name.textContent = c.name || '';
    row.title = c.realm ? `${c.name} · ${c.realm}` : (c.name || '');
    row._fallback.textContent = String(c.name || '?').slice(0, 2).toUpperCase();
  }
  if (!prev || prev.classColor !== c.classColor || (prev.ok !== false) !== reachable) {
    // Bei nicht erreichbaren Zeilen faerbt die CSS-Klasse grau — dann keinen
    // Klassenfarb-Override setzen.
    row._name.style.color = (reachable && c.classColor) ? c.classColor : '';
  }

  // Unterzeile: Spec/Level bzw. „nicht erreichbar".
  const sub = reachable ? wowSubline(c) : 'nicht erreichbar';
  if (row._sub.textContent !== sub) row._sub.textContent = sub;

  // iLvl-Badge nur, wenn Option an UND Wert vorhanden UND erreichbar.
  const showIlvl = _cfgVal('wow', 'showIlvl') !== false;
  const hasIlvl = reachable && showIlvl && Number.isFinite(Number(c.ilvlEquipped));
  const ilvlText = hasIlvl ? `iLvl ${c.ilvlEquipped}` : '';
  if (row._ilvl.textContent !== ilvlText) row._ilvl.textContent = ilvlText;
  row._ilvl.style.display = ilvlText ? '' : 'none';

  // Avatar setzen (Property, nie innerHTML). Nicht erreichbare Zeilen haben
  // keine avatarUrl → Kuerzel zeigen.
  if (!prev || prev.avatarUrl !== c.avatarUrl) {
    if (reachable && c.avatarUrl) {
      row._img.style.display = '';
      row._img.src = c.avatarUrl;
    } else {
      row._img.style.display = 'none';
      row._img.removeAttribute('src');
    }
  }
}

/* ---------- Rendern ---------- */

function setWowEmpty(text) {
  const el = $('wowEmpty');
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? '' : 'none';
}

function renderWow(d) {
  // Fehler-Payloads (ok:false) nicht ueber gute Daten schreiben, sonst blinkt
  // die Kachel bei einem Fehl-Tick. not_configured und ok:true sind gueltige,
  // uebernehmbare Zustaende.
  if (d && (d.ok || d.error === 'not_configured')) _wowData = d;
  else if (d && !_wowData) _wowData = d;

  applyWowLayout();

  const badge = $('wowBadge');
  const list = $('wowList');
  const data = _wowData;

  if (!data || !data.ok) {
    const notCfg = data && data.error === 'not_configured';
    if (badge) {
      badge.textContent = notCfg ? 'nicht eingerichtet' : (data ? 'offline' : '…');
      badge.style.color = notCfg ? 'var(--text-3)' : 'var(--red)';
      badge.title = notCfg
        ? 'Einstellungen → Module → WoW-Charaktere'
        : (data && data.message) || '';
    }
    if (list) diffList(list, [], (i) => i.key, _wowCreateRow, _wowUpdateRow);
    setWowEmpty(notCfg
      ? 'Noch nicht eingerichtet — Einstellungen → Module → WoW-Charaktere.'
      : data ? 'Battle.net ist gerade nicht erreichbar.' : 'Wird geladen …');
    return;
  }

  const all = data.characters || [];
  const items = _cfgLimit('wow', 'maxRows', all);
  if (list) diffList(list, items, (i) => i.key, _wowCreateRow, _wowUpdateRow);
  setWowEmpty(all.length
    ? ''
    : 'Noch keine Charaktere — in den Einstellungen hinzufügen.');

  if (badge) {
    const reachable = all.filter((c) => c.ok !== false).length;
    const stale = data._stale;
    badge.textContent = stale ? 'stale' : `${reachable}/${all.length}`;
    badge.style.color = stale ? '#ffb454'
      : (reachable === all.length ? 'var(--text-3)' : '#ffb454');
    badge.title = stale
      ? 'Letzter bekannter Stand — Battle.net gerade nicht erreichbar.'
      : (reachable < all.length ? `${all.length - reachable} nicht erreichbar` : '');
  }
}

// REST-Fallback: greift ohne SSE-Stream und nach einer Options-Aenderung.
async function pollWow() {
  if (!state.liveOn || !widgetOnActivePage('wow')) return;
  try { renderWow(await fetch('/api/wow', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* Anzeige bleibt auf dem letzten Stand */ }
}

/* ============================================================================
   Detailfenster (Klick auf eine erreichbare Zeile)
   ----------------------------------------------------------------------------
   .picker-modal-Muster wie tmdb-xrel: build/open/close inkl. ESC + Klick
   ausserhalb + Fokus-Rueckgabe. Die sechs Bloecke werden erst beim Oeffnen aus
   GET /api/wow/detail?realm=&name= geholt.
   ============================================================================ */

function _buildWowDetailModal() {
  const modal = document.createElement('div');
  modal.id = 'wowDetailModal';
  modal.className = 'picker-modal';
  modal.innerHTML =
    '<div class="picker-panel" style="width:min(680px,100%)">'
    + '<div class="picker-head">'
    + '<span class="picker-title" id="wowDetailTitle">Charakter</span>'
    + '<button class="picker-close" title="Schließen" aria-label="Schließen">✕</button>'
    + '</div>'
    + '<div class="wow-detail-body">'
    + '<div id="wowDetailStatus" class="wow-detail-status"></div>'
    + '<div id="wowDetailContent" class="wow-detail-content" style="display:none">'
    // Block 1: grosser Render
    + '<div class="wow-detail-render"><img id="wowDetailRender" alt=""></div>'
    // Block 2: Stammdaten
    + '<div class="wow-detail-block"><div class="cfg-section">Stammdaten</div>'
    + '<div id="wowDetailStamm" class="wow-detail-grid"></div></div>'
    // Block 3: Ausruestung
    + '<div class="wow-detail-block"><div class="cfg-section">Ausrüstung</div>'
    + '<div id="wowDetailEquip" class="wow-detail-equip"></div></div>'
    // Block 4: Mythic+
    + '<div class="wow-detail-block"><div class="cfg-section">Mythic+ Rating</div>'
    + '<div id="wowDetailMythic" class="wow-detail-mythic"></div></div>'
    // Block 5: Raid-Fortschritt
    + '<div class="wow-detail-block"><div class="cfg-section">Raid-Fortschritt</div>'
    + '<div id="wowDetailRaids" class="wow-detail-raids"></div></div>'
    // Block 6: Berufe
    + '<div class="wow-detail-block"><div class="cfg-section">Berufe</div>'
    + '<div id="wowDetailProfs" class="wow-detail-profs"></div></div>'
    + '</div>'
    + '</div>'
    + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeWowDetail(); });
  modal.querySelector('.picker-close').addEventListener('click', closeWowDetail);
  const render = modal.querySelector('#wowDetailRender');
  render.addEventListener('error', () => { render.style.display = 'none'; });
  document.addEventListener('keydown', (e) => {
    if (_wowDetail && e.key === 'Escape') closeWowDetail();
  });
  document.body.appendChild(modal);
  return modal;
}

async function openWowDetail(seed) {
  const modal = $('wowDetailModal') || _buildWowDetailModal();
  const key = seed.key;
  _wowDetail = key;
  _wowLastFocus = document.activeElement;

  // Titel schon aus der Zeile fuellen (der Detail-Call verifiziert danach).
  setText('wowDetailTitle', seed.realm ? `${seed.name} · ${seed.realm}` : (seed.name || 'Charakter'));
  const content = $('wowDetailContent');
  if (content) content.style.display = 'none';
  setText('wowDetailStatus', 'Wird geladen …');

  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.classList.add('open');
    const close = modal.querySelector('.picker-close');
    if (close) close.focus();
  });

  // Realm-Slug + Name gehen als Query-Parameter (encodeURIComponent) — das
  // Backend validiert beide noch einmal streng.
  const realm = encodeURIComponent(seed.realmSlug || seed.realm || '');
  const name = encodeURIComponent(seed.name || '');
  try {
    const d = await fetch(`/api/wow/detail?realm=${realm}&name=${name}`, { cache: 'no-store' })
      .then((r) => r.json());
    // Zwischenzeitlich geschlossen oder ein anderer Charakter geoeffnet.
    if (_wowDetail !== key) return;
    wowFillDetail(d);
  } catch {
    if (_wowDetail === key) setText('wowDetailStatus', 'Die Detaildaten konnten nicht geladen werden.');
  }
}

// Kleiner Helfer: eine Definitionszeile (Label + Wert) fuer das Stammdaten-Grid.
function _wowDefRow(label, value) {
  if (value == null || value === '') return null;
  const wrap = document.createElement('div');
  wrap.className = 'wow-def';
  const l = document.createElement('span');
  l.className = 'wow-def-label';
  l.textContent = label;
  const v = document.createElement('span');
  v.className = 'wow-def-val';
  v.textContent = String(value);
  wrap.append(l, v);
  return wrap;
}

function wowFillDetail(d) {
  const status = $('wowDetailStatus');
  const content = $('wowDetailContent');
  if (!status || !content) return;

  if (!d || !d.ok || !d.character) {
    content.style.display = 'none';
    status.textContent = d && d.error === 'not_found'
      ? 'Dieser Charakter wurde bei Battle.net nicht gefunden.'
      : 'Die Detaildaten konnten nicht geladen werden.';
    return;
  }

  const c = d.character;
  status.textContent = '';
  content.style.display = '';

  // --- Block 1: grosser Render ---
  const render = $('wowDetailRender');
  if (render) {
    if (c.renderUrl) { render.style.display = ''; render.src = c.renderUrl; }
    else { render.style.display = 'none'; render.removeAttribute('src'); }
  }

  // --- Block 2: Stammdaten ---
  const stamm = $('wowDetailStamm');
  const s = c.stammdaten || {};
  if (stamm) {
    stamm.textContent = '';
    const ilvl = (s.ilvlEquipped != null || s.ilvlAverage != null)
      ? [s.ilvlEquipped != null ? `${s.ilvlEquipped} angelegt` : null,
         s.ilvlAverage != null ? `${s.ilvlAverage} gesamt` : null].filter(Boolean).join(' · ')
      : null;
    const rows = [
      _wowDefRow('Rasse', s.race),
      _wowDefRow('Klasse', s.className),
      _wowDefRow('Spezialisierung', s.spec),
      _wowDefRow('Level', Number.isFinite(Number(s.level)) ? s.level : null),
      _wowDefRow('Fraktion', s.faction ? wowFaction(s.faction) : null),
      _wowDefRow('Gilde', s.guild),
      _wowDefRow('Titel', s.title),
      _wowDefRow('Realm', s.realm),
      _wowDefRow('Letzter Login', wowLastLogin(s.lastLogin)),
      _wowDefRow('Item-Level', ilvl),
    ].filter(Boolean);
    for (const r of rows) stamm.appendChild(r);
    // Klasse in Klassenfarbe hervorheben (Property, nie innerHTML).
    if (s.classColor) {
      const klasse = rows.find((r) => r.querySelector('.wow-def-label').textContent === 'Klasse');
      if (klasse) klasse.querySelector('.wow-def-val').style.color = s.classColor;
    }
    if (!rows.length) stamm.textContent = 'Keine Stammdaten verfügbar.';
  }

  // --- Block 3: Ausruestung (Item-Name in Qualitaetsfarbe + iLvl je Item) ---
  const equip = $('wowDetailEquip');
  if (equip) {
    equip.textContent = '';
    const items = Array.isArray(c.equipment) ? c.equipment : [];
    if (!items.length) {
      equip.textContent = 'Keine Ausrüstung verfügbar.';
    } else {
      for (const it of items) {
        const row = document.createElement('div');
        row.className = 'wow-equip-row';
        const slot = document.createElement('span');
        slot.className = 'wow-equip-slot';
        slot.textContent = it.slot || '';
        const name = document.createElement('span');
        name.className = 'wow-equip-name';
        name.textContent = it.name || '';
        if (it.qualityColor) name.style.color = it.qualityColor;
        const lvl = document.createElement('span');
        lvl.className = 'wow-equip-ilvl';
        lvl.textContent = Number.isFinite(Number(it.ilvl)) ? String(it.ilvl) : '';
        row.append(slot, name, lvl);
        equip.appendChild(row);
      }
    }
  }

  // --- Block 4: Mythic+ Rating ---
  const mythic = $('wowDetailMythic');
  if (mythic) {
    const rating = c.mythic && c.mythic.rating != null ? c.mythic.rating : null;
    mythic.textContent = rating != null ? String(rating) : '— (keine Wertung in dieser Saison)';
  }

  // --- Block 5: Raid-Fortschritt (Instanzen der aktuellen Erweiterung) ---
  const raids = $('wowDetailRaids');
  if (raids) {
    raids.textContent = '';
    const r = c.raids || {};
    const instances = Array.isArray(r.instances) ? r.instances : [];
    if (!instances.length) {
      raids.textContent = 'Kein Raid-Fortschritt verfügbar.';
    } else {
      if (r.expansion) {
        const exp = document.createElement('div');
        exp.className = 'wow-raid-exp';
        exp.textContent = r.expansion;
        raids.appendChild(exp);
      }
      for (const inst of instances) {
        const row = document.createElement('div');
        row.className = 'wow-raid-row';
        const iname = document.createElement('span');
        iname.className = 'wow-raid-name';
        iname.textContent = inst.name || '';
        const modes = document.createElement('span');
        modes.className = 'wow-raid-modes';
        // Je Schwierigkeit „7/8 HC" — der difficulty-Name wird gekuerzt.
        modes.textContent = (Array.isArray(inst.modes) ? inst.modes : [])
          .filter((m) => m && (m.total || m.completed))
          .map((m) => `${m.completed}/${m.total} ${m.difficulty || ''}`.trim())
          .join('  ·  ');
        row.append(iname, modes);
        raids.appendChild(row);
      }
    }
  }

  // --- Block 6: Berufe (Haupt-/Nebenberufe mit Skill-Stand) ---
  const profs = $('wowDetailProfs');
  if (profs) {
    profs.textContent = '';
    const p = c.professions || {};
    const all = [].concat(
      Array.isArray(p.primaries) ? p.primaries : [],
      Array.isArray(p.secondaries) ? p.secondaries : [],
    );
    if (!all.length) {
      profs.textContent = 'Keine Berufe erlernt.';
    } else {
      for (const prof of all) {
        const row = document.createElement('div');
        row.className = 'wow-prof-row';
        const name = document.createElement('span');
        name.className = 'wow-prof-name';
        name.textContent = prof.name || '';
        const skill = document.createElement('span');
        skill.className = 'wow-prof-skill';
        // Number(null) waere 0 und damit faelschlich „finite" — deshalb erst auf
        // vorhandene Werte pruefen, sonst zeigt ein Beruf ohne Skill „null/null".
        const hasSkill = prof.skill != null && prof.max != null
          && Number.isFinite(Number(prof.skill)) && Number.isFinite(Number(prof.max));
        skill.textContent = hasSkill
          ? `${prof.skill}/${prof.max}${prof.tier ? ` · ${prof.tier}` : ''}`
          : (prof.tier || '');
        row.append(name, skill);
        profs.appendChild(row);
      }
    }
  }
}

function closeWowDetail() {
  const modal = $('wowDetailModal');
  _wowDetail = null;
  if (!modal) return;
  modal.classList.remove('open');
  setTimeout(() => { modal.style.display = 'none'; }, 180);
  if (_wowLastFocus && typeof _wowLastFocus.focus === 'function') _wowLastFocus.focus();
  _wowLastFocus = null;
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'wow',
  label: 'WoW-Charaktere',
  section: 'media',
  defaultSize: { w: 4, h: 6 },
  minSize: { w: 3, h: 4 },

  event: 'wow',
  handler: renderWow,
  // renderWow() traegt die Darstellungs-Optionen mit auf die Liste — eine reine
  // Design-Aenderung wirkt damit sofort, auch ohne frische Daten.
  refresh: () => { renderWow(null); pollWow(); },

  template: () => `
    <div class="tile">
      <div class="tile-head">
        <span data-tile-title>WoW-Charaktere</span>
        <span id="wowBadge" class="tile-badge"></span>
      </div>
      <div id="wowList" class="tile-list wow-list"></div>
      <div id="wowEmpty" class="wow-empty" style="display:none"></div>
    </div>`,

  options: [
    { key: 'maxRows', label: 'Max. Charaktere', type: 'count', default: 0, group: 'Auswahl' },
    { key: 'showIlvl', label: 'Item-Level anzeigen', type: 'toggle', default: true, filter: true, group: 'Anzeige' },
    { key: 'textSize', label: 'Schriftgröße', type: 'select', default: 'm', options: WOW_SIZES, group: 'Darstellung' },
    { key: 'spacing', label: 'Abstand', type: 'select', default: 'normal', options: WOW_SPACINGS, group: 'Darstellung' },
  ],

  settings: {
    badge: 'WoW', color: '#f4c430',
    statusEl: 'wowSettingsStatus',
    load: loadWowSettings,
  },
});

/* ============================================================================
   Einstellungen (Settings → Module → WoW-Charaktere)
   ----------------------------------------------------------------------------
   Das Panel baut sich komplett selbst. Die Tab-Huelle steht — anders als bei
   den aelteren Modulen — NICHT in index.html; sie wird hier beim ersten Oeffnen
   als Geschwister von #categoryGrid erzeugt (index.html/app.js bleiben
   unangetastet). Zwei Abschnitte:
     1. Zugangsdaten: BLIZZARD_CLIENT_ID/_SECRET/_REGION ueber /api/secrets
        (Muster tmdb-xrel: maskierte Werte '***', readOnly wenn aus _env).
     2. Charakterverwaltung: Realm-Dropdown (/api/wow/realms), Name-Feld,
        „Prüfen & Hinzufügen" (POST /api/wow/add), Liste (GET /api/wow/config)
        mit Entfernen je Eintrag (POST /api/wow/remove).
   ============================================================================ */

const WOW_SECRETS = [
  { key: 'BLIZZARD_CLIENT_ID', label: 'Battle.net Client-ID', type: 'text' },
  { key: 'BLIZZARD_CLIENT_SECRET', label: 'Battle.net Client-Secret', type: 'password' },
  { key: 'BLIZZARD_REGION', label: 'Region (eu/us/kr/tw, Default eu)', type: 'text' },
];

let _wowRealms = null;  // Realm-Index (lang gecacht), fuer das Dropdown

function setWowStatus(text, color) {
  const el = $('wowSettingsStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

// Sorgt dafuer, dass die Tab-Huelle im Settings-Baum existiert und aktiv ist.
// selectTab() in app.js schaltet .active nur auf bereits vorhandene .tab-Knoten;
// unseren erzeugen wir hier und markieren ihn selbst aktiv.
function _ensureWowTab() {
  let tab = document.querySelector('.tab[data-tab="wow"]');
  if (!tab) {
    // Die Tabs sind Geschwister von #categoryGrid im Settings-Inhaltsbereich.
    const grid = $('categoryGrid');
    const host = grid && grid.parentElement;
    if (!host) return null;
    tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tab = 'wow';
    // Kopfzeile analog zu den anderen Modul-Tabs (Badge + Status), danach der
    // Body, den loadWowSettings() fuellt.
    tab.innerHTML =
      '<div class="cfg-row">'
      + '<div style="display:flex;align-items:center;gap:10px;flex-shrink:0">'
      + '<span style="font:700 11px \'JetBrains Mono\',monospace;color:#f4c430;min-width:22px;'
      + 'background:rgba(244,196,48,0.1);border-radius:4px;padding:2px 5px;text-align:center">WoW</span>'
      + '<div><div class="cfg-key">WoW-Charaktere</div>'
      + '<div style="font:500 10px \'JetBrains Mono\',monospace;color:var(--text-dim);margin-top:2px">'
      + 'Blizzard Battle.net · Profil-Kacheln</div></div></div>'
      + '<span id="wowSettingsStatus" style="font:500 11px \'JetBrains Mono\',monospace;color:var(--text-status)">● –</span>'
      + '</div>'
      + '<div id="wowSettingsBody"></div>';
    host.appendChild(tab);
  }
  // Diesen Tab aktiv schalten (die uebrigen hat selectTab bereits deaktiviert).
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  return tab;
}

async function loadWowSettings() {
  const tab = _ensureWowTab();
  if (!tab) return;
  const body = $('wowSettingsBody');
  if (!body) return;
  body.innerHTML = '';
  setWowStatus('● lädt …', 'var(--text-3)');

  // Zugangsdaten und gespeicherte Charakterliste parallel holen. Der Realm-
  // Index kommt erst beim Bau des Dropdowns (er braucht gueltige Zugangsdaten).
  let secrets = {};
  let config = { characters: [] };
  try {
    [secrets, config] = await Promise.all([
      fetch('/api/secrets', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/wow/config', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ characters: [] })),
    ]);
  } catch {
    body.textContent = 'Zugangsdaten konnten nicht geladen werden.';
    setWowStatus('● Fehler', '#f43f5e');
    return;
  }

  renderWowSecrets(body, secrets);
  renderWowCharacters(body, (config && config.characters) || []);
  wowRefreshStatus();
}

/* ---------- Abschnitt 1: Zugangsdaten (Muster tmdb-xrel) ---------- */

function renderWowSecrets(body, secrets) {
  const fromEnv = new Set(secrets._env || []);

  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Zugangsdaten';
  body.appendChild(head);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';
  const inputs = [];
  for (const s of WOW_SECRETS) {
    const input = document.createElement('input');
    input.className = 'cfg-input';
    input.type = s.type;
    input.placeholder = s.label;
    input.autocomplete = 'off';
    input.value = secrets[s.key] || '';
    // Per Umgebungsvariable gesetzte Werte haben Vorrang — das Feld sagt es.
    if (fromEnv.has(s.key)) {
      input.readOnly = true;
      input.title = `${s.key} kommt aus der Umgebung und hat Vorrang`;
      input.style.opacity = '.6';
    }
    inputs.push({ ...s, input });
    row.appendChild(input);
  }

  const save = document.createElement('button');
  save.className = 'cfg-btn';
  save.textContent = '↵ Speichern';
  save.addEventListener('click', async () => {
    const payload = {};
    // '***' ist der Maskierungs-Platzhalter fuer bereits gesetzte Secrets — der
    // Server ignoriert ihn beim Speichern (kein readOnly-Feld mitschicken).
    for (const s of inputs) if (!s.input.readOnly) payload[s.key] = s.input.value.trim();
    setWowStatus('● speichert …', 'var(--text-3)');
    try {
      const r = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // Der Server leert dabei alle Caches; danach die Ansichten neu laden.
      _wowRealms = null; // Region kann sich geaendert haben → Dropdown neu holen
      await loadWowSettings();
      pollWow();
    } catch (err) {
      console.error('WoW-Zugangsdaten konnten nicht gespeichert werden:', err.message);
      setWowStatus('● Fehler', '#f43f5e');
    }
  });
  row.appendChild(save);
  body.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'tile-settings-hint';
  hint.style.lineHeight = '1.7';
  // Statischer Text, keine Fremddaten.
  hint.innerHTML = 'Auf '
    + '<a href="https://develop.battle.net" target="_blank" rel="noopener noreferrer">develop.battle.net</a>'
    + ' einen Client anlegen und <b>Client-ID</b> + <b>Client-Secret</b> hier eintragen. '
    + 'Die <b>Region</b> ist optional (Default <code>eu</code>; erlaubt: eu/us/kr/tw). '
    + 'Erst wenn ID und Secret stehen, spricht die Kachel mit Battle.net.';
  body.appendChild(hint);
}

/* ---------- Abschnitt 2: Charakterverwaltung ---------- */

function renderWowCharacters(body, characters) {
  const head = document.createElement('div');
  head.className = 'cfg-section';
  head.textContent = 'Charaktere';
  body.appendChild(head);

  // --- Hinzufuegen: Realm-Dropdown + Name + Button ---
  const add = document.createElement('div');
  add.className = 'news-cfg-add';

  const realmSel = document.createElement('select');
  realmSel.className = 'cfg-input';
  realmSel.style.flex = '1 1 200px';
  const loading = document.createElement('option');
  loading.value = '';
  loading.textContent = 'Realm wird geladen …';
  realmSel.appendChild(loading);
  realmSel.disabled = true;

  const nameInput = document.createElement('input');
  nameInput.className = 'cfg-input';
  nameInput.placeholder = 'Charaktername';
  nameInput.autocomplete = 'off';

  const addBtn = document.createElement('button');
  addBtn.className = 'cfg-btn';
  addBtn.textContent = 'Prüfen & Hinzufügen';

  const doAdd = async () => {
    const realm = realmSel.value;
    const name = nameInput.value.trim();
    if (!realm) { setWowStatus('● Realm wählen', '#ffb454'); return; }
    if (!name) { setWowStatus('● Name eingeben', '#ffb454'); return; }
    addBtn.disabled = true;
    setWowStatus('● prüft …', 'var(--text-3)');
    try {
      const r = await fetch('/api/wow/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realm, name }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d && d.ok) {
        nameInput.value = '';
        // Frische Liste zeichnen und die Kachel nachziehen.
        renderWowCharList((d.characters) || []);
        setWowStatus(d.already ? '● bereits in der Liste' : '● hinzugefügt', '#3ddc97');
        pollWow();
      } else if (r.status === 404 || (d && d.error === 'not_found')) {
        setWowStatus('● Charakter nicht gefunden', '#f43f5e');
      } else if (r.status === 400 || (d && (d.error === 'bad_input' || d.error === 'too_many'))) {
        setWowStatus(d && d.error === 'too_many' ? '● Maximum erreicht' : '● Eingabe ungültig', '#f43f5e');
      } else {
        setWowStatus('● Prüfung fehlgeschlagen', '#f43f5e');
      }
    } catch (err) {
      console.error('WoW-Charakter konnte nicht hinzugefügt werden:', err.message);
      setWowStatus('● Fehler', '#f43f5e');
    } finally {
      addBtn.disabled = false;
    }
  };
  addBtn.addEventListener('click', doAdd);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });

  add.append(realmSel, nameInput, addBtn);
  body.appendChild(add);

  // --- Liste der gespeicherten Charaktere ---
  const list = document.createElement('div');
  list.id = 'wowCharList';
  list.className = 'wow-cfg-list';
  body.appendChild(list);
  renderWowCharList(characters);

  // Realm-Index nachladen und das Dropdown fuellen (braucht Zugangsdaten).
  fillWowRealms(realmSel);
}

// Zeichnet die gespeicherte Charakterliste mit Entfernen-Button je Eintrag.
function renderWowCharList(characters) {
  const list = $('wowCharList');
  if (!list) return;
  list.textContent = '';
  const arr = Array.isArray(characters) ? characters : [];
  if (!arr.length) {
    const empty = document.createElement('div');
    empty.className = 'news-cfg-empty';
    empty.textContent = 'Noch keine Charaktere — oben Realm und Name eingeben.';
    list.appendChild(empty);
    return;
  }
  for (const c of arr) {
    const row = document.createElement('div');
    row.className = 'news-cfg-row';

    const info = document.createElement('div');
    info.className = 'news-cfg-info';
    const name = document.createElement('div');
    name.className = 'news-cfg-name';
    name.textContent = c.name || '';   // Fremddaten → textContent
    const url = document.createElement('div');
    url.className = 'news-cfg-url';
    url.textContent = c.realm || '';    // Realm-Slug
    info.append(name, url);

    const actions = document.createElement('div');
    actions.className = 'news-cfg-actions';
    const del = document.createElement('button');
    del.className = 'cfg-btn cfg-btn-del';
    del.textContent = '×';
    del.title = 'Charakter entfernen';
    del.addEventListener('click', async () => {
      del.disabled = true;
      setWowStatus('● entfernt …', 'var(--text-3)');
      try {
        const r = await fetch('/api/wow/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ realm: c.realm, name: c.name }),
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d && d.ok) {
          renderWowCharList(d.characters || []);
          setWowStatus('● entfernt', '#3ddc97');
          pollWow();
        } else {
          setWowStatus('● Entfernen fehlgeschlagen', '#f43f5e');
          del.disabled = false;
        }
      } catch (err) {
        console.error('WoW-Charakter konnte nicht entfernt werden:', err.message);
        setWowStatus('● Fehler', '#f43f5e');
        del.disabled = false;
      }
    });
    actions.appendChild(del);

    row.append(info, actions);
    list.appendChild(row);
  }
}

// Realm-Dropdown fuellen. Der Index wird nach dem ersten Laden im Modul
// gecacht (er aendert sich fast nie); ohne gueltige Zugangsdaten meldet das
// Backend einen Fehler — das Feld sagt es dann.
async function fillWowRealms(sel) {
  const apply = (realms) => {
    sel.textContent = '';
    const first = document.createElement('option');
    first.value = '';
    first.textContent = realms.length ? 'Realm wählen …' : 'Keine Realms geladen';
    sel.appendChild(first);
    for (const r of realms) {
      if (!r || !r.slug) continue;
      const o = document.createElement('option');
      o.value = r.slug;                 // Slug ist der API-Schluessel
      o.textContent = r.name || r.slug; // Realm-Name ist Fremddaten → textContent
      sel.appendChild(o);
    }
    sel.disabled = realms.length === 0;
  };

  if (_wowRealms) { apply(_wowRealms); return; }
  try {
    const d = await fetch('/api/wow/realms', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok && Array.isArray(d.realms)) {
      _wowRealms = d.realms;
      apply(d.realms);
    } else {
      sel.textContent = '';
      const o = document.createElement('option');
      o.value = '';
      o.textContent = 'Realms nicht ladbar — Zugangsdaten prüfen';
      sel.appendChild(o);
      sel.disabled = true;
    }
  } catch {
    sel.textContent = '';
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Realms nicht erreichbar';
    sel.appendChild(o);
    sel.disabled = true;
  }
}

// Sagt, ob die Zugangsdaten tatsaechlich tragen — analog tmdb-xrel: ein Blick
// auf die aktuelle Kachel-Payload genuegt.
async function wowRefreshStatus() {
  try {
    const d = await fetch('/api/wow', { cache: 'no-store' }).then((r) => r.json());
    if (d && d.ok) {
      const all = d.characters || [];
      const reachable = all.filter((c) => c.ok !== false).length;
      setWowStatus(all.length ? `● ${reachable}/${all.length} erreichbar` : '● keine Charaktere',
        all.length ? '#3ddc97' : '#ffb454');
    } else if (d && d.error === 'not_configured') {
      setWowStatus('● nicht eingerichtet', '#ffb454');
    } else {
      setWowStatus('● Battle.net antwortet nicht', '#f43f5e');
    }
  } catch {
    setWowStatus('● Fehler', '#f43f5e');
  }
}
