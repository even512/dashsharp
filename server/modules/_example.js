'use strict';

/* ============================================================================
   Vorlage fuer ein Backend-Modul — wird NICHT geladen (`_`-Praefix).
   Zum Verwenden kopieren nach server/modules/<id>.js; das Gegenstueck fuer die
   Kachel liegt unter public/modules/<id>.js.

   Beispiel: Uptime Kuma. Zeigt, wie Secrets, configured(), fetch() und eine
   Aktions-Route zusammenspielen.
   ============================================================================ */

// Aktionen IMMER ueber eine Whitelist aufloesen — nie einen Wert aus dem
// Request in einen Pfad, ein Kommando oder eine Mutation einsetzen.
const ACTIONS = {
  pause:  'pause',
  resume: 'resume',
};

module.exports = {
  id: 'example',
  label: 'Uptime Kuma',

  // TTL ist zugleich Cache-Dauer UND Push-Intervall. Ehrlich waehlen: der Wert
  // bestimmt, wie oft der Upstream 24/7 getroffen wird.
  ttl: 30000,

  secrets: [
    { key: 'KUMA_URL',   label: 'URL' },
    { key: 'KUMA_TOKEN', label: 'API-Token', masked: true },
  ],

  // Solange das falsch ist, wird fetch() nie aufgerufen und die Kachel bekommt
  // { ok:false, error:'not_configured' }.
  configured: (get) => !!get('KUMA_URL'),

  async fetch(get, ctx) {
    const base = get('KUMA_URL').replace(/\/+$/, '');
    const data = await ctx.httpJson(`${base}/api/status-page/heartbeat`, {
      headers: { Authorization: `Bearer ${get('KUMA_TOKEN')}` },
      timeoutMs: 6000,
      insecure: true, // LAN-Appliances haben oft self-signed Zertifikate
    });

    // Immer auf eine schlanke, stabile Form normalisieren: die Kachel soll
    // nicht die Upstream-Struktur kennen muessen, und Feldwechsel beim
    // Upstream bleiben hier lokal.
    const monitors = (data.monitors || []).map((m) => ({
      id: m.id,
      name: m.name || '?',
      up: !!m.up,
      responseMs: Number.isFinite(m.ping) ? Math.round(m.ping) : null,
    }));

    return {
      ok: true,
      total: monitors.length,
      up: monitors.filter((m) => m.up).length,
      monitors,
    };
  },

  // Optional: Zusatz-Endpunkte. GET /api/example legt die Registry selbst an.
  routes(app, { get, ctx, invalidate }) {
    app.post('/api/example/action', async (req, res) => {
      const id = String((req.body && req.body.id) || '').trim();
      const action = ACTIONS[String((req.body && req.body.action) || '').trim()];
      if (!id) return res.status(400).json({ ok: false, error: 'missing_id' });
      if (!action) return res.status(400).json({ ok: false, error: 'bad_action' });
      try {
        const base = get('KUMA_URL').replace(/\/+$/, '');
        await ctx.httpJson(`${base}/api/monitor/${encodeURIComponent(id)}/${action}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${get('KUMA_TOKEN')}` },
          insecure: true,
        });
        invalidate(); // naechster Abruf zeigt den neuen Stand statt des Caches
        res.json({ ok: true });
      } catch (err) {
        res.status(502).json({ ok: false, error: 'action_failed', message: err.message });
      }
    });
  },
};
