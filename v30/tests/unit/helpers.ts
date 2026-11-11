import { Simulation } from '../../src/gameplay/sim';
import { newGame } from '../../src/gameplay/state';
import type { SimEvent } from '../../src/gameplay/types';

export function makeSim(seed = 1975) { return new Simulation(newGame(seed)); }
/** Run the simulation for `seconds` of game time, calling `each` after every step. */
export function run(sim: Simulation, seconds: number, each?: (events: SimEvent[]) => void | boolean) {
  const steps = Math.round(seconds * 10);
  for (let i = 0; i < steps; i++) { const ev = sim.step([]); if (each && each(ev) === true) return true; }
  return false;
}
export class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}
