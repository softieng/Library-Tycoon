import { DEWEY } from './dewey';
import type { ServiceId } from './services';

/**
 * GAMEPLAY LAYOUT — not a factual reconstruction of the real building.
 * One reading hall (قاعة الخوارزمي) with its adjacent borrowing counter, reception,
 * reference desk and digital-services corner. Units are metres, +x east, +z north.
 * This single file is the source of truth for the simulation (navigation, seats,
 * queues, stations) and for the 3D world (object placement).
 */
export const HALL = { minX: -13, maxX: 13, minZ: -9, maxZ: 9, cell: 0.5 } as const;
export const DOOR = { minX: 9, maxX: 11, z: -9, outside: { x: 10, z: -10.4 }, inside: { x: 10, z: -7.9 } } as const;

export type PropType =
  | 'shelf' | 'lowshelf' | 'table' | 'counter' | 'refdesk' | 'digitaldesk' | 'printer' | 'pcdesk'
  | 'podium' | 'display' | 'kiosk' | 'armchair' | 'floorlamp' | 'rope' | 'staffonly' | 'cart' | 'cleancart' | 'bench' | 'plant' | 'sofa' | 'coffeetable' | 'totem' | 'backshelf' | 'halldoor' | 'gate';

export interface Prop {
  id: string;
  type: PropType;
  x: number;
  z: number;
  /** Yaw in quarter turns: 0 = front faces south (−z), 1 = faces west (−x), 2 = north, 3 = east. */
  rot: 0 | 1 | 2 | 3;
  /** Footprint width (local x) and depth (local z) in metres; swapped when rot is odd. */
  w: number;
  d: number;
  solid: boolean;
  requires?: string;
  label?: string;
  code?: string;
}
export interface Spot { x: number; z: number; yaw: number }
export const YAW = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 } as const;

const props: Prop[] = [];
const P = (p: Prop) => { props.push(p); return p; };

/* ---- Collection: ten Dewey shelves (7 on the north wall, 3 on the west wall) ---- */
export interface ShelfInfo { id: string; code: string; access: Spot }
export const SHELVES: ShelfInfo[] = [];
[-11, -9, -7, -5, -3, -1, 1].forEach((x, i) => {
  const c = DEWEY[i];
  P({ id: `shelf_${c.code}`, type: 'shelf', x, z: 8.68, rot: 0, w: 2, d: 0.55, solid: true, code: c.code, label: c.nameAr });
  SHELVES.push({ id: `shelf_${c.code}`, code: c.code, access: { x, z: 7.7, yaw: YAW.N } });
});
[5.5, 3.5, 1.5].forEach((z, i) => {
  const c = DEWEY[7 + i];
  P({ id: `shelf_${c.code}`, type: 'shelf', x: -12.68, z, rot: 3, w: 2, d: 0.55, solid: true, code: c.code, label: c.nameAr });
  SHELVES.push({ id: `shelf_${c.code}`, code: c.code, access: { x: -11.7, z, yaw: YAW.W } });
});
P({ id: 'low_a', type: 'lowshelf', x: -6.6, z: 3.1, rot: 0, w: 2.4, d: 0.8, solid: true, requires: 'shelves_khwarizmi' });
P({ id: 'low_b', type: 'lowshelf', x: -6.6, z: 0.3, rot: 0, w: 2.4, d: 0.8, solid: true, requires: 'shelves_khwarizmi' });

