# Third-party notices — Library Tycoon V3.0

Per-file provenance and SHA-256 hashes are in [`ASSET_MANIFEST.json`](ASSET_MANIFEST.json).

## 3D models

| Asset set | Creator | Licence | Source | Used for |
|---|---|---|---|---|
| Kenney **Furniture Kit** (16 models) | Kenney — kenney.nl | CC0 1.0 Universal | https://kenney.nl/assets/furniture-kit (files mirrored from https://github.com/Hidencod/tge-assets `packs/furniture-kit/`) | chairs, monitor, keyboard, mouse, laptop, plants, lamps, sofa, armchair, coffee table, bin, book stack — re-scaled and re-materialised by `tools/blender/build_furniture.py` |
| Kenney **Mini Characters** (12 rigged models) | Kenney — kenney.nl | CC0 1.0 Universal | https://kenney.nl/assets/mini-characters (mirrored from the same repository, `packs/mini-characters/`) | students and staff; files are byte-identical, palette / proportions applied at runtime |

Licence check performed for these exact packs: the source repository README states "all by Kenney
under CC0 1.0", matching https://kenney.nl/support. CC0 requires no attribution; it is given anyway.
kenney.nl itself was not reachable from the build environment, so the pack pages were not re-read
directly — the licence statement relied on is the mirror repository's and the V2.8 audit's.

No Quaternius, Poly Haven or other third-party art is included in this version.

## Original work in this repository

All furniture not listed above, the hall architecture, every texture under `public/assets/textures/`
(procedurally generated), and the mascot 3D model were created for this project by the scripts in
`tools/`.

## Software

| Package | Licence | Notes |
|---|---|---|
| Babylon.js (`@babylonjs/core`, `@babylonjs/loaders`) 9.35.0 | Apache-2.0 | 3D engine, bundled |
| React, React DOM 19.3.1 | MIT | UI |
| Cairo typeface (`@fontsource/cairo`) | SIL Open Font License 1.1 | UI + in-world Arabic text, self-hosted |
| Vite, TypeScript, Vitest, `@vitejs/plugin-react` | MIT / Apache-2.0 | build & test only |
| Playwright | Apache-2.0 | browser QA only |
| Blender (`bpy`) | GPL | used only as an offline tool to generate assets; no Blender code ships |

Design research only (no code or assets copied): OpenRCT2, OpenTTD, Dev Studio Tycoon, Computer Store
Tycoon. No GPL game code was reused.

## Protected institutional identity (not third-party, not licensed for reuse)

The Central Library logo, the University of Technology logo and the library mascot belong to the
institution. Files under `assets-src/branding/` and `public/assets/branding/` are byte-identical to
the owner-supplied originals and are verified in CI. The mascot 3D model is a new interpretation of
the approved master and is **pending owner approval**.
