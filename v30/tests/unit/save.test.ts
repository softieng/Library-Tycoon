import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { Simulation } from '../../src/gameplay/sim';
import { BACKUP_KEY, LEGACY_KEYS, SAVE_KEY, SaveStore, migrate, parseSave, sanitize, serialize } from '../../src/persistence/save';
import { makeSim, MemoryStorage, run } from './helpers';

describe('save / load', () => {
  it('round-trips progress and keeps the game playable', () => {
    const sim = makeSim(6); sim.state.money = 3_000_000;
    sim.dispatch({ type: 'buyUpgrade', id: 'waiting_area' }); sim.dispatch({ type: 'hire', role: 'cleaner' });
    sim.dispatch({ type: 'mascotReward', now: 1_800_000_000_000 });
    run(sim, 100);
    const store = new SaveStore(new MemoryStorage());
    expect(store.save(sim.state)).toBe(true);
    const res = store.load();
    expect(res.ok).toBe(true); if (!res.ok) return;
    const s = res.state;
    expect(s.money).toBe(sim.state.money); expect(s.upgrades).toEqual(['waiting_area']);
    expect(s.staff.map((x) => x.role).sort()).toEqual(['borrowing', 'cleaner']);
    expect(s.mascot.lastRewardAt).toBe(1_800_000_000_000);
    expect(s.day).toBe(sim.state.day); expect(s.totals.served).toBe(sim.state.totals.served);
    expect(s.visitors).toHaveLength(0); // transient agents are not restored
    const sim2 = new Simulation(s); run(sim2, 60);
    expect(sim2.state.visitors.length).toBeGreaterThan(0);
    // the mascot cooldown survives a reload (no reload exploit)
    const m = sim2.state.money; sim2.dispatch({ type: 'mascotReward', now: 1_800_000_000_000 + 1000 });
    expect(sim2.state.money).toBe(m);
  });
  it('a completed mission cannot be re-earned by reloading', () => {
    const sim = makeSim(6);
    sim.state.missions.completed.missing_book = 1; sim.state.missions.rewardLog.push('missing_book#1');
    const res = parseSave(serialize(sim.state)); if (!res.ok) throw new Error('load');
    const sim2 = new Simulation(res.state);
    sim2.dispatch({ type: 'startMission', id: 'missing_book' });
    expect(sim2.state.missions.active).toBeNull();
    expect(sim2.state.missions.rewardLog).toContain('missing_book#1');
  });
  it('keeps a backup, falls back to it when the main save is corrupt, and can roll back', () => {
    const mem = new MemoryStorage(), store = new SaveStore(mem), sim = makeSim();
    sim.state.money = 111_000; store.save(sim.state);
    sim.state.money = 222_000; store.save(sim.state);
    expect(mem.getItem(BACKUP_KEY)).toContain('111000');
    mem.setItem(SAVE_KEY, mem.getItem(SAVE_KEY)!.replace('222000', '999999999')); // tampered → checksum fails
    const res = store.load();
    expect(res.ok && res.source).toBe('backup');
    expect(res.ok && res.state.money).toBe(111_000);
    store.save(sim.state);
    const rb = store.rollback();
    expect(rb.ok && rb.state.money).toBe(111_000);
  });
  it('rejects garbage, foreign data and saves from a newer version', () => {
    for (const bad of ['', '{', '[]', '{"app":"other"}', JSON.stringify({ app: 'uot-library-tycoon', schema: 30, checksum: 'x', state: {} })]) expect(parseSave(bad).ok).toBe(false);
    expect(migrate({ schema: 99 })).toBeNull();
    expect(migrate({ schema: 12 })).toBeNull();
    expect(migrate('nope')).toBeNull();
  });
  it('sanitizes hostile values', () => {
    const s = sanitize({ schema: 30, money: -5e30, day: 'x', satisfaction: 900, upgrades: ['waiting_area', 'waiting_area', 'hack', 7], staff: [{ role: 'cleaner', level: 99 }, { role: 'cleaner' }, { role: 'ceo' }], missions: { completed: { fake: 3, missing_book: 2 }, rewardLog: 'x' }, broken: ['printer', 'reactor'], achievements: [1, 'a'] });
    expect(s.money).toBe(0); expect(s.day).toBe(1); expect(s.satisfaction).toBe(100);
    expect(s.upgrades).toEqual(['waiting_area']);
    expect(s.staff.map((x) => x.role)).toEqual(['borrowing', 'cleaner']); expect(s.staff[1].level).toBe(BALANCE.maxStaffLevel);
    expect(s.missions.completed).toEqual({ missing_book: 2 }); expect(s.broken).toEqual(['printer']); expect(s.achievements).toEqual(['a']);
    const sim = new Simulation(s); run(sim, 30); expect(Number.isFinite(sim.state.money)).toBe(true);
  });
});

describe('migration from V2.8', () => {
  const v28 = { version: 27, day: 4, clock: 100, money: 144000, satisfaction: 81, reputation: 4.2, cleanliness: 77, visitors: 30, served: 19, queue: 3, upgrades: 2, exam: null, bookGuesses: 2, bookTarget: 'B', quests: { book: true, service: true, exam: false }, messages: [] };
  it('imports a V2.8 save without touching the V2.8 key', () => {
    const mem = new MemoryStorage(); const text = JSON.stringify(v28);
    mem.setItem(LEGACY_KEYS.v28, text);
    const store = new SaveStore(mem), res = store.load();
    expect(res.ok && res.source).toBe('legacy-v28'); if (!res.ok) return;
    expect(res.state.schema).toBe(30); expect(res.state.day).toBe(4);
    expect(res.state.money).toBe(520_000); // 144,000 / 72,000 × 260,000
    expect(res.state.missions.completed.missing_book).toBe(1);
    expect(res.state.missions.rewardLog).toContain('missing_book#1');
    store.save(res.state);
    expect(mem.getItem(LEGACY_KEYS.v28)).toBe(text); // legacy save is preserved byte-for-byte
    expect(store.load().ok && (store.load() as any).source).toBe('save');
  });
  it('caps converted money so an edited legacy save is not a money exploit', () => {
    const m = migrate({ ...v28, money: 1e12 })!;
    expect(sanitize(m).money).toBe(5_000_000);
  });
});
