import { UNIT } from '../config/balance';

/**
 * Data-driven mission definitions. Presentation code never hard-codes a mission:
 * it renders whatever is described here. Rewards are paid by the mission engine
 * exactly once per run through a unique reward token.
 */
export type ObjectiveDef =
  | { id: string; kind: 'count'; event: string; count: number; textAr: string }
  | { id: string; kind: 'stat'; stat: 'cleanliness' | 'satisfaction'; gte: number; textAr: string };

export interface MissionDef {
  id: string;
  order: number;
  category: 'main' | 'repeatable';
  titleAr: string;
  descriptionAr: string;
  howAr: string;
  location: string; // zone id
  trigger: 'sequence' | 'manual';
  objectives: ObjectiveDef[];
  preconditions?: { missions?: string[]; upgrades?: string[]; minDay?: number; staff?: string[] };
  /** World effects applied when the mission starts (implemented in missions/effects.ts). */
  setup: string[];
  timeLimit?: number;
  reward: { money: number; reputationBoost?: number; satisfaction?: number };
  cooldown?: number; // seconds of play time before a repeatable can run again
  feedback: { mascot: 'celebrate' | 'wave' | 'point'; sfx: 'fanfare' | 'good' };
  icon: string;
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'missing_book', order: 1, category: 'main', icon: '📕', location: 'collection', trigger: 'sequence',
    titleAr: 'الكتاب المفقود',
    descriptionAr: 'طالب يبحث عن كتاب وُضع على رف خاطئ. فتّش الرفوف الحقيقية في القاعة حتى تجده.',
    howAr: 'انقر على أي رف كتب لتفتيشه. الحارس الصغير يذهب للرف ويخبرك هل اقتربت أم ابتعدت.',
    objectives: [{ id: 'found', kind: 'count', event: 'book_found', count: 1, textAr: 'اعثر على الكتاب المفقود' }],
    setup: ['hideBook'], reward: { money: 120 * UNIT, satisfaction: 3 }, feedback: { mascot: 'celebrate', sfx: 'fanfare' },
  },
  {
    id: 'guide_student', order: 2, category: 'main', icon: '🧭', location: 'entrance', trigger: 'sequence',
    titleAr: 'طالب تائه',
    descriptionAr: 'طالب جديد واقف عند المدخل وما يعرف وين يروح. اسأله عن حاجته ووجّهه للمكان الصحيح.',
    howAr: 'انقر على الطالب صاحب علامة الاستفهام، اقرأ طلبه، ثم اختر الوجهة. الحارس الصغير يرافقه.',
    objectives: [{ id: 'guided', kind: 'count', event: 'visitor_guided', count: 1, textAr: 'أوصل الطالب إلى وجهته الصحيحة' }],
    preconditions: { missions: ['missing_book'] },
    setup: ['spawnLost'], reward: { money: 90 * UNIT, satisfaction: 2 }, feedback: { mascot: 'wave', sfx: 'good' },
  },
  {
    id: 'rush_ten', order: 3, category: 'main', icon: '⏱️', location: 'borrowing', trigger: 'sequence',
    titleAr: 'ساعة الذروة',
    descriptionAr: 'انتهت المحاضرات ودخل الطلبة دفعة واحدة. اخدم عشرة طلاب قبل انتهاء الوقت.',
    howAr: 'راقب الطوابير. انقر على مكتب الخدمة لتخدم بنفسك إذا ماكو موظف، أو وظّف ودرّب لتسريع الخدمة.',
    objectives: [{ id: 'served', kind: 'count', event: 'visitor_served', count: 10, textAr: 'اخدم ١٠ طلاب' }],
    preconditions: { missions: ['guide_student'] },
    setup: ['rush'], timeLimit: 200, reward: { money: 200 * UNIT, reputationBoost: 2 }, feedback: { mascot: 'celebrate', sfx: 'fanfare' },
  },
  {
    id: 'dewey_sort', order: 4, category: 'main', icon: '🔢', location: 'borrowing', trigger: 'sequence',
    titleAr: 'تصنيف ديوي العشري',
    descriptionAr: 'عربة الكتب المُرجَعة ممتلئة. صنّف الكتب حسب تصنيف ديوي العشري حتى ترجع لرفوفها.',
    howAr: 'انقر على عربة الكتب قرب مكتب الإعارة لتبدأ اللعبة المصغّرة. تحتاج ٥ إجابات صحيحة من ٦.',
    objectives: [{ id: 'sorted', kind: 'count', event: 'dewey_correct', count: 5, textAr: 'صنّف ٥ كتب تصنيفاً صحيحاً' }],
    preconditions: { missions: ['rush_ten'] },
    setup: [], reward: { money: 150 * UNIT, satisfaction: 2 }, feedback: { mascot: 'celebrate', sfx: 'fanfare' },
  },
  {
    id: 'find_reference', order: 5, category: 'main', icon: '🔎', location: 'reference', trigger: 'sequence',
    titleAr: 'مرجع لطالب باحث',
    descriptionAr: 'طالبة عند مكتب المراجع تحتاج مصدراً لبحثها. حدّد الرف الصحيح حسب موضوع الكتاب.',
    howAr: 'اقرأ عنوان المرجع في لوحة المهمة ثم انقر على الرف الذي يحمل التصنيف المناسب.',
    objectives: [{ id: 'ref', kind: 'count', event: 'reference_found', count: 1, textAr: 'دُلّ الطالبة على الرف الصحيح' }],
    preconditions: { missions: ['dewey_sort'] },
    setup: ['referenceRequest'], reward: { money: 140 * UNIT, satisfaction: 3 }, feedback: { mascot: 'point', sfx: 'good' },
  },
  {
    id: 'exam_week', order: 6, category: 'main', icon: '📝', location: 'reading', trigger: 'sequence',
    titleAr: 'أسبوع الامتحانات',
    descriptionAr: 'القاعة مزدحمة في أسبوع الامتحانات. اخدم ثمانية طلاب وحافظ على الرضا فوق ٧٥٪.',
    howAr: 'وفّر مقاعد كافية (الترقيات) وخدمة سريعة (الموظفون). الطالب الذي لا يجد مقعداً يغادر منزعجاً.',
    objectives: [
      { id: 'served', kind: 'count', event: 'visitor_served', count: 8, textAr: 'اخدم ٨ طلاب أثناء الامتحانات' },
      { id: 'sat', kind: 'stat', stat: 'satisfaction', gte: 75, textAr: 'الرضا ٧٥٪ أو أكثر' },
    ],
    preconditions: { missions: ['find_reference'], upgrades: ['reading_hall'] },
    setup: ['examRush'], timeLimit: 260, reward: { money: 300 * UNIT, reputationBoost: 3 }, feedback: { mascot: 'celebrate', sfx: 'fanfare' },
  },
  {
    id: 'vip_visit', order: 7, category: 'main', icon: '🎓', location: 'entrance', trigger: 'sequence',
    titleAr: 'زيارة وفد أكاديمي',
    descriptionAr: 'وفد من الأساتذة يزور المكتبة. رحّب بكل ضيف عند وصوله واحرص أن يُخدموا دون تأخير.',
    howAr: 'انقر على كل ضيف يحمل علامة النجمة للترحيب به. الحارس الصغير يستقبلهم معك.',
    objectives: [
      { id: 'welcome', kind: 'count', event: 'vip_welcomed', count: 3, textAr: 'رحّب بثلاثة ضيوف' },
      { id: 'served', kind: 'count', event: 'vip_served', count: 2, textAr: 'ضيفان على الأقل يغادران راضيين' },
    ],
    preconditions: { missions: ['exam_week'] },
    setup: ['spawnVips'], timeLimit: 240, reward: { money: 350 * UNIT, reputationBoost: 4 }, feedback: { mascot: 'celebrate', sfx: 'fanfare' },
  },
  /* ---------- Repeatable optional missions ---------- */
  {
    id: 'tidy_hall', order: 20, category: 'repeatable', icon: '🧺', location: 'reading', trigger: 'manual',
    titleAr: 'ترتيب القاعة قبل التقييم',
    descriptionAr: 'لجنة ضمان الجودة قادمة. اجمع الكتب المتروكة على الطاولات قبل وصولها.',
    howAr: 'انقر على كل كتاب متروك (علامة ذهبية) على طاولات المطالعة لإعادته إلى مكانه.',
    objectives: [{ id: 'tidy', kind: 'count', event: 'book_reshelved', count: 5, textAr: 'أعد ٥ كتب متروكة' }],
    setup: ['misplaceBooks'], timeLimit: 120, cooldown: 240, reward: { money: 80 * UNIT, satisfaction: 2 }, feedback: { mascot: 'wave', sfx: 'good' },
  },
  {
    id: 'clean_inspection', order: 21, category: 'repeatable', icon: '🧼', location: 'reading', trigger: 'manual',
    titleAr: 'فحص النظافة',
    descriptionAr: 'جولة تفتيش على النظافة بعد قليل. ارفع النظافة إلى ٩٠٪ قبل وصول اللجنة.',
    howAr: 'عامل النظافة ينظّف داخل منطقته فقط. البقع خارج منطقته تحتاج نقرة منك (تنظيف عاجل مدفوع).',
    objectives: [
      { id: 'spots', kind: 'count', event: 'dirt_cleaned', count: 4, textAr: 'نظّف ٤ بقع' },
      { id: 'clean', kind: 'stat', stat: 'cleanliness', gte: 90, textAr: 'النظافة ٩٠٪ أو أكثر' },
    ],
    setup: ['spawnDirt'], timeLimit: 150, cooldown: 300, reward: { money: 90 * UNIT, reputationBoost: 1 }, feedback: { mascot: 'wave', sfx: 'good' },
  },
  {
    id: 'broken_printer', order: 22, category: 'repeatable', icon: '🖨️', location: 'computers', trigger: 'manual',
    titleAr: 'الطابعة عاطلة',
    descriptionAr: 'الطابعة توقفت والطلبة ينتظرون بحوثهم. قرّر: فني خارجي مضمون أم محاولة إصلاح مجانية؟',
    howAr: 'انقر على الطابعة المعطّلة واختر طريقة الإصلاح. موظف الخدمات الرقمية يرفع فرصة الإصلاح الذاتي.',
    objectives: [{ id: 'fix', kind: 'count', event: 'printer_repaired', count: 1, textAr: 'أعد الطابعة إلى العمل' }],
    preconditions: { upgrades: ['print_office'] },
    setup: ['breakPrinter'], timeLimit: 150, cooldown: 360, reward: { money: 100 * UNIT, satisfaction: 2 }, feedback: { mascot: 'wave', sfx: 'good' },
  },
  {
    id: 'restore_computer', order: 23, category: 'repeatable', icon: '🖥️', location: 'computers', trigger: 'manual',
    titleAr: 'حاسبة خارج الخدمة',
    descriptionAr: 'إحدى حاسبات البحث توقفت عن العمل. أعدها للخدمة حتى لا يخسر الطلبة مقعداً.',
    howAr: 'انقر على الحاسبة ذات الشاشة الحمراء واختر طريقة الإصلاح.',
    objectives: [{ id: 'fix', kind: 'count', event: 'computer_repaired', count: 1, textAr: 'أعد الحاسبة إلى الخدمة' }],
    setup: ['breakComputer'], timeLimit: 150, cooldown: 300, reward: { money: 80 * UNIT, satisfaction: 2 }, feedback: { mascot: 'wave', sfx: 'good' },
  },
  {
    id: 'difficult_borrow', order: 24, category: 'repeatable', icon: '🗂️', location: 'borrowing', trigger: 'manual',
    titleAr: 'طلب استعارة صعب',
    descriptionAr: 'طالب عند مكتب الإعارة عنده حالة خاصة. استمع له واتخذ القرار الصحيح وفق تعليمات المكتبة.',
    howAr: 'انتظر وصول الطالب صاحب علامة الطلب إلى المكتب ثم انقر عليه واختر الحل.',
    objectives: [{ id: 'solve', kind: 'count', event: 'difficult_resolved', count: 1, textAr: 'حُلّ طلب الاستعارة الصعب' }],
    setup: ['spawnDifficult'], timeLimit: 180, cooldown: 300, reward: { money: 110 * UNIT, satisfaction: 3 }, feedback: { mascot: 'point', sfx: 'good' },
  },
];
export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** Dialogue data for the "difficult borrowing request" mission. `correct` is the index of the policy-compliant answer. */
export const DIFFICULT_CASES = [
  { ask: 'أريد أمدد استعارة الكتاب للمرة الثالثة، والامتحان بعد أسبوع.', options: ['تمديد مفتوح بدون شروط', 'تمديد أخير لأسبوع إذا لم يحجزه طالب آخر', 'رفض الطلب وسحب الكتاب فوراً'], correct: 1 },
  { ask: 'ضاعت هويتي الجامعية وأحتاج أستعير مرجعاً اليوم.', options: ['إعارة بدون أي إثبات', 'التحقق من القيد في النظام وتسجيل إعارة مؤقتة', 'منعه من دخول المكتبة'], correct: 1 },
  { ask: 'هذا المرجع نسخة وحيدة وأريد آخذه للبيت.', options: ['إعارته خارجياً كأي كتاب', 'يُقرأ داخل القاعة فقط مع إتاحة التصوير المسموح', 'إخفاء المرجع عن الطلبة'], correct: 1 },
];
/** What a lost student says, and the zone that answers it. */
export const LOST_WANTS = [
  { say: 'أريد أستعير كتاباً لمادة البرمجة، من وين؟', zone: 'borrowing' },
  { say: 'عندي بحث وأحتاج مصادر وموسوعات.', zone: 'reference' },
  { say: 'أريد مكاناً هادئاً أقرأ بيه قبل الامتحان.', zone: 'reading' },
  { say: 'أريد أبحث بالفهرس الإلكتروني وأطبع صفحات.', zone: 'computers' },
];
