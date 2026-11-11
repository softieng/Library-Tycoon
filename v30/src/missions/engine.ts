import { BOOKS, DEWEY } from '../config/dewey';
import { PROPS, SHELVES, ZONES } from '../config/layout';
import type { Ctx } from '../gameplay/ctx';
import { clamp, pick, randInt, randRange } from '../gameplay/rng';
import type { DeviceId, GameState, MissionRun } from '../gameplay/types';
import { play, react } from '../mascot/brain';
import { dismiss, emote, spawnDirt, spawnVisitor } from '../visitors/visitors';
import { goTo } from '../navigation/movement';
import { DIFFICULT_CASES, LOST_WANTS, MISSION_BY_ID, MISSIONS, type MissionDef } from './definitions';

export type MissionAvailability = 'active' | 'available' | 'locked' | 'cooldown' | 'completed';
export interface MissionView { def: MissionDef; status: MissionAvailability; lockReasonAr?: string; cooldownLeft?: number; timesCompleted: number }

export function missionStatus(s: GameState, def: MissionDef): MissionView {
  const done = s.missions.completed[def.id] ?? 0;
  const base = { def, timesCompleted: done };
  if (s.missions.active?.id === def.id) return { ...base, status: 'active' };
  if (def.category === 'main' && done > 0) return { ...base, status: 'completed' };
  const pre = def.preconditions;
  const missingM = pre?.missions?.find((m) => !s.missions.completed[m]);
  if (missingM) return { ...base, status: 'locked', lockReasonAr: `أكمل أولاً: ${MISSION_BY_ID[missingM].titleAr}` };
  const missingU = pre?.upgrades?.find((u) => !s.upgrades.includes(u));
  if (missingU) return { ...base, status: 'locked', lockReasonAr: 'تتطلب ترقية من لوحة البناء' };
  if (pre?.minDay && s.day < pre.minDay) return { ...base, status: 'locked', lockReasonAr: `متاحة من اليوم ${pre.minDay}` };
  const cd = (s.missions.cooldownUntil[def.id] ?? 0) - s.playTime;
  if (cd > 0) return { ...base, status: 'cooldown', cooldownLeft: cd };
  return { ...base, status: 'available' };
}
export const missionViews = (s: GameState) => MISSIONS.map((d) => missionStatus(s, d));
export const nextMainMission = (s: GameState) => MISSIONS.find((d) => d.category === 'main' && missionStatus(s, d).status === 'available');

/* ------------------------------------------------------------------ setup effects */
const EFFECTS: Record<string, (ctx: Ctx, run: MissionRun) => void> = {
  hideBook(ctx, run) {
    const book = pick(ctx.s, BOOKS);
    const wrong = SHELVES.filter((sh) => sh.code !== book.code);
    run.data.target = pick(ctx.s, wrong).id; run.data.title = book.title; run.data.home = book.code; run.data.searched = ''; run.data.hint = '';
  },
  referenceRequest(ctx, run) {
    const book = pick(ctx.s, BOOKS);
    run.data.title = book.title; run.data.code = book.code;
    const z = ZONES.find((q) => q.id === 'reference')!;
    const v = spawnVisitor(ctx, { need: 'research', lostWant: 'ref' });
    v.state = 'lost'; goTo(ctx, v, { x: z.guide.x, z: z.guide.z }, z.guide.yaw);
    run.data.visitor = v.id;
  },
  spawnLost(ctx, run) {
    const i = randInt(ctx.s, LOST_WANTS.length);
    const v = spawnVisitor(ctx, { lostWant: String(i) });
    v.state = 'lost'; goTo(ctx, v, { x: 9.3 + randRange(ctx.s, -0.3, 0.3), z: -6.3 }, Math.PI);
    run.data.visitor = v.id; run.data.want = i;
  },
  rush(ctx) { ctx.s.rush = { until: ctx.s.playTime + 150, mult: 2.4 }; },
  examRush(ctx) { ctx.s.rush = { until: ctx.s.playTime + 230, mult: 2.0 }; ctx.s.satisfaction = clamp(ctx.s.satisfaction - 3, 0, 100); },
  spawnVips(_ctx, run) { run.data.toSpawn = 3; run.data.spawnT = 0.5; },
  misplaceBooks(ctx, run) {
    const tables = PROPS.filter((p) => p.type === 'table' && (!p.requires || ctx.owned.has(p.requires)));
    ctx.s.missions.misplaced = [];
    for (let i = 0; i < 5; i++) {
      const t = tables[i % tables.length];
      ctx.s.missions.misplaced.push({ id: ctx.s.nextId++, x: t.x + randRange(ctx.s, -0.8, 0.8), z: t.z + randRange(ctx.s, -0.3, 0.3), seatTable: t.id });
    }
    void run;
  },
  spawnDirt(ctx) { for (let i = 0; i < 3; i++) spawnDirt(ctx, true); for (let i = 0; i < 2; i++) spawnDirt(ctx, false); },
  breakPrinter(ctx) { breakDevice(ctx, 'printer'); },
  breakComputer(ctx, run) {
    const pcs: DeviceId[] = ['pc_1', 'pc_2', 'pc_3', 'pc_4'];
    const free = pcs.filter((p) => !ctx.s.broken.includes(p));
    const id = free.length ? pick(ctx.s, free) : 'pc_1';
    breakDevice(ctx, id); run.data.device = id;
  },
  spawnDifficult(ctx, run) {
    const i = randInt(ctx.s, DIFFICULT_CASES.length);
    const v = spawnVisitor(ctx, { need: 'borrow', difficult: true });
    run.data.visitor = v.id; run.data.scenario = i;
  },
};
export function breakDevice(ctx: Ctx, id: DeviceId) { if (!ctx.s.broken.includes(id)) { ctx.s.broken.push(id); ctx.out.push({ type: 'layout' }); } }

