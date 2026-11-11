// Renders the mascot sash texture with a real browser so Arabic text is shaped correctly.
// Inscriptions are exactly those on the owner-approved mascot master:
//   المكتبة المركزية / CENTRAL LIBRARY   and   الجامعة التكنولوجية / UNIVERSITY OF TECHNOLOGY
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const font = (f) => readFileSync(path.join(root, 'node_modules/@fontsource/cairo/files', f)).toString('base64');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Cairo;font-weight:700;src:url(data:font/woff2;base64,${font('cairo-arabic-700-normal.woff2')}) format('woff2');unicode-range:U+0600-06FF,U+FE70-FEFF;}
@font-face{font-family:Cairo;font-weight:600;src:url(data:font/woff2;base64,${font('cairo-latin-600-normal.woff2')}) format('woff2');}
html,body{margin:0;background:#16264d}
.sheet{width:1024px;height:512px;display:grid;grid-template-rows:1fr 1fr}
.strip{position:relative;background:linear-gradient(#1b2e5c,#15244a);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  box-shadow:inset 0 18px 0 #c9a23a, inset 0 22px 0 #8a6a1c, inset 0 -18px 0 #c9a23a, inset 0 -22px 0 #8a6a1c}
.ar{font:700 74px/1.05 Cairo;color:#d9b24c;direction:rtl;letter-spacing:0}
.en{font:600 37px/1 Cairo;color:#d9b24c;letter-spacing:5px}
</style><div class="sheet">
<div class="strip"><div class="ar">المكتبة المركزية</div><div class="en">CENTRAL LIBRARY</div></div>
<div class="strip"><div class="ar">الجامعة التكنولوجية</div><div class="en">UNIVERSITY OF TECHNOLOGY</div></div>
</div>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 512 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'assets-src/textures/mascot_sash.png') });
await browser.close();
console.log('wrote assets-src/textures/mascot_sash.png');
