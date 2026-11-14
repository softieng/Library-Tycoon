// Real-browser QA for Library Tycoon V3. Drives the actual game in Chromium (WebGL via GPU or SwiftShader),
// plays a mission by clicking real shelves in the 3D world, checks UI/RTL/save behaviour and captures the
// evidence screenshots. Nothing here is mocked: every screenshot is the live canvas + live React UI.
//
//   URL=http://localhost:4173/ node tests/e2e/run.mjs            (functional run + screenshots)
//   SHOT_QUALITY=high|medium  PERF=1  OUT=docs/qa
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openGame } from './browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const URL_ = process.env.URL ?? 'http://localhost:4173/';
const OUT = path.resolve(ROOT, process.env.OUT ?? 'docs/qa');
const SHOTS = path.join(OUT, 'screenshots');
const SHOT_QUALITY = process.env.SHOT_QUALITY ?? 'high';
mkdirSync(SHOTS, { recursive: true });

const results = [];
let failed = 0;
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail: String(detail) }); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };
const T = (page, fn, arg) => page.evaluate(fn, arg);
const ff = (page, s) => T(page, (s) => window.__TYCOON__.fastForward(s), s);
const quality = (page, q) => T(page, (q) => window.__TYCOON__.controller.updateSettings({ quality: q }), q);
const settle = (page, ms = 1500) => page.waitForTimeout(ms);
const shot = async (page, name, q = SHOT_QUALITY) => { await quality(page, q); await settle(page, q === 'high' ? 5000 : 2500); await page.screenshot({ path: path.join(SHOTS, name), timeout: 240000 }); await quality(page, 'medium'); console.log('  screenshot', name); };
/** Click a real object in the 3D world with the mouse (centres the camera on it first so no UI covers it). */
async function clickWorld(page, kind, id, zoom = 6) {
  const pos = await T(page, async ([kind, id, zoom]) => {
    const { host, controller } = window.__TYCOON__, s = controller.state;
    const at = kind === 'visitor' ? s.visitors.find((v) => v.id === id) : kind === 'mascot' ? s.mascot : kind === 'dirt' ? s.dirt.find((d) => d.id === id) : kind === 'misplaced' ? s.missions.misplaced.find((d) => d.id === id) : null;
    const p0 = at ?? window.__TYCOON__.layout.PROP_BY_ID[id];
    if (p0) host.cam.jump(p0.x, p0.z, zoom); else { const l = host.locate(kind, id); if (!l) return null; }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return host.locate(kind, id);
  }, [kind, id, zoom]);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  return true;
}

const t0 = Date.now();
const { browser, page, errors } = await openGame(URL_, { width: 1920, height: 1080 });
const loadMs = Date.now() - t0;

/* ------------------------------------------------------------------ 1. boot, WebGL, assets */
const boot = await T(page, () => ({ ready: window.__TYCOON__.ready, error: window.__TYCOON__.error ?? null, dir: document.documentElement.dir, lang: document.documentElement.lang,
  webgl: window.__TYCOON__.host?.engine.webGLVersion, renderer: window.__TYCOON__.host?.engine.getGlInfo?.().renderer, failures: window.__TYCOON__.host?.lib.failures ?? [],
  mascotMissing: window.__TYCOON__.host?.mascot.missingClips ?? ['?'] }));
check('WebGL scene initialised', boot.ready, boot.error ?? `WebGL${boot.webgl} · ${boot.renderer}`);
if (!boot.ready) { writeReport('BLOCKED: WebGL unavailable in this environment — visual acceptance cannot be evaluated.'); await browser.close(); process.exit(2); }
check('all 3D assets loaded', boot.failures.length === 0, boot.failures.join(','));
check('mascot has all 12 animation clips', boot.mascotMissing.length === 0, boot.mascotMissing.join(','));
check('document is Arabic RTL', boot.dir === 'rtl' && boot.lang === 'ar');
await quality(page, 'medium');
await page.waitForSelector('[data-testid=loading]', { state: 'detached', timeout: 60000 }).catch(() => {});
const blank = await T(page, () => { const c = document.querySelector('canvas'), g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; const set = new Set(); for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return set.size; });
check('canvas renders a non-trivial image', blank > 25, `${blank} distinct colour buckets`);
check('Cairo webfont active for Arabic UI', await T(page, () => document.fonts.check("700 16px Cairo", 'المكتبة')));

