import { describe, expect, it } from 'vitest';
import { BALANCE_VERSION } from '../../src/config/balance';
import { dailyGoalToken, directorGoals, goalsForDay } from '../../src/gameplay/daily';
import { Simulation } from '../../src/gameplay/sim';
import { SaveStore } from '../../src/persistence/save';
import { makeSim, MemoryStorage } from './helpers';

describe('director daily challenges', () => {
  it('rotates three stable, distinct, real-world-day-independent challenges', () => {
    expect(goalsForDay(1)).toEqual(['service', 'arrivals', 'satisfaction']);
    expect(goalsForDay(2)).toEqual(['service', 'borrowing', 'cleanliness']);
    expect(goalsForDay(3)).toEqual(['service', 'income', 'care']);
    expect(goalsForDay(4)).toEqual(goalsForDay(1));
    expect(new Set(goalsForDay(2)).size).toBe(3);
    expect(BALANCE_VERSION).toBeGreaterThan(1);
  });
  it('cannot claim early and pays exactly once when a real daily counter is met', () => {
    const sim = makeSim();
    const original = sim.state.money;
    const nothing = sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(sim.state.money).toBe(original);
    expect(nothing.some(e => e.type === 'directorGoal')).toBe(false);
    sim.state.ledger.served = 3;
    const awarded = sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(awarded.some(e => e.type === 'directorGoal')).toBe(true);
    expect(sim.state.money).toBe(original + 25_000);
    expect(sim.state.missions.rewardLog).toContain(dailyGoalToken(1, 'service'));
    sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(sim.state.money).toBe(original + 25_000);
    expect(sim.state.missions.rewardLog.filter(x => x === dailyGoalToken(1, 'service'))).toHaveLength(1);
  });
  it('rejects IDs outside the active day rotation', () => {
    const sim = makeSim();
    sim.state.ledger.served = 100;
    sim.dispatch({ type: 'claimDirectorGoal', id: 'care' });
    sim.dispatch({ type: 'claimDirectorGoal', id: '__unknown__' });
    expect(sim.state.missions.rewardLog).toHaveLength(0);
  });
  it('quality requirements are essential, not just the number of services', () => {
    const sim = makeSim();
    sim.state.ledger.served = 3;
    sim.state.satisfaction = 79;
    expect(directorGoals(sim.state).find(g => g.id === 'satisfaction')?.complete).toBe(false);
    sim.dispatch({ type: 'claimDirectorGoal', id: 'satisfaction' });
    expect(sim.state.missions.rewardLog).toHaveLength(0);
    sim.state.satisfaction = 85;
    expect(directorGoals(sim.state).find(g => g.id === 'satisfaction')?.complete).toBe(true);
    sim.dispatch({ type: 'claimDirectorGoal', id: 'satisfaction' });
    expect(sim.state.missions.rewardLog).toContain(dailyGoalToken(1, 'satisfaction'));
  });
  it('pays only once after save and reload, while preserving older mission rewards', () => {
    const sim = makeSim();
    sim.state.missions.rewardLog.push('missing_book#1');
    sim.state.ledger.served = 3;
    sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    const savedBalance = sim.state.money;
    const store = new SaveStore(new MemoryStorage());
    expect(store.save(sim.state)).toBe(true);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.missions.rewardLog).toContain('missing_book#1');
    expect(result.state.missions.rewardLog).toContain(dailyGoalToken(1, 'service'));
    const second = new Simulation(result.state);
    second.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(second.state.money).toBe(savedBalance);
  });
  it('allows a new day without repaying an older day claim', () => {
    const sim = makeSim();
    sim.state.ledger.served = 3;
    sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    sim.state.day = 2;
    sim.state.ledger.served = 3;
    const count = sim.state.missions.rewardLog.length;
    sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(sim.state.missions.rewardLog).toHaveLength(count + 1);
    expect(sim.state.missions.rewardLog).toContain(dailyGoalToken(1, 'service'));
    expect(sim.state.missions.rewardLog).toContain(dailyGoalToken(2, 'service'));
    sim.dispatch({ type: 'claimDirectorGoal', id: 'service' });
    expect(sim.state.missions.rewardLog).toHaveLength(count + 1);
  });
  it('does not require a new save field or any paid service', () => {
    const sim = makeSim();
    expect(directorGoals(sim.state)).toHaveLength(3);
    expect(directorGoals(sim.state).every(g => !g.complete && !g.claimed)).toBe(true);
    expect(directorGoals(sim.state).every(g => g.reward > 0 && g.target > 0)).toBe(true);
  });
  it('restores borrowing and reading counters after reloading a validated save', () => {
    const sim = makeSim();
    sim.state.day = 2;
    sim.state.ledger.served = 4;
    sim.state.ledger.byService.borrow = 2;
    sim.state.ledger.byService.reading = 2;
    const store = new SaveStore(new MemoryStorage());
    expect(store.save(sim.state)).toBe(true);
    const result = store.load();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.ledger.byService.borrow).toBe(2);
    expect(result.state.ledger.byService.reading).toBe(2);
    expect(directorGoals(result.state).find(g => g.id === 'borrowing')?.complete).toBe(true);
    const resumed = new Simulation(result.state);
    resumed.dispatch({ type: 'claimDirectorGoal', id: 'borrowing' });
    const paid = resumed.state.money;
    resumed.dispatch({ type: 'claimDirectorGoal', id: 'borrowing' });
    expect(resumed.state.money).toBe(paid);
  });

});
