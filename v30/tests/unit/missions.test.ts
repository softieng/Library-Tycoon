import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { SHELVES } from '../../src/config/layout';
import { DIFFICULT_CASES, LOST_WANTS, MISSION_BY_ID, MISSIONS } from '../../src/missions/definitions';
import { missionStatus } from '../../src/missions/engine';
import type { Simulation } from '../../src/gameplay/sim';
import { makeSim, run } from './helpers';

const complete = (sim: Simulation, id: string) => { sim.state.missions.completed[id] = 1; };
function unlockAll(sim: Simulation, upTo: string) {
  for (const m of MISSIONS) { if (m.id === upTo) break; if (m.category === 'main') complete(sim, m.id); }
}

describe('mission definitions (data-driven)', () => {
  it('covers the twelve required missions with complete data', () => {
    expect(MISSIONS).toHaveLength(12);
    for (const m of MISSIONS) {
      expect(m.titleAr.length).toBeGreaterThan(3); expect(m.descriptionAr.length).toBeGreaterThan(20);
      expect(m.objectives.length).toBeGreaterThan(0); expect(m.reward.money).toBeGreaterThan(0);
      expect(/[؀-ۿ]/.test(m.descriptionAr)).toBe(true);
      if (m.category === 'repeatable') expect(m.cooldown).toBeGreaterThan(0);
    }
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(12);
  });
  it('main missions unlock in sequence', () => {
    const sim = makeSim();
    expect(missionStatus(sim.state, MISSION_BY_ID.missing_book).status).toBe('available');
    expect(missionStatus(sim.state, MISSION_BY_ID.guide_student).status).toBe('locked');
    sim.dispatch({ type: 'startMission', id: 'guide_student' });
    expect(sim.state.missions.active).toBeNull();
  });
});

describe('missing-book mission is played in the world', () => {
  it('cannot be completed by pressing start; requires searching the real shelf with the mascot', () => {
    const sim = makeSim(42);
    const money0 = sim.state.money;
    sim.dispatch({ type: 'startMission', id: 'missing_book' });
    const runState = sim.state.missions.active!;
    expect(runState.id).toBe('missing_book');
    run(sim, 20);
    expect(sim.state.missions.active?.id).toBe('missing_book'); // nothing happens by waiting
    const target = String(runState.data.target);
    const wrong = SHELVES.find((s) => s.id !== target)!.id;
    const incomeBefore = sim.state.ledger.income;
    sim.dispatch({ type: 'clickShelf', id: wrong });
    expect(sim.state.mascot.task).toEqual({ kind: 'search', shelfId: wrong });
    expect(run(sim, 60, () => String(runState.data.searched).includes(wrong))).toBe(true); // mascot walked there and searched
    expect(String(runState.data.hint).length).toBeGreaterThan(3);
    expect(sim.state.missions.active?.id).toBe('missing_book');
    run(sim, 6);
    sim.dispatch({ type: 'clickShelf', id: target });
    let done = false, walked = false;
    run(sim, 90, (ev) => { if (sim.state.mascot.anim === 'walk') walked = true; if (ev.some((e) => e.type === 'mission' && e.status === 'completed')) done = true; return done; });
    expect(walked).toBe(true); expect(done).toBe(true);
    expect(sim.state.missions.completed.missing_book).toBe(1);
    expect(sim.state.missions.rewardLog).toContain('missing_book#1');
    const services = sim.state.ledger.income - incomeBefore - MISSION_BY_ID.missing_book.reward.money;
    expect(services % 75_000).toBe(0); // the only other income is whole borrow services
    expect(sim.state.money).toBeGreaterThan(money0);
    expect(sim.state.mascot.anim).toBe('celebrate');
    // main mission can never be started (or paid) again
    sim.dispatch({ type: 'startMission', id: 'missing_book' });
    expect(sim.state.missions.active).toBeNull();
  });
  it('never pays a reward twice even if the completion counter is tampered with', () => {
    const sim = makeSim(1);
    sim.state.missions.rewardLog.push('missing_book#1'); // token already spent
    sim.dispatch({ type: 'startMission', id: 'missing_book' });
    const r = sim.state.missions.active!;
    const before = sim.state.ledger.income;
    sim.dispatch({ type: 'clickShelf', id: String(r.data.target) });
    let paid = -1;
    run(sim, 90, () => { if (!sim.state.missions.active) { paid = sim.state.missions.lastResult!.reward; return true; } });
    expect(paid).toBe(0);
    expect((sim.state.ledger.income - before) % 75_000).toBe(0);
  });
});

