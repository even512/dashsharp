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
  attachments: [], // vorbereitete Anhänge (vor dem Absenden)
  abort: null,     // AbortController des laufenden Chat-Requests
};

/* ---------- Anhänge (Datei-Upload) ---------- */

const CL_MAX_FILES = 5;
const CL_MAX_BYTES = 10 * 1024 * 1024; // 10 MB je Datei
const CL_IMG_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const CL_TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'text', 'log', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml',
  'toml', 'ini', 'conf', 'cfg', 'env', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'css',
  'scss', 'less', 'html', 'htm', 'vue', 'svelte', 'py', 'rb', 'php', 'go', 'rs', 'java',
  'kt', 'kts', 'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'swift', 'dart', 'sh', 'bash', 'zsh',
  'sql', 'pl', 'lua', 'r', 'gradle', 'dockerfile', 'gitignore', 'properties',
]);

function fileExt(name) { return String(name || '').split('.').pop().toLowerCase(); }

// Dateityp bestimmen: 'image' | 'pdf' | 'text' | null (nicht unterstützt).
function classifyFile(file) {
  const mime = file.type || '';
  const ext = fileExt(file.name);
  if (CL_IMG_MIME.has(mime) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || CL_TEXT_EXT.has(ext)) return 'text';
  return null;
}

// Sauberen MIME-Typ ableiten (Browser lässt file.type oft leer bei Code-Dateien).
function normMime(file, kind) {
  if (kind === 'image') {
    if (CL_IMG_MIME.has(file.type)) return file.type;
    const ext = fileExt(file.name);
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }
  if (kind === 'pdf') return 'application/pdf';
  return file.type || 'text/plain';
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(r.error || new Error('read failed'));
    r.readAsDataURL(file);
  });
}

// Dateien prüfen, base64 lesen und in CL.attachments aufnehmen.
async function stageFiles(fileList) {
  const files = Array.from(fileList || []);
  for (const file of files) {
    if (CL.attachments.length >= CL_MAX_FILES) { setNotice(`Maximal ${CL_MAX_FILES} Dateien pro Nachricht.`, true); break; }
    const kind = classifyFile(file);
    if (!kind) { setNotice(`„${file.name}" – Format nicht unterstützt (nur Text/Code, Bilder, PDF).`, true); continue; }
    if (file.size > CL_MAX_BYTES) { setNotice(`„${file.name}" ist größer als 10 MB.`, true); continue; }
    let dataUrl;
    try { dataUrl = await readFileDataUrl(file); } catch { setNotice(`„${file.name}" konnte nicht gelesen werden.`, true); continue; }
    const comma = dataUrl.indexOf(',');
    const data = comma >= 0 ? dataUrl.slice(comma + 1) : '';
    if (!data) continue;
    CL.attachments.push({ name: file.name || 'datei', mime: normMime(file, kind), kind, size: file.size, data, dataUrl });
  }
  renderAttachments();
}

// Chip für einen Anhang. `removeIdx >= 0` fügt einen Entfernen-Button hinzu.
function attachChipEl(a, removeIdx) {
  const chip = document.createElement('div');
  chip.className = 'claude-attach-chip';
  if (a.kind === 'image' && a.dataUrl) {
    const img = document.createElement('img');
    img.className = 'claude-attach-thumb'; img.src = a.dataUrl; img.alt = a.name || '';
    chip.appendChild(img);
  } else {
    const ic = document.createElement('span');
    ic.className = 'claude-attach-ic';
    ic.textContent = a.kind === 'pdf' ? '📄' : (a.kind === 'image' ? '🖼' : '📎');
    chip.appendChild(ic);
  }
  const nm = document.createElement('span');
  nm.className = 'claude-attach-name'; nm.textContent = a.name || 'Datei';
  chip.appendChild(nm);
  if (typeof removeIdx === 'number' && removeIdx >= 0) {
    const del = document.createElement('button');
    del.className = 'claude-attach-del'; del.type = 'button';
    del.dataset.claude = 'unattach'; del.dataset.idx = String(removeIdx);
    del.textContent = '✕'; del.title = 'Entfernen';
    chip.appendChild(del);
  }
  return chip;
}

