import { describe, expect, it } from 'vitest';
import { BALANCE, UNIT } from '../../src/config/balance';
import { CLEANER_ZONE, DOOR, HALL, PROPS, QUEUES, SEATS, SHELVES, STATIONS } from '../../src/config/layout';
import { ROLES, SERVICES } from '../../src/config/services';
import { UPGRADES } from '../../src/config/upgrades';
import { footprint, NavGrid } from '../../src/navigation/grid';
import { salaryOf } from '../../src/staff/staff';
import { makeSim, run } from './helpers';

describe('legacy economy is preserved', () => {
  it('keeps the 17 upgrades with their legacy prices', () => {
    expect(UPGRADES.map((u) => u.cost / UNIT)).toEqual([160, 240, 310, 420, 550, 620, 780, 860, 980, 1150, 1390, 1740, 1920, 2150, 2480, 2900, 3900]);
    expect(new Set(UPGRADES.map((u) => u.id)).size).toBe(17);
  });
  it('keeps the four services and five roles', () => {
    expect([SERVICES.borrow, SERVICES.print, SERVICES.reading, SERVICES.research].map((s) => [s.reward / UNIT, s.duration])).toEqual([[75, 3.6], [110, 4.4], [60, 5.2], [135, 6]]);
    expect(ROLES.map((r) => r.hireCost / UNIT)).toEqual([320, 570, 860, 1320, 1580]);
    expect(BALANCE.startMoney).toBe(260_000);
    expect(BALANCE.mascotReward).toBe(25_000);
    expect(BALANCE.mascotCooldownMs).toBe(15 * 60 * 1000);
  });
});

describe('determinism', () => {
  it('same seed and actions give an identical state', () => {
    const a = makeSim(7), b = makeSim(7);
    run(a, 120); run(b, 120);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    const c = makeSim(8); run(c, 120);
    expect(JSON.stringify(c.state)).not.toBe(JSON.stringify(a.state));
  });
});

describe('navigation and collisions', () => {
  it('every seat approach, queue slot, shelf access and station is reachable from the door', () => {
    const nav = new NavGrid(new Set(UPGRADES.map((u) => u.id)));
    const targets = [...SEATS.map((s) => s.approach), ...Object.values(QUEUES).flat(), ...SHELVES.map((s) => s.access), STATIONS.st_cleaner.spot];
    for (const t of targets) {
      expect(nav.walkable(t.x, t.z), `walkable ${t.x},${t.z}`).toBe(true);
      expect(nav.findPath(DOOR.outside, t), `path to ${t.x},${t.z}`).not.toBeNull();
    }
  });
  it('visitors never walk through furniture or walls, and stay in the building', () => {
    const sim = makeSim(3);
    const solids = () => PROPS.filter((p) => p.solid && (!p.requires || sim.state.upgrades.includes(p.requires))).map(footprint);
    let samples = 0;
    run(sim, 200, () => {
      for (const v of sim.state.visitors) {
        if (v.state === 'sit' || v.state === 'toSeat') continue; // seated visitors are inside the table's clearance by design
        samples++;
        expect(v.x).toBeGreaterThan(HALL.minX); expect(v.x).toBeLessThan(HALL.maxX); expect(v.z).toBeLessThan(HALL.maxZ);
        for (const f of solids()) {
          const inside = v.x > f.minX + 0.02 && v.x < f.maxX - 0.02 && v.z > f.minZ + 0.02 && v.z < f.maxZ - 0.02;
          expect(inside, `visitor ${v.id} (${v.state}) inside furniture at ${v.x.toFixed(2)},${v.z.toFixed(2)}`).toBe(false);
        }
      }
    });
    expect(samples).toBeGreaterThan(500);
  });
  it('walking visitors keep their distance from each other', () => {
    const sim = makeSim(11);
    let close = 0, pairs = 0;
    run(sim, 200, () => {
      const vs = sim.state.visitors.filter((v) => v.state !== 'sit');
      for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
        pairs++;
        if (Math.hypot(vs[i].x - vs[j].x, vs[i].z - vs[j].z) < 0.3) close++;
      }
    });
    expect(pairs).toBeGreaterThan(1000);
    expect(close / pairs).toBeLessThan(0.01); // overlaps must be rare (deadlock breaker only)
  });
});

