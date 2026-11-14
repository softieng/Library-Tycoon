# Changelog

## Unreleased — daily director challenges and open-source art details (review-only)
- Three rotating in-game daily director goals, claimable exactly once per game day, with immediate saving and 25,000–45,000 virtual-IQD rewards. Seven goal definitions and Arabic dashboard controls.
- Income objective counts only actual service transactions, not other reward sources. Restored sanitised per-service daily counters after reload.
- New north-wall coffer panels, entrance relief inlays and GPU-instanced study props using existing GLB models and PBR palette, with no external assets or packages.
- New deterministic tests and actual browser QA assertion. No save-schema change or edit to protected logos/mascot.
- **Balance decision: BALANCE_VERSION 2** adds an optional new in-game reward source. Legacy service and mission prices and their rewards are unchanged.

## Unreleased — visual polish
- Character kit v2 (new Blender-authored rigged people, runtime faces/expressions, reading/writing/typing layer), procedural 8-leg mascot gait, brass-ringed floor insets, window light shafts. See `docs/VISUAL_POLISH.md`. No balance or save changes.

## 3.0.0-alpha.1 — 2026-11-11 (vertical slice, pending owner approval)

Baseline: `feature/v28-real-assets-reading-hall` @ `e556240` (30 Node tests passing at branch time).
V3 lives in `v30/`; nothing in earlier versions was modified.

### Added
- React 19 + TypeScript + Vite application with a single integration layer (`GameController`)
  between UI, Babylon.js world and simulation; engine lifecycle, resize, disposal and error boundary.
- Deterministic simulation (fixed 0.1 s steps, seeded RNG stored in the save): visitor finite-state
  machine with five needs, A* navigation with obstacle inflation and yielding, seat / shelf / queue
  reservations, service desks, staff efficiency / morale / breaks, cleaner confined to its zone,
  cleanliness, satisfaction, reputation, daily cycle with salaries and reports, random decision
  events, device faults, achievements.
- Data-driven mission engine with 12 missions (7 sequential, 5 repeatable), each played through
  world interaction; unique reward tokens prevent double payment; Dewey Decimal mini-game.
- One reading hall (قاعة الخوارزمي) with borrowing counter, reference desk, digital services,
  computers, reading tables, lounge, reception and information totem.
- Blender (bpy) pipeline: 21 custom furniture models, 16 normalised CC0 Kenney props, shared
  palette materials, procedural textures.
- Rigged 3D mascot (34 bones, 12 clips: idle, walk, turn, welcome, guide, search, think, celebrate,
  sad, read, point, wave) with an animation state machine; eight-leg alternating-tetrapod gait.
- Arabic RTL management UI: HUD, 11 collapsible panels, mission tracker, inspector, dialogs,
  completion card, settings with quality presets and render scale.
- Versioned saves (schema 30): checksum, atomic-ish write, backup, rollback, export / import,
  sanitiser, one-way migration from V2.8 saves.
- 42 unit tests, real-browser QA script with screenshots, CI workflow, asset manifest + verifier.

### Preserved from the legacy game
- 17 upgrades with their prices, 4 services with rewards and durations, 5 roles with hire costs,
  starting balance 260,000 IQD, mascot gift 25,000 IQD every 15 minutes, six hall names, fixed
  camera (pan + zoom only), Arabic-first RTL, virtual IQD, no runtime AI or paid APIs.

### Balance decisions new in V3 (BALANCE_VERSION 1) — documented because the legacy game had no equivalent
- Money is stored in IQD (legacy "units" × 1,000); prices and rewards are numerically the same.
- The borrowing librarian is on duty from day one (legacy: hired for 320,000). The 320,000 price is
  kept in the role table for reference; other roles are hired at their legacy prices.
- Daily salary = 4 % of hire cost (+25 % per level); training = 40 % of hire cost × level.
- Mission rewards are 80,000–350,000 IQD (V2.8's 3,000–9,000 were on a different money scale).
- Upgrades may be bought out of legacy order when their prerequisites are met; hall-expansion
  upgrades (5, 7, 9, 10, 11, 13) are gated by `FLAGS.multiHall` until those halls exist.
- V2.8 save import converts money proportionally (÷72,000 × 260,000), capped at 5,000,000 IQD.

### Known issues / not done
- Halls 2–6 are not built. Official floor plan not available: current arrangement is a gameplay layout.
- Characters are Kenney mini-figures (stylised, low-poly). No dedicated turning, writing or typing
  clips exist in the pack: turning is in-place rotation, writing / typing are a procedural arm layer
  on the sit clip. Semi-realistic rigged characters remain an open art task.
- Mascot 3D model has not been compared and approved by the owner; fur is a sheen material, not
  shell fur; sash typeface is Cairo, which may differ from the approved master's lettering.
- Seated figures are aligned to their seat by position only; the generic sit pose overlaps the table edge in close-ups.
- Person-to-person avoidance is yield-and-repath (a deadlock breaker lets agents pass after 2.4 s).
- Babylon.js is bundled whole (~6 MB JS, 1.3 MB gzip); tree-shaken imports are a follow-up.
- Performance on the target RTX 3070 Ti laptop has not been measured (see docs/PERFORMANCE.md).
