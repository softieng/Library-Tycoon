# Performance report

## What was measured

Machine: cloud container, 4 vCPU, **no GPU**. Browser: headless Chromium with ANGLE → SwiftShader
(CPU software rasteriser), 1920×1080. Raw data: [`qa/performance.json`](qa/performance.json),
produced by `PERF=1 node tests/e2e/run.mjs`.

| Preset | FPS (software renderer, two runs) | Draw calls | Triangles | Notes |
|---|---|---|---|---|
| low | 1.1 – 2.0 | 220 – 240 | ~150 k | no shadows, no post-processing |
| medium | 0.9 – 1.2 | 380 – 630 | 290 – 445 k | 1536 px PCF shadows, bloom, FXAA, glow |
| high | 1.1 – 1.4 | 610 – 640 | ~445 k | 4096 px shadows, SSAO, MSAA ×4, sharpen |

Ranges are the two full runs made on 2026-11-11; counts vary with how many visitors are on screen.

- Page load to interactive (local preview server, cold): ~5 s, dominated by software shader compilation.
- JS heap: 117–125 MB at start and unchanged after three simulated days (720 s of simulation).
- Scene meshes: 659 → 688 (run 2), 676 → 692 (run 1) over the same period (agents come and go; no monotonic growth).
- Build size: 6.1 MB JS for the Babylon chunk (1.32 MB gzip), 0.35 MB app, ~9 MB assets.

## What these numbers do and do not mean

**The FPS figures say nothing about a real GPU.** SwiftShader is CPU-bound and renders this scene at
about one frame per second regardless of preset. They are reported because they are what was
actually measured, not as a claim.

**Not measured (required before any performance claim):** frame rate on the RTX 3070 Ti laptop,
frame rate on an integrated GPU for the low preset, GPU memory, load time on Windows 11.

## How to measure on the target laptop (2 minutes)

1. `npm run build && npm run preview`, open http://localhost:4173 in Chrome or Edge.
2. الإعدادات → tick "إظهار عدّاد الإطارات"; let the hall fill for a minute.
3. Note FPS for each of the three presets, then run `window.__TYCOON__.controller.world.stats()`
   in the console for draw calls and triangles.
4. Or run the scripted version with the real GPU: `PERF=1 node tests/e2e/run.mjs`
   (remove the SwiftShader flags in `tests/e2e/browser.mjs` to use the hardware GPU).

## Already in place

GPU instancing for all furniture; static architecture merged per material; frozen world matrices;
shared palette materials; books use vertex colours (one material); three quality presets with
shadow resolution, SSAO, MSAA, bloom and glow tiers; adjustable render scale; device-pixel-ratio cap;
assets loaded once and cached; agents' meshes, skeletons and animation groups disposed when they leave.

## Known costs / next optimisations

- Draw calls (~630 with shadows) are higher than ideal: each prop is several palette sub-meshes.
  Merging each prop into one mesh with a palette atlas would cut this by roughly 3×.
- Babylon.js is imported from the package root; switching to deep imports would shrink the bundle.
- Skinned characters are individual clones (not instanced); fine for ≤ 20 agents.
- No LODs: the scene is one room at a fixed camera distance, so LODs were not justified yet.
