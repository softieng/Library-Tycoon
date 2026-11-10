import { DOOR, HALL, PROPS, type Prop } from '../config/layout';

/** Static navigation grid + A* with line-of-sight smoothing. Pure and deterministic. */
export interface Pt { x: number; z: number }
const C = HALL.cell;
export const GRID_MIN_X = HALL.minX;
export const GRID_MIN_Z = HALL.minZ - 2; // two rows outside the door
export const COLS = Math.round((HALL.maxX - HALL.minX) / C);
export const ROWS = Math.round((HALL.maxZ - GRID_MIN_Z) / C);
const AGENT_R = 0.22;

export function footprint(p: Prop) {
  const w = p.rot % 2 ? p.d : p.w, d = p.rot % 2 ? p.w : p.d;
  return { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2 };
}
export const cellOf = (x: number, z: number) => ({ c: Math.floor((x - GRID_MIN_X) / C), r: Math.floor((z - GRID_MIN_Z) / C) });
export const centerOf = (c: number, r: number): Pt => ({ x: GRID_MIN_X + (c + 0.5) * C, z: GRID_MIN_Z + (r + 0.5) * C });

export class NavGrid {
  readonly blocked: Uint8Array;
  constructor(readonly owned: ReadonlySet<string>) {
    this.blocked = new Uint8Array(COLS * ROWS);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const p = centerOf(c, r);
      let b = false;
      if (p.z < HALL.minZ + 0.3) b = !(p.x > DOOR.minX + 0.2 && p.x < DOOR.maxX - 0.2); // outside wall, except the doorway
      else if (p.x < HALL.minX + 0.3 || p.x > HALL.maxX - 0.3 || p.z > HALL.maxZ - 0.3) b = true;
      this.blocked[r * COLS + c] = b ? 1 : 0;
    }
    for (const prop of PROPS) {
      if (!prop.solid || (prop.requires && !owned.has(prop.requires))) continue;
      const f = footprint(prop);
      const a = cellOf(f.minX - AGENT_R, f.minZ - AGENT_R), b = cellOf(f.maxX + AGENT_R, f.maxZ + AGENT_R);
      for (let r = Math.max(0, a.r); r <= Math.min(ROWS - 1, b.r); r++) for (let c = Math.max(0, a.c); c <= Math.min(COLS - 1, b.c); c++) {
        const p = centerOf(c, r);
        if (p.x > f.minX - AGENT_R && p.x < f.maxX + AGENT_R && p.z > f.minZ - AGENT_R && p.z < f.maxZ + AGENT_R) this.blocked[r * COLS + c] = 1;
      }
    }
  }
  isBlocked(c: number, r: number) { return c < 0 || r < 0 || c >= COLS || r >= ROWS || this.blocked[r * COLS + c] === 1; }
  walkable(x: number, z: number) { const k = cellOf(x, z); return !this.isBlocked(k.c, k.r); }

  /** Nearest free cell to a point (spiral search); seats/stations may sit inside inflated footprints. */
  nearestFree(x: number, z: number) {
    const k = cellOf(x, z);
    if (!this.isBlocked(k.c, k.r)) return k;
    let best: { c: number; r: number } | null = null, bd = 1e9;
    for (let rad = 1; rad < 8 && !best; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
      const c = k.c + dc, r = k.r + dr;
      if (this.isBlocked(c, r)) continue;
      const p = centerOf(c, r), d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = { c, r }; }
    }
    return best ?? k;
  }

  lineFree(a: Pt, b: Pt, hard?: (c: number, r: number) => boolean) {
    const dist = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(dist / (C * 0.4)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (!this.walkable(x, z)) return false;
      if (hard) { const k = cellOf(x, z); if (hard(k.c, k.r)) return false; }
    }
    return true;
  }

  /** A* (8-neighbour, no corner cutting). Returns smoothed waypoints ending exactly at `to`, or null. */
  findPath(from: Pt, to: Pt, avoid?: (c: number, r: number) => boolean, hard?: (c: number, r: number) => boolean): Pt[] | null {
    const s = this.nearestFree(from.x, from.z), g = this.nearestFree(to.x, to.z);
    const N = COLS * ROWS, start = s.r * COLS + s.c, goal = g.r * COLS + g.c;
    const gs = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open: number[] = [start], f = new Float32Array(N).fill(Infinity);
    const h = (i: number) => { const dc = Math.abs((i % COLS) - g.c), dr = Math.abs(Math.floor(i / COLS) - g.r); return (dc + dr) + (Math.SQRT2 - 2) * Math.min(dc, dr); };
    gs[start] = 0; f[start] = h(start);
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === goal) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const cc = cur % COLS, cr = Math.floor(cur / COLS);
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cc + dc, nr = cr + dr;
        if (this.isBlocked(nc, nr) || (hard && hard(nc, nr))) continue;
        if (dr && dc && (this.isBlocked(cc + dc, cr) || this.isBlocked(cc, cr + dr))) continue;
        const ni = nr * COLS + nc;
        if (closed[ni]) continue;
        const cost = gs[cur] + (dr && dc ? Math.SQRT2 : 1) + (avoid && avoid(nc, nr) ? 6 : 0);
        if (cost < gs[ni]) { gs[ni] = cost; came[ni] = cur; f[ni] = cost + h(ni); open.push(ni); }
      }
    }
    if (goal !== start && came[goal] < 0) return null;
    const cells: Pt[] = [];
    for (let i = goal; i >= 0; i = came[i]) { cells.push(centerOf(i % COLS, Math.floor(i / COLS))); if (i === start) break; }
    cells.reverse();
    // String-pull: keep only waypoints needed for a clear line of sight.
    const out: Pt[] = [];
    let anchor: Pt = { x: from.x, z: from.z };
    if (!this.walkable(anchor.x, anchor.z)) { anchor = cells[0]; out.push(cells[0]); }
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.lineFree(anchor, cells[j], hard)) j--;
      out.push(cells[j]); anchor = cells[j]; i = j + 1;
    }
    out.push({ x: to.x, z: to.z }); // final exact approach (seat/station may be inside an inflated cell)
    return out;
  }
}
