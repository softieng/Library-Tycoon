import { Simulation, mascotRewardWait } from '../gameplay/sim';
import { newGame } from '../gameplay/state';
import type { Action, GameState, SimEvent } from '../gameplay/types';
import { SaveStore, type LoadResult, type StorageLike } from '../persistence/save';

export interface Selection { kind: 'visitor' | 'staff' | 'shelf' | 'zone' | 'mascot' | 'device' | 'station' | 'prop'; id: string | number }
export interface Toast { id: number; text: string; tone: 'good' | 'bad' | 'info'; at: number }
export interface Floater { id: number; amount: number; x?: number; z?: number; at: number }
/** Commands the UI can send to the 3D world (set by the scene host; a no-op before the scene exists). */
export interface WorldApi {
  zoom(dir: number): void; resetCamera(): void; focus(x: number, z: number): void;
  setQuality(q: Quality): void; setRenderScale(s: number): void;
  stats(): { fps: number; drawCalls: number; activeMeshes: number; triangles: number };
  project(x: number, y: number, z: number): { x: number; y: number } | null;
}
export type Quality = 'low' | 'medium' | 'high';
export interface Settings { quality: Quality; renderScale: number; sound: boolean; showFps: boolean }
const SETTINGS_KEY = 'uot-library-tycoon-v30-settings';
const memory: StorageLike = (() => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; })();
function browserStorage(): StorageLike { try { const s = window.localStorage; s.getItem('x'); return s; } catch { return memory; } }
/**
 * Preview releases under /v31/ must never overwrite the installed /v30/
 * game save or settings on the same github.io origin. No migration runs
 * automatically. A user may export/import a save explicitly from Settings.
 */
function isolatedPreviewStorage(base: StorageLike): StorageLike {
  if (typeof window === 'undefined') return base;
  const path = window.location.pathname;
  const preview = /(?:^|\\/)v31-shelves(?:\\/|$)/.test(path) ? 'v31-shelves'
    : /(?:^|\\/)v31(?:\\/|$)/.test(path) ? 'v31' : null;
  if (!preview) return base;
  // The v31 prefix remains identical to older previews, preserving those saves.
  // The shelves preview is an isolated trial, never modifying /v30/ or /v31/.
  const key = (name: string) => `uot-library-tycoon-${preview}-preview:${name}`;
  return {
    getItem: (name) => base.getItem(key(name)),
    setItem: (name, value) => base.setItem(key(name), value),
    removeItem: (name) => base.removeItem(key(name)),
  };
}


/**
 * The single integration layer between React (UI), Babylon.js (world) and the simulation.
 * React never touches Babylon objects; Babylon never touches React state.
 */
export class GameController {
  readonly sim: Simulation;
  readonly saves: SaveStore;
  speed = 1; paused = false;
  selection: Selection | null = null;
  toasts: Toast[] = []; floaters: Floater[] = [];
  settings: Settings = { quality: 'high', renderScale: 1, sound: true, showFps: false };
  world: WorldApi | null = null;
  loadSource: string = 'new';
  lastSavedAt = 0;
  private version = 0; private listeners = new Set<() => void>();
  private worldListeners = new Set<(e: SimEvent) => void>();
  private uiAcc = 0; private saveAcc = 0; private seq = 1;
  private storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = storage ?? isolatedPreviewStorage(browserStorage());
    this.saves = new SaveStore(this.storage);
    const res = this.saves.load();
    this.sim = new Simulation(res.ok ? res.state : newGame((Date.now() & 0xffff) | 1));
    this.loadSource = res.ok ? res.source : 'new';
    // Start on a lower-cost preset for a small touch screen, without
    // overriding a previously saved player preference.
    if (typeof window !== 'undefined' && window.innerWidth <= 820 &&
        window.matchMedia?.('(pointer: coarse)').matches) {
      this.settings = { ...this.settings, quality: 'low', renderScale: 0.72 };
    }
    try { const raw = this.storage.getItem(SETTINGS_KEY); if (raw) this.settings = { ...this.settings, ...JSON.parse(raw) }; } catch { /* defaults */ }
  }
  get state(): GameState { return this.sim.state; }

  /* ---- React subscription (useSyncExternalStore) ---- */
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => void this.listeners.delete(fn); };
  getVersion = () => this.version;
  notify() { this.version++; for (const l of this.listeners) l(); }
  onSimEvent(fn: (e: SimEvent) => void) { this.worldListeners.add(fn); return () => void this.worldListeners.delete(fn); }

  /** Called once per rendered frame by the scene host (or by a timer when WebGL is unavailable). */
  tick(realDt: number) {
    const dt = Math.min(realDt, 0.25);
    if (!this.paused) this.handle(this.sim.advance(dt * this.speed));
    this.uiAcc += dt; this.saveAcc += dt;
    const now = performance.now();
    if (this.toasts.length && now - this.toasts[0].at > 4200) { this.toasts.shift(); this.uiAcc = 1; }
    if (this.floaters.length && now - this.floaters[0].at > 1600) this.floaters.shift();
    if (this.uiAcc >= 0.2) { this.uiAcc = 0; this.notify(); }
    if (this.saveAcc >= 12) { this.saveAcc = 0; this.save(); }
  }
  dispatch(a: Action) { this.handle(this.sim.dispatch(a)); this.notify(); }
  private handle(events: SimEvent[]) {
    for (const e of events) {
      if (e.type === 'toast') { this.toasts.push({ id: this.seq++, text: e.text, tone: e.tone, at: performance.now() }); if (this.toasts.length > 4) this.toasts.shift(); }
      else if (e.type === 'money') { this.floaters.push({ id: this.seq++, amount: e.amount, x: e.x, z: e.z, at: performance.now() }); if (this.floaters.length > 12) this.floaters.shift(); }
      else if (e.type === 'mission' || e.type === 'upgrade' || e.type === 'directorGoal' || e.type === 'dayEnd') this.save();
      for (const l of this.worldListeners) l(e);
    }
  }
  select(sel: Selection | null) { this.selection = sel; this.notify(); }
  setSpeed(s: number) { this.speed = s; this.paused = s === 0; this.notify(); }
  mascotWait() { return mascotRewardWait(this.state, Date.now()); }

  /* ---- persistence ---- */
  save(): boolean { const ok = this.saves.save(this.state); if (ok) this.lastSavedAt = Date.now(); return ok; }
  private adopt(res: LoadResult): boolean {
    if (!res.ok) return false;
    this.sim.setState(res.state); this.selection = null;
    for (const l of this.worldListeners) l({ type: 'layout' });
    this.notify(); return true;
  }
  exportSave() { return this.saves.export(this.state); }
  importSave(text: string): boolean { const res = this.saves.import(text); if (res.ok) { this.save(); } const ok = this.adopt(res); if (ok) this.save(); return ok; }
  rollback(): boolean { return this.adopt(this.saves.rollback()); }
  newGame() { this.saves.reset(); this.adopt({ ok: true, state: newGame((Date.now() & 0xffff) | 1), source: 'save' }); this.save(); }
  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    try { this.storage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    if (patch.quality) this.world?.setQuality(patch.quality);
    if (patch.renderScale) this.world?.setRenderScale(patch.renderScale);
    this.notify();
  }
}
