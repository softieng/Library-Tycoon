import { UNIT } from './balance';
import type { FlagName } from './featureFlags';

/** The 17 legacy upgrades, same order and same prices (in units ×1,000 IQD). */
export interface UpgradeDef {
  id: string;
  order: number;
  nameAr: string;
  cost: number;
  effectAr: string;
  /** Upgrade is unavailable until the flag is on. */
  flag?: FlagName;
  /** Other upgrades that must be owned first. */
  requires?: string[];
}
const U = (order: number, id: string, nameAr: string, units: number, effectAr: string, extra: Partial<UpgradeDef> = {}): UpgradeDef =>
  ({ order, id, nameAr, cost: units * UNIT, effectAr, ...extra });

export const UPGRADES: UpgradeDef[] = [
  U(1, 'waiting_area', 'منطقة انتظار منظمة', 160, 'مقاعد انتظار قرب الإعارة: صبر الطابور +٣٠٪'),
  U(2, 'reading_hall', 'قاعة مطالعة عامة', 240, 'طاولتان إضافيتان وتفعيل خدمة المطالعة المدفوعة'),
  U(3, 'restrooms', 'المرافق الصحية', 310, 'تراجع النظافة أبطأ ورضا الزوار أعلى'),
  U(4, 'print_office', 'مكتب الطباعة', 420, 'تفعيل خدمة الطباعة في مكتب الخدمات الرقمية'),
  U(5, 'hall_jabir', 'قاعة جابر بن حيان', 550, 'جناح كتب ثانٍ', { flag: 'multiHall' }),
  U(6, 'shelves_khwarizmi', 'توسعة رفوف الخوارزمي', 620, 'رفوف عرض إضافية وتفعيل خدمة البحث العلمي'),
  U(7, 'hall_biruni', 'قاعة البيروني', 780, 'قاعة حاسبات', { flag: 'multiHall' }),
  U(8, 'staff_lounge', 'استراحة الموظفين', 860, 'استراحات أقصر ومعنويات أعلى'),
  U(9, 'hall_reference', 'قاعة المراجع', 980, 'جناح مصادر وموسوعات', { flag: 'multiHall' }),
  U(10, 'hall_thabit', 'قاعة ثابت بن قرة', 1150, 'قاعة مطالعة', { flag: 'multiHall' }),
  U(11, 'hall_theses', 'قاعة الأطاريح والرسائل', 1390, 'جناح دراسات عليا', { flag: 'multiHall' }),
  U(12, 'group_reading', 'توسعة المطالعة الجماعية', 1740, 'طاولتان جماعيتان إضافيتان', { requires: ['reading_hall'] }),
  U(13, 'postgrad_hall', 'قاعة دراسات عليا إضافية', 1920, 'مقاعد بحث إضافية', { flag: 'multiHall' }),
  U(14, 'ecatalog_lab', 'مختبر الفهرس الإلكتروني', 2150, 'جلسات الحاسبة أسرع وزوار أكثر'),
  U(15, 'corridor_plants', 'تجميل الممرات والنباتات', 2480, 'نباتات وزينة: رضا الزوار أعلى'),
  U(16, 'reception_refresh', 'تحديث صالة الاستقبال', 2900, 'سمعة أعلى وتدفق زوار أكبر'),
  U(17, 'golden_library', 'المكتبة الذهبية', 3900, 'لقب المكتبة الذهبية ومكافأة يومية', {
    requires: ['waiting_area', 'reading_hall', 'restrooms', 'print_office', 'shelves_khwarizmi', 'staff_lounge', 'group_reading', 'ecatalog_lab', 'corridor_plants', 'reception_refresh'],
  }),
];
export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