/* ---- Reading tables: each has four real seats ---- */
export interface SeatInfo { id: string; table: string; spot: Spot; approach: Spot; kind: 'read' | 'pc'; requires?: string }
export const SEATS: SeatInfo[] = [];
const table = (id: string, x: number, z: number, requires?: string) => {
  P({ id, type: 'table', x, z, rot: 0, w: 2.2, d: 1.1, solid: true, requires });
  let n = 0;
  for (const sx of [-0.55, 0.55]) for (const side of [-1, 1]) {
    SEATS.push({
      id: `${id}_s${n++}`, table: id, kind: 'read', requires,
      spot: { x: x + sx, z: z + side * 0.84, yaw: side < 0 ? YAW.N : YAW.S },
      approach: { x: x + sx, z: z + side * 1.5, yaw: side < 0 ? YAW.N : YAW.S },
    });
  }
};
table('table_1', -1.5, 4.2);
table('table_2', -1.5, 1.0);
table('table_3', 2.6, 4.2, 'reading_hall');
table('table_4', 2.6, 1.0, 'reading_hall');
table('table_5', 6.6, 1.0, 'group_reading');
table('table_6', 6.6, 4.2, 'group_reading');

/* ---- Computers on the north wall ---- */
[5.5, 7.5, 9.5, 11.5].forEach((x, i) => {
  P({ id: `pc_${i + 1}`, type: 'pcdesk', x, z: 8.5, rot: 0, w: 1.5, d: 0.8, solid: true });
  SEATS.push({ id: `pc_${i + 1}_seat`, table: `pc_${i + 1}`, kind: 'pc', spot: { x, z: 7.62, yaw: YAW.N }, approach: { x, z: 6.9, yaw: YAW.N } });
});
P({ id: 'hall_door_jabir', type: 'halldoor', x: 3.3, z: 8.9, rot: 0, w: 1.6, d: 0.2, solid: false, label: 'قاعة جابر بن حيان' });

/* ---- Service points ----
 * Desks are arranged so that every employee faces south or east, i.e. toward the fixed camera. */
P({ id: 'counter', type: 'counter', x: -10.9, z: -4.4, rot: 3, w: 5, d: 0.9, solid: true, label: 'الإعارة والإرجاع' });
P({ id: 'backshelf', type: 'backshelf', x: -12.68, z: -4.4, rot: 3, w: 4.4, d: 0.5, solid: true });
P({ id: 'rope', type: 'rope', x: -7.4, z: -5.05, rot: 0, w: 4.6, d: 0.1, solid: true });
P({ id: 'cart', type: 'cart', x: -10.6, z: -0.9, rot: 3, w: 0.7, d: 1.1, solid: true, label: 'عربة الكتب المُرجَعة' });
P({ id: 'refdesk', type: 'refdesk', x: -2.4, z: -4.0, rot: 0, w: 2.6, d: 0.9, solid: true, label: 'المراجع' });
P({ id: 'digitaldesk', type: 'digitaldesk', x: 10.6, z: 4.9, rot: 0, w: 2.2, d: 0.8, solid: true, label: 'الخدمات الرقمية' });
P({ id: 'printer', type: 'printer', x: 12.35, z: 3.2, rot: 1, w: 0.8, d: 0.8, solid: true, label: 'الطابعة' });
P({ id: 'podium', type: 'podium', x: 0.55, z: 6.25, rot: 0, w: 0.7, d: 0.6, solid: true });
P({ id: 'cleancart', type: 'cleancart', x: 8.9, z: 0.2, rot: 0, w: 0.7, d: 1.0, solid: true });
P({ id: 'totem', type: 'totem', x: 7.4, z: -7.7, rot: 0, w: 0.9, d: 0.4, solid: true, label: 'الاستعلامات' });
P({ id: 'gate', type: 'gate', x: 10, z: -9, rot: 0, w: 2, d: 0.2, solid: false });
/* Staff-only aisles behind the desks: invisible, but closed to visitors and the mascot. */
P({ id: 'staff_borrow', type: 'staffonly', x: -11.9, z: -4.4, rot: 0, w: 1.1, d: 5, solid: true });
P({ id: 'staff_ref', type: 'staffonly', x: -2.4, z: -3.05, rot: 0, w: 2.6, d: 1.0, solid: true });
P({ id: 'staff_digital', type: 'staffonly', x: 10.6, z: 5.75, rot: 0, w: 2.2, d: 0.9, solid: true });
P({ id: 'staff_supervisor', type: 'staffonly', x: 0.55, z: 6.9, rot: 0, w: 0.9, d: 0.6, solid: true });