describe('other missions', () => {
  it('guide_student: wrong destination is refused, the mascot walks the student to the right zone', () => {
    const sim = makeSim(77); unlockAll(sim, 'guide_student');
    sim.dispatch({ type: 'startMission', id: 'guide_student' });
    const r = sim.state.missions.active!, vid = Number(r.data.visitor);
    run(sim, 12);
    const v = sim.state.visitors.find((x) => x.id === vid)!;
    expect(v.state).toBe('lost');
    sim.dispatch({ type: 'clickVisitor', id: vid });
    expect(sim.state.missions.dialog?.kind).toBe('guide');
    const want = LOST_WANTS[Number(r.data.want)].zone;
    const wrong = ['borrowing', 'reference', 'reading', 'computers'].find((z) => z !== want)!;
    sim.dispatch({ type: 'guideChoice', zone: wrong });
    expect(sim.state.missions.active?.progress.guided).toBe(0);
    sim.dispatch({ type: 'guideChoice', zone: want });
    expect(sim.state.mascot.task?.kind).toBe('guide');
    let maxLag = 0;
    const ok = run(sim, 120, () => { const vv = sim.state.visitors.find((x) => x.id === vid); if (vv?.state === 'follow') maxLag = Math.max(maxLag, Math.hypot(vv.x - sim.state.mascot.x, vv.z - sim.state.mascot.z)); return !!sim.state.missions.completed.guide_student; });
    expect(ok).toBe(true);
    expect(maxLag).toBeLessThan(6); // the student really followed
  });
  it('rush_ten: needs ten real services and fails on timeout', () => {
    const sim = makeSim(5); unlockAll(sim, 'rush_ten');
    sim.dispatch({ type: 'startMission', id: 'rush_ten' });
    const served0 = sim.state.totals.served;
    const ok = run(sim, 200, () => !sim.state.missions.active);
    expect(ok).toBe(true);
    if (sim.state.missions.lastResult!.status === 'completed') expect(sim.state.totals.served - served0).toBeGreaterThanOrEqual(10);
    // a hopeless run times out
    const sim2 = makeSim(5); unlockAll(sim2, 'rush_ten');
    sim2.state.staff = []; // nobody serves and the director does nothing
    sim2.dispatch({ type: 'startMission', id: 'rush_ten' });
    run(sim2, 205);
    expect(sim2.state.missions.lastResult).toMatchObject({ id: 'rush_ten', status: 'failed', reward: 0 });
    expect(sim2.state.missions.completed.rush_ten).toBeUndefined();
  });
  it('find_reference: only the shelf with the right Dewey class completes it', () => {
    const sim = makeSim(8); unlockAll(sim, 'find_reference');
    sim.dispatch({ type: 'startMission', id: 'find_reference' });
    const r = sim.state.missions.active!;
    const right = SHELVES.find((s) => s.code === r.data.code)!, wrong = SHELVES.find((s) => s.code !== r.data.code)!;
    sim.dispatch({ type: 'clickShelf', id: wrong.id });
    expect(sim.state.missions.active!.progress.ref).toBe(0);
    sim.dispatch({ type: 'clickShelf', id: right.id });
    run(sim, 1);
    expect(sim.state.missions.completed.find_reference).toBe(1);
  });
  it('dewey_sort: needs five correct answers from the mini-game', () => {
    const sim = makeSim(8); unlockAll(sim, 'dewey_sort');
    sim.dispatch({ type: 'startMission', id: 'dewey_sort' });
    sim.dispatch({ type: 'deweyResult', correct: 4, total: 6 }); run(sim, 1);
    expect(sim.state.missions.active?.id).toBe('dewey_sort');
    sim.dispatch({ type: 'deweyResult', correct: 6, total: 6 }); run(sim, 1);
    expect(sim.state.missions.completed.dewey_sort).toBe(1);
  });
  it('tidy_hall: five books must be clicked; it is repeatable only after its cooldown', () => {
    const sim = makeSim(8);
    sim.dispatch({ type: 'startMission', id: 'tidy_hall' });
    expect(sim.state.missions.misplaced).toHaveLength(5);
    for (const b of [...sim.state.missions.misplaced]) { sim.dispatch({ type: 'clickMisplaced', id: b.id }); sim.dispatch({ type: 'clickMisplaced', id: b.id }); }
    run(sim, 1);
    expect(sim.state.missions.completed.tidy_hall).toBe(1);
    sim.dispatch({ type: 'startMission', id: 'tidy_hall' });
    expect(sim.state.missions.active).toBeNull(); // cooldown
    expect(missionStatus(sim.state, MISSION_BY_ID.tidy_hall).status).toBe('cooldown');
    run(sim, MISSION_BY_ID.tidy_hall.cooldown! + 1);
    sim.dispatch({ type: 'startMission', id: 'tidy_hall' });
    expect(sim.state.missions.active?.id).toBe('tidy_hall');
  });
  it('clean_inspection: dirt outside the cleaner zone needs the paid urgent clean', () => {
    const sim = makeSim(8);
    sim.dispatch({ type: 'startMission', id: 'clean_inspection' });
    expect(sim.state.dirt.length).toBe(5);
    expect(sim.state.dirt.filter((d) => !d.inZone)).toHaveLength(2);
    const money = sim.state.money, income0 = sim.state.ledger.income;
    for (const d of [...sim.state.dirt]) sim.dispatch({ type: 'cleanDirt', id: d.id });
    expect(sim.state.money).toBe(money - 5 * BALANCE.urgentCleanCost);
    run(sim, 30, () => !sim.state.missions.active);
    expect(sim.state.missions.completed.clean_inspection).toBe(1);
    expect(sim.state.ledger.income - income0).toBeGreaterThanOrEqual(MISSION_BY_ID.clean_inspection.reward.money);
  });
  it('broken_printer / restore_computer: the device must actually be repaired', () => {
    const sim = makeSim(8); sim.state.money = 5_000_000;
    sim.dispatch({ type: 'buyUpgrade', id: 'print_office' });
    sim.dispatch({ type: 'startMission', id: 'broken_printer' });
    expect(sim.state.broken).toContain('printer');
    run(sim, 5); expect(sim.state.missions.active?.id).toBe('broken_printer');
    sim.dispatch({ type: 'clickDevice', id: 'printer' });
    expect(sim.state.missions.dialog).toMatchObject({ kind: 'repair', device: 'printer' });
    const m = sim.state.money;
    sim.dispatch({ type: 'repairChoice', choice: 'technician' });
    expect(sim.state.money).toBe(m - BALANCE.technicianCost);
    expect(sim.state.broken).not.toContain('printer');
    run(sim, 1); expect(sim.state.missions.completed.broken_printer).toBe(1);
    sim.dispatch({ type: 'startMission', id: 'restore_computer' });
    const dev = sim.state.broken[0];
    expect(dev.startsWith('pc_')).toBe(true);
    sim.dispatch({ type: 'clickDevice', id: dev }); sim.dispatch({ type: 'repairChoice', choice: 'technician' });
    run(sim, 1); expect(sim.state.missions.completed.restore_computer).toBe(1);
  });
  it('difficult_borrow: the policy-compliant answer completes it, a wrong answer fails it', () => {
    for (const right of [true, false]) {
      const sim = makeSim(8);
      sim.dispatch({ type: 'startMission', id: 'difficult_borrow' });
      const r = sim.state.missions.active!, vid = Number(r.data.visitor), sc = DIFFICULT_CASES[Number(r.data.scenario)];
      const atDesk = run(sim, 170, () => { const v = sim.state.visitors.find((x) => x.id === vid); return v?.state === 'queue' && sim.state.queues.borrow[0] === vid; });
      expect(atDesk).toBe(true);
      run(sim, 4);
      expect(sim.state.service.borrow?.visitorId).not.toBe(vid); // not served until resolved
      sim.dispatch({ type: 'clickVisitor', id: vid });
      expect(sim.state.missions.dialog?.kind).toBe('difficult');
      sim.dispatch({ type: 'dialogChoice', choice: right ? sc.correct : (sc.correct + 1) % 3 });
      run(sim, 1);
      if (right) expect(sim.state.missions.completed.difficult_borrow).toBe(1);
      else expect(sim.state.missions.lastResult).toMatchObject({ status: 'failed', reward: 0 });
    }
  });
  it('vip_visit: guests must be welcomed by clicking them', () => {
    const sim = makeSim(8); unlockAll(sim, 'vip_visit');
    sim.dispatch({ type: 'startMission', id: 'vip_visit' });
    let welcomed = 0;
    const ok = run(sim, 240, () => {
      for (const v of sim.state.visitors) if (v.vip && !v.welcomed && v.z > -9) { sim.dispatch({ type: 'clickVisitor', id: v.id }); sim.dispatch({ type: 'clickVisitor', id: v.id }); welcomed++; }
      return !sim.state.missions.active;
    });
    expect(ok).toBe(true); expect(welcomed).toBe(3);
    expect(sim.state.missions.lastResult?.status).toBe('completed');
  });
});