/* ------------------------------------------------------------------ 2. HUD + all management panels */
const hud = await T(page, () => Object.fromEntries([...document.querySelectorAll('[data-testid^=hud-]')].map((e) => [e.dataset.testid, e.textContent])));
check('HUD shows IQD balance and indicators', /د\.ع/.test(hud['hud-money'] ?? '') && Object.keys(hud).length === 8, JSON.stringify(hud).slice(0, 160));
const panels = ['home', 'missions', 'build', 'staff', 'services', 'visitors', 'library', 'events', 'achievements', 'finance', 'settings'];
let panelsOk = true; const panelDetail = [];
for (const p of panels) {
  await page.click(`[data-testid=dock-${p}]`);
  const info = await T(page, (p) => { const el = document.querySelector(`[data-testid=panel-${p}]`); return el ? { text: el.textContent.length, ar: /[؀-ۿ]/.test(el.textContent), dir: getComputedStyle(el).direction, w: el.getBoundingClientRect().width } : null; }, p);
  if (!info || !info.ar || info.dir !== 'rtl' || info.text < 40) { panelsOk = false; panelDetail.push(p); }
}
check('11 management panels open with Arabic RTL content', panelsOk, panelDetail.join(','));
const cover = await T(page, () => { const p = document.querySelector('.panel').getBoundingClientRect(); return (p.width * p.height) / (innerWidth * innerHeight); });
check('an open panel leaves the 3D world dominant', cover < 0.2, `${(cover * 100).toFixed(1)}% of the screen`);
await page.click('[data-testid=dock-settings]'); // collapse
check('panels collapse', (await page.$('.panel')) === null);

// The director's daily progression must be visible through the real RTL dashboard.
// Keep it a UI assertion, not an artificial claim, to preserve economy in this suite.
await page.click('[data-testid=dock-home]');
const dailyPanels = await T(page, () => ({
  cards: document.querySelectorAll('[data-testid^="director-goal-"]').length,
  buttons: document.querySelectorAll('[data-testid^="claim-goal-"]').length,
  text: document.querySelector('[data-testid="director-goal-service"]')?.textContent ?? '',
}));
check('daily director challenges render in the real Arabic dashboard',
  dailyPanels.cards === 3 && dailyPanels.buttons === 3 && dailyPanels.text.includes('خدمة'),
  JSON.stringify(dailyPanels).slice(0, 160));
await page.click('[data-testid=dock-home]');

check('credits name present', await T(page, async () => { document.querySelector('[data-testid=dock-settings]').click(); await new Promise((r) => setTimeout(r, 300)); const t = document.querySelector('.credits')?.textContent ?? ''; document.querySelector('[data-testid=dock-settings]').click(); return t.includes('سامر رعد عزاوي') && t.includes('Samer Raad Azzawi'); }));

/* ------------------------------------------------------------------ 3. camera: pan + zoom only, rotation locked */
const cam0 = await T(page, () => { const { host } = window.__TYCOON__; return { ...host.cam.state, dir: host.cam.camera.getForwardRay().direction.asArray() }; });
await page.click('[data-testid=zoom-in]'); await page.click('[data-testid=zoom-in]');
await page.mouse.move(900, 600); await page.mouse.down(); await page.mouse.move(700, 500, { steps: 6 }); await page.mouse.up();
await page.keyboard.down('ArrowRight'); await settle(page, 900); await page.keyboard.up('ArrowRight');
await page.mouse.wheel(0, -400); await settle(page, 1200);
const cam1 = await T(page, () => { const { host } = window.__TYCOON__; return { ...host.cam.state, dir: host.cam.camera.getForwardRay().direction.asArray() }; });
check('camera zooms and pans', cam1.zoom < cam0.zoom - 0.5 && Math.hypot(cam1.x - cam0.x, cam1.z - cam0.z) > 0.5, `zoom ${cam0.zoom.toFixed(1)}→${cam1.zoom.toFixed(1)}`);
check('camera rotation is locked', cam0.dir.every((v, i) => Math.abs(v - cam1.dir[i]) < 1e-4));
for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 600);
await settle(page, 1500);
const camFar = await T(page, () => window.__TYCOON__.host.cam.state.zoom);
check('zoom is clamped to useful limits', camFar <= 14.6, `max zoom ${camFar.toFixed(1)}`);
await page.click('[data-testid=cam-reset]'); await settle(page, 1500);

