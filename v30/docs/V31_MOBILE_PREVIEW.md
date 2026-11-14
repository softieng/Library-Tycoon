# V3.1 isolated playable preview (touch trial)

Playable browser address: https://softieng.github.io/Library-Tycoon/v31/

The previous V3.0 public demo remains https://softieng.github.io/Library-Tycoon/v30/ and the original repository `main` remains unchanged. The preview is built only from the development branch `feature/v31-open-source-art-daily-challenges`, and published as compiled static files to the existing GitHub Pages preview branch.

## Phone controls
- Tap a bookshelf, student, workstation, mascot or interactive object to use it.
- Drag with one finger to move the fixed isometric camera.
- Pinch with two fingers to zoom; camera rotation remains locked.
- Use the bottom scrollable Arabic dock to open missions, manage staff, view six hall roadmap and claim daily director goals.
- Starts on `low` quality and 0.72 render scale on a narrow touch screen, unless the player had already selected settings for this preview.
- Desktop mouse drag / wheel zoom and keyboard controls remain supported.

## Save isolation
GitHub Pages shares a single browser origin between /v30/ and /v31/. Therefore, the /v31/ game transparently prefixes **all** of its save, backup and settings keys with `uot-library-tycoon-v31-preview:`. This avoids overwriting the player’s original V3.0 progress and settings. A preview game starts with its own fresh progress; the Settings panel supports deliberate export/import if needed. Do not silently migrate existing V3.0 saves.

## QA and limitations
The preview publication workflow now validates TypeScript, unit tests, protected asset hashes and the browser build. It additionally runs a real WebGL 3D scene in **emulated mobile Chromium with software rendering**, captures a 390×844 screenshot, verifies three daily challenge cards and tests simulated touch pan/pinch input, then publishes only if mobile smoke tests pass. It uploads the screenshot/report as a GitHub Actions artifact.

A physical iPhone/Safari or Android GPU is still required to assess real battery, frame rate, heat, text legibility and gesture experience. Halls 2–6 remain under development and are intentionally locked. This is an alpha preview rather than an approved final public release.

No Higgsfield credits or paid APIs are used.

## Sources
- Babylon.js official docs: https://doc.babylonjs.com/
- Playwright test framework: https://playwright.dev/
- GitHub Pages: https://docs.github.com/en/pages
