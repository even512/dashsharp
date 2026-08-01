'use strict';

/* ============================================================
   Claude — Chat-Kachel (Frontend)
   ------------------------------------------------------------
   Die ganze Konversation lebt in der Kachel: mehrere Threads,
   Modell-Wechsel pro Thread und Streaming-Antworten.

   Der periodische SSE-Push (renderClaude) hält Status und
   Thread-Liste aktuell. Der eigentliche Chat läuft über einen
   eigenen Streaming-Endpoint (/api/claude/chat), nicht über den
   Push.

   Fremdtext (Nutzer wie Claude) wird grundsätzlich escaped. Der
   Markdown-Renderer setzt nur eine feste, sichere Menge an Tags —
   kein rohes innerHTML mit Modell-Ausgabe.
   ============================================================ */

// Modul-weiter Zustand (die Kachel existiert einmal pro Dashboard).
const CL = {
  connected: false,
  configured: false,
  threads: [],
  models: [],
  defaultModel: null,
  activeId: null,
  sending: false,
};

/* ---------- Helfer ---------- */

function clRoot() { return document.querySelector('[data-widget-id="claude"] .claude-tile'); }
function clq(sel) { const r = clRoot(); return r ? r.querySelector(sel) : null; }

/* ---------- Markdown → sicheres HTML ----------
   Fenced-Code-Blöcke werden vor dem Escapen herausgelöst und als Platzhalter
   ersetzt, dann der Rest escaped und formatiert, dann die Code-Blöcke escaped
   wieder eingesetzt. So kann nichts aus der Modell-Ausgabe als Markup wirken. */

