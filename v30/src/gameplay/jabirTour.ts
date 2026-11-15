import { advanceJabirMission, JABIR_MISSIONS, JABIR_POINTS, JABIR_SHELVES, type JabirMissionProgress } from '../config/jabirHall';

/**
 * Review-only tour. Deliberately separate from GameState/save/ledger.
 * No simulated IQD is awarded until the real multi-hall economy is approved.
 */
export interface JabirTourState {
  active: boolean;
  mission: JabirMissionProgress | null;
  completedIds: readonly string[];
  messageAr: string;
}

export const newJabirTour = (): JabirTourState =>
  ({ active: false, mission: null, completedIds: [], messageAr: '' });

const validTargets = new Set([...JABIR_SHELVES.map(s => s.id), ...JABIR_POINTS.map(p => p.id)]);

export function beginJabirTour(old: JabirTourState): JabirTourState {
  return { ...old, active: true, messageAr: 'اختر مهمة، ثم اضغط على المواقع المحددة داخل قاعة جابر.' };
}

export function leaveJabirTour(old: JabirTourState): JabirTourState {
  return { ...old, active: false, mission: null, messageAr: '' };
}

export function startJabirTourMission(old: JabirTourState, missionId: string): JabirTourState {
  const m = JABIR_MISSIONS.find(q => q.id === missionId);
  if (!old.active || !m) return old;
  return {
    ...old, mission: { missionId: m.id, nextIndex: 0, finished: false },
    messageAr: m.storyAr,
  };
}

export function interactJabirTour(old: JabirTourState, targetId: string): JabirTourState {
  if (!old.active || !old.mission || !validTargets.has(targetId)) return old;
  const m = JABIR_MISSIONS.find(q => q.id === old.mission?.missionId);
  if (!m) return old;
  const step = advanceJabirMission(old.mission, targetId);
  if (!step.accepted) {
    // A missed target does not advance or award. Keep the hint explicit.
    if (old.mission.finished) return old;
    const next = m.sequence[old.mission.nextIndex];
    return { ...old, messageAr: 'هذا ليس الموقع المطلوب. ابحث عن ' + jabirTargetName(next) + '.' };
  }
  if (step.completedNow) {
    return {
      ...old, mission: step.progress,
      completedIds: old.completedIds.includes(m.id) ? old.completedIds : [...old.completedIds, m.id],
      messageAr: 'أحسنت، اكتملت المهمة التجريبية. لا تُضاف مكافآت مالية في وضع المعاينة.',
    };
  }
  return { ...old, mission: step.progress,
    messageAr: 'خطوة صحيحة. توجه الآن إلى ' + jabirTargetName(m.sequence[step.progress.nextIndex]) + '.' };
}

export function jabirTargetName(id: string): string {
  return JABIR_SHELVES.find(x => x.id === id)?.titleAr
    ?? JABIR_POINTS.find(x => x.id === id)?.titleAr ?? 'الموقع المطلوب';
}
