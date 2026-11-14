import { describe, expect, it } from 'vitest';
import { FLAGS } from '../../src/config/featureFlags';
import { HALL_ROADMAP, hallProgress } from '../../src/config/hallRoadmap';
import { JABIR_BOUNDS, JABIR_ENTRY, JABIR_DOOR, JABIR_SHELVES, JABIR_POINTS, JABIR_MISSIONS, advanceJabirMission } from '../../src/config/jabirHall';

const inHall = (p: {x: number; z: number}) =>
  p.x > JABIR_BOUNDS.minX && p.x < JABIR_BOUNDS.maxX &&
  p.z > JABIR_BOUNDS.minZ && p.z < JABIR_BOUNDS.maxZ;

describe('V3.2 Jabir development foundation, not a released second hall', () => {
  it('keeps unopened halls gated regardless of proposed content', () => {
    expect(FLAGS.multiHall).toBe(false);
    expect(HALL_ROADMAP[1].id).toBe('jabir');
    expect(hallProgress('hall_jabir', [])).toBe('in-development');
    expect(hallProgress('hall_jabir', ['hall_jabir'])).toBe('in-development');
  });
  it('preserves clear, stable and distinguishable shelf addresses', () => {
    expect(JABIR_SHELVES).toHaveLength(8);
    expect(new Set(JABIR_SHELVES.map(s => s.id)).size).toBe(8);
    expect(new Set(JABIR_SHELVES.map(s => s.code)).size).toBe(8);
    for (const s of JABIR_SHELVES) {
      expect(s.id).toBe('jabir_shelf_' + s.code);
      expect(/^[0-9]{3}$/.test(s.code)).toBe(true);
      expect(s.titleAr.length).toBeGreaterThan(6);
      expect(s.topicsAr.length).toBeGreaterThanOrEqual(3);
      expect(inHall(s)).toBe(true);
      expect(inHall(s.access)).toBe(true);
      expect(Math.hypot(s.x-s.access.x,s.z-s.access.z)).toBeGreaterThan(0.5);
      expect(Math.hypot(s.x-s.access.x,s.z-s.access.z)).toBeLessThan(1.8);
    }
    expect(inHall(JABIR_ENTRY)).toBe(true);
    expect(JABIR_DOOR.width).toBeGreaterThanOrEqual(2);
    expect(JABIR_DOOR.z).toBe(JABIR_BOUNDS.minZ);
  });
  it('defines named service points and no duplicate world interaction ids', () => {
    const allIds = [...JABIR_SHELVES.map(x => x.id), ...JABIR_POINTS.map(x => x.id)];
    expect(new Set(allIds).size).toBe(allIds.length);
    for (const p of JABIR_POINTS) {
      expect(inHall(p)).toBe(true);
      expect(p.titleAr.length).toBeGreaterThan(6);
    }
  });
  it('each narrative mission requires exactly 3 distinct world interactions', () => {
    const targets = new Set([...JABIR_SHELVES.map(s => s.id), ...JABIR_POINTS.map(p => p.id)]);
    expect(JABIR_MISSIONS).toHaveLength(3);
    expect(new Set(JABIR_MISSIONS.map(m => m.id)).size).toBe(3);
    for (const mission of JABIR_MISSIONS) {
      expect(mission.titleAr.length).toBeGreaterThan(6);
      expect(mission.storyAr.length).toBeGreaterThan(25);
      expect(mission.sequence).toHaveLength(3);
      expect(new Set(mission.sequence).size).toBe(3);
      for (const id of mission.sequence) expect(targets.has(id)).toBe(true);
      expect(mission.rewardIQD).toBeGreaterThan(0);
      expect(Number.isSafeInteger(mission.rewardIQD)).toBe(true);
    }
  });
  for (const mission of JABIR_MISSIONS) it(mission.id + ' completes through correct physical actions once', () => {
    let state = { missionId: mission.id, nextIndex: 0, finished: false };
    const wrong = advanceJabirMission(state, 'jabir_shelf_999');
    expect(wrong.accepted).toBe(false);
    expect(wrong.completedNow).toBe(false);
    expect(wrong.progress).toEqual(state);
    mission.sequence.forEach((target, i) => {
      const outOfOrder = advanceJabirMission(state, mission.sequence[(i + 1) % mission.sequence.length]);
      expect(outOfOrder.accepted).toBe(false);
      expect(outOfOrder.progress).toEqual(state);
      const result = advanceJabirMission(state, target);
      expect(result.accepted).toBe(true);
      expect(result.completedNow).toBe(i === mission.sequence.length - 1);
      state = result.progress;
      expect(state.nextIndex).toBe(i + 1);
    });
    expect(state.finished).toBe(true);
    const repeat = advanceJabirMission(state, mission.sequence[mission.sequence.length - 1]);
    expect(repeat.completedNow).toBe(false);
    expect(repeat.accepted).toBe(false);
    expect(repeat.progress).toEqual(state);
  });
});
