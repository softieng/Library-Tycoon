/**
 * Economy & pacing constants. BALANCE_VERSION must be bumped (and CHANGELOG updated)
 * whenever a number here changes. Legacy V2.x values are marked [legacy]; the legacy
 * engine stored money in "units" where 1 unit = 1,000 IQD, V3 stores plain IQD.
 */
export const BALANCE_VERSION = 2; // Daily director goals add a new, one-time-per-day in-game reward source.
export const UNIT = 1000; // [legacy] 1 credit unit = 1,000 IQD

export const BALANCE = {
  startMoney: 260 * UNIT, // [legacy]
  simStep: 0.1, // seconds per deterministic step
  dayLength: 240, // seconds of opening hours per day (08:00–16:00)
  closingGrace: 40, // seconds after closing before stragglers are asked to leave
  openHour: 8,
  closeHour: 16,
  maxVisitorsBase: 14,
  arrivalInterval: 7.5, // base seconds between arrivals at reputation 3.0
  queueCapacity: 6,
  patience: 34, // seconds a visitor tolerates in a queue
  manualServePenalty: 1.25, // duration multiplier when the director serves (no employee)
  salaryRate: 0.04, // [new in V3] daily salary = 4% of hire cost, per level multiplier below
  trainCostRate: 0.4, // [new in V3] training cost = 40% of hire cost × current level
  maxStaffLevel: 5,
  dirtChance: 0.14,
  dirtPenalty: 7,
  urgentCleanCost: 5 * UNIT,
  technicianCost: 40 * UNIT,
  mascotReward: 25 * UNIT, // [legacy] 25,000 IQD
  mascotCooldownMs: 15 * 60 * 1000, // [legacy] 15 minutes
  eventIntervalMin: 80,
  eventIntervalMax: 140,
  eventTimeout: 45,
} as const;
