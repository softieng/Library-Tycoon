// Real Playwright/SwiftShader rendering and interaction checks for Arabic shelf wayfinding.
// No mock canvas, no paid APIs, no changes to the game economy or player save.
import { mkdirSync, writeFileSync } from 'node:fs';
import { openGame } from './browser.mjs';

const url = process.env.URL ?? 'http://localhost:4173/';
const out = process.env.OUT ?? 'qa-shelves';
mkdirSync(out, { recursive: true });
const { browser, page, errors } = await openGame(url, { width: 1440, height: 900 });
const checks = [];
const check = (name, pass, detail = '') => {
  checks.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ': '+detail : ''}`);
};
try {
  await page.waitForFunction(() => window.__TYCOON__?.ready === true, null, { timeout: 180000 });
  const meshes = await page.evaluate(() => {
    const scene = window.__TYCOON__.host.scene;
    const codes = Array.from({ length: 10 }, (_, i) => String(i*100).padStart(3,'0'));
    return codes.map(code => {
      const sign = scene.getMeshByName(`label_shelf_${code}`);
      return { code, exists: !!sign, enabled: !!sign?.isEnabled(),
        hasTexture: !!sign?.material?.albedoTexture,
        parent: sign?.parent?.name ?? '' };
    });
  });
  check('all ten category signs are actual rendered 3D meshes', meshes.length === 10 &&
    meshes.every(m => m.exists && m.enabled && m.hasTexture && m.parent.startsWith('p_shelf_')), JSON.stringify(meshes.filter(m=>!m.exists || !m.hasTexture)));
  await page.click('[data-testid=dock-library]');
  await page.locator('.panel').evaluate(async el => { await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))); });
  check('all ten shelves appear in the Arabic library directory', await page.locator('[data-testid^="shelf-directory-"]').count() === 10);
  const count = page.locator('[data-testid="shelf-match-count"]');
  await page.locator('[data-testid="shelf-search"]').fill('ذكاء اصطناعي');
  check('Arabic topic lookup finds the 000 computer shelf',
    await page.locator('[data-testid^="shelf-directory-"]').count() === 1 &&
    await page.locator('[data-testid="shelf-directory-000"]').count() === 1);
  await page.locator('[data-testid="shelf-directory-000"]').click();
  const selected = await page.evaluate(() => {
    const { controller, host } = window.__TYCOON__;
    host.cam.update(1);
    return { selection: controller.selection, camera: host.cam.state };
  });
  check('choosing a shelf focuses the real 3D camera and selects it',
    selected.selection?.kind === 'shelf' && selected.selection?.id === 'shelf_000' &&
    Math.abs(selected.camera.x - -11) < 2, JSON.stringify(selected));
  await page.locator('[data-testid="shelf-search"]').fill('فيزياء');
  check('physics lookup routes to shelf 500', await page.locator('[data-testid="shelf-directory-500"]').count() === 1 &&
    await page.locator('[data-testid^="shelf-directory-"]').count() === 1);
  await page.locator('[data-testid="shelf-search"]').fill('غير موجود');
  check('invalid topic search reports no results', (await count.textContent())?.includes('٠') &&
    await page.locator('[data-testid="shelf-empty"]').count() === 1);
  await page.locator('[data-testid="shelf-search"]').fill('');
  check('all six planned hall subject collections appear but remain locked', await page.locator('[data-testid^="hall-subjects-"]').count() === 6 &&
    await page.locator('[data-testid^="hall-roadmap-"]').count() === 6);
  await page.screenshot({ path: out + '/directory-desktop-1440x900.png', timeout: 120000 });
  await page.locator('[data-testid="shelf-search"]').fill('الشبكات');
  await page.screenshot({ path: out + '/directory-network-search.png', timeout: 120000 });
  // The same playable directory must work on a touch-sized viewport.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-testid="shelf-search"]').fill('ذكاء اصطناعي');
  await page.locator('.panel').evaluate(async el => { await Promise.all(el.getAnimations().map(a => a.finished.catch(() => {}))); });
  check('phone-size library directory remains readable and searchable',
    await page.locator('[data-testid="shelf-directory-000"]').isVisible());
  await page.screenshot({ path: out + '/directory-phone-390x844.png', timeout: 120000 });
  check('no WebGL or runtime console errors', errors.length === 0, errors.slice(0,2).join(' | '));
} catch (error) {
  check('browser QA execution', false, String(error));
}
writeFileSync(out + '/shelf-qa.json', JSON.stringify({ url, checks, errors }, null, 2));
await browser.close();
process.exit(checks.some(x=>!x.pass) ? 1 : 0);
