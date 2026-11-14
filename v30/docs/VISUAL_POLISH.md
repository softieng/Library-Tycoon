# Visual polish pass (branch `feature/v30-visual-polish`)

Baseline: `feature/v30-professional-library-tycoon` @ 87b7c6f. Previous screenshots: `docs/qa/screenshots/`.
New screenshots (real browser captures of the running game, SwiftShader software WebGL): `docs/qa/visual-polish/`.
No economy, mission, upgrade or save-schema code was touched (`BALANCE_VERSION` / `SAVE_SCHEMA` unchanged).

## What changed
| Area | Before | After |
|---|---|---|
| Characters | Kenney mini-figures: cube heads, 0.5-head-ratio chibi bodies, painted-palette texture, no face from most angles | **Character kit v2** (`tools/blender/build_characters.py`): own mesh, ~5.9 heads tall, smooth limbs, hair styles (short, long, bun, curly, beard, hijab), glasses, bags, per-person height. 12 student + 5 staff-uniform models (navy blazer, brass badge/tie; teal cleaner uniform). Legacy GLBs kept as automatic fallback |
| Faces | none | Runtime face (`src/characters/face.ts`): eyes with blink and glance, brows, mouth with 6 expressions (neutral, focus, happy, surprised, unhappy, sleepy) driven by emotes/state |
| Animation | Kenney clips | 10 hand-keyed clips on a new 11-bone rig (idle, walk, sit, pick-up, interact, yes/no, hold, jump) + procedural layer: page-turning readers whose eyes sweep the text, writing scribble, typing, idle glances |
| Mascot | authored clips only | Procedural **alternating-tetrapod eight-leg gait** (stride, foot lift, knee tuck, body bob), head glance toward the nearest student, breathing, tassel/pendant inertia, palp fidgets. Mesh, materials, sash, pendant and clips untouched; `mascot.test.ts` passes |
| Floor | black "peg" cabochons on the tile grid | brass-ringed marble insets |
| Lighting | — | additive daylight shafts from the three arched windows |

## Measured / observed
- `npm run typecheck`, `npm test` (60 tests, +18 new for the character kit), `npm run assets:verify` (117 assets, 6 protected identity files intact), `npm run build`: pass.
- Browser e2e (`tests/e2e/run.mjs`, production build): all checks PASS, incl. employees fixed at workstations, mission reward once, 25,000 IQD gift cooldown, save reload, 1366×768 and 1024×700 layouts, zero console errors. Output in `docs/qa/visual-polish/e2e/`.
- Software-WebGL fps is only indicative (≈4 fps at 1080p high; triangle count rose from ~435k to ~700k with ~17 skinned characters).

## Known issues / remaining
- Characters are now realistically proportioned, so they are **smaller on screen** at the default zoom; readability of emotes relies on the floating icons. Consider a default zoom or icon-size review.
- Seated poses are one shared clip tuned for the reading chairs; the PC chairs and lounge sofa need per-seat tuning and a visual check.
- Mouth decal is small at default zoom (visible only in close-ups). Eyes/brows are the main expression carriers.
- The new rig has no walking foot-IK; stride is tuned for ~1.2 m/s. Legs may slide slightly at other speeds.
- Mascot gait is verified from captured frames only (`05-mascot-walk-*.png`); no video. Visual approval of the mascot against the master remains with the owner.
- Furniture materials and wall/architecture geometry were not reworked in this pass.
- Higgsfield: no credits spent; no generation run.
- Unity (PR #5) untouched.
