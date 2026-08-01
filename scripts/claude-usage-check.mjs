// Diagnose für den Claude-Usage-Endpoint.
// Liest CLAUDE_CODE_OAUTH_TOKEN aus der Umgebung oder config/secrets.json und
// klopft ein paar Endpoint-/Header-Varianten an. Zeigt Status + Body (gekürzt),
// damit der echte 403-Grund sichtbar wird. Druckt den Token NICHT.
//
//   node scripts/claude-usage-check.mjs
//
// Braucht Node 18+ (globales fetch).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SECRETS = path.join(__dirname, '..', 'config', 'secrets.json');

function token() {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return process.env.CLAUDE_CODE_OAUTH_TOKEN.trim();
  try {
    const j = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
    return String(j.CLAUDE_CODE_OAUTH_TOKEN || '').trim();
  } catch { return ''; }
}

const TOKEN = token();
if (!TOKEN) {
  console.error('Kein CLAUDE_CODE_OAUTH_TOKEN gefunden (weder Env noch config/secrets.json).');
  process.exit(1);
}
console.log(`Token gefunden: ${TOKEN.slice(0, 12)}…  (Länge ${TOKEN.length})\n`);

const BETA = 'oauth-2025-04-20';
const VER = '2023-06-01';

function headers({ ua = 'claude-code/2.0.0', beta = true, version = true } = {}) {
  const h = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'User-Agent': ua };
  if (beta) h['anthropic-beta'] = BETA;
  if (version) h['anthropic-version'] = VER;
  return h;
}

async function probe(label, url, opts) {
  try {
    const r = await fetch(url, { method: 'GET', headers: headers(opts) });
    const body = (await r.text()).slice(0, 600).replace(/\s+/g, ' ').trim();
    console.log(`• ${label}\n  ${url}\n  → HTTP ${r.status}  ${body ? '| ' + body : ''}\n`);
  } catch (e) {
    console.log(`• ${label}\n  ${url}\n  → FEHLER ${e.message}\n`);
  }
}

console.log('=== Kontroll-Call (sollte 200 sein) ===');
await probe('models (DashSharp-UA)', 'https://api.anthropic.com/v1/models?limit=1', { ua: 'DashSharp/1.0' });

console.log('=== Usage-Varianten ===');
await probe('usage · UA claude-code/2.0.0',       'https://api.anthropic.com/api/oauth/usage', { ua: 'claude-code/2.0.0' });
await probe('usage · UA claude-cli/1.0.0',        'https://api.anthropic.com/api/oauth/usage', { ua: 'claude-cli/1.0.0' });
await probe('usage · UA DashSharp/1.0',           'https://api.anthropic.com/api/oauth/usage', { ua: 'DashSharp/1.0' });
await probe('usage · ohne anthropic-version',     'https://api.anthropic.com/api/oauth/usage', { version: false });
await probe('usage · ohne anthropic-beta',        'https://api.anthropic.com/api/oauth/usage', { beta: false });

console.log('=== Verwandte OAuth-Endpoints (zeigen evtl. Scopes/Account) ===');
await probe('profile', 'https://api.anthropic.com/api/oauth/profile', {});
await probe('claude.ai/usage (alt)', 'https://claude.ai/api/oauth/usage', {});
