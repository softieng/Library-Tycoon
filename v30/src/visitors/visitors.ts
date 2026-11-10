import { BALANCE } from '../config/balance';
import { DOOR, QUEUES, SEATS, SHELVES, type SeatInfo } from '../config/layout';
import { SERVICES } from '../config/services';
import type { Ctx } from '../gameplay/ctx';
import { clamp, pick, rand, randInt, randRange } from '../gameplay/rng';
import type { EmoteKind, Need, Visitor } from '../gameplay/types';
import { goTo, near, stepMover } from '../navigation/movement';

export const VISITOR_MODELS = 12;
export type QueueId = 'borrow' | 'print' | 'research';

export function emote(v: { emote: Visitor['emote'] }, kind: EmoteKind, t = 2.6) { v.emote = { kind, t }; }

export function chooseNeed(ctx: Ctx): Need {
  const o = ctx.owned, bag: Need[] = ['borrow', 'borrow', 'borrow', 'borrow', 'read', 'read', 'read', 'computer'];
  if (o.has('print_office')) bag.push('print', 'print');
  if (o.has('shelves_khwarizmi')) bag.push('research', 'research');
  if (o.has('ecatalog_lab')) bag.push('computer');
  return pick(ctx.s, bag);
}

export function spawnVisitor(ctx: Ctx, opts: Partial<Visitor> = {}): Visitor {
  const s = ctx.s;
  const v: Visitor = {
    id: s.nextId++, model: randInt(s, VISITOR_MODELS), need: chooseNeed(ctx), state: 'enter',
    x: DOOR.outside.x + randRange(s, -0.5, 0.5), z: DOOR.outside.z, yaw: 0,
    path: null, pathI: 0, moving: false, turning: false, blockedT: 0, speed: randRange(s, 1.55, 1.95),
    timer: 0, patience: BALANCE.patience * (ctx.owned.has('waiting_area') ? 1.3 : 1), waited: 0,
    emote: null, carrying: false, activity: null, seatId: null, shelfId: null, queue: null, slot: -1,
    vip: false, lostWant: null, difficult: false, gesture: null, gestureT: 0, welcomed: false, score: 78,
    ...opts,
  };
  s.visitors.push(v);
  s.ledger.arrivals++; s.totals.visitors++;
  goTo(ctx, v, { x: DOOR.inside.x + randRange(s, -0.6, 0.6), z: DOOR.inside.z + randRange(s, 0, 0.8) });
  return v;
}

const seatAvailable = (ctx: Ctx, seat: SeatInfo) =>
  (!seat.requires || ctx.owned.has(seat.requires)) && ctx.s.seats[seat.id] === undefined &&
  !(seat.kind === 'pc' && ctx.s.broken.includes(seat.table as never));

export function freeSeats(ctx: Ctx, kind: 'read' | 'pc') { return SEATS.filter((x) => x.kind === kind && seatAvailable(ctx, x)); }

function leave(ctx: Ctx, v: Visitor, mood: 'happy' | 'unhappy' | 'neutral') {
  releaseAll(ctx, v);
  if (mood === 'unhappy') { emote(v, 'dissatisfied', 4); v.gesture = 'no'; v.gestureT = 1.2; v.score = Math.min(v.score, 22); ctx.s.ledger.lost++; }
  if (mood === 'happy') emote(v, 'happy', 2.4);
  v.state = 'leave'; v.activity = null;
  goTo(ctx, v, DOOR.outside);
}
export function dismiss(ctx: Ctx, v: Visitor, mood: 'happy' | 'unhappy' | 'neutral' = 'neutral') { leave(ctx, v, mood); }

export function releaseAll(ctx: Ctx, v: Visitor) {
  const s = ctx.s;
  if (v.seatId && s.seats[v.seatId] === v.id) delete s.seats[v.seatId];
  if (v.shelfId && s.shelfUsers[v.shelfId] === v.id) delete s.shelfUsers[v.shelfId];
  if (v.queue) {
    const q = s.queues[v.queue], i = q.indexOf(v.id);
    if (i >= 0) q.splice(i, 1);
    if (s.service[v.queue]?.visitorId === v.id) s.service[v.queue] = null;
  }
  v.seatId = null; v.shelfId = null; v.queue = null; v.slot = -1;
}

export function joinQueue(ctx: Ctx, v: Visitor, q: QueueId): boolean {
  const list = ctx.s.queues[q];
  if (list.length >= Math.min(BALANCE.queueCapacity, QUEUES[q].length)) return false;
  list.push(v.id); v.queue = q; v.slot = -1; v.state = 'toQueue';
  return true;
}

