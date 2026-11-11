// Shared launcher for real-browser QA. Uses the system Playwright + Chromium with software WebGL
// (SwiftShader) when no GPU is present, so the 3D scene is genuinely rendered in CI.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');
export const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage'];
export async function openGame(url, { width = 1920, height = 1080, storage } = {}) {
  const browser = await chromium.launch({ args: GL_ARGS });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'ar-IQ' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  if (storage) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__TYCOON__ !== undefined, null, { timeout: 180000 });
  return { browser, context, page, errors };
}
