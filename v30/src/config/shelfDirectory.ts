import { DEWEY } from './dewey';
import { HALL_ROADMAP } from './hallRoadmap';

/**
 * Fictional game wayfinding, inspired by subject signage in an academic library.
 * These entries are NOT a claim about actual Central Library book holdings or
 * a verified floor-by-floor physical distribution.
 *
 * Keep the canonical Dewey codes unchanged: the existing book-search missions,
 * classification mini-game, saves and shelf IDs all depend on them.
 */
export interface ShelfDirectoryEntry {
  code: string;
  shelfId: string;
  titleAr: string;
  topicsAr: readonly string[];
  accent: string;
}

export const SHELF_DIRECTORY: readonly ShelfDirectoryEntry[] = DEWEY.map((d) => {
  const details: Record<string, { titleAr: string; topicsAr: readonly string[] }> = {
    '000': { titleAr: 'المعارف والحاسوب', topicsAr: ['البرمجة', 'الذكاء الاصطناعي', 'الشبكات', 'قواعد البيانات', 'الخوارزميات'] },
    '100': { titleAr: 'الفلسفة وعلم النفس', topicsAr: ['المنطق', 'التفكير النقدي', 'علم النفس التربوي'] },
    '200': { titleAr: 'الديانات', topicsAr: ['الدراسات الدينية', 'علوم القرآن', 'تاريخ الأديان'] },
    '300': { titleAr: 'المجتمع والاقتصاد', topicsAr: ['العلوم الاجتماعية', 'الاقتصاد', 'القانون', 'الإدارة'] },
    '400': { titleAr: 'اللغات والمعاجم', topicsAr: ['اللغة العربية', 'اللغة الإنكليزية', 'المعاجم', 'الترجمة'] },
    '500': { titleAr: 'العلوم والرياضيات', topicsAr: ['الرياضيات', 'الفيزياء', 'الكيمياء', 'الإحصاء'] },
    '600': { titleAr: 'الهندسة والتقنية', topicsAr: ['الإلكترونيات', 'السيطرة', 'هندسة المواد', 'التطبيقات الصناعية'] },
    '700': { titleAr: 'الفنون والعمارة', topicsAr: ['التصميم المعماري', 'تاريخ العمارة', 'الفنون'] },
    '800': { titleAr: 'الآداب', topicsAr: ['الشعر', 'الرواية', 'الأدب العراقي'] },
    '900': { titleAr: 'التاريخ والجغرافيا', topicsAr: ['تاريخ بغداد', 'جغرافية العراق', 'الخرائط'] },
  };
  const entry = details[d.code];
  if (!entry) throw new Error(`Missing approved game shelf signage for Dewey ${d.code}`);
  return { code: d.code, shelfId: `shelf_${d.code}`, ...entry, accent: d.color };
});

export const SHELF_DIRECTORY_BY_ID: Readonly<Record<string, ShelfDirectoryEntry>> =
  Object.fromEntries(SHELF_DIRECTORY.map((entry) => [entry.shelfId, entry]));

export interface HallCollectionProposal {
  id: (typeof HALL_ROADMAP)[number]['id'];
  titleAr: string;
  subjectsAr: readonly string[];
  /** Design only; no simulated shelf stock and no real library catalogue link. */
  noteAr: string;
}
const subjectPlans: Readonly<Record<HallCollectionProposal['id'], { subjectsAr: readonly string[]; noteAr: string }>> = {
  khwarizmi: { subjectsAr: ['الحاسوب والبرمجة', 'الذكاء الاصطناعي', 'الشبكات وقواعد البيانات', 'الرياضيات', 'التصنيف العام'], noteAr: 'تصنيف ديوي العام موجود حالياً على ١٠ رفوف في القاعة التجريبية.' },
  jabir: { subjectsAr: ['الكيمياء', 'الهندسة الكيميائية', 'علم المواد', 'العلوم التطبيقية'], noteAr: 'تخصصات مقترحة للعبة بعد بناء القاعة الثانية.' },
  biruni: { subjectsAr: ['الفيزياء', 'الفلك', 'القياسات العلمية', 'الإحصاء', 'الخرائط والتحليل'], noteAr: 'تخصصات مقترحة للعبة وليست بيانات مقتنيات فعلية.' },
  reference: { subjectsAr: ['الموسوعات', 'المعاجم', 'الأدلة والكشافات', 'المراجع السريعة'], noteAr: 'تُجهّز باللعبة لاحقاً مع مهام البحث المرجعي.' },
  thabit: { subjectsAr: ['الرياضيات المتقدمة', 'الميكانيك', 'الهندسة', 'الكتب التخصصية'], noteAr: 'تُجهّز باللعبة لاحقاً مع تحديات المطالعة.' },
  theses: { subjectsAr: ['رسائل الماجستير', 'أطاريح الدكتوراه', 'البحوث الجامعية', 'الفهارس البحثية'], noteAr: 'تُجهّز باللعبة لاحقاً مع مهمات الباحثين.' },
};

export const HALL_COLLECTIONS: readonly HallCollectionProposal[] = HALL_ROADMAP.map(hall => ({
  id: hall.id, titleAr: hall.nameAr, ...subjectPlans[hall.id],
}));

/** Case- and common Arabic hamza-insensitive matching for the in-game directory. */
export function normalizeSubjectSearch(text: string): string {
  return text.normalize('NFKC').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function searchShelfDirectory(query: string): ShelfDirectoryEntry[] {
  const needle = normalizeSubjectSearch(query);
  return SHELF_DIRECTORY.filter(entry => !needle ||
    [entry.code, entry.titleAr, ...entry.topicsAr].some(term => normalizeSubjectSearch(term).includes(needle)));
}
