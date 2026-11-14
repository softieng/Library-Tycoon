import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, EVENTS } from '../../src/config/events';
import { HALL_ROADMAP, hallExpansionCost, hallProgress } from '../../src/config/hallRoadmap';
import { HALLS_AR } from '../../src/config/layout';
import { UPGRADE_BY_ID } from '../../src/config/upgrades';
import { makeSim } from './helpers';

describe('V3.1 director events', () => {
  it('has ten distinct decision events with Arabic text and safe no-cost timeouts', () => {
    expect(EVENTS).toHaveLength(10);
    expect(new Set(EVENTS.map((e) => e.id)).size).toBe(EVENTS.length);
    for (const ev of EVENTS) {
      expect(ev.titleAr.length).toBeGreaterThan(4);
      expect(ev.bodyAr.length).toBeGreaterThan(25);
      expect(ev.options).toHaveLength(2);
      expect(ev.defaultOption === 0 || ev.defaultOption === 1).toBe(true);
      expect(ev.options[ev.defaultOption].money ?? 0).toBeGreaterThanOrEqual(0);
      expect(ev.options[0].resultAr).not.toBe(ev.options[1].resultAr);
      for (const option of ev.options) {
        expect(option.textAr.length).toBeGreaterThan(4);
        expect(option.resultAr.length).toBeGreaterThan(10);
        expect(Object.values(option).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
      }
    }
  });

  it('makes offline-catalog assistance a real decision with measurable consequences', () => {
    const helpful = makeSim();
    helpful.state.event = { id: 'internet_interruption', t: 60 };
    const sat = helpful.state.satisfaction;
    helpful.dispatch({ type: 'eventChoice', choice: 0 });
    expect(helpful.state.event).toBeNull();
    expect(helpful.state.satisfaction).toBe(sat + 3);
    expect(helpful.state.prestige).toBe(1);

    const harmful = makeSim();
    harmful.state.event = { id: 'internet_interruption', t: 60 };
    harmful.dispatch({ type: 'eventChoice', choice: 1 });
    expect(harmful.state.satisfaction).toBe(sat - 6);
  });

  it('will not charge money or consume an event when an expensive option is unaffordable', () => {
    const sim = makeSim();
    sim.state.money = 0;
    sim.state.event = { id: 'rare_books', t: 60 };
    sim.dispatch({ type: 'eventChoice', choice: 0 });
    expect(sim.state.money).toBe(0);
    expect(sim.state.event?.id).toBe('rare_books');
    sim.dispatch({ type: 'eventChoice', choice: 1 });
    expect(sim.state.event).toBeNull();
  });

  it('adds non-repeatable achievements based on existing saved game statistics', () => {
    const ids = ['visitor_hundred', 'reader_space', 'research_ready', 'technical_rescuer'];
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    const sim = makeSim();
    for (const id of ids) expect(ACHIEVEMENTS.find((a) => a.id === id)?.test(sim.state)).toBe(false);
    sim.state.totals.visitors = 100;
    sim.state.upgrades.push('reading_hall', 'shelves_khwarizmi');
    sim.state.totals.repaired = 5;
    for (const id of ids) expect(ACHIEVEMENTS.find((a) => a.id === id)?.test(sim.state)).toBe(true);
  });
});

describe('six-hall 3D roadmap remains honest about actual gameplay scope', () => {
  it('lists the exact six hall names with stable upgrade prices', () => {
    expect(HALL_ROADMAP).toHaveLength(6);
    expect(HALL_ROADMAP.map((h) => h.nameAr)).toEqual(HALLS_AR);
    expect(hallProgress(HALL_ROADMAP[0].upgradeId, [])).toBe('playable');
    for (const hall of HALL_ROADMAP.slice(1)) {
      expect(hall.upgradeId).toBeTruthy();
      expect(hallExpansionCost(hall.upgradeId)).toBe(UPGRADE_BY_ID[hall.upgradeId!].cost);
      expect(hallProgress(hall.upgradeId, [])).toBe('in-development');
      expect(hallProgress(hall.upgradeId, [hall.upgradeId!])).toBe('in-development');
    }
  });
});