describe('seats and queues', () => {
  it('a seat is never occupied by two visitors and seated visitors sit exactly on a seat', () => {
    const sim = makeSim(5);
    let seated = 0;
    run(sim, 230, () => {
      const used = new Map<string, number>();
      for (const v of sim.state.visitors) {
        if (!v.seatId) continue;
        expect(used.has(v.seatId)).toBe(false);
        used.set(v.seatId, v.id);
        expect(sim.state.seats[v.seatId]).toBe(v.id);
        if (v.state === 'sit') { seated++; const seat = SEATS.find((s) => s.id === v.seatId)!; expect(Math.hypot(v.x - seat.spot.x, v.z - seat.spot.z)).toBeLessThan(0.01); expect(v.activity).not.toBeNull(); }
      }
    });
    expect(seated).toBeGreaterThan(50);
  });
  it('queues are ordered, bounded and only the head is served', () => {
    const sim = makeSim(9);
    let servedSeen = 0;
    run(sim, 230, () => {
      const q = sim.state.queues.borrow;
      expect(q.length).toBeLessThanOrEqual(BALANCE.queueCapacity);
      expect(new Set(q).size).toBe(q.length);
      const slot = sim.state.service.borrow;
      if (slot) { servedSeen++; expect(q[0]).toBe(slot.visitorId); }
      q.forEach((id, i) => { const v = sim.state.visitors.find((x) => x.id === id)!; if (v.state === 'queue') { expect(v.slot).toBeGreaterThanOrEqual(i); expect(v.slot).toBeLessThanOrEqual(i + 1); } }); // a visitor is never ahead of its place
    });
    expect(servedSeen).toBeGreaterThan(20);
    expect(sim.state.totals.served).toBeGreaterThan(3);
  });
  it('income matches completed services exactly', () => {
    const sim = makeSim(21);
    run(sim, 200);
    const l = sim.state.ledger;
    expect(l.byService.print + l.byService.research + l.byService.reading).toBe(0); // locked services earn nothing
    expect(l.income).toBe(l.byService.borrow * SERVICES.borrow.reward);
    expect(sim.state.money).toBe(BALANCE.startMoney + l.income - l.expenses);
  });
});

describe('staff rules', () => {
  it('service employees stay exactly at their workstation; the cleaner never leaves the cleaning zone', () => {
    const sim = makeSim(13);
    sim.state.money = 50_000_000;
    for (const r of ROLES) sim.dispatch({ type: 'hire', role: r.id });
    for (const id of ['print_office', 'shelves_khwarizmi', 'reading_hall']) sim.dispatch({ type: 'buyUpgrade', id });
    expect(sim.state.staff).toHaveLength(5);
    let cleanerMoved = 0;
    run(sim, 300, () => {
      for (const st of sim.state.staff) {
        if (st.role === 'cleaner') {
          if (st.moving) cleanerMoved++;
          expect(st.x).toBeGreaterThanOrEqual(CLEANER_ZONE.minX); expect(st.x).toBeLessThanOrEqual(CLEANER_ZONE.maxX);
          expect(st.z).toBeGreaterThanOrEqual(CLEANER_ZONE.minZ); expect(st.z).toBeLessThanOrEqual(CLEANER_ZONE.maxZ);
        } else {
          const home = STATIONS[ROLES.find((r) => r.id === st.role)!.station].spot;
          expect(st.x).toBe(home.x); expect(st.z).toBe(home.z);
        }
      }
    });
    expect(cleanerMoved).toBeGreaterThan(20); // it really walked to dirt spots
    expect(sim.state.totals.cleaned).toBeGreaterThan(0);
  });
  it('hiring, training and salaries cost what the config says', () => {
    const sim = makeSim();
    sim.state.money = 2_000_000;
    sim.dispatch({ type: 'hire', role: 'digital' });
    expect(sim.state.money).toBe(2_000_000 - 570_000);
    sim.dispatch({ type: 'hire', role: 'digital' }); // duplicate role is refused
    expect(sim.state.staff.filter((s) => s.role === 'digital')).toHaveLength(1);
    const st = sim.state.staff.find((s) => s.role === 'digital')!;
    sim.dispatch({ type: 'train', staffId: st.id });
    expect(st.level).toBe(2);
    expect(sim.state.money).toBe(2_000_000 - 570_000 - 570_000 * 0.4);
    expect(salaryOf(st)).toBe(Math.round(570_000 * 0.04 * 1.25));
    sim.state.money = 0;
    sim.dispatch({ type: 'hire', role: 'cleaner' });
    expect(sim.state.staff.some((s) => s.role === 'cleaner')).toBe(false);
    expect(sim.state.money).toBe(0);
  });
  it('a trained employee serves faster', () => {
    const time = (level: number) => {
      const sim = makeSim(4); sim.state.staff[0].level = level;
      sim.state.rush = { until: 1e9, mult: 5 }; // saturate the counter so staff speed is the bottleneck
      run(sim, 220); return sim.state.ledger.byService.borrow;
    };
    expect(time(5)).toBeGreaterThan(time(1));
  });
});

describe('day cycle', () => {
  it('closes the day, pays salaries and writes a report', () => {
    const sim = makeSim(2);
    let report: any = null;
    run(sim, BALANCE.dayLength + BALANCE.closingGrace + 5, (ev) => { for (const e of ev) if (e.type === 'dayEnd') report = e.report; });
    expect(report).not.toBeNull();
    expect(sim.state.day).toBe(2);
    expect(report.salaries).toBe(salaryOf(sim.state.staff[0]));
    expect(sim.state.reports[0].day).toBe(1);
    expect(sim.state.visitors.length).toBeLessThan(4);
  });
});
