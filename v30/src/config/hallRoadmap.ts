import { FLAGS } from './featureFlags';
import { HALLS_AR } from './layout';
import { UPGRADE_BY_ID } from './upgrades';

/**
 * V3.1 expansion roadmap. Every planned hall shares the Babylon 3D scene art
 * pipeline, but the halls are NOT playable until their actual scenes,
 * navigation, and service rules are built and tested.
 */
export const HALL_ROADMAP = [
  { id: 'khwarizmi', nameAr: HALLS_AR[0], icon: '📚', roleAr: 'المطالعة، الإعارة والبحث عن الكتب', upgradeId: null },
  { id: 'jabir', nameAr: HALLS_AR[1], icon: '🧪', roleAr: 'المعارض العلمية والتجارب التعليمية', upgradeId: 'hall_jabir' },
  { id: 'biruni', nameAr: HALLS_AR[2], icon: '💻', roleAr: 'الحاسبات والبحث الرقمي', upgradeId: 'hall_biruni' },
  { id: 'reference', nameAr: HALLS_AR[3], icon: '🔎', roleAr: 'الموسوعات والمراجع العلمية', upgradeId: 'hall_reference' },
  { id: 'thabit', nameAr: HALLS_AR[4], icon: '📖', roleAr: 'القراءة الهادئة والتحديات الدراسية', upgradeId: 'hall_thabit' },
  { id: 'theses', nameAr: HALLS_AR[5], icon: '🎓', roleAr: 'الأطاريح والرسائل والباحثون', upgradeId: 'hall_theses' },
] as const;

export type HallProgress = 'playable' | 'unlocked' | 'in-development' | 'locked';

/** Future flag changes do not create a fake playable hall. */
export function hallProgress(upgradeId: string | null, purchased: readonly string[]): HallProgress {
  if (upgradeId === null) return 'playable';
  if (!FLAGS.multiHall) return 'in-development';
  return purchased.includes(upgradeId) ? 'unlocked' : 'locked';
}

export function hallExpansionCost(upgradeId: string | null): number {
  return upgradeId ? UPGRADE_BY_ID[upgradeId]?.cost ?? 0 : 0;
}