/* ------------------------------------------------------------------ 4. living hall: visitors, seats, staff rules */
await ff(page, 75);
const live = await T(page, async () => {
  const { controller } = window.__TYCOON__, s = controller.state, L = window.__TYCOON__.layout;
  return { visitors: s.visitors.length, states: [...new Set(s.visitors.map((v) => v.state))], served: s.totals.served, staff: s.staff.map((x) => [x.role, x.x, x.z]), st: L?.STATIONS.st_borrow.spot ?? null };
});
check('visitors arrive and pursue different needs', live.visitors >= 4 && live.states.length >= 3, `${live.visitors} visitors: ${live.states.join(',')}`);
check('services are completed by staff', live.served >= 1, `${live.served} served`);
if (live.st) check('borrowing librarian is exactly at the workstation', live.staff[0][1] === live.st.x && live.staff[0][2] === live.st.z);
await T(page, () => window.__TYCOON__.host.cam.reset(true));
await shot(page, '01-reading-hall-1920x1080.png');

// close-up: student at a bookshelf
const browser_ = await T(page, () => { const T_ = window.__TYCOON__, c = T_.controller; for (let k = 0; k < 400; k++) { const v = c.state.visitors.find((v) => v.state === 'browse'); if (v) { c.setSpeed(0); T_.host.cam.jump(v.x + 0.6, v.z - 0.9, 2.6); return true; } T_.fastForward(0.5); } return false; });
check('a student browses a real bookshelf', browser_);
await shot(page, '02-student-at-bookshelf.png');
// close-up: working employee serving at the borrowing counter
const serving = await T(page, () => { const T_ = window.__TYCOON__, c = T_.controller; c.setSpeed(1); for (let k = 0; k < 900; k++) { if (c.state.service.borrow && c.state.service.borrow.t > 0.8) { c.setSpeed(0); T_.host.cam.jump(-10.6, -4.0, 2.7); return true; } T_.fastForward(0.3); } return false; });
check('the librarian serves a student at the counter', serving);
await shot(page, '03-employee-serving.png');
await T(page, () => window.__TYCOON__.controller.setSpeed(1));

/* ------------------------------------------------------------------ 5. mission: find the missing book by clicking real shelves */
await T(page, () => window.__TYCOON__.host.cam.reset(true));
await page.click('[data-testid=tracker-start]');
const m0 = await T(page, () => ({ active: window.__TYCOON__.controller.state.missions.active?.id, money: window.__TYCOON__.controller.state.money }));
check('mission starts from the mission tracker', m0.active === 'missing_book');
await page.click('[data-testid=dock-missions]'); await settle(page, 600);
await shot(page, '05-mission-interface.png', 'medium');
await page.click('[data-testid=dock-missions]');
check('waiting does not complete the mission', await T(page, () => { window.__TYCOON__.fastForward(15); return window.__TYCOON__.controller.state.missions.active?.id === 'missing_book'; }));
const target = await T(page, () => String(window.__TYCOON__.controller.state.missions.active.data.target));
const all = ['shelf_000', 'shelf_100', 'shelf_200', 'shelf_300', 'shelf_400', 'shelf_500', 'shelf_600', 'shelf_700', 'shelf_800', 'shelf_900'];
// Deliberately search two wrong shelves first, then the right one: proves a wrong guess does not complete the mission.
const shelves = [...all.filter((s) => s !== target).slice(0, 2), target];
let clicks = 0, walkShot = false, done = false;
for (const id of shelves) {
  if (done) break;
  await T(page, () => { const c = window.__TYCOON__.controller; for (let k = 0; k < 300 && (c.state.mascot.task?.kind === 'search' || c.state.mascot.animT > 0); k++) window.__TYCOON__.fastForward(0.3); });
  if (!(await clickWorld(page, 'shelf', id, 7))) continue;
  clicks++;
  const started = await T(page, (id) => window.__TYCOON__.controller.state.mascot.task?.kind === 'search' && window.__TYCOON__.controller.state.mascot.task.shelfId === id, id);
  if (clicks === 1) check('clicking a shelf in the 3D world sends the mascot to search it', started);
  if (clicks === 3) check('two wrong shelves did not complete the mission and produced a hint', await T(page, () => { const r = window.__TYCOON__.controller.state.missions.active; return !!r && String(r.data.searched).split(',').length === 2 && String(r.data.hint).length > 3; }));
  if (!walkShot && started) { // screenshot of the mascot walking on its eight legs
    const walking = await T(page, () => { const T_ = window.__TYCOON__, c = T_.controller; for (let k = 0; k < 120; k++) { T_.fastForward(0.2); const m = c.state.mascot; if (m.anim === 'walk' && k > 12) { c.setSpeed(0); T_.host.cam.jump(m.x, m.z, 2.0); return true; } } return false; });
    if (walking) { await shot(page, '04b-mascot-walking-to-shelf.png', 'medium'); walkShot = true; await T(page, () => window.__TYCOON__.controller.setSpeed(1)); }
  }
  done = await T(page, () => { const T_ = window.__TYCOON__, c = T_.controller; for (let k = 0; k < 400; k++) { T_.fastForward(0.3); if (!c.state.missions.active) return true; if (!c.state.mascot.task || c.state.mascot.task.kind === 'home') { if (c.state.mascot.animT <= 0) break; } } return !c.state.missions.active; });
}
check('mascot walk captured in the library', walkShot);
const m1 = await T(page, () => { const s = window.__TYCOON__.controller.state; return { completed: s.missions.completed.missing_book, last: s.missions.lastResult, money: s.money, log: s.missions.rewardLog }; });
check('missing-book mission completed through world interaction', m1.completed === 1 && m1.last?.status === 'completed', `${clicks} shelves searched`);
check('reward paid exactly once', m1.last?.reward === 120000 && m1.log.filter((x) => x.startsWith('missing_book')).length === 1);
await T(page, () => window.__TYCOON__.host.cam.reset(true));
await page.waitForSelector('[data-testid=mission-result]', { timeout: 20000 }).catch(() => {});
check('completion card shown', (await page.$('[data-testid=mission-result]')) !== null);
await shot(page, '06-mission-completed.png', 'medium');
await page.click('[data-testid=mission-result-ok]').catch(() => {});
// front view: the mascot walking back to its post (toward the camera)
const back = await T(page, () => { const T_ = window.__TYCOON__, c = T_.controller; for (let k = 0; k < 400; k++) { T_.fastForward(0.2); const m = c.state.mascot; if (m.anim === 'walk' && m.task?.kind === 'home' && m.x > 2 && m.z < 3) { c.setSpeed(0); T_.host.cam.jump(m.x, m.z, 2.1); return true; } } return false; });
check('mascot walks back to its post on its own', back);
await shot(page, '04-mascot-walking.png');
await T(page, () => window.__TYCOON__.controller.setSpeed(1));
await T(page, () => window.__TYCOON__.controller.dispatch({ type: 'startMission', id: 'missing_book' }));
check('a completed main mission cannot be replayed for a second reward', await T(page, () => window.__TYCOON__.controller.state.missions.active === null));

