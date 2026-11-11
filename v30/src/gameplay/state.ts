import { BALANCE, BALANCE_VERSION } from '../config/balance';
import { makeMascot } from '../mascot/brain';
import { makeStaff } from '../staff/staff';
import { SAVE_SCHEMA, type GameState, type Ledger } from './types';

export const emptyLedger = (): Ledger => ({ income: 0, expenses: 0, served: 0, arrivals: 0, lost: 0, byService: { borrow: 0, print: 0, reading: 0, research: 0 } });

export function newGame(seed = 1975): GameState {
  const s: GameState = {
    schema: SAVE_SCHEMA, balanceVersion: BALANCE_VERSION, rng: seed | 0, nextId: 1,
    day: 1, clock: 0, phase: 'open', playTime: 0,
    money: BALANCE.startMoney, satisfaction: 86, cleanliness: 92, reputation: 4.3, prestige: 0,
    upgrades: [], staff: [], visitors: [],
    queues: { borrow: [], print: [], research: [] }, service: { borrow: null, print: null, research: null },
    seats: {}, shelfUsers: {}, dirt: [], broken: [],
    mascot: makeMascot(),
    missions: { active: null, completed: {}, cooldownUntil: {}, rewardLog: [], lastResult: null, misplaced: [], dialog: null },
    event: null, nextEventAt: 70, eventsSeen: 0, rush: null, arrivalT: 2,
    ledger: emptyLedger(), reports: [],
    totals: { served: 0, earned: 0, visitors: 0, cleaned: 0, repaired: 0, deweyBest: 0 },
    achievements: [], log: [],
  };
  // V3 balance decision (documented in CHANGELOG): the borrowing librarian is on duty from day one.
  s.staff.push(makeStaff(s, 'borrowing'));
  return s;
}
