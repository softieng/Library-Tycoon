// CI gate: every asset must match ASSET_MANIFEST.json, every GLB must be structurally valid,
// and the protected identity files must still be the owner's originals.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildManifest, ROOT } from './build-manifest.mjs';
const manifest = JSON.parse(readFileSync(path.join(ROOT, 'ASSET_MANIFEST.json'), 'utf8'));
const PROTECTED = {
  'assets-src/branding/central-library-logo.original.png': 'da6dd6995ff79cb57c073f5ba0ae18c08605b557211a27a7a34027ba4f57af26',
  'public/assets/branding/central-library-logo.png': 'da6dd6995ff79cb57c073f5ba0ae18c08605b557211a27a7a34027ba4f57af26',
  'assets-src/branding/university-logo.original.jpg': '07768aae4ae5ea6d8a3fb3757425673d88a8833a1859f92f82748bf088a86fca',
  'public/assets/branding/university-logo.jpg': '07768aae4ae5ea6d8a3fb3757425673d88a8833a1859f92f82748bf088a86fca',
  'assets-src/branding/mascot.original.jpg': 'd2325f445a3050192469264300f5fab2554e926e3fe33343bf5d4aed7ad30954',
  'assets-src/branding/mascot.owner-reference.jpeg': '7b15188d46940cb7b16421749962705247487199da83688badca429740dd695f',
};
const problems = [];
const now = new Map(buildManifest().assets.map((a) => [a.path, a.sha256]));
for (const a of manifest.assets) {
  if (!existsSync(path.join(ROOT, a.path))) { problems.push(`missing: ${a.path}`); continue; }
  if (now.get(a.path) !== a.sha256) problems.push(`hash changed (regenerate the manifest if intended): ${a.path}`);
  for (const k of ['creator', 'license', 'sourceUrl', 'modifications', 'use']) if (!a[k] || !String(a[k]).length) problems.push(`manifest field "${k}" empty: ${a.path}`);
  if (a.path.endsWith('.glb')) { const b = readFileSync(path.join(ROOT, a.path)); if (b.toString('utf8', 0, 4) !== 'glTF' || b.readUInt32LE(4) !== 2 || b.readUInt32LE(8) !== b.length) problems.push(`invalid GLB container: ${a.path}`); }
}
for (const p of now.keys()) if (!manifest.assets.some((a) => a.path === p)) problems.push(`asset not in manifest: ${p}`);
for (const [p, h] of Object.entries(PROTECTED)) { const got = existsSync(path.join(ROOT, p)) ? createHash('sha256').update(readFileSync(path.join(ROOT, p))).digest('hex') : 'missing'; if (got !== h) problems.push(`PROTECTED identity asset altered: ${p}`); }
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`assets OK: ${manifest.assets.length} files match the manifest; ${manifest.assets.filter((a) => a.path.endsWith('.glb')).length} GLB valid; ${Object.keys(PROTECTED).length} protected identity files intact`);