/* ---- Comfort & décor ---- */
P({ id: 'bench_1', type: 'bench', x: -7.9, z: -2.6, rot: 0, w: 1.7, d: 0.6, solid: true, requires: 'waiting_area' });
P({ id: 'bench_2', type: 'bench', x: -5.7, z: -2.6, rot: 0, w: 1.7, d: 0.6, solid: true, requires: 'waiting_area' });
P({ id: 'sofa', type: 'sofa', x: -5.6, z: -8.2, rot: 2, w: 2.2, d: 0.9, solid: true });
P({ id: 'coffee', type: 'coffeetable', x: -5.6, z: -6.9, rot: 0, w: 1.0, d: 0.6, solid: true });
P({ id: 'armchair_1', type: 'armchair', x: -7.6, z: -7.7, rot: 3, w: 1.0, d: 0.9, solid: true });
P({ id: 'armchair_2', type: 'armchair', x: -3.8, z: -7.7, rot: 1, w: 1.0, d: 0.9, solid: true });
P({ id: 'display', type: 'display', x: 3.4, z: -5.2, rot: 0, w: 1.7, d: 1.7, solid: true, label: 'وصل حديثاً' });
P({ id: 'kiosk_1', type: 'kiosk', x: 6.2, z: -2.6, rot: 0, w: 0.6, d: 0.5, solid: true, label: 'الفهرس الإلكتروني' });
P({ id: 'kiosk_2', type: 'kiosk', x: 7.4, z: -2.6, rot: 0, w: 0.6, d: 0.5, solid: true, label: 'الفهرس الإلكتروني' });
P({ id: 'lamp_1', type: 'floorlamp', x: -7.9, z: -8.5, rot: 0, w: 0.4, d: 0.4, solid: true });
P({ id: 'lamp_2', type: 'floorlamp', x: -12.4, z: 7.4, rot: 0, w: 0.4, d: 0.4, solid: true });
P({ id: 'lamp_3', type: 'floorlamp', x: 12.4, z: 7.3, rot: 0, w: 0.4, d: 0.4, solid: true });
const plant = (id: string, x: number, z: number, requires?: string) => P({ id, type: 'plant', x, z, rot: 0, w: 0.6, d: 0.6, solid: true, requires });
plant('plant_1', 12.4, -8.3); plant('plant_2', -12.4, -8.3); plant('plant_3', -12.4, -0.6); plant('plant_4', 12.4, 0.2);
plant('plant_5', 12.4, -4.2, 'corridor_plants'); plant('plant_6', -4.4, 6.9, 'corridor_plants'); plant('plant_7', 0.4, -1.6, 'corridor_plants');
plant('plant_8', -9.6, -8.3, 'corridor_plants'); plant('plant_9', 8.4, 6.2, 'corridor_plants'); plant('plant_10', -1.6, -8.3, 'corridor_plants');

export const PROPS: readonly Prop[] = props;
export const PROP_BY_ID: Record<string, Prop> = Object.fromEntries(props.map((p) => [p.id, p]));

/* ---- Stations: service employees stay here. ---- */
export interface Station { id: string; spot: Spot; service?: ServiceId; propId?: string }
export const STATIONS: Record<string, Station> = {
  st_borrow: { id: 'st_borrow', spot: { x: -11.9, z: -4.4, yaw: YAW.E }, service: 'borrow', propId: 'counter' },
  st_reference: { id: 'st_reference', spot: { x: -2.4, z: -3.0, yaw: YAW.S }, service: 'research', propId: 'refdesk' },
  st_digital: { id: 'st_digital', spot: { x: 10.6, z: 5.75, yaw: YAW.S }, service: 'print', propId: 'digitaldesk' },
  st_supervisor: { id: 'st_supervisor', spot: { x: 0.55, z: 6.9, yaw: YAW.S }, service: 'reading', propId: 'podium' },
  st_cleaner: { id: 'st_cleaner', spot: { x: 8.9, z: 1.2, yaw: YAW.W } },
};
/** Cleaning staff may only move inside this rectangle. */
export const CLEANER_ZONE = { minX: -5, maxX: 9.6, minZ: -1.2, maxZ: 5.6 } as const;

