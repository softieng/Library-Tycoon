# Library Tycoon V2.6 | Isometric playable preview

This is a playable, original HTML Canvas 2.5D prototype guided by the owner-approved isometric cutaway visual reference. It **is not** the finished Babylon.js 3D release. Open `preview/index.html` in a static HTTP server or GitHub Pages. No build step, CDN, AI API, tokens, or external asset downloads are needed for this prototype. Runs entirely in the browser.

## Features implemented

- Cutaway library view with six zones: computer hall, book stacks, administration, references, reading, and borrowing
- Four staff members anchored to immutable workstations, navy and gold uniform; cleaning worker restricted to a rectangle
- Students, service queues, simulated visitors, cleanliness, satisfaction, reputation, income, game-time controls
- Clickable lost-book shelf search, with three chances and single award
- Exam rush event driven by service counts, and quality inspection driven by objective metrics
- Printer breakdown with repair, three-question classification mini-game
- Real upgrades that alter the scene (e.g., bookshelves grow), and costs in IQD
- Local save with schema version, mobile layout, camera pan/zoom, Arabic UI

The `core.js` module is also importable from Node.js for deterministic tests. Run `node --test preview/tests/core.test.cjs` from the repository root. The optional Playwright smoke test is `python preview/tests/browser_smoke.py` with a suitable Chromium installation.

## Owner identity protection

The authoritative University of Technology and Central Library logos were **not present** in the provided GitHub game sources. This preview shows two clearly labeled **reserved spaces**, never generated replacement logos. Do not publish a logo asset until it has been visually checked against the owner's approved master. Likewise, no redesigned library mascot has been generated.

Do not overwrite V2.5 `index.html`, change existing save keys, replace protected assets, or merge this branch into the release until the owner approves visuals and gameplay.

## Production migration

The V2.5 main game relies on local Babylon.js vendor binaries, textures, HDRs, models, and a fixed-camera module that are absent from the GitHub tree. Keep Babylon.js for the final 3D scene, use CC0-style furniture/characters after checking each download's license, and retain existing simulation and navigation compatibility. Recast is an option for dense dynamic crowds, not a dependency in this small preview.

Sources and licensing are documented in `OPEN_SOURCE_ASSETS.md`.