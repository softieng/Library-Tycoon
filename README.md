# Library Tycoon, University of Technology Central Library

Arabic-first library-management game development source, V2.5. Includes quests, staff uniforms and assigned stations, director challenges, special visitors, an exam-week event, and local tests.

## Current publication status

This repository-ready snapshot is **not a full playable release**. Source from the owner's Windows installation supplies Babylon.js vendor libraries, the approved official logo images, 3D models, textures, HDR environment, mascot sprite, and the fixed camera module. Those assets were not present in the provided packages. Do not replace official logos with generated graphics.

## Local QA

Run `node --test tests/*.cjs`. The tests verify game rules, navigation, reward safety, and upgrade compatibility. They are not a substitute for a browser GPU/playthrough test.

## Protected design

The official Central Library and University of Technology logos are immutable. The owner-approved versions must be copied byte-for-byte into the original assets/branding locations when available. The optional Babylon.js 3D layer falls back to the legacy engine if its dependencies are absent.

## Future publishing

GitHub Pages should only be enabled once all missing runtime assets are restored, the visual identity is verified, and the browser smoke test passes.