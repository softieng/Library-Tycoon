import { EXPANSION_BY_ID, type ExpansionHallId, type HallTarget } from '../config/expansionHalls';

export interface HallPoint { x: number; z: number }
export const HALL_CELL = 0.5;
const X0 = -10.5, X1 = 10.5, Z0 = -7.5, Z1 = 7.5;
const NX = Math.round((X1 - X0) / HALL_CELL) + 1;
const NZ = Math.round((Z1 - Z0) / HALL_CELL) + 1;
const DIRS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
] as const;

/** Uniform grid navigation with solid furniture and no diagonal corner cuts. */
export class HallGrid {
  private readonly blocked = new Uint8Array(NX * NZ);
  constructor(public readonly hallId: ExpansionHallId) {
    for (const t of EXPANSION_BY_ID[hallId].targets) this.blockFurniture(t);
  }
  private index(x: number, z: number) { return z * NX + x; }
  private toCell(p: HallPoint) {
    return {
      x: Math.min(NX - 1, Math.max(0, Math.round((p.x - X0) / HALL_CELL))),
      z: Math.min(NZ - 1, Math.max(0, Math.round((p.z - Z0) / HALL_CELL))),
    };
  }
  private fromIndex(idx: number): HallPoint {
    return { x: X0 + (idx % NX) * HALL_CELL, z: Z0 + Math.floor(idx / NX) * HALL_CELL };
  }
  private blockFurniture(t: HallTarget) {
    const width = t.kind === 'study' ? 2.3 : t.kind === 'shelf' ? 1.85 :
      t.model === 'kiosk' || t.model === 'printer' ? 0.85 : 2.2;
    const depth = t.kind === 'study' ? 1.2 : t.kind === 'shelf' ? 0.85 :
      t.model === 'kiosk' || t.model === 'printer' ? 0.85 : 1.3;
    const safety = 0.19;
    for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) {
      const p = this.fromIndex(this.index(x, z));
      if (Math.abs(p.x - t.x) <= width / 2 + safety &&
          Math.abs(p.z - t.z) <= depth / 2 + safety)
        this.blocked[this.index(x, z)] = 1;
    }
  }
  isClear(p: HallPoint): boolean {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z) ||
        p.x < X0 || p.x > X1 || p.z < Z0 || p.z > Z1) return false;
    const c = this.toCell(p);
    return this.blocked[this.index(c.x, c.z)] === 0;
  }
  /** All positions used by gameplay are inside the hall and validated. */
  nearest(p: HallPoint): HallPoint | null {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return null;
    const at = this.toCell(p), idx = this.index(at.x, at.z);
    if (!this.blocked[idx]) return this.fromIndex(idx);
    for (let radius = 1; radius < 12; radius++) {
      let best: HallPoint | null = null, bestD = Infinity;
      for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        const x = at.x + dx, z = at.z + dz;
        if (x < 0 || z < 0 || x >= NX || z >= NZ || this.blocked[this.index(x, z)]) continue;
        const point = this.fromIndex(this.index(x, z));
        const d = Math.hypot(point.x - p.x, point.z - p.z);
        if (d < bestD) { best = point; bestD = d; }
      }
      if (best) return best;
    }
    return null;
  }
  /** A* with bounded hops, no fake direct path through bookshelves. */
  path(from: HallPoint, to: HallPoint): HallPoint[] | null {
    const start = this.nearest(from), end = this.nearest(to);
    if (!start || !end) return null;
    const s = this.toCell(start), g = this.toCell(end);
    const startIdx = this.index(s.x, s.z), goalIdx = this.index(g.x, g.z);
    if (startIdx === goalIdx) return [];
    const gScore = new Float64Array(this.blocked.length).fill(Infinity);
    const came = new Int32Array(this.blocked.length).fill(-1);
    const closed = new Uint8Array(this.blocked.length);
    const open = new Set<number>([startIdx]);
    gScore[startIdx] = 0;
    const heuristic = (idx: number) => {
      const x = idx % NX, z = Math.floor(idx / NX);
      return Math.hypot(x - g.x, z - g.z);
    };
    let visits = 0;
    while (open.size && visits++ < this.blocked.length) {
      let best = -1, bestF = Infinity;
      for (const idx of open) {
        const f = gScore[idx] + heuristic(idx);
        if (f < bestF) { best = idx; bestF = f; }
      }
      if (best === goalIdx) {
        const out: HallPoint[] = [];
        let i = best;
        while (i !== startIdx && i >= 0) { out.push(this.fromIndex(i)); i = came[i]; }
        out.reverse(); return out;
      }
      open.delete(best); closed[best] = 1;
      const x = best % NX, z = Math.floor(best / NX);
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nx >= NX || nz < 0 || nz >= NZ) continue;
        const next = this.index(nx, nz);
        if (this.blocked[next] || closed[next]) continue;
        if (dx && dz && (this.blocked[this.index(x + dx, z)] || this.blocked[this.index(x, z + dz)]))
          continue;
        const score = gScore[best] + (dx && dz ? Math.SQRT2 : 1);
        if (score >= gScore[next]) continue;
        gScore[next] = score; came[next] = best; open.add(next);
      }
    }
    return null;
  }
}
