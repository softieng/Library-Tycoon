import type { RoleId, ServiceId } from '../config/services';
import type { Pt } from '../navigation/grid';

export const SAVE_SCHEMA = 30;
export type Need = 'borrow' | 'read' | 'computer' | 'research' | 'print';
export type VState =
  | 'enter' | 'toShelf' | 'browse' | 'toQueue' | 'queue' | 'served' | 'toSeat' | 'sit'
  | 'leave' | 'lost' | 'follow' | 'gone';
export type Activity = 'read' | 'write' | 'computer';
export type EmoteKind = 'happy' | 'confused' | 'dissatisfied' | 'celebrate' | 'request' | 'sleep' | 'vip' | 'wait';
export interface Emote { kind: EmoteKind; t: number }

export interface Mover {
  x: number; z: number; yaw: number;
  path: Pt[] | null; pathI: number;
  moving: boolean; turning: boolean; blockedT: number; speed: number;
  /** Yaw the agent should settle to once its path is finished. */
  faceYaw?: number;
}
export interface Visitor extends Mover {
  id: number; model: number; need: Need; state: VState;
  timer: number; patience: number; waited: number;
  emote: Emote | null;
  carrying: boolean; activity: Activity | null;
  seatId: string | null; shelfId: string | null; queue: 'borrow' | 'print' | 'research' | null; slot: number;
  vip: boolean; lostWant: string | null; difficult: boolean;
  /** One-shot gesture for the renderer: 'pickup' | 'receive' | 'yes' | 'no'. */
  gesture: string | null; gestureT: number;
  welcomed: boolean; score: number;
}
export type StaffState = 'working' | 'serving' | 'break' | 'walking' | 'cleaning';
export interface Staff extends Mover {
  id: number; role: RoleId; name: string; level: number; xp: number;
  morale: number; energy: number; state: StaffState; timer: number;
  servedToday: number; servedTotal: number; serviceTime: number;
  targetDirt: number | null; emote: Emote | null;
}
export interface ServiceSlot { visitorId: number; t: number; dur: number; by: 'staff' | 'director' }
export interface Dirt { id: number; x: number; z: number; inZone: boolean; cleaning: number }
export type DeviceId = 'printer' | 'pc_1' | 'pc_2' | 'pc_3' | 'pc_4';
export type MascotState = 'idle' | 'walk' | 'turn' | 'welcome' | 'guide' | 'search' | 'think' | 'celebrate' | 'sad' | 'read' | 'point' | 'wave';
export interface Mascot extends Mover {
  anim: MascotState; animT: number;
  task: null | { kind: 'guide'; visitorId: number; dest: string } | { kind: 'search'; shelfId: string } | { kind: 'home' } | { kind: 'greet' };
  lastRewardAt: number; rewardsClaimed: number; idleT: number;
}
export interface MissionRun {
  id: string; status: 'active' | 'completed' | 'failed';
  progress: Record<string, number>; timeLeft: number | null;
  data: Record<string, string | number | boolean>;
}
export interface MissionsState {
  active: MissionRun | null;
  completed: Record<string, number>; // id → times completed
  cooldownUntil: Record<string, number>; // id → playTime when available again
  rewardLog: string[]; // unique reward tokens — a token can only ever pay once
  lastResult: { id: string; status: 'completed' | 'failed'; reward: number; at: number } | null;
  misplaced: { id: number; x: number; z: number; seatTable: string }[];
  dialog: null | { kind: 'difficult' | 'guide' | 'repair'; visitorId?: number; device?: DeviceId; scenario?: number };
}
export interface PendingEvent { id: string; t: number }
export interface DayReport { day: number; income: number; expenses: number; salaries: number; served: number; arrivals: number; lost: number; satisfaction: number; cleanliness: number; reputation: number }
export interface Ledger { income: number; expenses: number; served: number; arrivals: number; lost: number; byService: Record<ServiceId, number> }

export interface GameState {
  schema: number; balanceVersion: number;
  rng: number; nextId: number;
  day: number; clock: number; phase: 'open' | 'closing'; playTime: number;
  money: number; satisfaction: number; cleanliness: number; reputation: number; prestige: number;
  upgrades: string[];
  staff: Staff[]; visitors: Visitor[];
  queues: Record<'borrow' | 'print' | 'research', number[]>;
  service: Record<'borrow' | 'print' | 'research', ServiceSlot | null>;
  seats: Record<string, number>; // seatId → visitorId (reservation)
  shelfUsers: Record<string, number>; // shelfId → visitorId
  dirt: Dirt[]; broken: DeviceId[];
  mascot: Mascot;
  missions: MissionsState;
  event: PendingEvent | null; nextEventAt: number; eventsSeen: number;
  rush: { until: number; mult: number } | null;
  arrivalT: number;
  ledger: Ledger; reports: DayReport[];
  totals: { served: number; earned: number; visitors: number; cleaned: number; repaired: number; deweyBest: number };
  achievements: string[];
  log: { t: number; day: number; text: string; tone: 'good' | 'bad' | 'info' }[];
}

/** Things that happened during a step — consumed by the renderer/UI/audio, never by the sim itself. */
export type SimEvent =
  | { type: 'toast'; text: string; tone: 'good' | 'bad' | 'info' }
  | { type: 'money'; amount: number; x?: number; z?: number }
  | { type: 'mission'; id: string; status: 'started' | 'completed' | 'failed' }
  | { type: 'upgrade'; id: string }
  | { type: 'achievement'; id: string }
  | { type: 'sfx'; name: 'coin' | 'good' | 'bad' | 'click' | 'fanfare' }
  | { type: 'dayEnd'; report: DayReport }
  | { type: 'layout' };

export type Action =
  | { type: 'buyUpgrade'; id: string }
  | { type: 'hire'; role: RoleId }
  | { type: 'train'; staffId: number }
  | { type: 'serve'; service: 'borrow' | 'print' | 'research' }
  | { type: 'cleanDirt'; id: number }
  | { type: 'clickShelf'; id: string }
  | { type: 'clickVisitor'; id: number }
  | { type: 'clickDevice'; id: DeviceId }
  | { type: 'clickMisplaced'; id: number }
  | { type: 'repairChoice'; choice: 'technician' | 'self' }
  | { type: 'dialogChoice'; choice: number }
  | { type: 'guideChoice'; zone: string }
  | { type: 'closeDialog' }
  | { type: 'startMission'; id: string }
  | { type: 'abandonMission' }
  | { type: 'deweyResult'; correct: number; total: number }
  | { type: 'eventChoice'; choice: number }
  | { type: 'mascotReward'; now: number }
  | { type: 'nextDay' };