describe('mascot reward (25,000 IQD / 15 minutes)', () => {
  it('pays once per cooldown and resists clock tampering', () => {
    const sim = makeSim(); const t0 = 1_800_000_000_000, m0 = sim.state.money;
    sim.dispatch({ type: 'mascotReward', now: t0 });
    expect(sim.state.money).toBe(m0 + 25_000);
    for (let i = 0; i < 20; i++) sim.dispatch({ type: 'mascotReward', now: t0 + i * 1000 });
    expect(sim.state.money).toBe(m0 + 25_000);
    sim.dispatch({ type: 'mascotReward', now: t0 + 15 * 60 * 1000 - 1 });
    expect(sim.state.money).toBe(m0 + 25_000);
    sim.dispatch({ type: 'mascotReward', now: t0 + 15 * 60 * 1000 });
    expect(sim.state.money).toBe(m0 + 50_000);
    // moving the system clock backwards never pays; it restarts the cooldown instead
    sim.dispatch({ type: 'mascotReward', now: t0 - 60 * 60 * 1000 });
    expect(sim.state.money).toBe(m0 + 50_000);
    sim.dispatch({ type: 'mascotReward', now: t0 - 60 * 60 * 1000 + 60_000 });
    expect(sim.state.money).toBe(m0 + 50_000);
    sim.dispatch({ type: 'mascotReward', now: NaN });
    expect(sim.state.money).toBe(m0 + 50_000);
    expect(sim.state.mascot.rewardsClaimed).toBe(2);
  });
  it('the mascot returns to its post and never stays in the walkway', () => {
    const sim = makeSim(3);
    run(sim, 150);
    const m = sim.state.mascot;
    if (!m.task && !m.path) expect(Math.hypot(m.x - 11.9, m.z + 6.4)).toBeLessThan(1.5);
  });
});