// Vorbereitete Anhänge über dem Eingabefeld anzeigen.
function renderAttachments() {
  const box = clq('[data-claude-attachments]');
  if (!box) return;
  box.innerHTML = '';
  if (!CL.attachments.length) { box.hidden = true; return; }
  box.hidden = false;
  CL.attachments.forEach((a, i) => box.appendChild(attachChipEl(a, i)));
}

/* ---------- Helfer ---------- */

function clRoot() { return document.querySelector('[data-widget-id="claude"] .claude-tile'); }
function clq(sel) { const r = clRoot(); return r ? r.querySelector(sel) : null; }

/* ---------- Markdown → sicheres HTML ----------
   Fenced-Code-Blöcke werden vor dem Escapen herausgelöst und als Platzhalter
   ersetzt, dann der Rest escaped und formatiert, dann die Code-Blöcke escaped
   wieder eingesetzt. So kann nichts aus der Modell-Ausgabe als Markup wirken. */

function renderMarkdown(src, streaming) {
  let text = String(src == null ? '' : src);

  // Streaming: der Text endet ständig mitten in einem Markdown-Zeichen. Einen
  // noch offenen Code-Block (ungerade Zahl an ```-Fences) temporär schließen,
  // damit er sofort als Code-Block gerendert und live gefüllt wird. Der Index
  // dieses noch offenen Blocks bekommt später keinen Kopier-Button.
  let hadOpenFence = false;
  if (streaming && ((text.match(/```/g) || []).length % 2 === 1)) {
    text += '\n```';
    hadOpenFence = true;
  }

  const codeBlocks = [];
  // ```lang\n ... ```
  let s = text.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length;
    codeBlocks.push({ lang: String(lang || '').trim(), code });
    return ` CODE${i} `;
  });
  // Der zuletzt erfasste Block stammt vom synthetischen Schluss-Fence → offen.
  const openFenceIndex = hadOpenFence ? codeBlocks.length - 1 : -1;
  if (streaming) {
    s = hideDanglingMarkdown(s); // offene Inline-Marker am Textende kaschieren
  }

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
      // später durch das <div.claude-code> ersetzt). Die umgebenden Leerzeichen
      // MÜSSEN erhalten bleiben, sonst greift die Wiedereinsetzung (/ CODE\d+ /) nicht.
      closeList();
      out.push(` ${line.trim()} `);
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
    const idx = Number(i);
    const b = codeBlocks[idx];
    if (!b) return '';
    // Noch offener Block (Streaming): kein Kopier-Button, kommt beim Schluss-Render.
    const btn = idx === openFenceIndex ? ''
      : `<button class="claude-copy" data-claude="copy" type="button">Kopieren</button>`;
    return `<div class="claude-code">${btn}`
      + `<pre><code>${esc(b.code.replace(/\n$/, ''))}</code></pre></div>`;
  });
  return html;
}

/* Streaming-Hilfe: kaschiert am Textende offene Markdown-Marker, damit während
   des Tippens keine rohen Steuerzeichen (**, *, _, `, #) aufblitzen. Arbeitet auf
   dem Text NACH dem Herauslösen der Code-Blöcke (die als CODE-Platzhalter
   vorliegen), also werden Backticks in Code nicht angetastet. Nur eindeutig
   „hängende" (ungepaarte bzw. am Ende offene) Marker werden entfernt — vollständige
   Paare wie **fett** oder `code` bleiben unberührt. */
