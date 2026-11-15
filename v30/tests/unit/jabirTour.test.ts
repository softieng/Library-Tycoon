import { describe, expect, it } from 'vitest';
import { GameController, type WorldApi } from '../../src/app/controller';
import { FLAGS } from '../../src/config/featureFlags';
import { JABIR_MISSIONS, JABIR_POINTS, JABIR_SHELVES } from '../../src/config/jabirHall';
import { HALL_ROADMAP, hallProgress } from '../../src/config/hallRoadmap';
import { beginJabirTour, interactJabirTour, leaveJabirTour, newJabirTour, startJabirTourMission } from '../../src/gameplay/jabirTour';
import type { StorageLike } from '../../src/persistence/save';

function localStore(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); } };
}
function controllerWithWorld() {
  const c = new GameController(localStore());
  const visited: string[] = [];
  c.world = { setHallView: (hall) => { visited.push(hall); return true; } } as WorldApi;
  return { c, visited };
}

describe('Jabir Hall V3.2 3D preview and isolated mission logic', () => {
  it('keeps hall unlock gate closed in the production campaign', () => {
    expect(FLAGS.multiHall).toBe(false);
    expect(HALL_ROADMAP[1].id).toBe('jabir');
    expect(hallProgress('hall_jabir', ['hall_jabir'])).toBe('in-development');
  });
  it('uses valid distinct 3D click targets for all eight shelves and six points', () => {
    const ids = [...JABIR_SHELVES.map(x => x.id), ...JABIR_POINTS.map(x => x.id)];
    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(14);
    for (const m of JABIR_MISSIONS) for (const id of m.sequence) expect(ids).toContain(id);
  });
  it('refuses activation without a ready WebGL world', () => {
    const c = new GameController(localStore());
    expect(c.enterJabirTour()).toBe(false);
    expect(c.jabirTour.active).toBe(false);
  });
  it('refuses invalid missions or targets and preserves action order', () => {
    const original = newJabirTour();
    expect(startJabirTourMission(original, JABIR_MISSIONS[0].id)).toBe(original);
    const ready = beginJabirTour(original);
    expect(startJabirTourMission(ready, 'fake')).toBe(ready);
    const mission = startJabirTourMission(ready, JABIR_MISSIONS[0].id);
    expect(interactJabirTour(mission, 'unknown')).toBe(mission);
    const wrong = interactJabirTour(mission, JABIR_MISSIONS[0].sequence[1]);
    expect(wrong.mission?.nextIndex).toBe(0);
    expect(wrong.completedIds).toEqual([]);
  });
  for (const m of JABIR_MISSIONS) it(m.id + ' is completed only by three ordered, physical scene interactions', () => {
    let s = startJabirTourMission(beginJabirTour(newJabirTour()), m.id);
    for (let i = 0; i < m.sequence.length; i++) {
      s = interactJabirTour(s, m.sequence[i]);
      expect(s.mission?.nextIndex).toBe(i + 1);
      expect(s.mission?.finished).toBe(i === m.sequence.length - 1);
    }
    expect(s.completedIds).toEqual([m.id]);
    const same = interactJabirTour(s, m.sequence[m.sequence.length - 1]);
    expect(same.completedIds).toEqual([m.id]);
    expect(same).toBe(s);
  });
  it('preserves a unique achievement list on replay and clears trial on exit', () => {
    const m = JABIR_MISSIONS[0];
    let s = startJabirTourMission(beginJabirTour(newJabirTour()), m.id);
    for (const id of m.sequence) s = interactJabirTour(s, id);
    s = startJabirTourMission(s, m.id);
    for (const id of m.sequence) s = interactJabirTour(s, id);
    expect(s.completedIds).toEqual([m.id]);
    const exit = leaveJabirTour(s);
    expect(exit.active).toBe(false);
    expect(exit.mission).toBeNull();
    expect(exit.completedIds).toEqual([m.id]);
  });
  it('rejects main-campaign actions and speed changes during a Jabir visit', () => {
    const { c } = controllerWithWorld();
    const original = JSON.stringify(c.state);
    const originalSpeed = c.speed;
    expect(c.enterJabirTour()).toBe(true);
    c.dispatch({ type: 'mascotReward', now: Date.now() });
    c.setSpeed(3);
    c.tick(10);
    expect(JSON.stringify(c.state)).toBe(original);
    expect(c.speed).toBe(originalSpeed);
    c.exitJabirTour();
    expect(c.jabirTour.active).toBe(false);
  });
  it('never modifies the real game economy, save state, or simulation during a tour', () => {
    const { c, visited } = controllerWithWorld();
    const original = JSON.stringify(c.state);
    const savedAt = c.lastSavedAt;
    expect(c.enterJabirTour()).toBe(true);
    expect(visited).toEqual(['jabir']);
    const m = JABIR_MISSIONS[0];
    c.startJabirMission(m.id);
    for (const id of m.sequence) c.interactJabirTarget(id);
    expect(c.jabirTour.completedIds).toEqual([m.id]);
    c.tick(200); // bounded dt; campaign remains untouched
    expect(JSON.stringify(c.state)).toBe(original);
    expect(c.lastSavedAt).toBe(savedAt);
    c.exitJabirTour();
    expect(visited).toEqual(['jabir', 'khwarizmi']);
    expect(c.jabirTour.active).toBe(false);
  });
  it('does not persist preview mission progress in the established V3 save', () => {
    const store = localStore();
    const c = new GameController(store);
    c.world = { setHallView: () => true } as unknown as WorldApi;
    expect(c.enterJabirTour()).toBe(true);
    c.startJabirMission(JABIR_MISSIONS[0].id);
    for (const id of JABIR_MISSIONS[0].sequence) c.interactJabirTarget(id);
    expect(c.save()).toBe(true);
    const reloaded = new GameController(store);
    expect(reloaded.jabirTour.active).toBe(false);
    expect(reloaded.jabirTour.completedIds).toEqual([]);
    expect(reloaded.state.money).toBe(c.state.money);
  });
});