/* ------------------------------------------------------------------ lifecycle */
export function startMission(ctx: Ctx, id: string): boolean {
  const s = ctx.s, def = MISSION_BY_ID[id];
  if (!def || s.missions.active) return false;
  if (missionStatus(s, def).status !== 'available') return false;
  const run: MissionRun = { id, status: 'active', progress: {}, timeLeft: def.timeLimit ?? null, data: {} };
  for (const o of def.objectives) run.progress[o.id] = 0;
  s.missions.active = run; s.missions.dialog = null;
  for (const fx of def.setup) EFFECTS[fx]?.(ctx, run);
  ctx.out.push({ type: 'mission', id, status: 'started' }, { type: 'sfx', name: 'click' });
  ctx.toast(`بدأت المهمة: ${def.titleAr}`, 'info');
  return true;
}

function objectivesMet(s: GameState, def: MissionDef, run: MissionRun) {
  return def.objectives.every((o) => (o.kind === 'count' ? run.progress[o.id] >= o.count : s[o.stat] >= o.gte));
}
export function missionSignal(ctx: Ctx, event: string, n = 1) {
  const run = ctx.s.missions.active; if (!run) return;
  const def = MISSION_BY_ID[run.id];
  for (const o of def.objectives) if (o.kind === 'count' && o.event === event) run.progress[o.id] = Math.min(o.count, run.progress[o.id] + n);
}
function cleanup(ctx: Ctx, run: MissionRun, success: boolean) {
  const s = ctx.s;
  s.missions.misplaced = []; s.missions.dialog = null;
  if (run.id === 'rush_ten' || run.id === 'exam_week') s.rush = null;
  const vid = run.data.visitor as number | undefined;
  const v = vid !== undefined ? s.visitors.find((x) => x.id === vid) : undefined;
  if (v && !success) { v.difficult = false; if (v.state === 'lost' || v.state === 'follow') dismiss(ctx, v, 'unhappy'); }
  if (!success) for (const x of s.visitors) if (x.vip && !x.welcomed) x.emote = null;
}
export function stepMissions(ctx: Ctx, dt: number) {
  const s = ctx.s, run = s.missions.active; if (!run) return;
  const def = MISSION_BY_ID[run.id];
  // Staggered VIP arrivals for the academic delegation.
  if (typeof run.data.toSpawn === 'number' && run.data.toSpawn > 0) {
    run.data.spawnT = (run.data.spawnT as number) - dt;
    if ((run.data.spawnT as number) <= 0) {
      const v = spawnVisitor(ctx, { vip: true, need: pick(s, ['borrow', 'read'] as const) });
      emote(v, 'vip', 999); run.data.toSpawn--; run.data.spawnT = 9;
    }
  }
  if (objectivesMet(s, def, run)) return completeMission(ctx, run, def);
  if (run.timeLeft !== null) {
    run.timeLeft -= dt;
    if (run.timeLeft <= 0) failMission(ctx, 'انتهى الوقت');
  }
}
function completeMission(ctx: Ctx, run: MissionRun, def: MissionDef) {
  const s = ctx.s, times = (s.missions.completed[def.id] ?? 0) + 1, token = `${def.id}#${times}`;
  run.status = 'completed'; s.missions.active = null;
  let paid = 0;
  if (!s.missions.rewardLog.includes(token)) { // a reward token can only ever pay once
    s.missions.rewardLog.push(token);
    paid = def.reward.money; ctx.earn(paid, s.mascot.x, s.mascot.z);
    if (def.reward.satisfaction) s.satisfaction = clamp(s.satisfaction + def.reward.satisfaction, 0, 100);
    if (def.reward.reputationBoost) s.prestige = clamp(s.prestige + def.reward.reputationBoost, 0, 40);
  }
  s.missions.completed[def.id] = times;
  s.missions.cooldownUntil[def.id] = s.playTime + (def.cooldown ?? 0);
  s.missions.lastResult = { id: def.id, status: 'completed', reward: paid, at: s.playTime };
  cleanup(ctx, run, true);
  play(s.mascot, def.feedback.mascot === 'celebrate' ? 'celebrate' : def.feedback.mascot);
  ctx.out.push({ type: 'mission', id: def.id, status: 'completed' }, { type: 'sfx', name: def.feedback.sfx });
  ctx.toast(`اكتملت المهمة: ${def.titleAr}`, 'good');
}
export function failMission(ctx: Ctx, reasonAr: string) {
  const s = ctx.s, run = s.missions.active; if (!run) return;
  const def = MISSION_BY_ID[run.id];
  run.status = 'failed'; s.missions.active = null;
  s.missions.cooldownUntil[def.id] = s.playTime + Math.min(def.cooldown ?? 30, 60);
  s.missions.lastResult = { id: def.id, status: 'failed', reward: 0, at: s.playTime };
  cleanup(ctx, run, false);
  react(s.mascot, 'sad');
  ctx.out.push({ type: 'mission', id: def.id, status: 'failed' }, { type: 'sfx', name: 'bad' });
  ctx.toast(`لم تكتمل المهمة (${reasonAr}): ${def.titleAr}`, 'bad');
}