function hideDanglingMarkdown(s) {
  // Angefangene Überschrift am Ende (nur #-Zeichen, noch kein Inhalt) ausblenden.
  s = s.replace(/(^|\n)#{1,6}[ \t]*$/, '$1');
  // Ungepaartes Inline-Backtick: letztes (öffnendes) ` entfernen.
  if ((s.match(/`/g) || []).length % 2 === 1) {
    const i = s.lastIndexOf('`');
    if (i >= 0) s = s.slice(0, i) + s.slice(i + 1);
  }
  // Ungepaartes ** : letztes (öffnendes) ** entfernen.
  if ((s.match(/\*\*/g) || []).length % 2 === 1) {
    const i = s.lastIndexOf('**');
    if (i >= 0) s = s.slice(0, i) + s.slice(i + 2);
  }
  // Einzelnes offenes * bzw. _ direkt am Textende (nicht Teil eines **-Paars).
  s = s.replace(/(^|[^*])\*[ \t]*$/, '$1');
  s = s.replace(/(^|[^_])_[ \t]*$/, '$1');
  return s;
}

/* ---------- Nachrichten rendern ---------- */

function messagesEl() { return clq('[data-claude-messages]'); }

function addBubble(role, html, isMarkdown, opts) {
  opts = opts || {};
  const box = messagesEl();
  if (!box) return null;
  const row = document.createElement('div');
  row.className = `claude-bubble claude-${role}`;
  // Anhang-Chips (nur bei Nutzer-Nachrichten mit Dateien).
  if (opts.attachments && opts.attachments.length) {
    const at = document.createElement('div');
    at.className = 'claude-bubble-atts';
    for (const a of opts.attachments) at.appendChild(attachChipEl(a));
    row.appendChild(at);
  }
  const body = document.createElement('div');
  body.className = 'claude-md';
  if (html === '' && opts.attachments && opts.attachments.length) body.hidden = true; // reine Datei-Nachricht
  if (isMarkdown) body.innerHTML = html; else body.textContent = html;
  row.appendChild(body);
  if (opts.aborted) markAborted(body);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  return body;
}

// „abgebrochen"-Kennzeichnung an die Blase (Eltern-Zeile von .claude-md) hängen.
function markAborted(body) {
  const row = body && body.parentElement;
  if (!row || row.querySelector('.claude-aborted')) return;
  const tag = document.createElement('div');
  tag.className = 'claude-aborted';
  tag.textContent = 'abgebrochen';
  row.appendChild(tag);
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
    const isAssistant = m.role === 'assistant';
    addBubble(m.role, isAssistant ? renderMarkdown(m.content) : m.content, isAssistant, {
      attachments: m.attachments || null,
      aborted: !!m.aborted,
    });
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

// Sende-/Stop-Zustand des Buttons umschalten. Während Claude arbeitet wird aus
// dem Senden-Pfeil (➤) eine rote Stop-Taste (■), die den Request abbricht.
function setSending(on) {
  CL.sending = on;
  const btn = clq('.claude-send');
  if (!btn) return;
  if (on) {
    btn.dataset.claude = 'stop';
    btn.classList.add('claude-stop');
    btn.textContent = '■';
    btn.title = 'Antwort stoppen';
  } else {
    btn.dataset.claude = 'send';
    btn.classList.remove('claude-stop');
    btn.textContent = '➤';
    btn.title = 'Senden';
  }
}

function abortSend() { if (CL.abort) { try { CL.abort.abort(); } catch { /* egal */ } } }

async function send() {
  if (CL.sending) return;
  const input = clq('[data-claude-input]');
  if (!input) return;
  const text = input.value.trim();
  const files = CL.attachments.slice();
  if (!text && !files.length) return;
  if (!CL.configured) { setNotice('Nicht verbunden — Token in Einstellungen → Module setzen.', true); return; }

  const threadId = await ensureThread();
  if (!threadId) return;

  setSending(true);
  input.value = '';
  CL.attachments = [];
  renderAttachments();
  setNotice('', false);

  // leeren Platzhalter der neuen Unterhaltung entfernen
  const empty = clq('.claude-empty');
  if (empty) empty.remove();

  addBubble('user', text, false, { attachments: files.length ? files : null });
  const bubble = addBubble('assistant', '', false);
  if (bubble) bubble.classList.add('claude-streaming');

  // Schreibmaschinen-Anzeige: eintreffende Deltas landen in `target`, eine
  // requestAnimationFrame-Schleife gibt sie gleichmäßig Buchstabe für Buchstabe
  // frei (`shown`) und rendert bei jedem Schritt das bisher Sichtbare formatiert.
  // So ist die Anzeige vom netzwerkseitigen Wortgruppen-Takt entkoppelt und
  // schon während des Tippens sauber strukturiert. Das Tempo ist adaptiv: je
  // größer der Rückstand, desto schneller — hängt am Ende also nie lange nach.
  // Zeitbasiertes, gleichmäßiges Tempo: unabhängig von der Framerate werden pro
  // Sekunde konstant CPS_BASE Zeichen freigegeben — im Normalfall also ~1 Zeichen
  // pro Frame, was sich wirklich flüssig „Buchstabe für Buchstabe" liest. Bei
  // großem Rückstand steigt das Tempo nur sanft (bis CPS_MAX) und pro Frame werden
  // NIE mehr als STEP_MAX Zeichen aufgedeckt → keine Wortgruppen-Sprünge mehr.
  const CPS_BASE = 55;   // Grundtempo (Zeichen/Sekunde)
  const CPS_MAX = 110;   // Obergrenze, falls die Anzeige weit hinterherhinkt
  const STEP_MAX = 2;    // harte Deckelung Zeichen pro Frame (Smoothness-Garantie)
  const DT_MAX = 0.05;   // Zeitschritt deckeln (verhindert Bursts nach Tab-Wechsel)
  let target = '';         // vollständig empfangener Roh-Text
  let shown = 0;           // bereits sichtbare Zeichen
  let ended = false;       // Stream abgeschlossen (done)
  let finalize = null;     // Schluss-Render, sobald alles sichtbar ist
  let rafId = 0;
  let carry = 0;           // aufgelaufener Sub-Zeichen-Bruchteil
  let lastTs = 0;          // Zeitstempel des letzten Frames

  const CARET = '<span class="claude-caret"></span>';
  const paintStream = () => {
    if (!bubble) return;
    let html = renderMarkdown(target.slice(0, shown), true);
    // Caret möglichst inline ans Ende der letzten Textzeile setzen (vor deren
    // schließendem Tag), sonst schlicht anhängen (z.B. bei reinem Code-Block).
    const m = html.match(/<\/(?:p|li|h[3-6])>(?![\s\S]*<\/(?:p|li|h[3-6])>)/);
    html = m ? html.slice(0, m.index) + CARET + html.slice(m.index) : html + CARET;
    bubble.innerHTML = html;
    scrollMessages();
  };
  const typeTick = (ts) => {
    rafId = 0;
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, DT_MAX);
    lastTs = ts;
    const backlog = target.length - shown;
    if (backlog > 0) {
      // Tempo steigt nur sanft mit dem Rückstand, bleibt aber gedeckelt.
      const rate = Math.min(CPS_MAX, CPS_BASE + backlog * 0.25);
      carry += dt * rate;
      let step = Math.floor(carry);
      if (step >= STEP_MAX) { step = STEP_MAX; carry = 0; } else { carry -= step; }
      if (step > 0) { shown = Math.min(target.length, shown + step); paintStream(); }
    } else {
      carry = 0;
    }
    if (shown < target.length) { rafId = requestAnimationFrame(typeTick); }
    else { lastTs = 0; if (ended && finalize) { const f = finalize; finalize = null; f(); } }
  };
  const pumpType = () => { if (!rafId && shown < target.length) rafId = requestAnimationFrame(typeTick); };
  const stopType = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; } };

  CL.abort = new AbortController();
  try {
    const payload = { threadId, message: text };
    if (files.length) {
      payload.attachments = files.map((a) => ({ name: a.name, mime: a.mime, kind: a.kind, size: a.size, data: a.data }));
    }
    const resp = await fetch('/api/claude/chat', {
      method: 'POST',
      // Bewusst KEIN application/json: so lässt das globale 1-MB-JSON den Body
      // durch und der 32-MB-Parser der Route greift (server/modules/claude.js).
      headers: { 'Content-Type': 'application/x-claude-chat' },
      body: JSON.stringify(payload),
      signal: CL.abort.signal,
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
          target += ev.text || '';
          pumpType();
        } else if (ev.type === 'done') {
          const finalText = (ev.text && ev.text.trim()) ? ev.text : target;
          target = finalText;
          ended = true;
          finalize = () => {
            if (bubble) { bubble.classList.remove('claude-streaming'); bubble.innerHTML = renderMarkdown(finalText); scrollMessages(); }
          };
          if (shown >= target.length) { const f = finalize; finalize = null; f(); }
          else pumpType();
        } else if (ev.type === 'error') {
          ended = true;
          stopType();
          if (bubble) { bubble.classList.remove('claude-streaming'); bubble.classList.add('claude-error'); bubble.textContent = errorText(ev.message); }
        }
      }
    }
  } catch (err) {
    ended = true;
    stopType();
    if (err && err.name === 'AbortError') {
      // Nutzer-Stopp: den bis hier empfangenen Teil behalten und markieren.
      if (bubble) { bubble.classList.remove('claude-streaming'); bubble.innerHTML = renderMarkdown(target); markAborted(bubble); scrollMessages(); }
    } else if (bubble) {
      bubble.classList.remove('claude-streaming'); bubble.classList.add('claude-error'); bubble.textContent = 'Verbindung unterbrochen.';
    }
  } finally {
    CL.abort = null;
    setSending(false);
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
    else if (act === 'stop') abortSend();
    else if (act === 'attach') { const f = clq('[data-claude-file]'); if (f) f.click(); }
    else if (act === 'unattach') { const i = Number(btn.dataset.idx); if (i >= 0) { CL.attachments.splice(i, 1); renderAttachments(); } }
    else if (act === 'copy') copyCode(btn);
  });

  document.addEventListener('keydown', (e) => {
    const input = e.target.closest('[data-claude-input]');
    if (!input) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  // Datei-Auswahl über den Büroklammer-Button.
  document.addEventListener('change', (e) => {
    const f = e.target.closest('[data-claude-file]');
    if (!f) return;
    stageFiles(f.files);
    f.value = ''; // gleiche Datei erneut wählbar
  });

  // Bild/Datei aus der Zwischenablage einfügen (Screenshots).
  document.addEventListener('paste', (e) => {
    if (!e.target.closest('[data-claude-input]')) return;
    const files = e.clipboardData && e.clipboardData.files;
    if (files && files.length) { e.preventDefault(); stageFiles(files); }
  });

  // Drag & Drop auf die Kachel.
  document.addEventListener('dragover', (e) => {
    const root = e.target.closest && e.target.closest('.claude-tile');
    if (!root) return;
    if (!(e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files'))) return;
    e.preventDefault();
    const dz = root.querySelector('[data-claude-drop]'); if (dz) dz.hidden = false;
  });
  document.addEventListener('dragleave', (e) => {
    const root = e.target.closest && e.target.closest('.claude-tile');
    if (!root) return;
    if (e.relatedTarget && root.contains(e.relatedTarget)) return; // noch über der Kachel
    const dz = root.querySelector('[data-claude-drop]'); if (dz) dz.hidden = true;
  });
  document.addEventListener('drop', (e) => {
    const root = e.target.closest && e.target.closest('.claude-tile');
    const dz = document.querySelector('.claude-tile [data-claude-drop]');
    if (dz) dz.hidden = true;
    if (!root) return;
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) stageFiles(e.dataTransfer.files);
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

      <div class="claude-attachments" data-claude-attachments hidden></div>

      <div class="claude-input-row">
        <button class="claude-attach" data-claude="attach" type="button" title="Datei anhängen">📎</button>
        <textarea class="claude-input" data-claude-input rows="1" placeholder="Frage stellen… (Enter senden, Shift+Enter Zeilenumbruch)"></textarea>
        <button class="claude-send" data-claude="send" type="button" title="Senden">➤</button>
        <input class="claude-file" data-claude-file type="file" multiple hidden
               accept="image/*,application/pdf,text/*,.md,.json,.csv,.log,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.html,.css,.yaml,.yml,.xml,.sh,.sql">
      </div>

      <div class="claude-drop" data-claude-drop hidden><span>Datei hier ablegen</span></div>
    </div>`,

  options: [],

  settings: { badge: 'CL', color: '#d97757', statusEl: 'claudeSettingsStatus', load: loadClaudeSettings },
});
