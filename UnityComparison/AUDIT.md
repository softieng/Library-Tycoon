# Unity comparison audit (static, no Editor available)

Date: 2026-11-14. Unity Editor / license: **not available** in the cloud session -> compilation and rendering are **BLOCKED**, not passed.

## Verified
- `verify_source_assets.py`: 15 GLBs match declared hashes.
- V3 (`v30/`): typecheck, 42 unit tests, `assets:verify` all pass (untouched).

## Fixed (unverified in Unity)
- Test asmdef lacked `UnityEngine/UnityEditor.TestRunner` references and the `UNITY_INCLUDE_TESTS` constraint, so EditMode tests would not compile/run.
- Keyboard camera pan used world axes; now follows the fixed isometric view.
- Added manual, license-gated workflow `unity-editor-tests.yml` (needs owner secrets).

## Known risks to check once an Editor exists
- No URP asset assigned; `Shader.Find` fallbacks may be stripped in WebGL builds (add to Always Included Shaders or use a Shader Graph).
- glTFast -> legacy `Animation` clip import is unproven; mascot/character clips may not play.
- `OnMouseDown` needs the legacy Input Manager (Active Input Handling = Old or Both).
- HallWalker is waypoint-only, no NavMesh/crowd avoidance.

## Rollback
All changes live on a dev branch; revert with `git revert <commit>`. `main`, `v30/`, protected logos and the mascot GLB are untouched.
