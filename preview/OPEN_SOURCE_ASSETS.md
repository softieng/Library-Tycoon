# Verified open-source and openly licensed candidates

Sources checked on 2026-11-07. No third-party binaries or art are included in this playable preview. The preview renders its own original procedural shapes.

| Component | Source | License | Usage decision |
|---|---|---|---|
| Babylon.js engine | https://github.com/BabylonJS/Babylon.js | Apache-2.0 | **Keep** existing game engine for final 3D scene, use locally hosted release |
| Recast & Detour | https://github.com/recastnavigation/recastnavigation | zlib | **Optional**, crowd/pathfinding if original navigation cannot handle dense agents |
| Kenney Furniture Kit | https://kenney.nl/assets/furniture-kit | CC0 | Tables, chairs and interior furniture after importing the actual asset package |
| Kenney Mini Characters | https://kenney.nl/assets/mini-characters | CC0 | Character rigs and animation after adapting approved institutional uniforms |
| Kenney Modular Buildings | https://kenney.nl/assets/modular-buildings | CC0 | Optional walls and corridors for cutaway scene |
| Godot | https://godotengine.org/license/ | MIT | Valid alternative, but **do not migrate** the current Babylon.js project |

Important:
- CC0 gives generous reuse rights but does not authorize changing protected official UOT or Central Library logos.
- Do not add art sourced from copyrighted commercial game screenshots or extracted games.
- Avoid assuming all Quaternius downloads share the same license. Its licensing varies by pack and version. Check each source page and document it before incorporation.
- Before packaging external assets, retain original licensing notices where required. The preview currently has no external runtime assets.