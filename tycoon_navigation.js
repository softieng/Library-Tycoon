/* Library Tycoon V2.2 local navigation. No external APIs, no game-state or save mutations.
   Footprints are world-space x/z rectangles. An actor never enters a solid footprint,
   including a chair. Sitting is a visual transition at a safe approach anchor. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.LibraryTycoonNavigation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const GRID = 0.4, RADIUS = 0.24, PI2 = Math.PI * 2;
  const finite = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const clone = p => ({ x: p.x, z: p.z });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function inside(b, p, radius = RADIUS) {
    return p.x > b.x0 - radius && p.x < b.x1 + radius && p.z > b.z0 - radius && p.z < b.z1 + radius;
  }
  function blocked(p, blocks, radius = RADIUS) {
    return !finite(p) || blocks.some(b => inside(b, p, radius));
  }
  function lineClear(a, b, blocks, radius = RADIUS) {
    if (blocked(a, blocks, radius) || blocked(b, blocks, radius)) return false;
    const steps = Math.max(1, Math.ceil(dist(a, b) / 0.12));
    for (let i = 1; i < steps; i++) {
      const t = i / steps, p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
      if (blocked(p, blocks, radius)) return false;
    }
    return true;
  }
  function project(p, blocks, radius = RADIUS, preferred = null, maxR = 3.6) {
    if (!finite(p)) return null;
    if (!blocked(p, blocks, radius)) return clone(p);
    let best = null, cost = Infinity;
    const angle = preferred ? Math.atan2(preferred.z, preferred.x) : 0;
    for (let r = radius + 0.08; r <= maxR + 0.0001; r += 0.18) {
      for (let i = 0; i < 24; i++) {
        const a = angle + i * PI2 / 24, q = { x: p.x + Math.cos(a) * r, z: p.z + Math.sin(a) * r };
        if (blocked(q, blocks, radius)) continue;
        const bias = preferred ? 0.14 * (1 - Math.cos(a - angle)) : 0;
        if (r + bias < cost) { best = q; cost = r + bias; }
      }
      if (best) return best;
    }
    return null;
  }
  function seatApproach(seat, blocks, radius = RADIUS) {
    if (!seat || !finite(seat)) return null;
    // Face points at the table, so the first approach is from behind the chair.
    const back = { x: -Math.sin(seat.face || 0), z: -Math.cos(seat.face || 0) };
    const base = Math.atan2(back.z, back.x);
    for (const r of [0.7, 0.9, 1.15, 1.45]) for (const da of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, Math.PI]) {
      const a = base + da, q = { x: seat.x + Math.cos(a) * r, z: seat.z + Math.sin(a) * r };
      if (!blocked(q, blocks, radius)) return q;
    }
    return project(seat, blocks, radius, back);
  }
  class MinHeap {
    constructor() { this.a = []; }
    push(item) { const a = this.a; a.push(item); for (let i = a.length - 1; i > 0;) { const p = (i - 1) >> 1; if (a[p][0] <= item[0]) break; a[i] = a[p]; i = p; a[i] = item; } }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (!a.length) return top; let i = 0; while (true) { let l = i * 2 + 1, r = l + 1, c = r < a.length && a[r][0] < a[l][0] ? r : l; if (l >= a.length || a[c][0] >= last[0]) break; a[i] = a[c]; i = c; } a[i] = last; return top; }
    get length() { return this.a.length; }
  }
  function search(start, goal, blocks, radius = RADIUS) {
    if (lineClear(start, goal, blocks, radius)) return [clone(goal)];
    const x0 = Math.min(start.x, goal.x) - 4.8, z0 = Math.min(start.z, goal.z) - 4.8;
    const W = Math.ceil((Math.abs(start.x - goal.x) + 9.6) / GRID) + 1;
    const H = Math.ceil((Math.abs(start.z - goal.z) + 9.6) / GRID) + 1;
    if (W * H > 50000) return null;
    const pos = (x, z) => ({ x: x0 + x * GRID, z: z0 + z * GRID });
    const sx = Math.round((start.x - x0) / GRID), sz = Math.round((start.z - z0) / GRID);
    const gx = Math.round((goal.x - x0) / GRID), gz = Math.round((goal.z - z0) / GRID);
    const occ = new Uint8Array(W * H);
    for (const b of blocks) {
      const loX = Math.max(0, Math.floor((b.x0 - radius - x0) / GRID) - 1);
      const hiX = Math.min(W - 1, Math.ceil((b.x1 + radius - x0) / GRID) + 1);
      const loZ = Math.max(0, Math.floor((b.z0 - radius - z0) / GRID) - 1);
      const hiZ = Math.min(H - 1, Math.ceil((b.z1 + radius - z0) / GRID) + 1);
      for (let z = loZ; z <= hiZ; z++) for (let x = loX; x <= hiX; x++) if (inside(b, pos(x, z), radius)) occ[x + z * W] = 1;
    }
    // Grid rounding might put the actual free endpoints in occupied cells. Seek nearby free cells.
    function nearest(x, z) {
      for (let ring = 0; ring <= 5; ring++) for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const X = x + dx, Z = z + dz, k = X + Z * W;
        if (X < 0 || Z < 0 || X >= W || Z >= H || occ[k]) continue;
        return k;
      }
      return -1;
    }
    const s = nearest(sx, sz), g = nearest(gx, gz);
    if (s < 0 || g < 0) return null;
    const cost = new Float64Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H), heap = new MinHeap();
    const heur = k => { const dx = Math.abs(k % W - g % W), dz = Math.abs(Math.floor(k / W) - Math.floor(g / W)); return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz); };
    cost[s] = 0; heap.push([heur(s), s]); let expanded = 0, found = false;
    const dirs = [[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[-1,-1,Math.SQRT2]];
    while (heap.length && expanded++ < 12000) {
      const [, k] = heap.pop(); if (closed[k]) continue; closed[k] = 1;
      if (k === g) { found = true; break; }
      const x = k % W, z = Math.floor(k / W);
      for (const [dx, dz, weight] of dirs) {
        const X = x + dx, Z = z + dz;
        if (X < 0 || Z < 0 || X >= W || Z >= H) continue;
        const n = X + Z * W; if (occ[n] || closed[n]) continue;
        if (dx && dz && (occ[X + z * W] || occ[x + Z * W])) continue;
        const next = cost[k] + weight;
        if (next >= cost[n]) continue;
        cost[n] = next; from[n] = k; heap.push([next + heur(n), n]);
      }
    }
    if (!found) return null; // NEVER fabricate a straight path through blocked furniture.
    const cells = []; for (let k = g, n = 0; k !== s && n++ < 50000; k = from[k]) {
      if (k < 0) return null; cells.push(pos(k % W, Math.floor(k / W)));
    }
    cells.reverse(); cells.push(clone(goal));
    const result = []; let prev = start;
    for (let i = 0; i < cells.length;) {
      let j = cells.length - 1;
      while (j > i && !lineClear(prev, cells[j], blocks, radius)) j--;
      if (!lineClear(prev, cells[j], blocks, radius)) return null;
      result.push(cells[j]); prev = cells[j]; i = j + 1;
    }
    return result;
  }
  function plan(start, waypoints, blocks, opts = {}) {
    const out = [], radius = opts.radius ?? RADIUS;
    if (!finite(start) || !Array.isArray(waypoints) || !waypoints.every(finite)) { out.blocked = true; return out; }
    let pos = clone(start);
    // If an old saved actor spawned inside furniture, push it to a nearby free spot.
    if (blocked(pos, blocks, radius)) {
      const relocated = project(pos, blocks, radius); if (!relocated) { out.blocked = true; return out; }
      pos = relocated; out.push(pos);
    }
    for (let i = 0; i < waypoints.length; i++) {
      const last = i === waypoints.length - 1, p = waypoints[i];
      let goal = last && opts.seat && dist(p, opts.seat) < 0.05 ? seatApproach(opts.seat, blocks, radius) : project(p, blocks, radius);
      if (!goal) { out.blocked = true; return out; }
      if (dist(pos, goal) < 0.1) { pos = goal; continue; }
      const segment = search(pos, goal, blocks, radius);
      if (!segment) { out.blocked = true; return out; }
      out.push(...segment); pos = goal;
    }
    return out;
  }
  function move(start, goal, blocks, radius = RADIUS) {
    if (!finite(start) || !finite(goal)) return clone(start);
    const s = blocked(start, blocks, radius) ? project(start, blocks, radius) || clone(start) : clone(start);
    if (lineClear(s, goal, blocks, radius)) return clone(goal);
    // Collision-constrained axis sliding, rather than a teleport to the other side of a mesh.
    const alongX = { x: goal.x, z: s.z }, alongZ = { x: s.x, z: goal.z };
    if (lineClear(s, alongX, blocks, radius)) return alongX;
    if (lineClear(s, alongZ, blocks, radius)) return alongZ;
    return s;
  }
  return { blocked, lineClear, project, seatApproach, plan, move, GRID, RADIUS };
});
