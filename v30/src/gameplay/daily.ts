import type { GameState } from './types';

/**
 * Three deterministic daily objectives. They depend on the existing day,
 * ledger and quality stats, not a new save field, wall-clock time or an API.
 * Once paid, the token is persisted in the mission reward log.
 */
export type DirectorGoalId = 'service' | 'arrivals' | 'borrowing' | 'income' | 'satisfaction' | 'cleanliness' | 'care';
export interface DirectorGoal {
  id: DirectorGoalId; titleAr: string; descriptionAr: string;
  progress: number; target: number; complete: boolean; claimed: boolean;
  reward: number; token: string;
}
interface GoalDef {
  id: DirectorGoalId; titleAr: string; descriptionAr: string;
  target: number; reward: number;
  measure(s: GameState): number; eligible(s: GameState): boolean;
}
const GOALS: Record<DirectorGoalId, GoalDef> = {
  service: { id: 'service', titleAr: 'خدمة الزوار', descriptionAr: 'اخدم ٣ طلبة خلال اليوم',
    target: 3, reward: 25_000, measure: s => s.ledger.served, eligible: () => true },
  arrivals: { id: 'arrivals', titleAr: 'استقبال الطلبة', descriptionAr: 'استقبل ٦ زوار خلال اليوم',
    target: 6, reward: 30_000, measure: s => s.ledger.arrivals, eligible: () => true },
  borrowing: { id: 'borrowing', titleAr: 'الإعارة السريعة', descriptionAr: 'أكمل إعارتين خلال اليوم',
    target: 2, reward: 30_000, measure: s => s.ledger.byService.borrow, eligible: () => true },
  income: { id: 'income', titleAr: 'ميزانية المكتبة', descriptionAr: 'حقق ١٥٠٬٠٠٠ د.ع من إيرادات اليوم',
    target: 150_000, reward: 35_000, measure: s => s.ledger.income, eligible: () => true },
  satisfaction: { id: 'satisfaction', titleAr: 'زوار راضون', descriptionAr: 'حافظ على رضا ٨٠٪ مع ٣ خدمات منجزة',
    target: 3, reward: 40_000, measure: s => s.ledger.served, eligible: s => s.satisfaction >= 80 },
  cleanliness: { id: 'cleanliness', titleAr: 'قاعة مرتبة', descriptionAr: 'حافظ على نظافة ٨٥٪ مع ٣ خدمات منجزة',
    target: 3, reward: 40_000, measure: s => s.ledger.served, eligible: s => s.cleanliness >= 85 },
  care: { id: 'care', titleAr: 'لا تترك طالباً', descriptionAr: 'اخدم ٤ طلبة بدون خروج أي زائر منزعج',
    target: 4, reward: 45_000, measure: s => s.ledger.served, eligible: s => s.ledger.lost === 0 },
};
/** Day 1 is the first rotation. Changes in the wall clock never affect goals. */
export function goalsForDay(day: number): readonly DirectorGoalId[] {
  const cycle = (Math.max(1, Math.floor(day)) - 1) % 3;
  const secondary: readonly DirectorGoalId[] = ['arrivals', 'borrowing', 'income'];
  const quality: readonly DirectorGoalId[] = ['satisfaction', 'cleanliness', 'care'];
  return ['service', secondary[cycle], quality[cycle]];
}
export function dailyGoalToken(day: number, id: DirectorGoalId): string {
  return `director-day:${day}:${id}`;
}
export function directorGoals(s: GameState): DirectorGoal[] {
  return goalsForDay(s.day).map(id => {
    const def = GOALS[id], progress = Math.max(0, def.measure(s));
    const complete = progress >= def.target && def.eligible(s);
    const token = dailyGoalToken(s.day, id);
    return { id, titleAr: def.titleAr, descriptionAr: def.descriptionAr,
      progress, target: def.target, complete, claimed: s.missions.rewardLog.includes(token),
      reward: def.reward, token };
  });
}