/* ------------------------------------------------------------------ mission-specific world interactions */
const shelfIndex = (id: string) => SHELVES.findIndex((x) => x.id === id);
/** Called when the mascot finishes physically searching a shelf. */
export function resolveShelfSearch(ctx: Ctx, shelfId: string) {
  const s = ctx.s, run = s.missions.active;
  if (!run || run.id !== 'missing_book') return;
  const list = String(run.data.searched).split(',').filter(Boolean);
  if (!list.includes(shelfId)) list.push(shelfId);
  run.data.searched = list.join(',');
  if (shelfId === run.data.target) { run.data.hint = 'لقيناه!'; missionSignal(ctx, 'book_found'); return; }
  const d = Math.abs(shelfIndex(shelfId) - shelfIndex(String(run.data.target)));
  run.data.hint = d <= 1 ? 'قريب جداً! الكتاب على رف مجاور' : d <= 3 ? 'قريب، الكتاب على بُعد رفّين أو ثلاثة' : 'بعيد، جرّب الجهة الثانية من القاعة';
  s.satisfaction = clamp(s.satisfaction - 1, 0, 100);
  play(s.mascot, 'think');
  ctx.toast(`مو على هذا الرف. ${run.data.hint}`, 'info');
}
export function referenceShelfClick(ctx: Ctx, shelfId: string): boolean {
  const s = ctx.s, run = s.missions.active;
  if (!run || run.id !== 'find_reference') return false;
  const sh = SHELVES.find((x) => x.id === shelfId)!;
  if (sh.code === run.data.code) { missionSignal(ctx, 'reference_found'); return true; }
  const c = DEWEY.find((x) => x.code === sh.code)!;
  s.satisfaction = clamp(s.satisfaction - 1, 0, 100);
  ctx.toast(`رف ${c.code} مخصص لـ«${c.nameAr}». فكّر بموضوع الكتاب`, 'bad');
  return false;
}
