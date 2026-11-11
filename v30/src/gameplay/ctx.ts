import type { NavGrid } from '../navigation/grid';
import type { GameState, SimEvent } from './types';

/** Everything a subsystem needs for one deterministic step. */
export interface Ctx {
  s: GameState;
  nav: NavGrid;
  out: SimEvent[];
  owned: ReadonlySet<string>;
  /** Report a gameplay fact to the mission engine (e.g. 'visitor_served'). */
  signal(event: string, n?: number): void;
  toast(text: string, tone?: 'good' | 'bad' | 'info'): void;
  earn(amount: number, x?: number, z?: number): void;
  spend(amount: number): boolean;
}
