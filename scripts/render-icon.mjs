// Rendert das Master-Logo (logo.svg) zu den PNG-Assets.
// Einmalig/So oft du willst:  npm i -D sharp  &&  node scripts/render-icon.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'logo.svg'));

const targets = [
  { out: 'icon.png', size: 256 },          // Unraid-Template & Docker Hub
  { out: 'public/favicon.png', size: 64 }, // Browser-Tab (PNG-Fallback)
];

for (const { out, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(root, out));
  console.log(`✓ ${out} (${size}px)`);
}