/* ------------------------------------------------------------------ 6. mini-game opened from the world */
const cartClicked = await clickWorld(page, 'cart', 'cart', 6);
await page.waitForSelector('[data-testid=dewey]', { timeout: 8000 }).catch(() => {});
check('clicking the returns cart opens the Dewey mini-game', cartClicked && (await page.$('[data-testid=dewey]')) !== null);
for (let i = 0; i < 6; i++) { await page.click('[data-testid=dewey] [data-answer="1"]').catch(() => {}); await page.waitForTimeout(1000); }
check('mini-game is playable to the end', (await page.$('[data-testid=dewey-close]')) !== null);
await page.screenshot({ path: path.join(SHOTS, '07-dewey-minigame-result.png'), timeout: 240000 });
await page.click('[data-testid=dewey-close]').catch(() => {});
check('mini-game score recorded', await T(page, () => window.__TYCOON__.controller.state.totals.deweyBest === 6));

/* ------------------------------------------------------------------ 7. mascot gift (25,000 IQD / 15 min) by clicking the mascot */
await T(page, () => { const c = window.__TYCOON__.controller; for (let k = 0; k < 200 && (c.state.mascot.path || c.state.mascot.task); k++) window.__TYCOON__.fastForward(0.5); });
const g0 = await T(page, () => window.__TYCOON__.controller.state.money);
await clickWorld(page, 'mascot', 'mascot', 5); await settle(page, 400);
const g1 = await T(page, () => window.__TYCOON__.controller.state.money);
await clickWorld(page, 'mascot', 'mascot', 5); await settle(page, 400);
const g2 = await T(page, () => window.__TYCOON__.controller.state.money);
check('clicking the mascot pays the 25,000 IQD gift once per cooldown', g1 - g0 >= 25000 && (g1 - g0) % 75000 === 25000 % 75000 && g2 - g1 < 25000, `+${g1 - g0}, then +${g2 - g1}`);

