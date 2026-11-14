/** Runtime asset list. Paths are relative to the app base so the build works from any sub-path or offline. */
export const MODEL_DIR = 'assets/models/';
export const TEXTURE_DIR = 'assets/textures/';
export const PROP_MODELS = [
  'shelf', 'lowshelf', 'table', 'counter', 'refdesk', 'digitaldesk', 'pcdesk', 'printer', 'podium', 'cart', 'cleancart', 'bench', 'totem',
  'backshelf', 'display', 'kiosk', 'armchair', 'stanchion', 'book_closed', 'book_open', 'planter', 'spill',
  'chair_read', 'chair_pc', 'monitor', 'keyboard', 'mouse', 'laptop', 'plant_tall', 'plant_small', 'plant_small_b', 'lamp_table', 'lamp_floor',
  'sofa', 'coffeetable', 'trashcan', 'book_stack',
] as const;
export type PropModel = (typeof PROP_MODELS)[number];
export const CHARACTER_MODELS = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f'] as const;
/** Staff use models whose clothing swatches never collide with their hair/skin swatches (see tools/textures). */
export const STAFF_MODEL: Record<string, number> = { borrowing: 0, digital: 6, cleaner: 10, research: 3, supervisor: 5 };
export const MASCOT_MODEL = 'mascot';
export const MASCOT_CLIPS = ['idle', 'walk', 'turn', 'welcome', 'guide', 'search', 'think', 'celebrate', 'sad', 'read', 'point', 'wave'] as const;
export const TOTAL_ASSETS = PROP_MODELS.length + CHARACTER_MODELS.length * 2 + Object.keys(STAFF_MODEL).length + 1;
