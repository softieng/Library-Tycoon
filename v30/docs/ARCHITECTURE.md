# Architecture

```
v30/
  src/
    app/          main.tsx, App.tsx, controller.ts (the ONLY bridge between UI, world and sim), audio.ts
    ui/           React components: HUD, dock, 11 panels, dialogs, mini-game, theme.css
    engine/       SceneHost (Babylon engine lifecycle, render loop, input, quality), camera, environment
    world/        hall.ts (architecture + furniture placement), text.ts (Arabic signs), markers.ts
    characters/   CharacterView (students/staff: clips, procedural upper-body layer)
    mascot/       brain.ts (animation state machine, sim side) + MascotView.ts (render side)
    navigation/   grid.ts (nav grid, A*, smoothing) + movement.ts (steering, yielding)
    gameplay/     types.ts, state.ts, sim.ts (deterministic step + player actions), rng.ts, ctx.ts
    visitors/     visitor finite-state machine, seat / shelf / queue reservations
    staff/        roles, efficiency, morale, cleaner zone logic
    missions/     definitions.ts (data) + engine.ts (lifecycle, rewards, world effects)
    config/       balance.ts, upgrades.ts, services.ts, layout.ts, dewey.ts, events.ts, featureFlags.ts
    persistence/  save.ts (schema, migrations, sanitiser, backup / rollback)
    assets/       manifest.ts (runtime asset list) + library.ts (loading, palette materials, instancing)
  tools/          Blender + texture build scripts, manifest tooling, dev capture helpers
  tests/unit/     Vitest (simulation, missions, saves, mascot identity)
  tests/e2e/      real-browser QA (Playwright + WebGL)
  assets-src/     untouched sources: Kenney GLBs, protected brand originals, generated mascot textures
  public/assets/  what ships: normalised models, textures, brand files
```

## Boundaries

| Layer | Knows about | Never touches |
|---|---|---|
| `gameplay/`, `visitors/`, `staff/`, `missions/`, `navigation/`, `mascot/brain.ts` | plain data (`GameState`), config | DOM, Babylon, storage, `Date.now()` (time is passed in) |
| `engine/`, `world/`, `characters/`, `mascot/MascotView.ts` | Babylon, read-only `GameState`, `controller.dispatch` | React, storage |
| `ui/` | React, `controller` | Babylon objects |
| `persistence/` | `GameState`, a `StorageLike` | everything else |

`GameController` owns the `Simulation` and the `SaveStore`. Each rendered frame the scene host calls
`controller.tick(dt)`, which advances the simulation in fixed 0.1 s steps and returns `SimEvent`s
(toasts, money, mission, layout, sfx). React subscribes through `useSyncExternalStore` and re-renders
at ~5 Hz. The Babylon scene is created once in `GameCanvas` (a component with no changing props) and
is never re-created by React updates; StrictMode's throw-away mount is skipped by deferring creation
one task. `SceneHost.dispose()` stops the loop, removes every listener and observer, and disposes the
scene and engine.

## Determinism

`Simulation.step()` is a pure function of state + actions: the RNG state lives in the save
(`rng.ts`), wall-clock time only enters through the `mascotReward` action argument. The unit tests
rely on this (same seed ⇒ byte-identical state).

## One layout file

`config/layout.ts` is the single source for both the simulation (obstacles, seats, queue slots,
stations, cleaner zone, zones) and the world (prop placement). Adding furniture = adding one `P({…})`
line; the nav grid, picking and rendering follow. Service desks are oriented so staff face south or
east, i.e. toward the fixed camera.

## Asset normalisation pipeline

1. **Sources** (`assets-src/`): Kenney GLBs are stored byte-identical to upstream.
2. **Blender** (`tools/blender/build_furniture.py`): every model — custom or Kenney — is exported in
   metres, origin at footprint centre on the floor, front facing south, with materials reduced to
   named palette slots (`wood`, `navy`, `brass`, `ivory`, `marble`, `books`, …). No embedded textures.
3. **Engine** (`assets/library.ts`): binds one shared PBR material per palette name, bakes node
   transforms, and serves GPU instances. So every prop shares the same wood, brass and navy response.
4. **Characters**: raw rigs + runtime normalisation (1.5 m, head 72 %, shared student / staff palette
   textures). Clip mapping lives in `CharacterView.ts` (`clipForVisitor`, `clipForStaff`).
5. **Manifest** (`ASSET_MANIFEST.json`): creator, source URL, licence, hash, modification history, use.

## Extending

- **Mission**: add an entry to `missions/definitions.ts`. Objectives are `count` (driven by
  `ctx.signal('event')`) or `stat`. Needs a new world effect? add it to `EFFECTS` in `engine.ts`.
- **Upgrade**: `config/upgrades.ts`; gate furniture with `requires: '<id>'` in the layout.
- **Role / service**: `config/services.ts` + a station in the layout.
- **Hall**: generalise `layout.ts` to a list of halls (each with its own bounds, props and zones),
  build one `HallBuild` per hall, and turn on `FLAGS.multiHall` once the hall passes acceptance.
- **Mascot clip**: author it in `tools/blender/build_mascot.py`, add its name to `MASCOT_CLIPS` and
  `MASCOT_CLIP_TIME`; the identity test enforces the list.
- **Balance**: `config/balance.ts`; bump `BALANCE_VERSION` and note it in the changelog.

## Saves

Key `uot-library-tycoon-v30` (+ `-backup`, `-tmp`). Envelope `{app, schema, savedAt, checksum, state}`.
Load path: main → backup → one-way import of a V2.8 save → new game. Every load runs
`migrate()` (table keyed by schema) then `sanitize()` (clamps, whitelists, drops transient agents).
Earlier versions' keys are only ever read. `reset()` and `rollback()` both keep the other copy, so
neither is destructive.
