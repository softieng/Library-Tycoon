# V2.5 QA | 2026-11-05

Executed with Node.js v22 (local sandbox). No direct Windows 3D GPU acceptance.

- 14 tests: V2.4 campaign, mission progression, 4 incidents, sorting challenge, staff wardrobe and actual game scenario.
- 10 tests: unchanged core simulation structures and protected source checks.
- 18 tests: V2.5 reputation, 3 coordinate-linked map hotspots, hunt cooldown/timeouts, exam win/fail, live visitor queue priorities and NPC outcomes, staff break schedule, save restoration safety.
- 11 tests: institutional identity, theme controls, fixed camera and credits.
- 11 tests: routefinding and obstacle navigation.
- 9 tests: live operations normalization.
- 4 tests: route failure and staff station approach.
- TOTAL: **77 tests PASS, 0 fail**.

Additional checks:

- `node --check` all package modules and main inline game script compiled through `vm.Script`.
- Safe V2.5 installer applied to an exact V2.3 and V2.4 synthetic test directories, then repeated idempotently with `ALREADY INSTALLED`.
- `restore_local.cjs` from newly created rollback directory restored each prior version byte-for-byte.
- Synthetic protected logo, mascot and save fixtures retained identical SHA-256 before and after install and restore.
- The package never edits user official logo images, original models, user credentials, saved game data or any server / GitHub repository.

NOT independently verified: Windows live 3D rendering with the full Babylon.js GLB/HDRI assets, rig deformation, mouse map-hotspot feel, FPS and original owner-approved logo visuals. This is a source-level and test-harness acceptance only.
