import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameController } from '../app/controller';

export const GameContext = createContext<GameController | null>(null);
/** Subscribe a component to the simulation (UI snapshots are published ~5 times per second). */
export function useGame(): GameController {
  const c = useContext(GameContext)!;
  useSyncExternalStore(c.subscribe, c.getVersion);
  return c;
}
const AR = new Intl.NumberFormat('ar-IQ');
export const num = (n: number) => AR.format(Math.round(n));
export const iqd = (n: number) => `${AR.format(Math.round(n))} د.ع`;
export const pct = (n: number) => `${AR.format(Math.round(n))}٪`;
export const dec1 = (n: number) => new Intl.NumberFormat('ar-IQ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
export function clockText(clock: number, dayLength: number, open = 8, close = 16) {
  const m = Math.min(1, clock / dayLength) * (close - open) * 60 + open * 60;
  const h = Math.floor(m / 60), mm = Math.floor(m % 60);
  return `${AR.format(h).padStart(2, '٠')}:${AR.format(mm).padStart(2, '٠')}`;
}
export const mmss = (sec: number) => { const s = Math.max(0, Math.ceil(sec)); return `${AR.format(Math.floor(s / 60))}:${AR.format(s % 60).padStart(2, '٠')}`; };
