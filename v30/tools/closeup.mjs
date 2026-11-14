// Dev helper: close-up of one visitor/staff member facing the camera. node tools/closeup.mjs <out> <state> [zoom] [ffSeconds]
import { openGame } from '../tests/e2e/browser.mjs';
const [out, state = 'sit', zoom = '1.6', ff = '60'] = process.argv.slice(2);
const { browser, page, errors } = await openGame(process.env.URL ?? 'http://localhost:5173/', { width: 900, height: 700 });
await page.evaluate((q) => window.__TYCOON__.controller.updateSettings({ quality: q }), process.env.Q ?? 'medium');
await page.evaluate((s) => window.__TYCOON__.fastForward(Number(s)), ff);
const info = await page.evaluate(async ([st, z, SIGN, FACE]) => {
  const T = window.__TYCOON__, c = T.controller;
  for (let k = 0; k < 800; k++) {
    const list = st === 'staff' ? c.state.staff : c.state.visitors;
    const v = list.find((v) => (st === 'staff' || v.state === st) && SIGN * (Math.sin(v.yaw) - Math.cos(v.yaw)) > 0.6 && !v.moving === (st !== 'leave'));
    if (v) { if (FACE) v.yaw = Math.PI * 0.75; c.setSpeed(0); T.host.cam.jump(v.x - 1.4, v.z + 1.4, Number(z)); return [v.state, v.activity, v.model, v.x, v.z, v.yaw]; }
    T.fastForward(0.5);
  }
  return null;
}, [state, zoom, Number(process.env.SIGN ?? 1), !!process.env.FACE]);
console.log(JSON.stringify(info));
await page.waitForTimeout(2500);
await page.screenshot({ path: out, timeout: 120000 });
console.log('errors', errors.slice(0, 5));
await browser.close();