function toShelf(ctx: Ctx, v: Visitor, preferred?: string): boolean {
  const free = SHELVES.filter((sh) => ctx.s.shelfUsers[sh.id] === undefined);
  const sh = (preferred && free.find((x) => x.id === preferred)) || (free.length ? pick(ctx.s, free) : null);
  if (!sh) return false;
  ctx.s.shelfUsers[sh.id] = v.id; v.shelfId = sh.id; v.state = 'toShelf';
  return goTo(ctx, v, sh.access, sh.access.yaw);
}
export function sendToShelf(ctx: Ctx, v: Visitor, shelfId: string) { releaseAll(ctx, v); return toShelf(ctx, v, shelfId); }

function toSeat(ctx: Ctx, v: Visitor, kind: 'read' | 'pc'): boolean {
  const free = freeSeats(ctx, kind);
  if (!free.length) return false;
  // Prefer the nearest free seat so behaviour is understandable.
  free.sort((a, b) => Math.hypot(a.spot.x - v.x, a.spot.z - v.z) - Math.hypot(b.spot.x - v.x, b.spot.z - v.z));
  const seat = free[Math.min(free.length - 1, randInt(ctx.s, 2))];
  ctx.s.seats[seat.id] = v.id; v.seatId = seat.id; v.state = 'toSeat';
  return goTo(ctx, v, seat.approach, seat.approach.yaw);
}

/** Decide what a visitor does next according to its real need. */
export function pursueNeed(ctx: Ctx, v: Visitor) {
  switch (v.need) {
    case 'borrow': case 'read':
      if (!toShelf(ctx, v)) { v.state = 'enter'; v.timer = 1.2; }
      break;
    case 'computer': case 'print':
      if (!toSeat(ctx, v, 'pc')) { ctx.toast('طالب لم يجد حاسبة شاغرة وغادر', 'bad'); leave(ctx, v, 'unhappy'); }
      break;
    case 'research':
      if (!joinQueue(ctx, v, 'research')) leave(ctx, v, 'unhappy');
      break;
  }
}

