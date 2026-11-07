# Library Tycoon V2.7 Agent Handoff

Scope: `v27/` only. Never overwrite the protected original identity or V2.5 and V2.6 gameplay. Never fabricate or recolor logos, invent a mascot, upload private data or merge to main. Fixed orthographic isometric camera, zoom and pan only. Arabic-first and IQD.

Target: owner-approved colorful cartoon cutaway of Central Library similar in quality/readability to the concept image; maintain original features. A passing unit test is not a visual approval. Browser/WebGL visual confirmation and owner sign-off are separate gates.

Review workflow:
1. Run `node --test v27/tests/gameplay.test.cjs` and `node --check v27/world.js && node --check v27/app.js`.
2. Open `v27/index.html` from a local HTTP server with network access, verify `window.__LIBRARY_WORLD_READY`, take full desktop screenshot. Avoid rendering-only test claims from static checks.
3. Check every interactive shelf and counter, verify rewards once, watch staff positions and cleaning bounds for at least 60 seconds, confirm 30 FPS minimum on target laptop, check right panel readability.
4. Only after owner approves the actual visual scene, replace proxy characters/objects with CC0 high-quality model packs and build real navigation.
5. Use narrow-scope tests before broad regressions to minimize model tokens. No paid API calls or automatic cloud-model loops.