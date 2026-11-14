// Dev helper: real mascot walk (missing-book mission → shelf search) captured as N frames. node tools/gait.mjs <outPrefix> [frames]
import { openGame } from '../tests/e2e/browser.mjs';
const [out, frames = '4'] = process.argv.slice(2);
const { browser, page, errors } = await openGame('http://localhost:5173/', { width: 900, height: 700 });
await page.evaluate((q) => window.__TYCOON__.controller.updateSettings({ quality: q }), process.env.Q ?? 'medium');
const r = await page.evaluate(() => {
  const T = window.__TYCOON__, c = T.controller;
  c.dispatch({ type: 'startMission', id: 'missing_book' });
  const sh = c.state.missions.active; const id = 'shelf_' + (window.SHELF ?? '500');
  return JSON.stringify([sh?.id]);
});
console.log('mission', r);
const shelf = await page.evaluate(() => { const T = window.__TYCOON__; const m = T.controller.state.mascot; return [m.x, m.z]; });
await page.evaluate(() => { const c = window.__TYCOON__.controller; const ids = Object.keys(c.state).length; c.dispatch({ type: 'clickShelf', id: window.__SH ?? 'shelf_000' }); });
console.log('start', shelf);
for (let i = 0; i < Number(frames); i++) {
  await page.evaluate(() => { window.__TYCOON__.fastForward(0.45); const m = window.__TYCOON__.controller.state.mascot; window.__TYCOON__.host.cam.jump(m.x - 0.6, m.z + 0.6, 1.4); });
  await page.waitForTimeout(1200);
  console.log(i, JSON.stringify(await page.evaluate(() => { const m = window.__TYCOON__.controller.state.mascot; return [m.anim, +m.x.toFixed(2), +m.z.toFixed(2), m.moving]; })));
  await page.screenshot({ path: `${out}${i}.png`, timeout: 120000 });
}
console.log('errors', errors.slice(0, 5));
await browser.close();
