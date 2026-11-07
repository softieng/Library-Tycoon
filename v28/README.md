# Library Tycoon V2.8 | CC0 Art-First Reading Hall

This is a deliberately independent **real-GLB** Babylon.js vertical slice in `/v28/`. It preserves existing versions 2.5, 2.6 and 2.7. It is an actual 3D interactive scene, **not an approved final art build**. The goal is to evaluate a polished reading hall before building the other halls.

## Actual imported third-party artwork

Source: [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets), redistributing 22 CC0 Kenney GLB models from `furniture-kit` and `mini-characters`. Assets are copied to `v28/assets/`, not hotlinked to an outside account. Four humanoid models have been verified to include 32 animation groups with `idle`, `walk`, and `sit`. GLB blobs were SHA-verified against the original source repository during upload.

The architectural room, brass railings, marble walls, carpet, windows, decorative signage, lighting and gameplay effects are original procedural Babylon.js code. **This slice does not contain Blender-generated high-detail art**, nor does it imply it meets the approved final render.

## Interactivity

- Real imported bookshelf racks, book stacks, tables, chairs, computers, lamps, plants, waiting bench and desk.
- Four bookshelf targets trigger the existing lost-book mission, one eligible reward. Borrowing counter triggers service progress; exam pressure counts actual services.
- Isometric orthographic camera with locked rotation, pan and zoom.
- Two assigned workstation staff, a bounded cleaning worker and students with imported idle, walking or sitting clips.
- Local save key for V2.8, unrelated to V2.5/V2.6/V2.7 saves.
- Arabic RTL dashboard, IQD economy, mission progress, no AI inference or paid API at runtime.

## Visual QA and status

The GLB files are real, source-verified, and the JS logic has local regression tests. `node --test v28/tests/*.cjs` verifies gameplay and content contracts. Browser WebGL/animation visual inspection and any Blender finishing remain art-approval gates. Do not claim visual acceptance until an owner-reviewed screenshot/playthrough exists.

## Development

Serve this directory over HTTP, or open `https://softieng.github.io/Library-Tycoon/v28/` **after it is deployed from the Pages source branch**. The preview uses the official Babylon CDN and GLTF loader, requiring network connectivity. When approved for production, pin/self-host the runtime per Babylon recommendations.

## Protected branding

Official Central Library and University of Technology logos and the library's protected mascot are intentionally absent because the owner's original master source assets have not been verified in this repository. There are text-only reserved positions, not fabricated logos or re-generated mascots.

## Source provenance and licenses

See `ASSET_CREDITS.md`, `MODEL_MANIFEST.json`, and [`Kenney's original CC0 license`](https://kenney.nl/support). Third-party GLB files are unmodified. App-specific code is original. Do not resell isolated asset bundles as the game.