// Dev helper: node tools/shot.mjs <outPrefix> <seconds> "x,z,zoom" ["x,z,zoom" ...]   (env: Q=quality, W,H, JS=code to eval first, SPEED)
import { openGame } from '../tests/e2e/browser.mjs';
const [out, secs = '4', ...views] = process.argv.slice(2);
const { browser, page, errors } = await openGame(process.env.URL ?? 'http://localhost:5173/', { width: Number(process.env.W ?? 1600), height: Number(process.env.H ?? 900) });
console.log(JSON.stringify(await page.evaluate(() => ({ ready: window.__TYCOON__.ready, error: window.__TYCOON__.error }))));
await page.evaluate((q) => window.__TYCOON__.controller.updateSettings({ quality: q }), process.env.Q ?? 'medium');
if (process.env.SPEED) await page.evaluate((s) => window.__TYCOON__.controller.setSpeed(Number(s)), process.env.SPEED);
if (process.env.JS) console.log('eval:', JSON.stringify(await page.evaluate(process.env.JS)));
if (process.env.FF) await page.evaluate((s) => window.__TYCOON__.fastForward(Number(s)), process.env.FF);
await page.waitForTimeout(Number(secs) * 1000);
if (process.env.JS2) console.log('eval2:', JSON.stringify(await page.evaluate(process.env.JS2)));
console.log('stats', JSON.stringify(await page.evaluate(() => window.__TYCOON__.controller.world?.stats())));
let i = 0;
for (const v of views.length ? views : ['-']) {
  if (v !== '-') { const [x, z, zoom] = v.split(',').map(Number); await page.evaluate(([x, z, zoom]) => window.__TYCOON__.host.cam.jump(x, z, zoom), [x, z, zoom]); await page.waitForTimeout(700); }
  await page.screenshot({ path: `${out}${i++}.png`, timeout: 180000 });
}
console.log('errors:', errors.slice(0, 8));
await browser.close();
