# Library Tycoon V3.0 — Central Library, University of Technology, Baghdad

Arabic-first 3D library-management game. React + TypeScript UI, Babylon.js world, a deterministic
simulation, Blender-built assets. This folder (`v30/`) is the V3 workspace; every earlier version
(`/`, `preview/`, `v27/`, `v28/`) is preserved untouched.

> **Status: vertical slice, not owner-approved.** One hall (قاعة الخوارزمي) with its borrowing
> counter, reference desk, digital-services corner and reception is playable. Visual approval by the
> owner is still pending — see [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) for exactly what was
> verified and what was not. The room arrangement is a **gameplay layout**, not a reconstruction of
> the real building.

## Run

```bash
cd v30
npm ci
npm run dev            # http://localhost:5173
npm run build          # type-check + production build into dist/ (relative paths, self-hosted assets)
npm run preview        # serve dist/ on http://localhost:4173
```

No network access is needed at runtime: the engine, fonts, models and textures are all bundled.
No AI inference, no paid API, no telemetry.

## Test

```bash
npm test                         # 42 deterministic unit tests (simulation, missions, saves, mascot identity)
npm run assets:verify            # asset hashes vs ASSET_MANIFEST.json, GLB validity, protected identity files
npm run preview & npm run test:e2e   # real-browser QA: plays a mission in the 3D world, writes docs/qa/
```

`test:e2e` needs Playwright + Chromium (`npx playwright install chromium`). Without a GPU it renders
through SwiftShader, which is correct but slow; if WebGL cannot start at all the run exits with
`BLOCKED` instead of pretending to pass.

## Play

- Students arrive with a need (borrow, read, computer, research, print), walk collision-aware paths,
  use real shelves, seats and queue positions, get served, react, and leave. Their experience drives
  satisfaction, reputation and income (virtual IQD).
- Hire and train the five roles. Service employees stay at their workstation; only the cleaner
  moves, and only inside the cleaning zone.
- Buy the 17 legacy upgrades (hall-expansion upgrades are visible but gated behind a feature flag).
- Missions are played in the world: search real shelves with the mascot, guide a lost student, sort
  returned books by Dewey class (mini-game on the returns cart), repair devices, pass inspections.
- Click the mascot for its gift: 25,000 IQD every 15 minutes.
- Camera: drag / arrows / WASD to pan, wheel or `+`/`-` to zoom, `Home` to reset. Rotation is locked.

## Rebuild the art

```bash
pip install bpy numpy pillow          # Blender 5.x as a Python module
node tools/textures/render-sash.mjs   # mascot sash (browser-shaped Arabic text)
python3 tools/textures/make_textures.py
python3 tools/blender/build_mascot.py
python3 tools/blender/build_furniture.py
node tools/build-manifest.mjs         # refresh hashes after any asset change
```

## Documents

| File | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Module boundaries, data flow, how to add halls / missions / staff |
| [`docs/ACCEPTANCE.md`](docs/ACCEPTANCE.md) | Acceptance checklist with evidence and honest gaps |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Measured numbers and how to measure on the target laptop |
| [`docs/qa/`](docs/qa/) | Browser QA report + screenshots from the running game |
| [`CHANGELOG.md`](CHANGELOG.md) · [`UPDATE_POLICY.md`](UPDATE_POLICY.md) | Versioning, release gates, rollback |
| [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) · [`ASSET_MANIFEST.json`](ASSET_MANIFEST.json) | Licences and per-file provenance |

## Credits

**م.م. سامر رعد عزاوي** — ماجستير هندسة الحاسبات — هندسة البرمجيات المدعومة بالذكاء الاصطناعي وتطوير الأنظمة الوكيلة
**Asst. Lecturer Samer Raad Azzawi** — M.Sc. in Computer Engineering — AI-Assisted Software Engineering & Agentic Development

The Central Library and University of Technology logos and the library mascot are protected
institutional identity. They are used unmodified and must never be redrawn or regenerated.
