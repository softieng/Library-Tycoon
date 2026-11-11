import { UNIT } from './balance';

/** The four legacy services with their legacy rewards (units) and durations (seconds). */
export type ServiceId = 'borrow' | 'print' | 'reading' | 'research';
export interface ServiceDef {
  id: ServiceId;
  nameAr: string;
  reward: number;
  duration: number;
  /** Upgrade that unlocks the paid service (undefined = from the start). */
  unlock?: string;
  role: RoleId;
  icon: string;
}
export type RoleId = 'borrowing' | 'digital' | 'cleaner' | 'research' | 'supervisor';

export const SERVICES: Record<ServiceId, ServiceDef> = {
  borrow: { id: 'borrow', nameAr: 'الاستعارة والإرجاع', reward: 75 * UNIT, duration: 3.6, role: 'borrowing', icon: '📚' },
  print: { id: 'print', nameAr: 'الطباعة والخدمات الرقمية', reward: 110 * UNIT, duration: 4.4, unlock: 'print_office', role: 'digital', icon: '🖨️' },
  reading: { id: 'reading', nameAr: 'المطالعة', reward: 60 * UNIT, duration: 5.2, unlock: 'reading_hall', role: 'supervisor', icon: '📖' },
  research: { id: 'research', nameAr: 'البحث العلمي والمراجع', reward: 135 * UNIT, duration: 6, unlock: 'shelves_khwarizmi', role: 'research', icon: '🔎' },
};

export interface RoleDef {
  id: RoleId;
  nameAr: string;
  hireCost: number;
  dutyAr: string;
  /** Station id in the layout (cleaner uses a zone instead). */
  station: string;
  includedAtStart?: boolean;
}
/** The five legacy roles with their legacy hire costs. */
export const ROLES: RoleDef[] = [
  { id: 'borrowing', nameAr: 'أمين الاستعارة', hireCost: 320 * UNIT, dutyAr: 'الاستعارة والإرجاع', station: 'st_borrow', includedAtStart: true },
  { id: 'digital', nameAr: 'موظف الطباعة والحاسبات', hireCost: 570 * UNIT, dutyAr: 'الطباعة ومساعدة الحاسبات', station: 'st_digital' },
  { id: 'cleaner', nameAr: 'عامل النظافة', hireCost: 860 * UNIT, dutyAr: 'النظافة والصيانة ضمن منطقة القاعة', station: 'st_cleaner' },
  { id: 'research', nameAr: 'مساعد البحث العلمي', hireCost: 1320 * UNIT, dutyAr: 'المساعدة المرجعية', station: 'st_reference' },
  { id: 'supervisor', nameAr: 'مشرف قاعة المطالعة', hireCost: 1580 * UNIT, dutyAr: 'الإشراف على قاعة المطالعة', station: 'st_supervisor' },
];
export const ROLE_BY_ID = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<RoleId, RoleDef>;
export const STAFF_NAMES: Record<RoleId, string> = {
  borrowing: 'أ. زينب', digital: 'أ. حيدر', cleaner: 'أبو علي', research: 'أ. نور', supervisor: 'أ. مصطفى',
};
