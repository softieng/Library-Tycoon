import { BALANCE } from '../config/balance';
import { ROLES } from '../config/services';
import { UPGRADE_BY_ID } from '../config/upgrades';
import { clamp } from '../gameplay/rng';
import { emptyLedger, newGame } from '../gameplay/state';
import { SAVE_SCHEMA, type GameState } from '../gameplay/types';
import { makeMascot } from '../mascot/brain';
import { MISSION_BY_ID } from '../missions/definitions';
import { makeStaff } from '../staff/staff';

/**
 * Versioned local saves.
 *  - V3 uses its own keys and never writes to, or deletes, any earlier version's key.
 *  - Writes are atomic-ish: write to a temp key, verify it, promote, keep the previous save as backup.
 *  - Every load goes through migrate() → sanitize(), so imported/corrupt data cannot break the sim.
 */
export const SAVE_KEY = 'uot-library-tycoon-v30';
export const BACKUP_KEY = 'uot-library-tycoon-v30-backup';
export const TEMP_KEY = 'uot-library-tycoon-v30-tmp';
/** Read-only legacy keys (never modified). */
export const LEGACY_KEYS = { v28: 'uot-library-tycoon-v28-art-first' } as const;
const APP_ID = 'uot-library-tycoon';

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface SaveEnvelope { app: string; schema: number; savedAt: number; checksum: string; state: unknown }

export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
export function serialize(state: GameState, now = Date.now()): string {
  const body = JSON.stringify(state);
  const env: SaveEnvelope = { app: APP_ID, schema: SAVE_SCHEMA, savedAt: now, checksum: checksum(body), state: JSON.parse(body) };
  return JSON.stringify(env);
}

const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d);
const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);

/* ---- Migrations: each entry upgrades one schema to a later one. ---- */
type Migration = (raw: Record<string, any>) => Record<string, any>;
const MIGRATIONS: Record<number, Migration> = {
  /**
   * V2.7/V2.8 state (version 27). Its economy used a different scale (start 72,000), so money is
   * converted proportionally to the V3 start (260,000) and capped; completed quests are recorded as
   * already-rewarded so they can never pay again.
   */
  27: (raw) => {
    const s = newGame() as unknown as Record<string, any>;
    s.day = num(raw.day, 1, 1, 365);
    s.money = Math.round(clamp((num(raw.money, 72000, 0, 1e8) / 72000) * BALANCE.startMoney, BALANCE.startMoney, 5_000_000));
    s.satisfaction = num(raw.satisfaction, 86, 0, 100);
    s.cleanliness = num(raw.cleanliness, 92, 0, 100);
    s.totals.served = num(raw.served, 0, 0, 1e7);
    if (raw.quests?.book === true) { s.missions.completed.missing_book = 1; s.missions.rewardLog.push('missing_book#1'); }
    s.log.unshift({ t: 0, day: s.day, text: 'تم استيراد تقدّمك من النسخة ٢٫٨', tone: 'info' });
    return s;
  },
};
export function migrate(raw: unknown): Record<string, any> | null {
  if (!isObj(raw)) return null;
  let cur = raw, schema = typeof raw.schema === 'number' ? raw.schema : typeof raw.version === 'number' ? raw.version : NaN;
  if (!Number.isFinite(schema) || schema > SAVE_SCHEMA) return null; // unknown or from a newer build: refuse, never guess
  for (let guard = 0; schema < SAVE_SCHEMA && guard < 10; guard++) {
    const m = MIGRATIONS[schema];
    if (!m) return null;
    cur = m(cur); schema = cur.schema;
  }
  return cur;
}

