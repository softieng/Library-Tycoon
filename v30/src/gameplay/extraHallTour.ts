import { EXPANSION_BY_ID, EXPANSION_HALL_IDS, expansionTarget, type ExpansionHallId } from '../config/expansionHalls';

export const HALL_PROGRESS_KEY = 'uot-library-tycoon-expansion-v1';
const HALL_PROGRESS_VERSION = 1;
export interface HallProgress {
  readonly completed: Readonly<Record<ExpansionHallId, readonly string[]>>;
  readonly earnedXp: Readonly<Record<ExpansionHallId, number>>;
}
export interface ActiveHallQuest { id: string; nextIndex: number; finished: boolean }
export interface ExtraHallState {
  readonly active: ExpansionHallId | null;
  readonly quest: ActiveHallQuest | null;
  readonly progress: HallProgress;
  readonly messageAr: string;
}
const emptyMap = <T>(make: () => T): Record<ExpansionHallId, T> =>
  Object.fromEntries(EXPANSION_HALL_IDS.map(id => [id, make()])) as Record<ExpansionHallId, T>;

export function newExtraHallState(): ExtraHallState {
  return { active: null, quest: null, progress: { completed: emptyMap(() => [] as string[]), earnedXp: emptyMap(() => 0) }, messageAr: '' };
}
export function readExtraHallProgress(raw: string | null): HallProgress {
  const fallback = newExtraHallState().progress;
  if (!raw || raw.length > 20_000) return fallback;
  try {
    const obj: unknown = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fallback;
    const v = obj as Record<string, unknown>;
    if (v.version !== HALL_PROGRESS_VERSION || !v.completed || typeof v.completed !== 'object' || Array.isArray(v.completed)) return fallback;
    const candidate = v.completed as Record<string, unknown>;
    const completed = emptyMap(() => [] as string[]);
    const earnedXp = emptyMap(() => 0);
    for (const id of EXPANSION_HALL_IDS) {
      const list = candidate[id];
      const allowed = new Set(EXPANSION_BY_ID[id].quests.map(q => q.id));
      if (!Array.isArray(list) || list.length > 30) return fallback;
      if (!list.every(m => typeof m === 'string' && allowed.has(m))) return fallback;
      completed[id] = [...new Set(list)];
      earnedXp[id] = EXPANSION_BY_ID[id].quests
        .filter(q => completed[id].includes(q.id)).reduce((n, q) => n + q.xp, 0);
    }
    return { completed, earnedXp };
  } catch { return fallback; }
}
export function writeExtraHallProgress(progress: HallProgress): string {
  // XP is derived from verified quest IDs instead of accepting a persisted number.
  return JSON.stringify({ version: HALL_PROGRESS_VERSION, completed: progress.completed });
}
export function visitExtraHall(state: ExtraHallState, id: ExpansionHallId): ExtraHallState {
  return { ...state, active: id, quest: null, messageAr: 'اختر مهمة من اللوحة، ثم اضغط على عناصرها داخل القاعة.' };
}
export function leaveExtraHall(state: ExtraHallState): ExtraHallState {
  return { ...state, active: null, quest: null, messageAr: '' };
}
export function startExtraHallQuest(state: ExtraHallState, questId: string): ExtraHallState {
  if (!state.active) return state;
  const q = EXPANSION_BY_ID[state.active].quests.find(x => x.id === questId);
  if (!q) return state;
  return { ...state, quest: { id: q.id, nextIndex: 0, finished: false }, messageAr: q.storyAr };
}
export function interactExtraHall(state: ExtraHallState, targetId: string): ExtraHallState {
  if (!state.active || !state.quest) return state;
  const hallId = state.active;
  const mission = EXPANSION_BY_ID[hallId].quests.find(q => q.id === state.quest?.id);
  if (!mission || state.quest.finished || !expansionTarget(hallId, targetId)) return state;
  const want = mission.sequence[state.quest.nextIndex];
  if (targetId !== want)
    return { ...state, messageAr: 'موقع غير صحيح. توجه إلى ' + (expansionTarget(hallId, want)?.titleAr ?? '') + '.' };
  const nextIndex = state.quest.nextIndex + 1;
  if (nextIndex < mission.sequence.length) {
    return { ...state, quest: { ...state.quest, nextIndex }, messageAr: 'خطوة صحيحة. توجه الآن إلى ' +
      (expansionTarget(hallId, mission.sequence[nextIndex])?.titleAr ?? '') + '.' };
  }
  const complete = state.progress.completed[hallId];
  const firstTime = !complete.includes(mission.id);
  const completed = {
    ...state.progress.completed,
    [hallId]: firstTime ? [...complete, mission.id] : complete,
  };
  const earnedXp = {
    ...state.progress.earnedXp,
    [hallId]: state.progress.earnedXp[hallId] + (firstTime ? mission.xp : 0),
  };
  return {
    ...state, quest: { ...state.quest, nextIndex, finished: true },
    progress: { completed, earnedXp },
    messageAr: firstTime ? 'أحسنت! اكتملت المهمة، وحصلت على ' + mission.xp + ' نقطة خبرة في القاعة.' :
      'أكملت المهمة مرة أخرى للتدريب، بدون تكرار مكافأة الخبرة.',
  };
}
