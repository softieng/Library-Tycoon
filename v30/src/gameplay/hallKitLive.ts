import { EXPANSION_BY_ID, type ExpansionHallId } from '../config/expansionHalls';
import { HallGrid, type HallPoint } from './hallKitNav';

/**
 * A light fixed-timestep, deterministic visitor simulation for expansion halls.
 * Runs IN MEMORY only. No salary, financial transaction or campaign save effects.
 * Workers remain at their designed desks. No unrestricted cleaner movement.
 */
export type ServicePolicy = 'careful' | 'balanced' | 'rapid';
export const SERVICE_POLICIES: Readonly<Record<ServicePolicy, { seconds: number; satisfaction: number }>> = {
  careful: { seconds: 6.2, satisfaction: 91 },
  balanced: { seconds: 3.8, satisfaction: 79 },
  rapid: { seconds: 2.4, satisfaction: 65 },
};
export type HallVisitorPhase = 'queue' | 'service' | 'shelf' | 'browse' | 'read' | 'reading' | 'exit';
export interface HallLiveVisitor {
  id: number;
  model: number;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  phase: HallVisitorPhase;
  privateTimer: number;
  route: HallPoint[];
  destination: HallPoint | null;
  shelfId: string;
}
export interface HallLiveStatus {
  readonly hall: ExpansionHallId;
  readonly seconds: number;
  readonly arrivals: number;
  readonly served: number;
  readonly departed: number;
  readonly rejected: number;
  readonly queue: number;
  readonly policy: ServicePolicy;
  readonly satisfaction: number;
  readonly visitors: readonly HallLiveVisitor[];
  readonly staff: Readonly<HallPoint>;
}
const ENTRY: HallPoint = { x: 0, z: -7.5 };
const FRONT: HallPoint = { x: -7.5, z: -6.0 };
const QUEUE_SPACING = 1.0;
const READ_TIME = 6;
const MAX_QUEUE = 6;
const MAX_VISITORS = 15;
const STEP = 0.1;
export const HALL_STAFF_STATION: Readonly<HallPoint> = Object.freeze({ x: -8.7, z: -4.7 });

export class HallLiveEngine {
  readonly nav: HallGrid;
  readonly hall: ExpansionHallId;
  private readonly people: HallLiveVisitor[] = [];
  private readonly line: number[] = [];
  private serviceId: number | null = null;
  private activeServiceSatisfaction = SERVICE_POLICIES.balanced.satisfaction;
  private accumulator = 0;
  private nextSpawn = 2.0;
  private randomState: number;
  private nextId = 1;
  private t = 0;
  private policy: ServicePolicy = 'balanced';
  private satisfactionSum = 0;
  arrivals = 0;
  served = 0;
  departed = 0;
  rejected = 0;

