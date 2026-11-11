import { MASCOT_GREET, MASCOT_HOME, SHELVES, ZONES } from '../config/layout';
import type { Ctx } from '../gameplay/ctx';
import { rand } from '../gameplay/rng';
import type { Mascot, MascotState } from '../gameplay/types';
import { angDiff, goTo, stepMover } from '../navigation/movement';

/**
 * The mascot's animation state machine. `anim` is one of the twelve clips authored in
 * Blender; one-shot clips run for a fixed time, then the brain falls back to idle/walk.
 */
export const MASCOT_CLIP_TIME: Record<MascotState, number> = {
  idle: 0, walk: 0, turn: 0, welcome: 2.6, guide: 0, search: 2.8, think: 2.6, celebrate: 3.0, sad: 2.8, read: 6, point: 1.8, wave: 2.4,
};
export function makeMascot(): Mascot {
  return { ...MASCOT_HOME, path: null, pathI: 0, moving: false, turning: false, blockedT: 0, speed: 1.35, faceYaw: MASCOT_HOME.yaw,
    anim: 'idle', animT: 0, task: null, lastRewardAt: 0, rewardsClaimed: 0, idleT: 0 };
}
export function play(m: Mascot, anim: MascotState) { m.anim = anim; m.animT = MASCOT_CLIP_TIME[anim]; }
/** Only guiding and searching are uninterruptible; greeting and walking home give way to player requests. */
export const mascotBusy = (m: Mascot) => m.task?.kind === 'guide' || m.task?.kind === 'search';
/** React with a one-shot clip if the mascot is free (never interrupts guiding/searching). */
export function react(m: Mascot, anim: MascotState) { if (!mascotBusy(m) && !m.path) play(m, anim); }

export interface MascotHooks { onSearchDone(shelfId: string): void; onGuideDone(visitorId: number, dest: string): void }

export function stepMascot(ctx: Ctx, dt: number, others: Parameters<typeof stepMover>[3], hooks: MascotHooks) {
  const m = ctx.s.mascot;
  const oneShot = m.animT > 0;
  if (oneShot) {
    m.animT -= dt;
    if (m.animT > 0) return; // finish the gesture before doing anything else
    m.anim = 'idle';
    if (m.task?.kind === 'search') { const id = m.task.shelfId; m.task = { kind: 'home' }; hooks.onSearchDone(id); if (m.animT > 0) return; }
    else if (m.task?.kind === 'guide' && m.task.dest === '@arrived') { m.task = { kind: 'home' }; }
  }
  if (m.task?.kind === 'guide' && m.task.dest !== '@arrived' && m.path) {
    const gid = m.task.visitorId, gv = ctx.s.visitors.find((x) => x.id === gid);
    if (gv && Math.hypot(gv.x - m.x, gv.z - m.z) > 3.2) { m.moving = false; m.anim = 'guide'; return; } // wait for the student to catch up
  }
  const arrived = stepMover(ctx, m, dt, others);
  if (m.path) { m.anim = m.turning ? 'turn' : 'walk'; m.idleT = 0; }
  else if (m.turning) m.anim = 'turn';
  else if (m.animT <= 0) m.anim = 'idle';

  const t = m.task;
  if (t?.kind === 'search' && arrived && !m.path) { play(m, 'search'); return; }
  if (t?.kind === 'guide' && t.dest !== '@arrived') {
    const v = ctx.s.visitors.find((x) => x.id === t.visitorId);
    if (!v) { m.task = { kind: 'home' }; return; }
    if (arrived && !m.path) {
      const dest = t.dest; t.dest = '@arrived';
      m.faceYaw = Math.atan2(v.x - m.x, v.z - m.z);
      play(m, 'point'); hooks.onGuideDone(v.id, dest);
    }
    return;
  }
  if (t?.kind === 'greet' && arrived && !m.path) { play(m, 'welcome'); m.task = { kind: 'home' }; return; }
  if (t?.kind === 'home' && !m.path && m.animT <= 0) {
    if (Math.hypot(m.x - MASCOT_HOME.x, m.z - MASCOT_HOME.z) > 0.25) goTo(ctx, m, MASCOT_HOME, MASCOT_HOME.yaw);
    else if (Math.abs(angDiff(m.yaw, MASCOT_HOME.yaw)) < 0.1) m.task = null;
  }
  if (!m.task && !m.path && m.animT <= 0) {
    m.idleT += dt;
    if (m.idleT > 13) {
      m.idleT = 0;
      const r = rand(ctx.s);
      play(m, r < 0.4 ? 'read' : r < 0.7 ? 'think' : 'wave');
    }
  }
}

export function sendSearch(ctx: Ctx, shelfId: string): boolean {
  const m = ctx.s.mascot, sh = SHELVES.find((x) => x.id === shelfId);
  if (!sh || m.task?.kind === 'search' || m.task?.kind === 'guide') return false;
  // Stand beside the access spot so a browsing student is never displaced.
  const side = sh.access.yaw === 0 ? { x: sh.access.x + 0.75, z: sh.access.z } : { x: sh.access.x, z: sh.access.z - 0.75 };
  m.animT = 0;
  if (!goTo(ctx, m, side, sh.access.yaw)) return false;
  m.task = { kind: 'search', shelfId };
  return true;
}
export function sendGuide(ctx: Ctx, visitorId: number, zoneId: string): boolean {
  const m = ctx.s.mascot, zone = ZONES.find((z) => z.id === zoneId);
  if (!zone || mascotBusy(m)) return false;
  m.animT = 0;
  if (!goTo(ctx, m, zone.guide, zone.guide.yaw)) return false;
  m.task = { kind: 'guide', visitorId, dest: zoneId };
  return true;
}
export function sendGreet(ctx: Ctx) {
  const m = ctx.s.mascot;
  if (m.task || m.path || m.animT > 0) return;
  if (Math.hypot(m.x - MASCOT_GREET.x, m.z - MASCOT_GREET.z) < 0.3) { play(m, 'welcome'); return; }
  if (goTo(ctx, m, MASCOT_GREET, MASCOT_GREET.yaw)) m.task = { kind: 'greet' };
}