export function stepVisitor(ctx: Ctx, v: Visitor, dt: number, others: Parameters<typeof stepMover>[3]) {
  const s = ctx.s;
  if (v.emote && v.emote.t < 900) { v.emote.t -= dt; if (v.emote.t <= 0) v.emote = null; }
  if (v.gesture) { v.gestureT -= dt; if (v.gestureT <= 0) v.gesture = null; }
  const arrived = v.state === 'sit' ? true : stepMover(ctx, v, dt, others);

  switch (v.state) {
    case 'enter':
      if (!arrived) break;
      if (v.timer > 0) { v.timer -= dt; if (v.timer > 0) break; }
      pursueNeed(ctx, v);
      break;
    case 'toShelf':
      if (arrived) { v.state = 'browse'; v.timer = randRange(s, 3.2, 6); }
      break;
    case 'browse':
      v.timer -= dt;
      if (v.timer < 1.1 && !v.carrying) { v.carrying = true; v.gesture = 'pickup'; v.gestureT = 1.0; }
      if (v.timer > 0) break;
      if (v.shelfId) { delete s.shelfUsers[v.shelfId]; v.shelfId = null; }
      if (v.need === 'borrow') { if (!joinQueue(ctx, v, 'borrow')) { ctx.toast('طابور الإعارة ممتلئ، طالب غادر بدون كتابه', 'bad'); leave(ctx, v, 'unhappy'); } }
      else if (v.need === 'read') { if (!toSeat(ctx, v, 'read')) { ctx.toast('لا يوجد مقعد مطالعة شاغر، طالب غادر منزعجاً', 'bad'); leave(ctx, v, 'unhappy'); } }
      else { v.score = Math.max(v.score, 90); leave(ctx, v, 'happy'); }
      break;
    case 'toQueue': case 'queue': {
      const q = v.queue!; const idx = s.queues[q].indexOf(v.id);
      if (idx < 0) { leave(ctx, v, 'neutral'); break; }
      const slot = Math.min(idx, QUEUES[q].length - 1);
      if (slot !== v.slot) { v.slot = slot; goTo(ctx, v, QUEUES[q][slot], QUEUES[q][slot].yaw); break; }
      if (arrived && near(v, QUEUES[q][slot], 0.2)) v.state = 'queue';
      v.waited += dt;
      if (v.state === 'queue' && !v.difficult) {
        v.patience -= dt * (v.vip && !v.welcomed ? 1.6 : 1);
        if (v.patience < 9 && !v.emote) emote(v, 'wait', 1.5);
        if (v.patience <= 0) { ctx.toast(`طالب ملّ من انتظار ${SERVICES[q].nameAr} وغادر`, 'bad'); leave(ctx, v, 'unhappy'); }
      }
      break;
    }
    case 'served': break; // progressed by the service desk
    case 'toSeat': {
      if (!arrived) break;
      const seat = SEATS.find((x) => x.id === v.seatId);
      if (!seat) { leave(ctx, v, 'neutral'); break; }
      v.x = seat.spot.x; v.z = seat.spot.z; v.yaw = seat.spot.yaw; v.faceYaw = seat.spot.yaw;
      v.state = 'sit';
      if (seat.kind === 'pc') { v.activity = 'computer'; v.timer = randRange(s, 10, 18) * (ctx.owned.has('ecatalog_lab') ? 0.75 : 1); }
      else { v.activity = rand(s) < 0.35 ? 'write' : 'read'; v.timer = randRange(s, 12, 24); }
      break;
    }
    case 'sit': {
      v.timer -= dt;
      const seat = SEATS.find((x) => x.id === v.seatId);
      if (seat?.kind === 'pc' && s.broken.includes(seat.table as never)) { ctx.toast('حاسبة تعطّلت أثناء الاستخدام', 'bad'); standUp(v, seat); leave(ctx, v, 'unhappy'); break; }
      if (v.timer > 0) break;
      if (seat) standUp(v, seat);
      if (v.seatId) { delete s.seats[v.seatId]; v.seatId = null; }
      v.activity = null;
      if (v.need === 'read') {
        if (ctx.owned.has('reading_hall')) {
          const sup = s.staff.find((x) => x.role === 'supervisor');
          ctx.earn(Math.round(SERVICES.reading.reward * (sup ? 1 + 0.08 * sup.level : 1)), v.x, v.z);
          s.ledger.byService.reading++; countServed(ctx, v);
          if (sup) { sup.servedToday++; sup.servedTotal++; sup.xp++; }
        }
        v.score = Math.max(v.score, 88); leave(ctx, v, 'happy');
      } else if (v.need === 'print') {
        if (!ctx.owned.has('print_office')) { v.score = Math.max(v.score, 84); leave(ctx, v, 'happy'); }
        else if (s.broken.includes('printer')) { ctx.toast('الطابعة عاطلة، طالب غادر بدون أوراقه', 'bad'); leave(ctx, v, 'unhappy'); }
        else if (!joinQueue(ctx, v, 'print')) leave(ctx, v, 'unhappy');
      } else { v.score = Math.max(v.score, 86); leave(ctx, v, 'happy'); }
      break;
    }
    case 'leave':
      if (arrived) {
        v.state = 'gone';
        const restroom = ctx.owned.has('restrooms');
        let score = v.score - (100 - s.cleanliness) * 0.25 + (restroom ? 2 : 0) + (ctx.owned.has('corridor_plants') ? 3 : 0) + (ctx.owned.has('golden_library') ? 3 : 0);
        score = clamp(score, 0, 100);
        s.satisfaction = clamp(s.satisfaction * 0.92 + score * 0.08, 0, 100);
        if (v.vip && score >= 70) ctx.signal('vip_served');
        if (rand(s) < BALANCE.dirtChance * (restroom ? 0.6 : 1)) spawnDirt(ctx);
      }
      break;
    case 'lost':
      if (!v.emote) emote(v, v.lostWant === 'ref' ? 'request' : 'confused', 999);
      break;
    case 'follow': {
      const m = s.mascot, d = Math.hypot(m.x - v.x, m.z - v.z);
      v.timer -= dt;
      if (d > 1.5 && v.timer <= 0) { v.timer = 0.5; goTo(ctx, v, { x: m.x - Math.sin(m.yaw) * 0.9, z: m.z - Math.cos(m.yaw) * 0.9 }); }
      break;
    }
    case 'gone': break;
  }
}
function standUp(v: Visitor, seat: SeatInfo) { v.x = seat.approach.x; v.z = seat.approach.z; }
export function countServed(ctx: Ctx, v: Visitor) {
  ctx.s.ledger.served++; ctx.s.totals.served++;
  ctx.signal('visitor_served');
  void v;
}

export function spawnDirt(ctx: Ctx, forceZone?: boolean) {
  const s = ctx.s;
  if (s.dirt.length >= 9) return;
  // Imported lazily to avoid a config cycle.
  const Z = { minX: -5, maxX: 9.6, minZ: -1.2, maxZ: 7.2 };
  const inZone = forceZone ?? rand(s) < 0.72;
  for (let i = 0; i < 40; i++) {
    const x = inZone ? randRange(s, Z.minX + 0.6, Z.maxX - 0.6) : randRange(s, -11.5, 11.5);
    const z = inZone ? randRange(s, Z.minZ + 0.6, Z.maxZ - 0.6) : randRange(s, -8, -1.8);
    if (!ctx.nav.walkable(x, z)) continue;
    const inside = x > Z.minX + 0.3 && x < Z.maxX - 0.3 && z > Z.minZ + 0.3 && z < Z.maxZ - 0.3;
    if (inside !== inZone) continue;
    s.dirt.push({ id: s.nextId++, x, z, inZone, cleaning: 0 });
    return;
  }
}
