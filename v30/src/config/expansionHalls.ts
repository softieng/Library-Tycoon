import type { PropModel } from '../assets/manifest';

/**
 * Four additional 3D challenge halls. All activities and shelf labels are
 * original fictional GAME content and are not real Koha inventory.
 * They are never purchased or unlocked in the campaign by this module.
 */
export type ExpansionHallId = 'biruni' | 'reference' | 'thabit' | 'theses';
export interface HallTarget {
  id: string;
  titleAr: string;
  x: number;
  z: number;
  model: PropModel;
  kind: 'shelf' | 'service' | 'study' | 'exhibit';
  code?: string;
}
export interface HallQuest {
  id: string;
  titleAr: string;
  storyAr: string;
  sequence: readonly [string, string, string];
  xp: number;
}
export interface HallDefinition {
  id: ExpansionHallId;
  nameAr: string;
  nameEn: string;
  icon: string;
  taglineAr: string;
  offsetX: number;
  accent: string;
  targets: readonly HallTarget[];
  quests: readonly HallQuest[];
}
const target = (id: string, titleAr: string, x: number, z: number, model: PropModel, kind: HallTarget['kind'], code?: string): HallTarget =>
  ({ id, titleAr, x, z, model, kind, code });
const quest = (id: string, titleAr: string, storyAr: string, a: string, b: string, c: string, xp = 120): HallQuest =>
  ({ id, titleAr, storyAr, sequence: [a, b, c], xp });

