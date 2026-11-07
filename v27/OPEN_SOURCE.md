# Open-source dependency and asset policy

## Used at runtime
- Babylon.js: Apache-2.0, https://github.com/BabylonJS/Babylon.js . The development preview uses `https://cdn.babylonjs.com/babylon.js`. Production must pin and self-host a reviewed runtime; official documentation warns that the shared CDN is for experiments.
- Custom game code, materials, layouts, 3D meshes and characters in this preview: authored specifically for Library Tycoon. No externally copied asset packs are bundled.

## Future candidate assets, not bundled
- Kenney Furniture Kit: CC0, https://kenney.nl/assets/furniture-kit (140 props); audit asset pack before import.
- Kenney Mini Characters: CC0, https://kenney.nl/assets/mini-characters (animated); verify skeleton and uniform retexturing.
- Recast Navigation: https://github.com/recastnavigation/recastnavigation ; use only if needed after defining real walkable zones.

Official University of Technology and Central Library branding is governed by its institutional identity, and is not replaced by any open-source asset.