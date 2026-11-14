# V3.1 Director Engagement Preview (review-only)

This is a deliberately small, safe gameplay-improvement batch on top of the V3.0 visual polish branch. **Not merged, not publicly deployed.**

## New playable content
- **Six new dynamic director decision events**, bringing the existing event pool from 4 to 10. Exam crowds, rare collections, student-project exhibitions, an external internet outage with local-catalog fallback, computer-queue pressure and a new-student tour.
- Choice consequences now appear next to each button, allowing the player to compare satisfaction, prestige, cleanliness, cost and visitor effects before deciding.
- Unaffordable paid choices are disabled in the event panel. Auto-timeout choices remain free.
- **Four additional progression achievements** drawn from existing, persisted game metrics. No new persistent fields and no save-schema migration.

## Six 3D halls
- The library overview now displays the six named halls, their planned roles and real prices from the existing upgrade definitions.
- **Only Khwarizmi is playable.** Halls 2–6 remain visibly in development and remain locked via the existing `FLAGS.multiHall=false`. No fake halls, new scene or spendable unlocks are introduced.
- All future halls are intended to share Babylon.js, art direction, game camera, mascot/students and rendering architecture. Actual implementation and approval of each hall is a separate milestone.

## Automated verification
- New tests cover unique event IDs, default no-cost timeout choices, meaningful simulated decision consequences, insufficient funds, all four achievements, the six-hall roadmap and actual upgrade costs.
- Existing unit, protected asset, browser, balance and save tests must remain green.
- No protected branding or mascot models are changed.

## Planned engagement roadmap, not part of this PR
1. Finish browser and actual GPU verification of V3.0 visual polish.
2. Rich event staging: matching visitor animations and environmental reactions.
3. Non-abusive daily objectives with streaks and an accessible game journal, designed with a migration-safe save change.
4. Build and test hall 2 (Jabir), including navigation, music/sound zones, unique missions and true scene transitions.
5. Repeat for the remaining halls using the same engine and an art-quality acceptance checklist.

Cost figures refer to in-game IQD, not real money.