/* ---- Queues: slot 0 is the service position. ---- */
export const QUEUES: Record<'borrow' | 'print' | 'research', Spot[]> = {
  borrow: [-9.85, -8.95, -8.05, -7.15, -6.25, -5.35].map((x) => ({ x, z: -4.4, yaw: YAW.W })),
  research: [-5.1, -6.0, -6.9, -7.8].map((z) => ({ x: -2.4, z, yaw: YAW.N })),
  print: [3.85, 2.95, 2.05, 1.15].map((z) => ({ x: 10.6, z, yaw: YAW.N })),
};

export const MASCOT_HOME: Spot = { x: 11.3, z: -3.4, yaw: 2.5 }; // faces the entrance and the camera
export const MASCOT_GREET: Spot = { x: 11.3, z: -7.3, yaw: YAW.W };

/* ---- Zones (selectable "rooms" inside the hall) ---- */
export interface Zone { id: string; nameAr: string; minX: number; maxX: number; minZ: number; maxZ: number; kind: 'quiet' | 'active'; guide: Spot }
export const ZONES: Zone[] = [
  { id: 'borrowing', nameAr: 'الإعارة والإرجاع', minX: -13, maxX: -4.6, minZ: -7, maxZ: -1.6, kind: 'active', guide: { x: -6.6, z: -3.5, yaw: YAW.W } },
  { id: 'reference', nameAr: 'المراجع والبحث العلمي', minX: -4.6, maxX: 0.4, minZ: -9, maxZ: -1.6, kind: 'quiet', guide: { x: -0.8, z: -5.6, yaw: YAW.N } },
  { id: 'lounge', nameAr: 'ركن الاستراحة', minX: -13, maxX: -4.6, minZ: -9, maxZ: -7, kind: 'quiet', guide: { x: -5.6, z: -5.9, yaw: YAW.S } },
  { id: 'entrance', nameAr: 'المدخل والاستقبال', minX: 0.4, maxX: 13, minZ: -9, maxZ: -1.6, kind: 'active', guide: { x: 9.2, z: -6.6, yaw: YAW.N } },
  { id: 'computers', nameAr: 'الحاسبات والخدمات الرقمية', minX: 4.4, maxX: 13, minZ: -1.6, maxZ: 9, kind: 'active', guide: { x: 8.6, z: 6.4, yaw: YAW.N } },
  { id: 'reading', nameAr: 'المطالعة', minX: -4.2, maxX: 4.4, minZ: -1.6, maxZ: 6.9, kind: 'quiet', guide: { x: 0.6, z: 2.6, yaw: YAW.N } },
  { id: 'collection', nameAr: 'مجموعة الكتب — رفوف الخوارزمي', minX: -13, maxX: 4.4, minZ: -1.6, maxZ: 9, kind: 'quiet', guide: { x: -5, z: 7.4, yaw: YAW.N } },
];
export function zoneAt(x: number, z: number): Zone | undefined {
  return ZONES.find((q) => x >= q.minX && x <= q.maxX && z >= q.minZ && z <= q.maxZ);
}
export const HALL_NAME_AR = 'قاعة الخوارزمي';
export const HALLS_AR = ['قاعة الخوارزمي', 'قاعة جابر بن حيان', 'قاعة البيروني', 'قاعة المراجع', 'قاعة ثابت بن قرة', 'قاعة الأطاريح والرسائل'];
