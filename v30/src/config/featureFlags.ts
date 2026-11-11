/** Feature flags gate systems that have not passed their acceptance gate yet. */
export const FLAGS = {
  /** Halls 2–6 are not modelled yet; their upgrades stay locked until this passes visual acceptance. */
  multiHall: false,
  /** Web Audio feedback (synthesised, no asset files). */
  audio: true,
  /** Debug/QA hooks on window.__TYCOON__ (always on: required by automated browser QA). */
  qaHooks: true,
} as const;
export type FlagName = keyof typeof FLAGS;
