# Library Tycoon V3.1: daily goals and open-source art pass

Status: **review-only**. This work is layered on the green V3.1 director-engagement branch and must not merge or publish without the owner's approval.

## Implemented

### 3 daily director challenges
- Every simulated in-game day offers three deterministic goals, selected by game day instead of wall clock or network services. The list rotates over service, visitor, borrowing, income, satisfaction, cleanliness and care criteria.
- Goals appear as progress cards in the Arabic Home dashboard, with a real claim button once each criterion is met.
- Rewards range from 25,000 to 45,000 virtual IQD; amounts are an intentional new in-game balance source and bump `BALANCE_VERSION` to 2.
- Claims write a unique `director-day:<day>:<goal>` token to the existing protected mission reward ledger and save immediately. Rewards are once per goal per game day and survive reload.
- A missing legacy behavior was fixed: per-service daily counters are now sanitized and restored from existing saves. No new save key, schema, OAuth, cloud service or paid AI model.
- The service-income goal counts real service transactions from the restored `ledger.byService` values, not bonuses, event payouts or other mission rewards.
- Bonus goals never replace the twelve existing missions. No real payments.

### Architectural details
- Added four north-wall walnut, navy and brass coffer panels using Babylon.js primitives and the already-loaded PBR palette.
- Added two thin inlaid entrance relief lines. No new collision or navigation geometry.
- Reading tables show actual instanced GLB book stacks and selected desk lamps from the existing asset library.
- The pre-existing static-geometry merge pass batches the added architectural boxes by material; furniture is instanced. No new texture dependency or 3D asset downloads.
- **This is a code and QA milestone, not yet owner-approved visual quality.** Real browser screenshots and a GPU check still determine acceptance.

## Technical sources and licences

The project already uses open-source Babylon.js, React, TypeScript and Blender. This PR adds **no new runtime packages or downloaded third-party meshes**.

- Babylon.js official performance guide: https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene/
- Babylon.js instance guide: https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances
- Poly Haven official CC0: https://polyhaven.com/license
- Kenney official CC0 notes: https://kenney.nl/support

Future art upgrade recommendations: evaluate one specific wood/stone PBR material at a time from Poly Haven, verify its exact file licence and technical format, create a small optimized derivative (for example, a 1K albedo + normal pair), record the licence, hashes and source URL, and measure WebGL load times before importing. Do not copy Poly Haven site images, logos or promotional renders into the game. Do not silently replace original university branding or the official pseudoscorpion mascot.

## Acceptance tests
- `npm run typecheck`
- `npm test`, including new tests for rewards, double-claims, game-day rotation, save and per-service preservation
- `npm run assets:verify` and `npm run build`
- Playwright on actual rendered browser: 3 daily cards in the home panel, existing mission, Dewey mini-game, mascot 25,000-IQD cooldown, full save/reload, RTL layout, identity assets and no console errors
- Actual screenshot at 1920×1080; compare with the previous visual-polish screenshot for furniture clutter, occlusion, contrast and FPS

## Next milestones, not included
1. Dedicated furnishing and sitting checks in the PC area and sofa, with student/book alignment.
2. Per-hall architectural kits and asset budgets. Hall 2, Jaber ibn Hayyan, must have its own 3D scene/navmesh/UI and genuine unlocking test before toggling `multiHall`.
3. Daily director diary and an overview of player decisions based on existing safe event log.
4. Render profiling on the target RTX GPU versus SwiftShader, with low/medium/high presets.
5. Optional CC0 PBR assets or animations only after asset licence verification and performance budgeting.

## Safety
No changes to official logos, mascot mesh, sash, pendant, mission reward values, older branches, production deployment or player saves.
