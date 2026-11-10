import { BALANCE } from '../config/balance';
import { CLEANER_ZONE, STATIONS } from '../config/layout';
import { ROLE_BY_ID, STAFF_NAMES, type RoleId } from '../config/services';
import type { Ctx } from '../gameplay/ctx';
import { clamp } from '../gameplay/rng';
import type { GameState, Staff } from '../gameplay/types';
import { cellOf, centerOf } from '../navigation/grid';
import { goTo, stepMover } from '../navigation/movement';

export function makeStaff(s: GameState, role: RoleId): Staff {
  const st = STATIONS[ROLE_BY_ID[role].station];
  return {
    id: s.nextId++, role, name: STAFF_NAMES[role], level: 1, xp: 0, morale: 78, energy: 100,
    state: 'working', timer: 0, servedToday: 0, servedTotal: 0, serviceTime: 0, targetDirt: null, emote: null,
    x: st.spot.x, z: st.spot.z, yaw: st.spot.yaw, path: null, pathI: 0, moving: false, turning: false, blockedT: 0, speed: 1.5, faceYaw: st.spot.yaw,
  };
}
export const salaryOf = (st: Staff) => Math.round(ROLE_BY_ID[st.role].hireCost * BALANCE.salaryRate * (1 + 0.25 * (st.level - 1)));
export const trainCostOf = (st: Staff) => Math.round(ROLE_BY_ID[st.role].hireCost * BALANCE.trainCostRate * st.level);
/** Work speed multiplier: level and morale both matter. */
export const efficiencyOf = (st: Staff) => (0.85 + 0.15 * st.level) * (0.75 + 0.25 * (st.morale / 100));

/** Hard navigation filter: cells outside the cleaning zone are forbidden for the cleaner. */
export const outsideCleanerZone = (c: number, r: number) => {
  const p = centerOf(c, r);
  return p.x < CLEANER_ZONE.minX || p.x > CLEANER_ZONE.maxX || p.z < CLEANER_ZONE.minZ || p.z > CLEANER_ZONE.maxZ;
};
void cellOf;

export function stepStaff(ctx: Ctx, st: Staff, dt: number, others: Parameters<typeof stepMover>[3]) {
  const s = ctx.s, lounge = ctx.owned.has('staff_lounge');
  if (st.emote) { st.emote.t -= dt; if (st.emote.t <= 0) st.emote = null; }
  // Morale drifts toward a target driven by workload and conditions.
  const pressure = st.role === 'borrowing' ? s.queues.borrow.length : st.role === 'digital' ? s.queues.print.length : st.role === 'research' ? s.queues.research.length : st.role === 'cleaner' ? s.dirt.length * 0.6 : s.visitors.length * 0.15;
  const target = clamp(74 + (lounge ? 12 : 0) + st.level * 2 - pressure * 4, 20, 100);
  st.morale += (target - st.morale) * 0.03 * dt;

  if (st.role !== 'cleaner') {
    // Service employees never leave their workstation.
    const home = STATIONS[ROLE_BY_ID[st.role].station].spot;
    st.x = home.x; st.z = home.z; st.path = null; st.moving = false; st.faceYaw = home.yaw;
    stepMover(ctx, st, dt, others);
    if (st.state === 'break') {
      st.timer -= dt;
      if (st.timer <= 0) { st.state = 'working'; st.energy = 100; st.emote = null; }
    } else if (st.state === 'working') {
      st.energy = clamp(st.energy - 0.04 * dt, 0, 100);
      if (st.energy < 18) { st.state = 'break'; st.timer = lounge ? 6 : 11; st.emote = { kind: 'sleep', t: st.timer }; }
    }
    return;
  }
  // ---- Cleaner: free to move, but only inside the cleaning zone. ----
  const home = STATIONS.st_cleaner.spot;
  const arrived = stepMover(ctx, st, dt, others);
  if (st.state === 'working') {
    const spots = s.dirt.filter((d) => d.inZone);
    if (spots.length) {
      spots.sort((a, b) => Math.hypot(a.x - st.x, a.z - st.z) - Math.hypot(b.x - st.x, b.z - st.z));
      const d = spots[0];
      if (goTo(ctx, st, { x: d.x, z: d.z }, undefined, outsideCleanerZone)) { st.targetDirt = d.id; st.state = 'walking'; }
    } else if (Math.hypot(st.x - home.x, st.z - home.z) > 0.3 && !st.path) {
      goTo(ctx, st, home, home.yaw, outsideCleanerZone);
    }
  } else if (st.state === 'walking') {
    const d = s.dirt.find((x) => x.id === st.targetDirt);
    if (!d) { st.state = 'working'; st.targetDirt = null; st.path = null; }
    else if (arrived) { st.state = 'cleaning'; st.timer = 2.6 / efficiencyOf(st); }
  } else if (st.state === 'cleaning') {
    st.timer -= dt;
    const d = s.dirt.find((x) => x.id === st.targetDirt);
    if (d) d.cleaning = 1;
    if (st.timer <= 0 || !d) {
      if (d) { s.dirt.splice(s.dirt.indexOf(d), 1); s.totals.cleaned++; st.servedToday++; st.servedTotal++; st.xp++; ctx.signal('dirt_cleaned'); }
      st.state = 'working'; st.targetDirt = null;
    }
  }
}
