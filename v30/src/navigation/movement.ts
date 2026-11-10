import type { Ctx } from '../gameplay/ctx';
import type { Mover } from '../gameplay/types';
import { cellOf, type Pt } from './grid';

const TURN_RATE = 7.5; // rad/s
export const angDiff = (a: number, b: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

function stationaryCells(ctx: Ctx, self: Mover) {
  const set = new Set<number>();
  const add = (m: Mover) => { if (m !== self && !m.path) { const k = cellOf(m.x, m.z); set.add(k.r * 1000 + k.c); } };
  ctx.s.visitors.forEach(add); ctx.s.staff.forEach(add); add(ctx.s.mascot);
  return set;
}
/** Plan a collision-aware path. Standing agents are treated as soft obstacles. */
export function goTo(ctx: Ctx, m: Mover, to: Pt, faceYaw?: number, hard?: (c: number, r: number) => boolean): boolean {
  const occ = stationaryCells(ctx, m);
  const path = ctx.nav.findPath(m, to, (c, r) => occ.has(r * 1000 + c), hard);
  if (!path) return false;
  m.path = path; m.pathI = 0; m.blockedT = 0; m.faceYaw = faceYaw;
  return true;
}
export function allMovers(ctx: Ctx): Mover[] { return [...ctx.s.visitors, ...ctx.s.staff, ctx.s.mascot]; }

/** Advance an agent along its path. Returns true when it has arrived (or has no path). */
export function stepMover(ctx: Ctx, m: Mover, dt: number, others: Mover[]): boolean {
  if (!m.path) {
    m.moving = false; m.turning = false;
    if (m.faceYaw !== undefined) {
      const d = angDiff(m.yaw, m.faceYaw);
      if (Math.abs(d) > 0.02) { m.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * dt); m.turning = Math.abs(d) > 0.3; }
    }
    return true;
  }
  const wp = m.path[m.pathI], dx = wp.x - m.x, dz = wp.z - m.z, dist = Math.hypot(dx, dz);
  if (dist < 0.05) {
    m.x = wp.x; m.z = wp.z; m.pathI++;
    if (m.pathI >= m.path.length) { m.path = null; m.moving = false; return true; }
    return false;
  }
  const want = Math.atan2(dx, dz), d = angDiff(m.yaw, want);
  m.yaw += Math.sign(d) * Math.min(Math.abs(d), TURN_RATE * dt);
  if (Math.abs(d) > 1.1) { m.moving = false; m.turning = true; return false; } // turn on the spot first
  m.turning = false;
  const step = Math.min(dist, m.speed * dt), nx = m.x + (dx / dist) * step, nz = m.z + (dz / dist) * step;
  let blocked = false;
  if (m.blockedT < 2.4) {
    for (const o of others) {
      if (o === m) continue;
      const ox = o.x - nx, oz = o.z - nz, od = Math.hypot(ox, oz);
      if (od > 0.5) continue;
      const ahead = ox * dx + oz * dz > 0;
      // Yield to agents ahead that are standing, or (to break symmetry) that started blocking earlier.
      if (ahead && (!o.moving || o.blockedT <= m.blockedT)) { blocked = true; break; }
    }
  }
  if (blocked) {
    m.moving = false; m.blockedT += dt;
    if (m.blockedT > 0.9 && m.path) { // try to walk around
      const goal = m.path[m.path.length - 1], keep = m.blockedT, face = m.faceYaw;
      if (goTo(ctx, m, goal, face)) m.blockedT = keep;
    }
    return false;
  }
  m.blockedT = Math.max(0, m.blockedT - dt * 0.5);
  m.x = nx; m.z = nz; m.moving = true;
  return false;
}
export const near = (a: Pt, b: Pt, d = 0.12) => Math.hypot(a.x - b.x, a.z - b.z) <= d;