/* ------------------------------------------------------------------ 8. save → reload → resume */
await page.click('[data-testid=dock-settings]'); await page.click('[data-testid=save-now]');
const before = await T(page, () => { const s = window.__TYCOON__.controller.state; return { money: s.money, day: s.day, done: s.missions.completed.missing_book, gift: s.mascot.lastRewardAt }; });
// In CI, SwiftShader spends substantial time compiling WebGL shaders and loading GLBs.
// 'load' is an unreliable navigation gate with Playwright's 30s default timeout.
// Wait only for the new document to commit, then verify actual game readiness below.
// This preserves the full save/load assertion and does not suppress reload failures.
await page.reload({ waitUntil: 'commit', timeout: 180000 });
await page.waitForFunction(() => window.__TYCOON__?.ready === true, null, { timeout: 180000 });
const after = await T(page, () => { const s = window.__TYCOON__.controller.state; return { money: s.money, day: s.day, done: s.missions.completed.missing_book, gift: s.mascot.lastRewardAt, src: window.__TYCOON__.controller.loadSource }; });
check('progress survives a page reload', after.src === 'save' && after.money === before.money && after.done === 1 && after.gift === before.gift, JSON.stringify(after));

/* ------------------------------------------------------------------ 9. responsive layout */
await quality(page, 'medium');
for (const [w, h] of [[1366, 768], [1024, 700]]) {
  await page.setViewportSize({ width: w, height: h }); await settle(page, 1200);
  const r = await T(page, () => { const tb = document.querySelector('.topbar').getBoundingClientRect(), dk = document.querySelector('.dock').getBoundingClientRect(); return { overflow: document.documentElement.scrollWidth > innerWidth + 1, tb: tb.right <= innerWidth + 1 && tb.left >= -1, dock: dk.bottom <= innerHeight + 1, canvas: document.querySelector('canvas').clientWidth }; });
  check(`layout fits ${w}×${h}`, !r.overflow && r.tb && r.dock && r.canvas === w, JSON.stringify(r));
  if (w === 1366) await page.screenshot({ path: path.join(SHOTS, '08-layout-1366x768.png'), timeout: 120000 });
}
await page.setViewportSize({ width: 1920, height: 1080 });

/* ------------------------------------------------------------------ 10. measured performance (optional) */
let perf = null;
if (process.env.PERF) {
  perf = { loadMs, renderer: boot.renderer, presets: {} };
  await ff(page, 60);
  for (const q of ['low', 'medium', 'high']) {
    await quality(page, q); await settle(page, 4000);
    perf.presets[q] = await T(page, async () => { const { host, controller } = window.__TYCOON__; const t0 = performance.now(); let n = 0; await new Promise((res) => { const f = () => { n++; if (performance.now() - t0 > 8000) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }); const st = controller.world.stats(); return { fps: +(n / ((performance.now() - t0) / 1000)).toFixed(2), drawCalls: st.drawCalls, triangles: Math.round(st.triangles), activeMeshes: st.activeMeshes, visitors: controller.state.visitors.length }; });
  }
  await quality(page, 'medium');
  const mem = async () => T(page, () => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
  const meshes = () => T(page, () => window.__TYCOON__.host.scene.meshes.length);
  const h0 = await mem(), n0 = await meshes(); await ff(page, 720); await settle(page, 3000); const h1 = await mem(), n1 = await meshes();
  perf.memory = { heapMB_start: h0, heapMB_after_3_game_days: h1, sceneMeshes_start: n0, sceneMeshes_after: n1 };
  check('no unbounded scene growth over three simulated days', n1 < n0 + 150, `${n0} → ${n1} meshes; heap ${h0} → ${h1} MB`);
  writeFileSync(path.join(OUT, 'performance.json'), JSON.stringify(perf, null, 2));
}

const benign = (e) => /favicon|ResizeObserver/.test(e);
check('no runtime console errors', errors.filter((e) => !benign(e)).length === 0, errors.filter((e) => !benign(e)).slice(0, 3).join(' | '));
writeReport(failed ? `${failed} check(s) failed` : 'all checks passed');
await browser.close();
process.exit(failed ? 1 : 0);

function writeReport(summary) {
  const lines = [`# Browser QA run`, '', `- URL: ${URL_}`, `- Date: ${new Date().toISOString()}`, `- Renderer: ${typeof boot !== 'undefined' ? boot.renderer : 'n/a'}`, `- Page load to ready: ${loadMs} ms`, `- Result: **${summary}** (${results.filter((r) => r.ok).length}/${results.length})`, '', '| Check | Result | Detail |', '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail.replace(/\|/g, '/').slice(0, 140)} |`)];
  writeFileSync(path.join(OUT, 'browser-qa.md'), lines.join('\n') + '\n');
  writeFileSync(path.join(OUT, 'browser-qa.json'), JSON.stringify({ url: URL_, summary, loadMs, results }, null, 2));
}