/** Rebuild a safe GameState from untrusted data. Transient agents are never restored. */
export function sanitize(raw: Record<string, any>): GameState {
  const s = newGame(num(raw.rng, 1975, -2147483648, 2147483647) | 0);
  s.nextId = num(raw.nextId, 1, 1, 1e9) | 0;
  s.day = Math.floor(num(raw.day, 1, 1, 100000));
  s.clock = num(raw.clock, 0, 0, BALANCE.dayLength - 1);
  s.playTime = num(raw.playTime, 0, 0, 1e9);
  s.money = Math.floor(num(raw.money, BALANCE.startMoney, 0, 1e12));
  s.satisfaction = num(raw.satisfaction, 86, 0, 100);
  s.cleanliness = num(raw.cleanliness, 92, 0, 100);
  s.prestige = num(raw.prestige, 0, 0, 40);
  s.upgrades = Array.isArray(raw.upgrades) ? [...new Set(raw.upgrades.filter((u: unknown): u is string => typeof u === 'string' && !!UPGRADE_BY_ID[u]))] : [];
  s.staff = [];
  const seen = new Set<string>();
  if (Array.isArray(raw.staff)) for (const r of raw.staff) {
    if (!isObj(r) || !ROLES.some((x) => x.id === r.role) || seen.has(r.role)) continue;
    seen.add(r.role);
    const st = makeStaff(s, r.role);
    st.level = Math.floor(num(r.level, 1, 1, BALANCE.maxStaffLevel)); st.xp = Math.floor(num(r.xp, 0, 0, 1e7));
    st.morale = num(r.morale, 78, 0, 100); st.servedTotal = Math.floor(num(r.servedTotal, 0, 0, 1e9));
    s.staff.push(st);
  }
  if (!seen.has('borrowing')) s.staff.unshift(makeStaff(s, 'borrowing'));
  const m = isObj(raw.missions) ? raw.missions : {};
  if (isObj(m.completed)) for (const [k, v] of Object.entries(m.completed)) if (MISSION_BY_ID[k]) s.missions.completed[k] = Math.floor(num(v, 0, 0, 1e6));
  if (isObj(m.cooldownUntil)) for (const [k, v] of Object.entries(m.cooldownUntil)) if (MISSION_BY_ID[k]) s.missions.cooldownUntil[k] = num(v, 0, 0, 1e12);
  if (Array.isArray(m.rewardLog)) s.missions.rewardLog = [...new Set(m.rewardLog.filter((x: unknown): x is string => typeof x === 'string' && x.length < 60))].slice(-500);
  // An interrupted mission is dropped (its transient actors are gone); it simply becomes available again.
  s.mascot = makeMascot();
  if (isObj(raw.mascot)) { s.mascot.lastRewardAt = num(raw.mascot.lastRewardAt, 0, 0, 1e14); s.mascot.rewardsClaimed = Math.floor(num(raw.mascot.rewardsClaimed, 0, 0, 1e7)); }
  s.eventsSeen = Math.floor(num(raw.eventsSeen, 0, 0, 1e7));
  s.nextEventAt = s.playTime + 70;
  if (Array.isArray(raw.reports)) s.reports = raw.reports.filter(isObj).slice(0, 30).map((r: any) => ({
    day: num(r.day, 1, 1, 1e6), income: num(r.income, 0, 0, 1e12), expenses: num(r.expenses, 0, 0, 1e12), salaries: num(r.salaries, 0, 0, 1e12),
    served: num(r.served, 0, 0, 1e6), arrivals: num(r.arrivals, 0, 0, 1e6), lost: num(r.lost, 0, 0, 1e6),
    satisfaction: num(r.satisfaction, 0, 0, 100), cleanliness: num(r.cleanliness, 0, 0, 100), reputation: num(r.reputation, 1, 1, 5),
  }));
  if (isObj(raw.totals)) for (const k of Object.keys(s.totals) as (keyof GameState['totals'])[]) s.totals[k] = num(raw.totals[k], 0, 0, 1e13);
  if (Array.isArray(raw.achievements)) s.achievements = [...new Set(raw.achievements.filter((x: unknown): x is string => typeof x === 'string'))].slice(0, 100);
  if (isObj(raw.ledger)) {
    const l = emptyLedger();
    for (const k of ['income', 'expenses', 'served', 'arrivals', 'lost'] as const)
      l[k] = num(raw.ledger[k], 0, 0, 1e12);
    // Preserve per-service progress when resuming daily director challenges.
    // Restrict keys and values explicitly to prevent injecting unrelated fields.
    if (isObj(raw.ledger.byService)) {
      for (const k of ['borrow', 'print', 'reading', 'research'] as const)
        l.byService[k] = Math.floor(num(raw.ledger.byService[k], 0, 0, 1e7));
    }
    s.ledger = l;
  }
  if (Array.isArray(raw.broken)) s.broken = raw.broken.filter((x: unknown) => ['printer', 'pc_1', 'pc_2', 'pc_3', 'pc_4'].includes(x as string));
  if (Array.isArray(raw.log)) s.log = raw.log.filter(isObj).slice(0, 40).map((l: any) => ({ t: num(l.t, 0, 0, 1e6), day: num(l.day, 1, 1, 1e6), text: String(l.text ?? '').slice(0, 200), tone: ['good', 'bad', 'info'].includes(l.tone) ? l.tone : 'info' }));
  return s;
}