export const EXPANSION_HALLS: readonly HallDefinition[] = [
  {
    id: 'biruni', nameAr: 'قاعة البيروني', nameEn: 'AL-BIRUNI DIGITAL HALL',
    icon: '💻', taglineAr: 'بحث رقمي، أجهزة حاسوب، ومساعدة الباحثين', offsetX: 92, accent: '#56c8e2',
    targets: [
      target('biruni_pc_1', 'محطة بحث رقمي ١', -8, 6.45, 'pcdesk', 'service'),
      target('biruni_pc_2', 'محطة بحث رقمي ٢', -4.8, 6.45, 'pcdesk', 'service'),
      target('biruni_pc_3', 'محطة بحث رقمي ٣', -1.6, 6.45, 'pcdesk', 'service'),
      target('biruni_network', 'دليل الشبكة المحلية', 2.4, 6.45, 'shelf', 'shelf', '004'),
      target('biruni_programming', 'مصادر البرمجة', 6.5, 6.45, 'shelf', 'shelf', '005'),
      target('biruni_help', 'مكتب المساعدة الرقمية', -7.3, -4.4, 'digitaldesk', 'service'),
      target('biruni_printer', 'منطقة الطباعة', 7.4, -4.5, 'printer', 'service'),
      target('biruni_catalog', 'فهرس البحث', 1.3, -3.3, 'kiosk', 'exhibit'),
      target('biruni_table', 'طاولة التدريب', -1.8, 1.0, 'table', 'study'),
    ],
    quests: [
      quest('biruni_search', 'بحث إلكتروني عاجل', 'طالب يريد الوصول إلى مصادر البرمجة وفتح جلسة بحث.', 'biruni_help', 'biruni_programming', 'biruni_pc_1'),
      quest('biruni_print', 'مشكلة الطباعة', 'تحقق من الدليل قبل إعادة توجيه طلب الطباعة.', 'biruni_pc_2', 'biruni_help', 'biruni_printer', 150),
      quest('biruni_training', 'ورشة فهرسة رقمية', 'هيّئ مصدراً تعليمياً، ثم قدّم تطبيقاً للطلبة.', 'biruni_catalog', 'biruni_network', 'biruni_table', 170),
    ],
  },
  {
    id: 'reference', nameAr: 'قاعة المراجع', nameEn: 'REFERENCE READING HALL',
    icon: '🔎', taglineAr: 'مراجع وموسوعات علمية وإرشاد بحثي', offsetX: 138, accent: '#ddba69',
    targets: [
      target('reference_encyclopedia', 'الموسوعات', -8, 6.5, 'shelf', 'shelf', '030'),
      target('reference_dictionaries', 'المعاجم', -4.7, 6.5, 'shelf', 'shelf', '400'),
      target('reference_sciences', 'المراجع العلمية', -1.4, 6.5, 'shelf', 'shelf', '500'),
      target('reference_engineering', 'المراجع الهندسية', 2, 6.5, 'shelf', 'shelf', '620'),
      target('reference_index', 'الفهارس والكشافات', 5.5, 6.5, 'shelf', 'shelf', '010'),
      target('reference_reception', 'مكتب الاستعلامات', -7.3, -4.5, 'refdesk', 'service'),
      target('reference_catalog', 'فهرس المراجع', 6.4, -4.1, 'kiosk', 'exhibit'),
      target('reference_table_1', 'طاولة باحثين ١', -2.6, 0.4, 'table', 'study'),
      target('reference_table_2', 'طاولة باحثين ٢', 3.3, 0.4, 'table', 'study'),
    ],
    quests: [
      quest('reference_encyclopedia_quest', 'باحث يحتاج موسوعة', 'تتطلب الإجابة الموثقة البحث عن موسوعة ومراجعة مكتب الاستعلامات.', 'reference_reception', 'reference_encyclopedia', 'reference_table_1'),
      quest('reference_term', 'مصطلح علمي صعب', 'اختيار المعجم المناسب، ثم تأكيد المفهوم بالمصدر العلمي.', 'reference_dictionaries', 'reference_sciences', 'reference_reception', 150),
      quest('reference_index_quest', 'إحالة مرجعية', 'استخدم الكشافات والمراجع الهندسية لتوجيه زائر.', 'reference_catalog', 'reference_index', 'reference_engineering', 170),
    ],
  },
  {
    id: 'thabit', nameAr: 'قاعة ثابت بن قرة', nameEn: 'THABIT IBN QURRA STUDY HALL',
    icon: '📖', taglineAr: 'مطالعة هادئة ومسائل رياضية وتحديات تعليمية', offsetX: 184, accent: '#99d7a2',
    targets: [
      target('thabit_mathematics', 'الرياضيات', -8, 6.5, 'shelf', 'shelf', '510'),
      target('thabit_geometry', 'الهندسة', -4.7, 6.5, 'shelf', 'shelf', '516'),
      target('thabit_physics', 'الفيزياء', -1.4, 6.5, 'shelf', 'shelf', '530'),
      target('thabit_astronomy', 'الفلك', 2, 6.5, 'shelf', 'shelf', '520'),
      target('thabit_history', 'تاريخ العلوم', 5.5, 6.5, 'shelf', 'shelf', '509'),
      target('thabit_guidance', 'مكتب إرشاد المطالعة', -7.3, -4.5, 'refdesk', 'service'),
      target('thabit_quiet', 'منطقة هدوء', 6.3, -4.5, 'display', 'exhibit'),
      target('thabit_table_1', 'طاولة مطالعة ١', -2.6, 0.4, 'table', 'study'),
      target('thabit_table_2', 'طاولة مطالعة ٢', 3.3, 0.4, 'table', 'study'),
    ],
    quests: [
      quest('thabit_geometry_quest', 'تحدي المثلثات', 'ابدأ بطلب باحث، ثم راجع مصدر الهندسة قبل حل التمرين.', 'thabit_guidance', 'thabit_geometry', 'thabit_table_1'),
      quest('thabit_astronomy_quest', 'رحلة في الفلك', 'تتبّع موضوع الفلك ثم راجع الفيزياء في منطقة المطالعة.', 'thabit_astronomy', 'thabit_physics', 'thabit_table_2', 150),
      quest('thabit_quiet_quest', 'حماية الهدوء', 'اختر المنطقة الهادئة، ثم أعِد توجيه الدراسة إلى مرجع مناسب.', 'thabit_quiet', 'thabit_mathematics', 'thabit_guidance', 170),
    ],
  },
  {
    id: 'theses', nameAr: 'قاعة الأطاريح', nameEn: 'THESES AND DISSERTATIONS HALL',
    icon: '🎓', taglineAr: 'بحث دراسات عليا، تصنيف، ومراجعة مصادر', offsetX: 230, accent: '#d5a8dc',
    targets: [
      target('theses_masters', 'رسائل الماجستير', -8, 6.5, 'shelf', 'shelf', 'MSc'),
      target('theses_doctoral', 'أطاريح الدكتوراه', -4.7, 6.5, 'shelf', 'shelf', 'PhD'),
      target('theses_engineering', 'الأطاريح الهندسية', -1.4, 6.5, 'shelf', 'shelf', 'ENG'),
      target('theses_index', 'الفهرس الموضوعي', 2, 6.5, 'shelf', 'shelf', 'IDX'),
      target('theses_archive', 'الأرشفة', 5.5, 6.5, 'shelf', 'shelf', 'ARC'),
      target('theses_reception', 'مكتب استعلامات الباحثين', -7.3, -4.5, 'refdesk', 'service'),
      target('theses_catalog', 'فهرس الرسائل', 6.4, -4.1, 'kiosk', 'exhibit'),
      target('theses_table_1', 'طاولة باحث دراسات عليا ١', -2.6, 0.4, 'table', 'study'),
      target('theses_table_2', 'طاولة باحث دراسات عليا ٢', 3.3, 0.4, 'table', 'study'),
    ],
    quests: [
      quest('theses_masters_quest', 'خطة رسالة ماجستير', 'باحث يحتاج مصدر رسالة ودليلاً موضوعياً ثم مكان مطالعة.', 'theses_reception', 'theses_masters', 'theses_table_1'),
      quest('theses_doctoral_quest', 'مراجعة أطروحة', 'وجّه البحث إلى الدكتوراه ثم الفهرس الموضوعي قبل العرض.', 'theses_catalog', 'theses_doctoral', 'theses_index', 150),
      quest('theses_archive_quest', 'مصدر مؤرشف', 'طابق موضوع الهندسة مع السجل الأرشيفي ثم دلّ الباحث عليه.', 'theses_engineering', 'theses_archive', 'theses_table_2', 170),
    ],
  },
] as const;

export const EXPANSION_BY_ID: Readonly<Record<ExpansionHallId, HallDefinition>> =
  Object.fromEntries(EXPANSION_HALLS.map(h => [h.id, h])) as Record<ExpansionHallId, HallDefinition>;

export const expansionTarget = (id: ExpansionHallId, targetId: string): HallTarget | undefined =>
  EXPANSION_BY_ID[id].targets.find(t => t.id === targetId);

export const EXPANSION_HALL_IDS = EXPANSION_HALLS.map(h => h.id);
