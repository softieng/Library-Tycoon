import type { GameState } from './types';
/** mulberry32 with its state stored in the save — the simulation is fully deterministic. */
export function rand(s: GameState): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (s: GameState, a: number, b: number) => a + rand(s) * (b - a);
export const randInt = (s: GameState, n: number) => Math.floor(rand(s) * n);
export const pick = <T>(s: GameState, arr: readonly T[]): T => arr[randInt(s, arr.length)];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
