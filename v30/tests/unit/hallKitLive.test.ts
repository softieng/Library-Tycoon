import { describe, expect, it } from 'vitest';
import { EXPANSION_HALL_IDS, EXPANSION_BY_ID, type ExpansionHallId } from '../../src/config/expansionHalls';
import { HallGrid } from '../../src/gameplay/hallKitNav';
import { HallLiveEngine, HALL_STAFF_STATION } from '../../src/gameplay/hallKitLive';

describe('hallKit shared navigation and live visitor service', () => {
  it('keeps the entry, queue and all designed walk-up positions unobstructed', () => {
    for (const hall of EXPANSION_HALL_IDS) {
      const nav = new HallGrid(hall);
      expect(nav.isClear({ x: 0, z: -7.5 })).toBe(true);
      for (let i = 0; i < 6; i++) expect(nav.isClear({ x: -7.5 + i, z: -6 })).toBe(true);
      for (const target of EXPANSION_BY_ID[hall].targets) {
        const approach = target.kind === 'shelf' ? { x: target.x, z: target.z - 1.2 }
          : target.kind === 'study' ? { x: target.x + 0.5, z: target.z - 1.2 } : null;
        if (approach) expect(nav.isClear(nav.nearest(approach)!)).toBe(true);
      }
    }
  });
  it('routes around solid furniture with no diagonal corner clipping', () => {
    const grid = new HallGrid('reference');
    const path = grid.path({ x: 0, z: -7.5 }, { x: -8, z: 5.1 });
    expect(path).not.toBeNull();
    let last = { x: 0, z: -7.5 };
    for (const p of path!) {
      expect(grid.isClear(p)).toBe(true);
      expect(Math.hypot(p.x - last.x, p.z - last.z)).toBeLessThan(0.8);
      last = p;
    }
    expect(grid.path({ x: Number.NaN, z: 0 }, { x: 0, z: 0 })).toBeNull();
  });
  it('returns no imaginary position for non-finite navigation targets', () => {
    const g = new HallGrid('biruni');
    expect(g.nearest({ x: Infinity, z: 1 })).toBeNull();
    expect(g.isClear({ x: 500, z: 100 })).toBe(false);
  });
  for (const hall of EXPANSION_HALL_IDS) {
    it(hall + ' serves, seats and releases visitors with no stationary crowd after 300 seconds', () => {
      const live = new HallLiveEngine(hall, 1337);
      let lastServed = 0;
      for (let step = 0; step < 3000; step++) {
        const state = live.advance(0.1);
        expect(state.visitors.length).toBeLessThanOrEqual(15);
        expect(state.queue).toBeLessThanOrEqual(6);
        expect(state.served).toBeGreaterThanOrEqual(lastServed);
        expect(state.staff).toEqual(HALL_STAFF_STATION);
        expect(state.visitors.filter(v => v.phase === 'service').length).toBeLessThanOrEqual(1);
        if (step % 10 === 0) {
          const seen = new Set(state.visitors.map(v => v.id));
          expect(seen.size).toBe(state.visitors.length);
          for (const v of state.visitors)
            expect(live.nav.isClear(live.nav.nearest({ x: v.x, z: v.z })!)).toBe(true);
        }
        lastServed = state.served;
      }
      const result = live.snapshot;
      expect(result.arrivals).toBeGreaterThan(25);
      expect(result.served).toBeGreaterThan(15);
      expect(result.departed).toBeGreaterThan(10);
      expect(result.rejected).toBe(0);
    });
  }
  it('matches seeded timelines across independent simulation instances', () => {
    const a = new HallLiveEngine('thabit', 9);
    const b = new HallLiveEngine('thabit', 9);
    for (let i = 0; i < 1250; i++) { a.advance(0.1); b.advance(0.1); }
    const one = a.snapshot, two = b.snapshot;
    expect([one.arrivals, one.served, one.departed, one.rejected])
      .toEqual([two.arrivals, two.served, two.departed, two.rejected]);
    expect(one.visitors.map(v => [v.id, v.phase, v.x, v.z]))
      .toEqual(two.visitors.map(v => [v.id, v.phase, v.x, v.z]));
  });
  it('service strategy changes throughput and satisfaction with deterministic tradeoffs', () => {
    const careful = new HallLiveEngine('biruni', 88);
    const rapid = new HallLiveEngine('biruni', 88);
    expect(careful.setServicePolicy('careful')).toBe(true);
    expect(rapid.setServicePolicy('rapid')).toBe(true);
    expect(careful.setServicePolicy('untrusted' as never)).toBe(false);
    // Inherited Object.prototype names must not become selectable strategies.
    expect(careful.setServicePolicy('toString' as never)).toBe(false);
    expect(careful.setServicePolicy('constructor' as never)).toBe(false);
    expect(careful.snapshot.policy).toBe('careful');
    for (let i = 0; i < 4000; i++) {
      careful.advance(0.1);
      rapid.advance(0.1);
    }
    const a = careful.snapshot, b = rapid.snapshot;
    expect(b.served).toBeGreaterThan(a.served);
    expect(b.satisfaction).toBeLessThan(a.satisfaction);
    expect(a.rejected).toBe(0);
    expect(b.rejected).toBe(0);
    expect(a.queue).toBeLessThanOrEqual(6);
    expect(b.queue).toBeLessThanOrEqual(6);
  });

  it('locks satisfaction to the policy active when a visitor starts service', () => {
    const unchanged = new HallLiveEngine('biruni', 31);
    const switched = new HallLiveEngine('biruni', 31);
    unchanged.setServicePolicy('careful');
    switched.setServicePolicy('careful');
    let started = false;
    for (let i = 0; i < 500; i++) {
      unchanged.advance(0.1);
      const state = switched.advance(0.1);
      if (state.visitors.some(v => v.phase === 'service')) {
        started = true;
        break;
      }
    }
    expect(started).toBe(true);
    expect(switched.setServicePolicy('rapid')).toBe(true);
    for (let i = 0; i < 100; i++) {
      unchanged.advance(0.1);
      switched.advance(0.1);
      if (unchanged.served > 0 && switched.served > 0) break;
    }
    expect(unchanged.served).toBe(1);
    expect(switched.served).toBe(1);
    expect(switched.snapshot.satisfaction).toBe(unchanged.snapshot.satisfaction);
  });

  it('does not expose mutable visitor state through snapshots', () => {
    const live = new HallLiveEngine('biruni', 17);
    for (let i = 0; i < 25; i++) live.advance(0.1);
    const original = live.snapshot;
    expect(original.visitors.length).toBeGreaterThan(0);
    const visitor = original.visitors[0]!;
    const x = visitor.x;
    const phase = visitor.phase;
    visitor.x = 999;
    visitor.phase = 'exit';
    visitor.route.push({ x: 999, z: 999 });
    if (visitor.destination) visitor.destination.x = 999;
    const fresh = live.snapshot.visitors[0]!;
    expect(fresh.x).toBe(x);
    expect(fresh.phase).toBe(phase);
    expect(fresh.route.some(p => p.x === 999)).toBe(false);
    expect(fresh.destination?.x).not.toBe(999);
  });

  it('releases a visitor when its queue route becomes unreachable', () => {
    const live = new HallLiveEngine('biruni', 17);
    for (let i = 0; i < 25; i++) live.advance(0.1);
    expect(live.snapshot.queue).toBe(1);
    const original = live.nav.path.bind(live.nav);
    live.nav.path = (() => null) as typeof live.nav.path;
    // Force replanning, rather than reusing the cached destination.
    const internal = (live as unknown as { people: typeof live.snapshot.visitors }).people[0]!;
    internal.destination = null;
    live.advance(0.1);
    expect(live.snapshot.queue).toBe(0);
    expect(live.snapshot.rejected).toBe(1);
    expect(live.snapshot.departed).toBe(1);
    expect(live.snapshot.visitors).toHaveLength(0);
    live.nav.path = original;
  });
  it('does not advance simulation time when paused or supplied invalid time', () => {
    const s = new HallLiveEngine('theses');
    expect(s.advance(0).seconds).toBe(0);
    expect(s.advance(-5).seconds).toBe(0);
    expect(s.advance(Number.NaN).seconds).toBe(0);
  });
});
