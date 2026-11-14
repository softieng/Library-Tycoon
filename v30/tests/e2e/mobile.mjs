// Real Chromium + SwiftShader mobile-preview smoke check.
// Uses an emulated touch viewport, then exercises the actual installed Babylon pointer handlers.
// This does NOT replace performance testing on a physical iPhone/Android device.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, GL_ARGS } from './browser.mjs';

const url = process.env.URL ?? 'http://localhost:4173/';
const out = process.env.MOBILE_OUT ?? 'qa-mobile';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: GL_ARGS });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  locale: 'ar-IQ',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push(m.text()); });
const checks = [];
const check = (name, pass, details = '') => {
  checks.push({ name, pass: !!pass, details });
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}${details ? ' : ' + details : ''}`);
};
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__TYCOON__?.ready === true, null, { timeout: 180000 });
  await page.waitForTimeout(800);
  const before = await page.evaluate(() => {
    const host = window.__TYCOON__.host;
    const zoom = host.cam.state.zoom;
    const canvas = document.querySelector('canvas');
    const fire = (type, id, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch',
      isPrimary: id === 1, clientX: x, clientY: y, button: 0, buttons: 1,
    }));
    const starting = { ...host.cam.state };
    fire('pointerdown', 1, 160, 360);
    fire('pointermove', 1, 205, 390);
    fire('pointerup', 1, 205, 390);
    host.cam.update(1);
    const panned = { ...host.cam.state };
    fire('pointerdown', 1, 145, 300);
    fire('pointerdown', 2, 245, 300);
    fire('pointermove', 1, 115, 300);
    fire('pointermove', 2, 275, 300);
    fire('pointerup', 1, 115, 300);
    fire('pointerup', 2, 275, 300);
    host.cam.update(1);
    return { initialZoom: zoom, zoomAfterPinch: host.cam.state.zoom,
      initial: starting, panned,
      quality: window.__TYCOON__.controller.settings.quality,
      renderScale: window.__TYCOON__.controller.settings.renderScale,
      siteOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      ready: window.__TYCOON__.ready,
      width: innerWidth,
    };
  });
  check('3D browser scene loads in mobile emulation', before.ready);
  check('mobile starts with low-cost graphics preset', before.quality === 'low' && before.renderScale <= .8, JSON.stringify({quality:before.quality,scale:before.renderScale}));
  check('single-finger drag pans fixed isometric camera',
    Math.hypot(before.panned.x - before.initial.x, before.panned.z - before.initial.z) > .01);
  check('two-finger pinch zoom works', before.zoomAfterPinch < before.initialZoom, JSON.stringify({before:before.initialZoom,after:before.zoomAfterPinch}));
  check('no horizontal page scroll at 390px', !before.siteOverflow);
  await page.click('[data-testid=dock-home]');
  // The panel slides in from +14px for 180ms. Measure final layout only after
  // its CSS entrance animation finishes, rather than reporting transient overflow.
  await page.locator('.panel').evaluate(async (element) => {
    await Promise.all(element.getAnimations().map(a => a.finished.catch(() => {})));
  });
  const panel = await page.evaluate(() => {
    const r = document.querySelector('.panel')?.getBoundingClientRect();
    const dock = document.querySelector('.dock')?.getBoundingClientRect();
    return { rect:r ? {top:r.top,bottom:r.bottom,left:r.left,right:r.right} : null,
      dock:dock ? {top:dock.top,bottom:dock.bottom,left:dock.left,right:dock.right} : null,
      goals: document.querySelectorAll('[data-testid^="director-goal-"]').length,
      height: innerHeight, width: innerWidth };
  });
  check('mobile panel and dock fit available screen', !!panel.rect && panel.rect.top >= 0 &&
    panel.rect.bottom <= panel.height + 1 && panel.rect.left >= -1 && panel.rect.right <= panel.width + 1 &&
    !!panel.dock && panel.dock.bottom <= panel.height + 1, JSON.stringify(panel));
  check('three director goals available from phone', panel.goals === 3);
  await page.screenshot({ path: out + '/v31-mobile-390x844.png', timeout: 120000 });
  await page.click('[data-testid=dock-home]');
  check('no unexpected runtime errors', errors.length === 0, errors.slice(0,2).join('; '));
} catch (e) {
  check('mobile smoke execution', false, String(e));
}
writeFileSync(out + '/mobile-results.json', JSON.stringify({ checks, errors, url }, null, 2));
await browser.close();
process.exit(checks.some(x => !x.pass) ? 1 : 0);
