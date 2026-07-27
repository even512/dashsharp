'use strict';

/* AdGuard Home — Statistik & Filterstatus über die Control-API.
   Auth ist HTTP-Basic; die Zugangsdaten bleiben serverseitig. */

// AdGuard liefert die Top-Listen als [{ "domain": count }, …].
function topBlockedList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((item) => item && typeof item === 'object')
    .slice(0, 10)
    .map((item) => ({ domain: Object.keys(item)[0], count: Object.values(item)[0] }))
    .filter((item) => item.domain);
}

module.exports = {
  id: 'adguard',
  label: 'AdGuard Home',
  ttl: 30000, // aggregierte Stats, aendern sich langsam

  secrets: [
    { key: 'ADGUARD_URL',  label: 'URL' },
    { key: 'ADGUARD_USER', label: 'Benutzer' },
    { key: 'ADGUARD_PASS', label: 'Passwort', masked: true },
  ],

  configured: (get) => !!get('ADGUARD_URL'),

  async fetch(get, ctx) {
    const base = get('ADGUARD_URL').replace(/\/+$/, '');
    const user = get('ADGUARD_USER');
    const pass = get('ADGUARD_PASS');
    const headers = (user || pass)
      ? { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') }
      : {};

    const [status, stats] = await Promise.all([
      ctx.httpJson(`${base}/control/status`, { headers, insecure: true }),
      ctx.httpJson(`${base}/control/stats`,  { headers, insecure: true }),
    ]);

    const total   = stats.num_dns_queries       || 0;
    const blocked = stats.num_blocked_filtering || 0;
    return {
      ok:         true,
      version:    status.version || null,
      running:    !!status.running,
      protection: !!status.protection_enabled,
      total,
      blocked,
      blockedPct: total > 0 ? Math.round(blocked / total * 100) : 0,
      topBlocked: topBlockedList(stats.top_blocked_domains),
      avgMs:      typeof stats.avg_processing_time === 'number'
                    ? +(stats.avg_processing_time * 1000).toFixed(1) : null,
    };
  },
};
