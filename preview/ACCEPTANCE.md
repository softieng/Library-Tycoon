# Library Tycoon V2.6 preview acceptance

## Local results (2026-11-07)

- 12/12 Node.js gameplay and save tests PASS.
- Browser smoke: desktop viewport 1440x900 PASS, 4 mission cards, classification answers, upgrade interaction, staff menu, exam event.
- Browser smoke: mobile viewport 390x844 PASS.
- No uncaught JavaScript exceptions during browser smoke.
- No official logo files or mascot designs modified.
- Original V2.5 files remain untouched. This is an independent `preview/` directory.

## Limitations

- This is a 2.5D Canvas illustration / interactive preview rather than complete real-time 3D Babylon.js.
- Characters are small procedural cartoons, not fully rigged 3D actors; service visitors are represented using queues and visible figures.
- Only a subset of furnishings visually upgrade. The final asset-rich scene needs 3D models and original branding image masters.
- Browser smoke uses Playwright `set_content` injection when sandbox browser navigation is restricted. GitHub Pages is not asserted live unless deployment is independently verified.