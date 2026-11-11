// Dev helper: close-ups of one visitor per state. node tools/poses.mjs <outPrefix> <ffSeconds> state[,state...]
import { openGame } from '../tests/e2e/browser.mjs';
const [out, ff = '100', states = 'sit,browse,queue,leave'] = process.argv.slice(2);
const { browser, page, errors } = await openGame('http://localhost:5173/', { width: 900, height: 700 });
await page.evaluate((q) => window.__TYCOON__.controller.updateSettings({ quality: q }), process.env.Q ?? 'medium');
await page.evaluate((s) => window.__TYCOON__.fastForward(Number(s)), ff);
let i = 0;
for (const st of states.split(',')) {
  const found = await page.evaluate(async (st) => {
    const T = window.__TYCOON__, c = T.controller;
    for (let k = 0; k < 600; k++) { const v = c.state.visitors.find((v) => v.state === st && !v.moving === (st !== 'leave' && st !== 'toShelf')); if (v) { c.setSpeed(0); T.host.cam.jump(v.x, v.z, Number(1.7)); return [v.state, v.activity, v.x, v.z, v.yaw, v.model]; } T.fastForward(0.5); }
    return null;
  }, st);
  console.log(st, JSON.stringify(found));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}${i++}.png`, timeout: 120000 });
  await page.evaluate(() => window.__TYCOON__.controller.setSpeed(1));
}
console.log('errors', errors.slice(0, 5));
await browser.close();
