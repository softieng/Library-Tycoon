import { describe, expect, it } from 'vitest';
import { EXPANSION_HALLS, EXPANSION_HALL_IDS, EXPANSION_BY_ID, expansionTarget, type ExpansionHallId } from '../../src/config/expansionHalls';
import { GameController, type WorldApi } from '../../src/app/controller';
import { HALL_PROGRESS_KEY, interactExtraHall, leaveExtraHall, newExtraHallState, readExtraHallProgress, startExtraHallQuest, visitExtraHall, writeExtraHallProgress } from '../../src/gameplay/extraHallTour';
import { expansionBounds } from '../../src/world/expansionHall';
import type { StorageLike } from '../../src/persistence/save';

const memory = (): StorageLike => {
  const data = new Map<string, string>();
  return {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  };
};

describe('four new 3D educational halls', () => {
  it('has all four official hall names, exactly 9 physical targets and 3 ordered quests each', () => {
    expect(EXPANSION_HALL_IDS).toEqual(['biruni', 'reference', 'thabit', 'theses']);
    for (const h of EXPANSION_HALLS) {
      expect(h.nameAr).toMatch(/^قاعة /);
      expect(h.targets).toHaveLength(9);
      expect(h.quests).toHaveLength(3);
      const targets = new Set(h.targets.map(t => t.id));
      expect(targets.size).toBe(h.targets.length);
      for (const q of h.quests) {
        expect(q.sequence).toHaveLength(3);
        for (const id of q.sequence) expect(targets.has(id)).toBe(true);
        expect(q.xp).toBeGreaterThan(0);
      }
      expect(expansionBounds(h.id).minX).toBeLessThan(h.offsetX);
      expect(expansionBounds(h.id).maxX).toBeGreaterThan(h.offsetX);
      for (const t of h.targets) expect(expansionTarget(h.id, t.id)).toEqual(t);
    }
  });

  it('never overlaps hall previews, independent from the Jabir preview center', () => {
    const bounds = EXPANSION_HALL_IDS.map(expansionBounds);
    for (let i = 1; i < bounds.length; i++)
      expect(bounds[i].minX - bounds[i - 1].maxX).toBeGreaterThan(5);
    expect(bounds[0].minX).toBeGreaterThan(46 + 11);
  });

  it('requires a real 3D world before entering and prevents simultaneous tours', () => {
    const c = new GameController(memory());
    expect(c.enterExtraHall('biruni')).toBe(false);
    const visited: string[] = [];
    c.world = { setHallView: hall => { visited.push(hall); return true; } } as unknown as WorldApi;
    expect(c.enterExtraHall('biruni')).toBe(true);
    expect(c.enterExtraHall('reference')).toBe(false);
    expect(c.enterJabirTour()).toBe(false);
    expect(c.isInHallPreview).toBe(true);
    c.exitExtraHall();
    expect(visited).toEqual(['biruni', 'khwarizmi']);
    expect(c.isInHallPreview).toBe(false);
  });

  it('rejects invalid or out-of-order clicks for every hall', () => {
    for (const hall of EXPANSION_HALL_IDS) {
      const q = EXPANSION_BY_ID[hall].quests[0];
      let s = visitExtraHall(newExtraHallState(), hall);
      expect(startExtraHallQuest(s, 'other')).toBe(s);
      s = startExtraHallQuest(s, q.id);
      expect(interactExtraHall(s, 'wrong-hall-thing')).toBe(s);
      s = interactExtraHall(s, q.sequence[1]);
      expect(s.quest?.nextIndex).toBe(0);
      expect(s.progress.earnedXp[hall]).toBe(0);
    }
  });

  for (const hall of EXPANSION_HALL_IDS) {
    it(hall + ' completes all three narrative quests but rewards XP once per unique quest', () => {
      let s = visitExtraHall(newExtraHallState(), hall);
      const quests = EXPANSION_BY_ID[hall].quests;
      for (const q of quests) {
        s = startExtraHallQuest(s, q.id);
        for (const t of q.sequence) s = interactExtraHall(s, t);
        expect(s.quest?.finished).toBe(true);
        expect(s.progress.completed[hall]).toContain(q.id);
      }
      const xp = quests.reduce((sum, q) => sum + q.xp, 0);
      expect(s.progress.earnedXp[hall]).toBe(xp);
      s = startExtraHallQuest(s, quests[0].id);
      for (const t of quests[0].sequence) s = interactExtraHall(s, t);
      expect(s.progress.earnedXp[hall]).toBe(xp);
      expect(s.progress.completed[hall]).toHaveLength(3);
      const gone = leaveExtraHall(s);
      expect(gone.active).toBeNull();
      expect(gone.progress.earnedXp[hall]).toBe(xp);
    });
  }

  it('rejects corrupt saved progress and forbids persisted arbitrary XP or fake hall quests', () => {
    const corrupt = [
      '[1,2]', '{oops}', '{}', JSON.stringify({ version: 2, completed: {} }),
      JSON.stringify({ version: 1, completed: { biruni: ['fake'] } }),
      ' '.repeat(22_000), JSON.stringify({ version: 1, completed: [] }),
    ];
    for (const raw of corrupt) {
      const p = readExtraHallProgress(raw);
      for (const id of EXPANSION_HALL_IDS) expect(p.earnedXp[id]).toBe(0);
    }
    let current = visitExtraHall(newExtraHallState(), 'biruni');
    current = startExtraHallQuest(current, EXPANSION_BY_ID.biruni.quests[0].id);
    for (const target of EXPANSION_BY_ID.biruni.quests[0].sequence) current = interactExtraHall(current, target);
    const payload = JSON.parse(writeExtraHallProgress(current.progress));
    payload.earnedXp = { biruni: 999999999 };
    const restored = readExtraHallProgress(JSON.stringify(payload));
    expect(restored.earnedXp.biruni).toBe(EXPANSION_BY_ID.biruni.quests[0].xp);
  });

  it('persists one-time progress separate from the main simulation and original campaign save', () => {
    const store = memory();
    const c = new GameController(store);
    const before = JSON.stringify(c.state);
    c.world = { setHallView: () => true } as unknown as WorldApi;
    expect(c.enterExtraHall('thabit')).toBe(true);
    const q = EXPANSION_BY_ID.thabit.quests[0];
    c.startExtraQuest(q.id);
    for (const t of q.sequence) c.interactExtraTarget(t);
    expect(c.extraTour.progress.earnedXp.thabit).toBe(q.xp);
    expect(JSON.stringify(c.state)).toBe(before);
    expect(store.getItem(HALL_PROGRESS_KEY)).toContain(q.id);
    c.exitExtraHall();
    const reopened = new GameController(store);
    expect(reopened.extraTour.progress.completed.thabit).toEqual([q.id]);
    expect(reopened.extraTour.progress.earnedXp.thabit).toBe(q.xp);
    expect(reopened.extraTour.active).toBeNull();
    expect(JSON.stringify(reopened.state).slice(0,100)).not.toContain('hall_');
  });

  it('keeps each hall progress separate from the other three and from Jabir', () => {
    let state = newExtraHallState();
    for (const hall of EXPANSION_HALL_IDS) {
      const q = EXPANSION_BY_ID[hall].quests[0];
      state = startExtraHallQuest(visitExtraHall(state, hall), q.id);
      for (const t of q.sequence) state = interactExtraHall(state, t);
      state = leaveExtraHall(state);
    }
    for (const hall of EXPANSION_HALL_IDS) {
      expect(state.progress.completed[hall]).toHaveLength(1);
      expect(state.progress.earnedXp[hall]).toBe(EXPANSION_BY_ID[hall].quests[0].xp);
    }
  });
});