export type LoadResult = { ok: true; state: GameState; source: 'save' | 'backup' | 'legacy-v28' | 'import' } | { ok: false; reason: string };

export function parseSave(text: string | null, source: 'save' | 'backup' | 'import' = 'save'): LoadResult {
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > 2_000_000) return { ok: false, reason: 'too-large' };
  let env: unknown;
  try { env = JSON.parse(text); } catch { return { ok: false, reason: 'not-json' }; }
  if (!isObj(env) || env.app !== APP_ID || !isObj(env.state)) return { ok: false, reason: 'not-a-save' };
  if (typeof env.checksum !== 'string' || checksum(JSON.stringify(env.state)) !== env.checksum) return { ok: false, reason: 'checksum' };
  const migrated = migrate({ ...env.state, schema: typeof env.state.schema === 'number' ? env.state.schema : env.schema });
  if (!migrated) return { ok: false, reason: 'unsupported-version' };
  return { ok: true, state: sanitize(migrated), source };
}

export class SaveStore {
  constructor(private store: StorageLike) {}
  save(state: GameState, now = Date.now()): boolean {
    try {
      const text = serialize(state, now);
      this.store.setItem(TEMP_KEY, text);
      if (this.store.getItem(TEMP_KEY) !== text) return false; // verify before promoting
      const prev = this.store.getItem(SAVE_KEY);
      if (prev && parseSave(prev).ok) this.store.setItem(BACKUP_KEY, prev);
      this.store.setItem(SAVE_KEY, text);
      this.store.removeItem(TEMP_KEY);
      return true;
    } catch { return false; }
  }
  /** Main save → backup → one-way import of a V2.8 save → nothing. */
  load(): LoadResult {
    const main = safe(() => parseSave(this.store.getItem(SAVE_KEY), 'save'));
    if (main?.ok) return main;
    const backup = safe(() => parseSave(this.store.getItem(BACKUP_KEY), 'backup'));
    if (backup?.ok) return backup;
    const legacy = safe(() => this.store.getItem(LEGACY_KEYS.v28));
    if (legacy) {
      try { const m = migrate(JSON.parse(legacy)); if (m) return { ok: true, state: sanitize(m), source: 'legacy-v28' }; } catch { /* ignore */ }
    }
    return { ok: false, reason: main && !main.ok ? main.reason : 'empty' };
  }
  /** Restore the previous save (the current one becomes the backup, so rollback is itself reversible). */
  rollback(): LoadResult {
    const backup = parseSave(safe(() => this.store.getItem(BACKUP_KEY)) ?? null, 'backup');
    if (!backup.ok) return backup;
    const cur = this.store.getItem(SAVE_KEY), bak = this.store.getItem(BACKUP_KEY)!;
    this.store.setItem(SAVE_KEY, bak);
    if (cur) this.store.setItem(BACKUP_KEY, cur);
    return backup;
  }
  hasBackup() { return !!safe(() => this.store.getItem(BACKUP_KEY)); }
  export(state: GameState) { return serialize(state); }
  import(text: string): LoadResult { return parseSave(text, 'import'); }
  /** Starts over, but keeps the old save as the backup so it can be rolled back. */
  reset() { const cur = safe(() => this.store.getItem(SAVE_KEY)); if (cur) this.store.setItem(BACKUP_KEY, cur); this.store.removeItem(SAVE_KEY); }
}
function safe<T>(f: () => T): T | null { try { return f(); } catch { return null; } }