  constructor(hall: ExpansionHallId, seed = 17) {
    this.hall = hall;
    this.nav = new HallGrid(hall);
    this.randomState = (seed | 0) || 17;
    if (!this.nav.isClear(ENTRY) || !this.nav.isClear(FRONT))
      throw new Error('hall_queue_or_door_blocked');
  }
  setServicePolicy(policy: ServicePolicy): boolean {
    if (!Object.prototype.hasOwnProperty.call(SERVICE_POLICIES, policy)) return false;
    this.policy = policy;
    return true;
  }
  private rand() {
    let n = this.randomState;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.randomState = n || 17;
    return (n >>> 0) / 4294967296;
  }
  get snapshot(): HallLiveStatus {
    return {
      hall: this.hall, seconds: this.t,
      arrivals: this.arrivals, served: this.served, departed: this.departed,
      rejected: this.rejected, queue: this.line.length,
      policy: this.policy, satisfaction: this.served
        ? Math.round(this.satisfactionSum / this.served) : 75,
      visitors: this.people.map(v => ({ ...v, route: v.route.map(p => ({ ...p })),
        destination: v.destination ? { ...v.destination } : null })),
      staff: HALL_STAFF_STATION,
    };
  }
  private queuePoint(index: number): HallPoint { return { x: FRONT.x + index * QUEUE_SPACING, z: FRONT.z }; }
  private plan(v: HallLiveVisitor, target: HallPoint): boolean {
    const destination = this.nav.nearest(target);
    if (!destination) return false;
    if (v.destination && Math.abs(v.destination.x - destination.x) < 0.05 &&
        Math.abs(v.destination.z - destination.z) < 0.05) return true;
    const path = this.nav.path({ x: v.x, z: v.z }, destination);
    if (path === null) return false;
    v.destination = destination; v.route = path;
    return true;
  }
  private march(v: HallLiveVisitor, dt: number): boolean {
    const target = v.route[0] ?? v.destination;
    if (!target) return true;
    const dx = target.x - v.x, dz = target.z - v.z, distance = Math.hypot(dx, dz);
    const travel = 1.35 * dt;
    if (distance > 0.005) v.yaw = Math.atan2(dx, dz);
    if (distance <= travel + 0.005) {
      v.x = target.x; v.z = target.z;
      if (v.route.length) v.route.shift();
      v.moving = v.route.length > 0;
    } else {
      v.x += dx / distance * travel;
      v.z += dz / distance * travel;
      v.moving = true;
    }
    return v.route.length === 0 && v.destination !== null &&
      Math.hypot(v.destination.x - v.x, v.destination.z - v.z) <= 0.05;
  }
  private trySpawn() {
    if (this.line.length >= MAX_QUEUE || this.people.length >= MAX_VISITORS) return;
    const shelf = EXPANSION_BY_ID[this.hall].targets.filter(t => t.kind === 'shelf');
    const pick = shelf[Math.floor(this.rand() * shelf.length)]!;
    const v: HallLiveVisitor = {
      id: this.nextId++, model: Math.floor(this.rand() * 12),
      x: ENTRY.x, z: ENTRY.z, yaw: 0, moving: false,
      phase: 'queue', privateTimer: 0, route: [], destination: null,
      shelfId: pick.id,
    };
    this.people.push(v); this.line.push(v.id); this.arrivals++;
  }
  private beginNext(v: HallLiveVisitor, phase: HallVisitorPhase, target: HallPoint): boolean {
    v.phase = phase; v.destination = null; v.route = [];
    if (this.plan(v, target)) return true;
    // A missing route is a reported service failure, never a teleported visitor.
    this.rejected++;
    v.phase = 'exit'; v.destination = null; v.route = [];
    return this.plan(v, ENTRY);
  }
  private tickOne() {
    this.t += STEP;
    this.nextSpawn -= STEP;
    if (this.nextSpawn <= 0) {
      this.trySpawn();
      // Occasional pressure forces a real management choice between throughput
      // and satisfaction instead of making every service policy equivalent.
      this.nextSpawn = 4.0 + this.rand() * 1.8;
    }
    for (const v of this.people) {
      if (v.phase === 'queue') {
        const index = this.line.indexOf(v.id);
        if (index === -1) { this.beginNext(v, 'exit', ENTRY); continue; }
        const desired = this.queuePoint(index);
        if (!this.plan(v, desired)) { this.rejected++; continue; }
        const ready = this.march(v, STEP);
        if (ready && index === 0 && this.serviceId === null) {
          this.serviceId = v.id; v.phase = 'service';
          v.privateTimer = SERVICE_POLICIES[this.policy].seconds;
          // Lock the service outcome when service begins, not after a policy switch.
          this.activeServiceSatisfaction = SERVICE_POLICIES[this.policy].satisfaction;
          v.moving = false;
        }
      } else if (v.phase === 'service') {
        v.privateTimer -= STEP;
        if (v.privateTimer <= 0) {
          this.served++;
          this.satisfactionSum += Math.max(0, this.activeServiceSatisfaction
            - Math.max(0, this.line.length - 2) * 3);
          this.line.shift();
          this.serviceId = null;
          const sh = EXPANSION_BY_ID[this.hall].targets.find(t => t.id === v.shelfId)!;
          this.beginNext(v, 'shelf', { x: sh.x, z: sh.z - 1.2 });
        }
      } else if (v.phase === 'shelf') {
        if (this.march(v, STEP)) { v.phase = 'browse'; v.privateTimer = 2.3; v.moving = false; }
      } else if (v.phase === 'browse') {
        v.privateTimer -= STEP;
        if (v.privateTimer <= 0) {
          const tables = EXPANSION_BY_ID[this.hall].targets.filter(t => t.kind === 'study');
          const table = tables[Math.floor(this.rand() * tables.length)]!;
          this.beginNext(v, 'read', { x: table.x + 0.5, z: table.z - 1.2 });
        }
      } else if (v.phase === 'read') {
        if (this.march(v, STEP)) { v.phase = 'reading'; v.privateTimer = READ_TIME; v.moving = false; }
      } else if (v.phase === 'reading') {
        v.privateTimer -= STEP;
        if (v.privateTimer <= 0) this.beginNext(v, 'exit', ENTRY);
      } else if (v.phase === 'exit') {
        if (this.march(v, STEP)) v.privateTimer = -1;
      }
    }
    for (let i = this.people.length - 1; i >= 0; i--) {
      const v = this.people[i];
      if (v.phase === 'exit' && v.privateTimer === -1) { this.people.splice(i, 1); this.departed++; }
    }
  }
  advance(dt: number): HallLiveStatus {
    if (!Number.isFinite(dt) || dt <= 0) return this.snapshot;
    this.accumulator += Math.min(dt, 0.25);
    let steps = 0;
    while (this.accumulator >= STEP && steps++ < 4) {
      this.tickOne(); this.accumulator -= STEP;
    }
    return this.snapshot;
  }
}