function renderMarkdown(src) {
  const text = String(src == null ? '' : src);
  const codeBlocks = [];
  // ```lang\n ... ```
  let s = text.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length;
    codeBlocks.push({ lang: String(lang || '').trim(), code });
    return ` CODE${i} `;
  });

  s = esc(s); // ab hier ist alles escaped

  // Inline-Code `x`
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code class="claude-code-inline">${c}</code>`);
  // Fett **x**  und Kursiv *x* / _x_
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  // Links [text](http…) — nur http/https zulassen, text ist bereits escaped
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (_, txt, url) =>
    `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${txt}</a>`);

  // Blockweise: Überschriften, Listen, Absätze
  const lines = s.split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) {
      closeList();
      const lvl = Math.min(4, m[1].length) + 2; // h3..h6
      out.push(`<h${lvl}>${m[2]}</h${lvl}>`);
    } else if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      if (list !== 'ul') { closeList(); list = 'ul'; out.push('<ul>'); }
      out.push(`<li>${m[1]}</li>`);
    } else if ((m = /^\s*\d+\.\s+(.*)$/.exec(line))) {
      if (list !== 'ol') { closeList(); list = 'ol'; out.push('<ol>'); }
      out.push(`<li>${m[1]}</li>`);
    } else if (/^\s*CODE\d+\s*$/.test(line)) {
      // Eigenständige Code-Block-Zeile: nicht in <p> wickeln (Platzhalter wird
      // später durch das <div.claude-code> ersetzt).
      closeList();
      out.push(line.trim());
    } else if (line.trim() === '') {
      closeList();
      out.push('');
    } else {
      closeList();
      out.push(`<p>${line}</p>`);
    }
  }
  closeList();
  let html = out.join('\n');

  // Code-Blöcke wieder einsetzen (Inhalt escaped, mit Kopier-Button).
  html = html.replace(/ CODE(\d+) /g, (_, i) => {
    const b = codeBlocks[Number(i)];
    if (!b) return '';
    return `<div class="claude-code"><button class="claude-copy" data-claude="copy" type="button">Kopieren</button>`
      + `<pre><code>${esc(b.code.replace(/\n$/, ''))}</code></pre></div>`;
  });
  return html;
}

/* ---------- Nachrichten rendern ---------- */

function messagesEl() { return clq('[data-claude-messages]'); }

function addBubble(role, html, isMarkdown) {
  const box = messagesEl();
  if (!box) return null;
  const row = document.createElement('div');
  row.className = `claude-bubble claude-${role}`;
  const body = document.createElement('div');
  body.className = 'claude-md';
  if (isMarkdown) body.innerHTML = html; else body.textContent = html;
  row.appendChild(body);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  return body;
}

function renderThreadMessages(messages) {
  const box = messagesEl();
  if (!box) return;
  box.innerHTML = '';
  if (!messages || !messages.length) {
    const hint = document.createElement('div');
    hint.className = 'claude-empty';
    hint.textContent = 'Stell deine erste Frage.';
    box.appendChild(hint);
    return;
  }
  for (const m of messages) {
    addBubble(m.role, m.role === 'assistant' ? renderMarkdown(m.content) : m.content, m.role === 'assistant');
  }
}

/* ---------- Threads / Modelle ---------- */

function activeThread() { return CL.threads.find((t) => t.id === CL.activeId) || null; }

function currentModelLabel() {
  const t = activeThread();
  const id = (t && t.model) || CL.defaultModel;
  const m = CL.models.find((x) => x.id === id);
  return m ? m.label : (id || 'Modell');
}

function renderMenus() {
  // Thread-Menü
  const tm = clq('[data-claude-menu="threads"]');
  if (tm) {
    tm.innerHTML = '';
    const add = document.createElement('button');
    add.className = 'claude-menu-item claude-menu-new';
    add.dataset.claude = 'new-thread';
    add.textContent = '+ Neue Unterhaltung';
    tm.appendChild(add);
    for (const t of CL.threads) {
      const row = document.createElement('div');
      row.className = 'claude-menu-item claude-thread-row' + (t.id === CL.activeId ? ' active' : '');
      const open = document.createElement('button');
      open.className = 'claude-thread-open';
      open.dataset.claude = 'open-thread';
      open.dataset.id = t.id;
      open.textContent = t.title || 'Unterhaltung';
      const del = document.createElement('button');
      del.className = 'claude-thread-del';
      del.dataset.claude = 'del-thread';
      del.dataset.id = t.id;
      del.textContent = '✕';
      del.title = 'Löschen';
      row.appendChild(open);
      row.appendChild(del);
      tm.appendChild(row);
    }
  }
  // Modell-Menü
  const mm = clq('[data-claude-menu="model"]');
  if (mm) {
    mm.innerHTML = '';
    const curId = (activeThread() && activeThread().model) || CL.defaultModel;
    for (const m of CL.models) {
      const b = document.createElement('button');
      b.className = 'claude-menu-item' + (m.id === curId ? ' active' : '');
      b.dataset.claude = 'set-model';
      b.dataset.id = m.id;
      b.textContent = m.label;
      mm.appendChild(b);
    }
  }
  const lbl = clq('[data-claude-model]');
  if (lbl) lbl.textContent = currentModelLabel();
}

function closeMenus() {
  for (const el of document.querySelectorAll('.claude-menu')) el.hidden = true;
}

/* ---------- Netzwerk ---------- */

async function apiJson(url, opts) {
  const r = await fetch(url, opts);
  return r.json();
}

async function openThread(id) {
  CL.activeId = id;
  closeMenus();
  renderMenus();
  try {
    const d = await apiJson('/api/claude/thread/' + encodeURIComponent(id), { cache: 'no-store' });
    if (d && d.ok) renderThreadMessages(d.thread.messages);
  } catch { /* Anzeige bleibt */ }
}

async function newThread() {
  try {
    const model = CL.defaultModel || undefined;
    const d = await apiJson('/api/claude/threads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    if (d && d.ok) {
      CL.threads.unshift({ ...d.thread });
      CL.activeId = d.thread.id;
      renderMenus();
      renderThreadMessages([]);
    }
  } catch { /* nächster Push korrigiert */ }
  closeMenus();
}

async function deleteThread(id) {
  try {
    await apiJson('/api/claude/thread/' + encodeURIComponent(id), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
  } catch { /* egal */ }
  CL.threads = CL.threads.filter((t) => t.id !== id);
  if (CL.activeId === id) { CL.activeId = null; renderThreadMessages([]); }
  renderMenus();
}

async function setModel(id) {
  const t = activeThread();
  closeMenus();
  if (!t) { CL.defaultModel = id; renderMenus(); return; }
  t.model = id;
  renderMenus();
  try {
    await apiJson('/api/claude/thread/' + encodeURIComponent(t.id), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setModel', model: id }),
    });
  } catch { /* egal */ }
}

async function ensureThread() {
  if (activeThread()) return CL.activeId;
  await newThread();
  return CL.activeId;
}

async function send() {
  if (CL.sending) return;
  const input = clq('[data-claude-input]');
  const btn = clq('[data-claude-send]');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  if (!CL.configured) { setNotice('Nicht verbunden — Token in Einstellungen → Module setzen.', true); return; }

  const threadId = await ensureThread();
  if (!threadId) return;

  CL.sending = true;
  if (btn) btn.disabled = true;
  input.value = '';

  // leeren Platzhalter der neuen Unterhaltung entfernen
  const empty = clq('.claude-empty');
  if (empty) empty.remove();

  addBubble('user', text, false);
  const bubble = addBubble('assistant', '', false);
  if (bubble) bubble.classList.add('claude-streaming');
  let streamedRaw = '';

  try {
    const resp = await fetch('/api/claude/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId, message: text }),
    });
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx); buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === 'delta') {
          streamedRaw += ev.text || '';
          if (bubble) { bubble.textContent = streamedRaw; scrollMessages(); }
        } else if (ev.type === 'done') {
          const finalText = (ev.text && ev.text.trim()) ? ev.text : streamedRaw;
          if (bubble) { bubble.classList.remove('claude-streaming'); bubble.innerHTML = renderMarkdown(finalText); scrollMessages(); }
        } else if (ev.type === 'error') {
          if (bubble) { bubble.classList.remove('claude-streaming'); bubble.classList.add('claude-error'); }
          if (bubble) bubble.textContent = errorText(ev.message);
        }
      }
    }
  } catch (err) {
    if (bubble) { bubble.classList.remove('claude-streaming'); bubble.classList.add('claude-error'); bubble.textContent = 'Verbindung unterbrochen.'; }
  } finally {
    CL.sending = false;
    if (btn) btn.disabled = false;
  }
}

function errorText(code) {
  const c = String(code || '');
  if (c.startsWith('sdk_unavailable')) return 'Agent SDK nicht verfügbar — Abhängigkeit installieren / Image neu bauen.';
  if (c.startsWith('claude_error')) return 'Claude-Fehler (evtl. Limit erreicht oder Token abgelaufen): ' + c.replace(/^claude_error:\s*/, '');
  if (c === 'not_configured') return 'Nicht verbunden — Token in Einstellungen setzen.';
  if (c === 'thread_not_found') return 'Unterhaltung nicht gefunden.';
  return 'Fehler: ' + c;
}

function scrollMessages() { const b = messagesEl(); if (b) b.scrollTop = b.scrollHeight; }

function setNotice(text, show) {
  const n = clq('[data-claude-notice]');
  if (!n) return;
  n.textContent = text || '';
  n.hidden = !show;
}

/* ---------- Push-Handler (Status, Threads) ---------- */

function renderStatus() {
  const dot = clq('[data-claude-status]');
  if (!dot) return;
  if (!CL.configured) { dot.style.color = 'var(--red)'; dot.title = 'Nicht eingerichtet'; }
  else if (CL.connected) { dot.style.color = 'var(--green)'; dot.title = 'Verbunden'; }
  else { dot.style.color = '#ffb454'; dot.title = 'Token gesetzt, Verbindung fehlgeschlagen'; }
}

function renderClaude(d) {
  // Klick-/Keydown-Listener aufhaengen. Muss hier passieren (nicht nur in
  // refresh): im Push-Modus ruft der SSE-Hub nur den Handler (renderClaude) auf,
  // refresh() wird uebersprungen (_refreshActivePageWidgets bricht bei aktivem
  // Push frueh ab). Ohne das blieben Senden, Enter und die Menues tot.
  // wireClaude() ist idempotent (_clWired), Doppelaufruf ueber refresh schadet nicht.
  wireClaude();
  if (!clRoot()) return;
  if (!d || !d.ok) {
    CL.configured = false;
    CL.connected = false;
    renderStatus();
    setNotice(d && d.error === 'not_configured'
      ? 'Nicht verbunden — Abo-Token in Einstellungen → Module (Claude) setzen.'
      : 'Claude offline.', true);
    return;
  }
  CL.configured = true;
  CL.connected = !!d.connected;
  CL.threads = Array.isArray(d.threads) ? d.threads : [];
  CL.models = Array.isArray(d.models) ? d.models : CL.models;
  CL.defaultModel = d.defaultModel || CL.defaultModel;
  if (CL.activeId && !CL.threads.some((t) => t.id === CL.activeId)) CL.activeId = null;
  setNotice('', false);
  renderStatus();
  renderMenus();
}

// REST-Fallback (wenn kein SSE) und nach Options-Änderung.
async function pollClaude() {
  if (!state.liveOn || !widgetOnActivePage('claude')) return;
  try { renderClaude(await fetch('/api/claude', { cache: 'no-store' }).then((r) => r.json())); }
  catch { /* letzter Stand bleibt */ }
}

/* ---------- Event-Verdrahtung (einmalig, delegiert) ---------- */

let _clWired = false;
function wireClaude() {
  if (_clWired) return; _clWired = true;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-claude]');
    // Menüs schließen, wenn außerhalb geklickt
    if (!e.target.closest('.claude-menu') && !(btn && (btn.dataset.claude === 'threads' || btn.dataset.claude === 'model'))) {
      closeMenus();
    }
    if (!btn) return;
    const act = btn.dataset.claude;
    if (act === 'threads') { const m = clq('[data-claude-menu="threads"]'); const mm = clq('[data-claude-menu="model"]'); if (mm) mm.hidden = true; if (m) m.hidden = !m.hidden; }
    else if (act === 'model') { const m = clq('[data-claude-menu="model"]'); const tm = clq('[data-claude-menu="threads"]'); if (tm) tm.hidden = true; if (m) m.hidden = !m.hidden; }
    else if (act === 'new-thread') newThread();
    else if (act === 'open-thread') openThread(btn.dataset.id);
    else if (act === 'del-thread') { e.stopPropagation(); deleteThread(btn.dataset.id); }
    else if (act === 'set-model') setModel(btn.dataset.id);
    else if (act === 'send') send();
    else if (act === 'copy') copyCode(btn);
  });

  document.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-claude-input]');
    if (!input) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
}

function copyCode(btn) {
  const pre = btn.parentElement && btn.parentElement.querySelector('pre code');
  if (!pre) return;
  const text = pre.textContent || '';
  const done = () => { const o = btn.textContent; btn.textContent = 'Kopiert'; setTimeout(() => { btn.textContent = o; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {});
  else done();
}

/* ---------- Einstellungen (Settings → Module → Claude) ---------- */

function setClaudeSettingsStatus(text, color) {
  const el = document.getElementById('claudeSettingsStatus');
  if (!el) return;
  el.textContent = text; el.style.color = color;
}

async function refreshClaudeSettingsStatus() {
  try {
    const d = await fetch('/api/claude', { cache: 'no-store' }).then((r) => r.json());
    if (!d || !d.ok) { setClaudeSettingsStatus('● nicht verbunden', '#ffb454'); return; }
    if (d.connected) setClaudeSettingsStatus('● verbunden', '#3ddc97');
    else setClaudeSettingsStatus('● Token gesetzt, Verbindung fehlgeschlagen', '#ffb454');
  } catch { setClaudeSettingsStatus('● –', 'var(--text-3)'); }
}

async function loadClaudeSettings() {
  const body = document.getElementById('claudeSettingsBody');
  if (!body) return;
  body.innerHTML = '';

  const sec = document.createElement('div');
  sec.className = 'cfg-section';
  sec.textContent = 'Abo-Token (Claude Pro/Max)';
  body.appendChild(sec);

  const row = document.createElement('div');
  row.className = 'news-cfg-add';
  const input = document.createElement('input');
  input.className = 'cfg-input'; input.type = 'password'; input.placeholder = 'Token einfügen'; input.autocomplete = 'off';
  const save = document.createElement('button');
  save.className = 'cfg-btn'; save.textContent = '↵ Speichern';
  row.append(input, save);
  body.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'tile-settings-hint'; hint.style.lineHeight = '1.7';
  hint.innerHTML = 'Die Kachel nutzt dein <b>Claude-Abo</b>, nicht einen pro-Token-API-Key — nur so zählen die '
    + 'Anfragen gegen dein Abo-Limit statt pro Token. '
    + 'Token einmalig auf einer Maschine erzeugen, die in deinem Abo eingeloggt ist:'
    + '<br><code>claude setup-token</code><br>und den ausgegebenen Wert hier einfügen. '
    + 'Alternativ per Umgebungsvariable <code>CLAUDE_CODE_OAUTH_TOKEN</code> (hat Vorrang).';
  body.appendChild(hint);

  // aktuellen Zustand des Secrets laden (maskiert / per Env gesperrt)
  try {
    const s = await fetch('/api/secrets', { cache: 'no-store' }).then((r) => r.json());
    if ((s._env || []).includes('CLAUDE_CODE_OAUTH_TOKEN')) {
      input.readOnly = true; input.style.opacity = '.6';
      input.title = 'Kommt aus der Umgebung und hat Vorrang';
      input.placeholder = 'per Umgebungsvariable gesetzt';
    } else if (s.CLAUDE_CODE_OAUTH_TOKEN === '***') {
      input.placeholder = 'gespeichert — neu eingeben zum Ändern';
    }
  } catch { /* Feld bleibt leer */ }

  refreshClaudeSettingsStatus();

  save.addEventListener('click', async () => {
    if (input.readOnly) return;
    setClaudeSettingsStatus('● speichert …', 'var(--text-3)');
    try {
      const r = await fetch('/api/secrets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CLAUDE_CODE_OAUTH_TOKEN: input.value.trim() }),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      input.value = '';
      input.placeholder = 'gespeichert — neu eingeben zum Ändern';
      setClaudeSettingsStatus('● gespeichert', '#3ddc97');
      setTimeout(refreshClaudeSettingsStatus, 1500);
      pollClaude();
    } catch { setClaudeSettingsStatus('● Fehler', '#f43f5e'); }
  });
}

/* ---------- Registrierung ---------- */

Dash.registerModule({
  id: 'claude',
  label: 'Claude',
  section: 'dienste',
  defaultSize: { w: 6, h: 8 },
  minSize: { w: 4, h: 6 },

  event: 'claude',
  handler: renderClaude,
  refresh: () => { wireClaude(); return pollClaude(); },

  template: () => `
    <div class="tile claude-tile">
      <div class="tile-head claude-head">
        <span data-tile-title>Claude</span>
        <span class="claude-head-actions">
          <button class="claude-btn" data-claude="threads" type="button" title="Unterhaltungen">☰</button>
          <button class="claude-btn claude-model-btn" data-claude="model" type="button" title="Modell wählen"><span data-claude-model>Modell</span> ▾</button>
          <span class="claude-status" data-claude-status>●</span>
        </span>
        <div class="claude-menu" data-claude-menu="threads" hidden></div>
        <div class="claude-menu" data-claude-menu="model" hidden></div>
      </div>

      <div class="claude-messages" data-claude-messages></div>

      <div class="claude-notice" data-claude-notice hidden></div>

      <div class="claude-input-row">
        <textarea class="claude-input" data-claude-input rows="1" placeholder="Frage stellen… (Enter senden, Shift+Enter Zeilenumbruch)"></textarea>
        <button class="claude-send" data-claude="send" type="button" title="Senden">➤</button>
      </div>
    </div>`,

  options: [],

  settings: { badge: 'CL', color: '#d97757', statusEl: 'claudeSettingsStatus', load: loadClaudeSettings },
});
