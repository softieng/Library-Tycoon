# Acceptance checklist — V3.0.0-alpha.1

Legend: ✅ verified here (with evidence) · 🟡 implemented, not fully verified or partial · ⛔ not done / blocked · 👤 needs the owner

Evidence comes from `npm test` (42 unit tests), `npm run assets:verify`, and the real-browser run in
[`qa/browser-qa.md`](qa/browser-qa.md) with screenshots in [`qa/screenshots/`](qa/screenshots/).
Every screenshot is the live canvas and live UI of the production build; none is a mock-up.

## Mandatory visual gate

| Item | Status | Evidence / note |
|---|---|---|
| WebGL actually rendered in a browser | ✅ | Chromium + ANGLE/SwiftShader (software). Not blocked. |
| Full 1920×1080 reading-hall screenshot | ✅ | `qa/screenshots/01-reading-hall-1920x1080.png` |
| Close-up: student at a bookshelf | ✅ | `02-student-at-bookshelf.png` |
| Close-up: working employee | ✅ | `03-employee-serving.png` (librarian at her station serving, progress bar) |
| 3D mascot walking in the library | ✅ | `04-mascot-walking.png` (front), `04b-mascot-walking-to-shelf.png` |
| Main mission interface | ✅ | `05-mission-interface.png` |
| Completed mission | ✅ | `06-mission-completed.png` |
| Comparison with the approved concept art | ⛔ | The approved concept image is **not in any repository I could access**, so no side-by-side was possible. Only the mascot master was available. |
| **Owner visual approval** | 👤 | **Not requested as "complete". The owner has not seen these screenshots yet.** |

### Honest visual assessment (my own, not an approval)

What works: coherent navy / gold / ivory / walnut palette; warm lighting with soft shadows; dense,
individually modelled books; arched windows, wainscot, cornices, brass rails; readable zones;
signage with correct Arabic; staff face the camera; the hall is busy with students.

What is still below a "premium, semi-realistic" target:
- **Characters are Kenney mini-figures** — blocky, big-headed, toy-like. They are consistent with
  each other but are the weakest element and do not match semi-realistic architecture.
- Sitting figures use a generic sit pose; hands do not grip books; no finger or facial animation.
- Kenney-derived props (sofa, armchair, chairs, plants) are simpler than the custom furniture.
- Marble is a procedural texture with tiling visible in close-ups; no real-time floor reflections.
- No ceiling or pendant lighting (cut-away view); walls above the shelves are plain.
- Mascot plush is a sheen material, not real fur; proportions were matched by eye to one photo.

## Institutional identity

| Item | Status | Evidence |
|---|---|---|
| Official logos unmodified | ✅ | SHA-256 locked in `assets:verify` and `mascot.test.ts` |
| Mascot: exactly 8 walking legs, 2 pedipalps with claws | ✅ | `mascot.test.ts` on the exported GLB |
| No tail, no stinger | ✅ | same test |
| Graduation cap + tassel, navy sash, pendant | ✅ | same test + screenshots |
| Sash inscriptions (المكتبة المركزية / CENTRAL LIBRARY, الجامعة التكنولوجية / UNIVERSITY OF TECHNOLOGY) | 🟡 | Exact words verified. **Typeface is Cairo; the master's lettering was not reproduced glyph-for-glyph.** |
| Pendant "إقرأ 1975" | 🟡 | The pendant carries the official logo (which contains the اقرأ calligraphy and 1975), resampled, not redrawn. At game scale it is a few pixels. |
| 12 mascot animations, eight-leg gait | ✅ | same test; `tools/blender/build_mascot.py` |
| Subtle facial expressions | 🟡 | blink, squint, smile→frown, small mouth. Not reviewed. |
| Owner approval of the 3D mascot against the master | 👤 | **Not done. Do not treat the mascot as approved.** |

## Gameplay

| Item | Status | Evidence |
|---|---|---|
| Arrive → need → navigate → wait → served → react → reputation/income | ✅ | unit tests + browser run |
| Collision-aware paths; no walking through furniture or walls | ✅ | `simulation.test.ts` (sampled every step for 200 s) |
| Person-to-person avoidance | 🟡 | overlaps < 1 % of sampled pairs; deadlock breaker lets agents pass through after 2.4 s |
| Real seats and queue slots; no double occupancy | ✅ | unit tests |
| Service staff fixed at workstations; cleaner confined to its zone | ✅ | unit test (300 s, all five roles) + browser check |
| Hiring, training, salary, morale, efficiency, breaks | ✅ | unit tests |
| 17 upgrades, legacy prices | ✅ | unit test. 6 hall upgrades are flag-gated (halls not built) |
| Economy integrity (income = services × price) | ✅ | unit test |
| Mascot gift 25,000 IQD / 15 min, anti-exploit | ✅ | unit test (spam, reload, clock rollback) + browser click |
| 12 data-driven missions, each needs world interaction | ✅ | `missions.test.ts` covers all 12; browser run plays "missing book" by clicking shelves |
| No duplicate rewards | ✅ | reward tokens; unit + browser checks |
| Playable mini-game | ✅ | Dewey sorting, opened by clicking the returns cart |
| Random events with consequences | 🟡 | implemented; outcomes not individually unit-tested |
| Achievements | 🟡 | implemented; not individually tested |
| Character states: idle, walk, enter, wait, sit, read, approach desk, receive, leave, happy, dissatisfied | 🟡 | mapped to Kenney clips + emote icons |
| Character states: turning, writing, computer use, confused, celebrating | 🟡 | no dedicated clips in the pack: in-place rotation, procedural arm layer, emote icons |

## UI, camera, saves, engineering

| Item | Status | Evidence |
|---|---|---|
| Arabic RTL UI, 11 panels + save/resume, collapsible, world stays dominant | ✅ | browser run (open panel = 17.7 % of screen) |
| Developer credit (Arabic + English) | ✅ | browser check; Settings → عن اللعبة |
| Fixed camera: pan, zoom, reset; rotation locked; zoom clamped | ✅ | browser run |
| Select rooms (zones), staff, students, shelves, devices, mascot | ✅ | implemented + used in browser run (shelves, cart, mascot) |
| Save / load / backup / rollback / import validation | ✅ | `save.test.ts`, browser reload check |
| Migration from V2.8, legacy key untouched | ✅ | `save.test.ts` |
| Feature flags | ✅ | `multiHall` gates unbuilt halls |
| No console errors | ✅ | browser run |
| Layout at 1366×768 and 1024×700 | ✅ | browser run |
| Production build | ✅ | `npm run build` |
| CI workflow | 🟡 | written (`.github/workflows/v30-ci.yml`); **its first run on GitHub was not observed by me** |
| Performance: 60 FPS on RTX 3070 Ti, 30 FPS low preset | ⛔ | **Not measured — no GPU here.** See `PERFORMANCE.md` |
| Public preview URL | ⛔ | Not deployed. Manual workflow prepared; needs owner approval and Pages enabled |
| Six halls | ⛔ | Only قاعة الخوارزمي; by design until this hall is approved |
| Offline / LAN use | 🟡 | everything is self-hosted with relative paths; not tested from a LAN server |
