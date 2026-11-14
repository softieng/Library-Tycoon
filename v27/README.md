# Library Tycoon V2.7 | Babylon.js Reading Hall Vertical Slice

**Status: playable development preview, not a final art-approved game.**

The user rejected the flat 2.5D v2.6 preview. This implementation is an isolated, original **true 3D Babylon.js** scene containing a detailed reading hall, book racks, computer area, counters, low partitions, plant props, lighting, campus landscaping, stylized animated students, assigned staff, cleaning zone, interactions and mission states.

## What works
- Isometric orthographic camera, pan, zoom and reset with fixed viewing angle.
- Native Babylon.js 3D meshes. No drawn 2D isometric board or flat image pretending to be a game.
- Detailed procedurally built walls, windows, furnishings, 3D books, green banker lamps, chairs and plants, in navy, gold and ivory.
- Borrowing/reference staff stay at assigned stations. Cleaner moves only in bounded zone.
- Student walking and seated idle animations. Walking routes are deliberately limited to open circulation paths, not a full navmesh; complex navigation is not implemented yet.
- Click bookshelf markers to find lost book and receive reward once. Click the borrowing counter to serve actual queue. Exam rush requires eight services and satisfaction threshold. Upgrade costs and states change the floor details. Arabic RTL dashboard, IQD, local saved progress independent of v2.6.
- Tests run without internet: `node --test v27/tests/gameplay.test.cjs`.

## Opening the preview
Open `v27/index.html` through a web server, e.g. GitHub Pages at `https://softieng.github.io/Library-Tycoon/v27/`. No installation by the player. The preview loads Babylon.js from the official CDN, requiring network access and WebGL on the player browser. GitHub Pages hosting does not automatically prove the WebGL scene renders on every GPU. The official Babylon.js CDN explicitly says it is intended for learning and small experiments, not production: before final release, pin and self-host the audited runtime.

## Protected identity
Official logos and mascot were absent from the accessible repo assets. Spaces are reserved. No fabricated or altered official logo/mascot is included. Original V2.5 and V2.6 files are unchanged. Do not merge until owner approves actual 3D playthrough visuals.

## Next graphical milestone
After visual approval, replace generated primitive-based people with CC0 animated rigged meshes (e.g. Kenney Mini Characters), custom uniform skins, book pickup/return animations, verified accessible navigation, and optimized baked lighting. Build the remaining six real halls using the approved layout and real master brand assets, preserving save compatibility.