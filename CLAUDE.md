# Library Tycoon — notes for coding agents

- **Active workspace: `v30/`** (React + TypeScript + Babylon.js). Read `v30/README.md`,
  `v30/docs/ARCHITECTURE.md`, `v30/UPDATE_POLICY.md` and `v30/docs/ACCEPTANCE.md` before changing code.
- Everything outside `v30/` (root V2.5 files, `preview/`, `v27/`, `v28/`) is preserved history. Do not
  edit, move or delete it. `v27/AGENTS.md` still applies to `v27/`.
- Branch: `feature/v30-professional-library-tycoon`. Never force-push, never merge to `main`, never
  enable Pages without the owner's approval.
- Protected identity: the Central Library logo, the University logo and the mascot. Never redraw,
  recolour or regenerate them. `npm run assets:verify` byte-locks the originals. The mascot is a brown
  plush pseudoscorpion: exactly 8 walking legs, 2 pedipalps with claws, no tail, no stinger, navy
  graduation cap with gold tassel, navy sash with the approved inscriptions, logo pendant.
  `tests/unit/mascot.test.ts` enforces this on the exported GLB.
- Preserve the legacy economy (17 upgrade prices, 4 services, 5 roles, 25,000 IQD / 15 min mascot
  gift). Balance lives in `v30/src/config/`; changes need `BALANCE_VERSION` + changelog + tests.
- Saves: bump `SAVE_SCHEMA` and add a migration + test for any `GameState` change.
- Checks before committing (run in `v30/`): `npm run typecheck && npm test && npm run assets:verify`,
  then `npm run build`, then `npm run preview & npm run test:e2e` for anything visual.
- A passing unit test is not visual approval. Screenshots must come from the running game; if WebGL
  is unavailable, report visual acceptance as BLOCKED.
- Token hygiene: search narrowly, use `tools/shot.mjs` / `tools/poses.mjs` for quick captures, run
  targeted tests after scoped changes and the full suite at milestones.
- Dev facts: software WebGL (SwiftShader) renders ~1–3 FPS at 1080p here, so use
  `window.__TYCOON__.fastForward(seconds)` in browser automation instead of waiting for frames.
  Blender is used as the `bpy` Python module (`pip install bpy`).
