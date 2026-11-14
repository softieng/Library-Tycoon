/**
 * V3.2: Jabir ibn Hayyan hall gameplay foundation.
 * DESIGN-ONLY: no scene, hall unlock, save mutation, economy change or deployment.
 * Fictional academic collections for Library Tycoon, not actual Koha holdings.
 *
 * The source of truth for the existing Khwarizmi hall remains config/layout.ts.
 */
export const JABIR_BOUNDS = { minX: -11, maxX: 11, minZ: -8, maxZ: 8 } as const;
export const JABIR_ENTRY = { x: 0, z: -7.7 } as const;
export const JABIR_DOOR = { x: 0, z: -8, width: 2.4 } as const;

export interface JabirShelf {
  id: string;
  code: string;
  titleAr: string;
  topicsAr: readonly string[];
  x: number;
  z: number;
  /** A walkable, free standing approach target, not the shelf's solid footprint. */
  access: { x: number; z: number };
}

export const JABIR_SHELVES: readonly JabirShelf[] = [
  { id: 'jabir_shelf_540', code: '540', titleAr: 'الكيمياء العامة', topicsAr: ['العناصر', 'المركبات', 'التفاعلات'], x: -8, z: 7, access: { x: -8, z: 5.8 } },
  { id: 'jabir_shelf_541', code: '541', titleAr: 'الكيمياء الفيزيائية', topicsAr: ['الطاقة', 'الاتزان', 'الثرموداينمك'], x: -5, z: 7, access: { x: -5, z: 5.8 } },
  { id: 'jabir_shelf_542', code: '542', titleAr: 'الطرق الكيميائية', topicsAr: ['طرق القياس', 'الأجهزة', 'السلامة المختبرية'], x: -2, z: 7, access: { x: -2, z: 5.8 } },
  { id: 'jabir_shelf_543', code: '543', titleAr: 'الكيمياء التحليلية', topicsAr: ['التحليل', 'المعايرة', 'القياس'], x: 1, z: 7, access: { x: 1, z: 5.8 } },
  { id: 'jabir_shelf_546', code: '546', titleAr: 'الكيمياء اللاعضوية', topicsAr: ['المعادن', 'اللافلزات', 'المركبات'], x: 4, z: 7, access: { x: 4, z: 5.8 } },
  { id: 'jabir_shelf_547', code: '547', titleAr: 'الكيمياء العضوية', topicsAr: ['المركبات العضوية', 'البوليمرات', 'الكيمياء الحيوية'], x: 7, z: 7, access: { x: 7, z: 5.8 } },
  { id: 'jabir_shelf_620', code: '620', titleAr: 'العلوم الهندسية', topicsAr: ['المواد', 'الميكانيك', 'التطبيقات'], x: -9.5, z: 2.5, access: { x: -8.1, z: 2.5 } },
  { id: 'jabir_shelf_660', code: '660', titleAr: 'الهندسة الكيميائية', topicsAr: ['عمليات التصنيع', 'العمليات الصناعية', 'هندسة التفاعلات'], x: -9.5, z: -1.5, access: { x: -8.1, z: -1.5 } },
] as const;

export interface JabirPoint {
  id: string;
  titleAr: string;
  x: number;
  z: number;
  kind: 'service' | 'exhibit' | 'study' | 'staff';
}
export const JABIR_POINTS: readonly JabirPoint[] = [
  { id: 'jabir_reception', titleAr: 'استعلامات القاعة', x: 0, z: -5.6, kind: 'service' },
  { id: 'jabir_materials_exhibit', titleAr: 'معرض المواد العلمية', x: 3.0, z: -0.5, kind: 'exhibit' },
  { id: 'jabir_library_desk', titleAr: 'مكتب أمين القاعة', x: -6.5, z: -5.5, kind: 'staff' },
  { id: 'jabir_study_table_1', titleAr: 'طاولة مطالعة ١', x: -2.7, z: 1.5, kind: 'study' },
  { id: 'jabir_study_table_2', titleAr: 'طاولة مطالعة ٢', x: 4.8, z: 2.6, kind: 'study' },
  { id: 'jabir_study_table_3', titleAr: 'طاولة مطالعة ٣', x: 7.3, z: -4.2, kind: 'study' },
] as const;

/**
 * Narrative interactions demand three separate world actions. All rewards are
 * in simulated IQD. No real money is charged, and no real laboratory tasks occur.
 */
export interface JabirMission {
  id: string;
  titleAr: string;
  storyAr: string;
  sequence: readonly string[];
  rewardIQD: number;
}
export const JABIR_MISSIONS = [
  {
    id: 'jabir_research_request',
    titleAr: 'طلب باحث مستعجل',
    storyAr: 'طالب دراسات عليا يحتاج مرجعاً في الكيمياء التحليلية قبل موعد مناقشة البحث.',
    sequence: ['jabir_reception', 'jabir_shelf_543', 'jabir_library_desk'],
    rewardIQD: 18000,
  },
  {
    id: 'jabir_materials_exhibition',
    titleAr: 'معرض المواد',
    storyAr: 'جهز زاوية عرض تعليمية لزوار المعرض بالعثور على مصدر علم المواد.',
    sequence: ['jabir_materials_exhibit', 'jabir_shelf_620', 'jabir_reception'],
    rewardIQD: 23000,
  },
  {
    id: 'jabir_classification_challenge',
    titleAr: 'خطأ في بطاقة التصنيف',
    storyAr: 'وصل طلب كتاب هندسة كيميائية إلى رف غير مناسب. تحقق من الدليل وأعد توجيهه.',
    sequence: ['jabir_library_desk', 'jabir_shelf_660', 'jabir_reception'],
    rewardIQD: 21000,
  },
] as const satisfies readonly JabirMission[];

export interface JabirMissionProgress {
  missionId: (typeof JABIR_MISSIONS)[number]['id'];
  nextIndex: number;
  finished: boolean;
}
export interface JabirMissionStep {
  progress: JabirMissionProgress;
  accepted: boolean;
  completedNow: boolean;
}
/** Pure deterministic transition. Award from completedNow only, then persist a unique reward token. */
export function advanceJabirMission(progress: JabirMissionProgress, selectedId: string): JabirMissionStep {
  const mission = JABIR_MISSIONS.find((m) => m.id === progress.missionId);
  if (!mission || progress.finished || progress.nextIndex < 0 || progress.nextIndex >= mission.sequence.length) {
    return { progress, accepted: false, completedNow: false };
  }
  if (mission.sequence[progress.nextIndex] !== selectedId) {
    return { progress, accepted: false, completedNow: false };
  }
  const nextIndex = progress.nextIndex + 1;
  const completedNow = nextIndex === mission.sequence.length;
  return {
    progress: { ...progress, nextIndex, finished: completedNow },
    accepted: true,
    completedNow,
  };
}
