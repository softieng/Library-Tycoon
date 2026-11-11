# Unity 6.3 LTS art comparison | Library Tycoon

Status: **Unity project sources committed; NOT rendered or compiled in Unity Editor yet**.

This is a separate technical art comparison with V3.0, not a replacement game or public playable WebGL build. The last concept image was AI-generated and is an **art target only**.

## Where to start
- Repository: `softieng/Library-Tycoon`
- Development branch: `feature/unity-63-reading-hall-poc`
- Unity project directory: `UnityComparison/`
- Existing playable Babylon + React V3.0 remains under `v30/`.

## What is included
- Locked isometric camera, pan and zoom.
- One reading hall with cutaway architecture and warm lighting.
- **15 actual GLB files** reused byte-for-byte from the existing V3 project: bookshelves, chairs, tables, counters, lamps, plants, students, staff and the 3D mascot.
- Clickable shelves with a single-reward missing-book mission.
- Clickable borrowing service counter, and 25,000-IQD mascot gift with 15-minute cooldown.
- Small visitor movement proof-of-concept. **Not production navmesh/crowd avoidance.**
- Independent `PlayerPrefs` save namespace. Older browser saves untouched.
- Editor scene-generation command and source-integrity checker.

## Toolchain and opening the project
Use Unity 6.3 LTS (6000.3.x) with Web Build Support and `com.unity.cloud.gltfast@6.20.0` (included in Packages/manifest.json). URP 17.3 is also listed but a URP render asset is not yet assigned.

In Unity Hub, open `UnityComparison/` as a project. Then choose:
`Library Tycoon > Create 3D Art Comparison Scene`.
Press Play to see the scene. Test WebGL only after the Editor compiles and renders successfully.

The project **has not been compiled or opened in Unity Editor** in the current environment, and the script interfaces remain subject to Unity-specific verification. A Unity license, actual Editor runner, and WebGL module are needed for an automated WebGL build. Do not invent a GitHub Pages Unity URL.

## Visual acceptance
This project is a **technical proof of concept**, not the polished look in the AI concept art:
- Imported furniture and characters are unchanged V3 source assets.
- Building finishes are generated for layout evaluation.
- Character clips are attempted via the legacy Animation component; verify glTFast's animation conversion in the Editor.
- Unity Lighting/URP project asset, text shaping, crowd pathfinding, polished materials, scene polish, WebGL build and measured GPU FPS remain pending.
- Mascot mesh comes from V3 and requires owner approval against the official master. Never fabricate branded imagery or change protected identity.

## Prior releases
No modifications to `main`, `v30/`, official logos, original mascot source references, or V3 saved data.

## Verification
`python3 UnityComparison/Tools/verify_source_assets.py` validates the checked-in 15 GLB binaries, structural headers, declared source hashes, and C# source paths.
This static check is NOT a substitute for compiling and visually testing with Unity Editor.

## Decision gate
A/B compare a real 1920x1080 Unity editor screenshot with a real V3 Babylon screenshot. Only continue a Unity migration if measured visual quality and game/browser performance improve. Preserve React/Babylon as the default until then.
