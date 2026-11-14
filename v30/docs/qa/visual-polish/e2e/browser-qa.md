# Browser QA run

- URL: http://localhost:4173/
- Date: 2026-11-14T05:36:22.355Z
- Renderer: ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)
- Page load to ready: 4067 ms
- Result: **all checks passed** (37/37)

| Check | Result | Detail |
|---|---|---|
| WebGL scene initialised | PASS | WebGL2 · ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver) |
| all 3D assets loaded | PASS |  |
| mascot has all 12 animation clips | PASS |  |
| document is Arabic RTL | PASS |  |
| canvas renders a non-trivial image | PASS | 134 distinct colour buckets |
| Cairo webfont active for Arabic UI | PASS |  |
| HUD shows IQD balance and indicators | PASS | {"hud-money":"💰الرصيد٢٦٠٬٠٠٠ د.ع","hud-time":"📅اليوم ١٠٨:٠١","hud-satisfaction":"😊الرضا٨٦٪","hud-cleanliness":"✨النظافة٩٤٪","hud-reputati |
| 11 management panels open with Arabic RTL content | PASS |  |
| an open panel leaves the 3D world dominant | PASS | 17.7% of the screen |
| panels collapse | PASS |  |
| credits name present | PASS |  |
| camera zooms and pans | PASS | zoom 11.6→7.2 |
| camera rotation is locked | PASS |  |
| zoom is clamped to useful limits | PASS | max zoom 14.5 |
| visitors arrive and pursue different needs | PASS | 9 visitors: sit,toQueue,browse,toShelf |
| services are completed by staff | PASS | 3 served |
| borrowing librarian is exactly at the workstation | PASS |  |
| a student browses a real bookshelf | PASS |  |
| the librarian serves a student at the counter | PASS |  |
| mission starts from the mission tracker | PASS |  |
| waiting does not complete the mission | PASS |  |
| clicking a shelf in the 3D world sends the mascot to search it | PASS |  |
| two wrong shelves did not complete the mission and produced a hint | PASS |  |
| mascot walk captured in the library | PASS |  |
| missing-book mission completed through world interaction | PASS | 3 shelves searched |
| reward paid exactly once | PASS |  |
| completion card shown | PASS |  |
| mascot walks back to its post on its own | PASS |  |
| a completed main mission cannot be replayed for a second reward | PASS |  |
| clicking the returns cart opens the Dewey mini-game | PASS |  |
| mini-game is playable to the end | PASS |  |
| mini-game score recorded | PASS |  |
| clicking the mascot pays the 25,000 IQD gift once per cooldown | PASS | +25000, then +0 |
| progress survives a page reload | PASS | {"money":1305000,"day":1,"done":1,"gift":1794634541725,"src":"save"} |
| layout fits 1366×768 | PASS | {"overflow":false,"tb":true,"dock":true,"canvas":1366} |
| layout fits 1024×700 | PASS | {"overflow":false,"tb":true,"dock":true,"canvas":1024} |
| no runtime console errors | PASS |  |
