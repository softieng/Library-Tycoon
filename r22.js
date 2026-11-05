/* Library Tycoon V2.2 - Babylon.js PBR presentation layer.
   Reads the unchanged V2.1 simulation through window.__LT22 and draws it. It never writes game state,
   money or saves. If initialisation fails the legacy WebGL renderer keeps running (R22.on === false). */
(() => {
'use strict';
const B = window.BABYLON; if (!B) return;
const V3 = B.Vector3;
const R = window.R22 = { on: false, failed: false, placements: [], pending: null, stats: { renderer: '', draws: 0, actors: 0 }, log: [] };
const say = m => { R.log.push(m); };
R.ready = new Promise(res => { R._res = res; });

// ---- recorder hooks called from the legacy builder (assetModel / buildWorld)
const KNOWN = new Set(['bookcase_premium', 'chair_premium', 'front_desk_premium', 'reading_table_premium', 'computer_premium', 'planter_premium']);
R.chairs = []; R.blockers = [];
// Share one tested navigation core between the production game and headless Node tests.
const NAV = window.LibraryTycoonNavigation;
if (!NAV) { R.failed = true; R._res(false); return; }
function blk(root, kind, circ) {
  root.computeWorldMatrix(true); const bb = root.getHierarchyBoundingVectors(true); if (bb.min.y > 1.4) return;
  let x0 = bb.min.x, x1 = bb.max.x, z0 = bb.min.z, z1 = bb.max.z;
  if (circ) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; x0 = cx - circ; x1 = cx + circ; z0 = cz - circ; z1 = cz + circ; }
  R.blockers.push({ x0, x1, z0, z1, kind });
}
R.blockedAt = (x, z, radius = 0.24) => NAV.blocked({ x, z }, R.blockers, radius);
R.safePosition = (x, z) => NAV.project({ x, z }, R.blockers, 0.24);
R.moveSafe = (a, x, z) => { const p = NAV.move({ x:a.x, z:a.z }, {x,z}, R.blockers, 0.24); a.x = p.x; a.z = p.z; };
R.pushOut = a => { if (R.blockedAt(a.x, a.z)) { const p = R.safePosition(a.x, a.z); if (p) { a.x = p.x; a.z = p.z; } } };
R.route = (start, waypoints, opts = {}) => NAV.plan(start, waypoints, R.blockers, {radius:0.24, seat:opts.seat});
R.trees = []; R.pots = [];
R.begin = () => { R.placements = []; R.trees = []; R.pots = []; };
R.tree = (x, z) => { if (R.failed) return false; R.trees.push({ x, z }); return true; };
R.pot = (x, z) => { if (R.failed) return false; R.pots.push({ x, z }); return true; };
R.freeSeat = (x, z, r, id) => { let best = null, bd = 1e9; for (const c of R.chairs) { if (c.taken && c.taken !== id) continue; if (Math.abs(c.x - x) > r || Math.abs(c.z - z) > r) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } } if (best) best.taken = id; return best; };
R.release = id => { R.chairs.forEach(c => { if (c.taken === id) c.taken = null; }); };
R.place = (name, x, z, scale, rot) => {
  if (name === 'kenney_books') return true;            // books are generated per bookcase below
  if (R.failed || !KNOWN.has(name)) return false;
  R.placements.push({ name, x, z, scale, rot }); return true;
};
R.commit = (mesh, level) => { R.pending = { mesh, level, placements: R.placements.slice(), trees: R.trees.slice(), pots: R.pots.slice() }; if (R.scene && !R._q) R._q = setTimeout(() => { R._q = 0; apply(); }, 0); };   // coalesce rapid rebuilds (several upgrades in one tick)

let engine, scene, cam, sun, csm, root, LT, canvas;
let worldNodes = [], thin = [], containers = {}, geomCache = {}, skinTex = {}, actors = new Map(), vfxMesh;
const HAIR = ['Hair_SimpleParted', 'Hair_Buns', 'Hair_Buzzed', 'Hair_Long', 'Hair_BuzzedFemale'];
const hex = h => B.Color3.FromHexString(h);

function pbrTex(dir, uv, o = {}) {
  const m = new B.PBRMaterial(dir, scene), t = f => { const x = new B.Texture(`assets/tex/${dir}/${f}.jpg`, scene); x.uScale = x.vScale = 1; return x; };
  m.albedoTexture = t('diff'); m.bumpTexture = t('nor'); m.metallicTexture = t('rough');
  m.useRoughnessFromMetallicTextureGreen = true; m.useMetallnessFromMetallicTextureBlue = false;
  m.metallic = 0; m.roughness = 1; Object.assign(m, o); return m;
}

async function init() {
  canvas = document.createElement('canvas'); canvas.id = 'r22';
  const legacy = document.getElementById('game'); legacy.parentNode.insertBefore(canvas, legacy);
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  legacy.style.opacity = '0';
  engine = new B.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance' });
  const gl = engine._gl, ext = gl.getExtension('WEBGL_debug_renderer_info');
  R.stats.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  scene = R.scene = new B.Scene(engine);
  scene.useRightHandedSystem = true;                  // same handedness as the legacy world coordinates
  scene.clearColor = new B.Color4(0.86, 0.925, 0.91, 1);
  const hdr = new B.HDRCubeTexture('assets/hdri/reading_room_1k.hdr', scene, 256);
  scene.environmentTexture = hdr; scene.environmentIntensity = 0.7;
  const ip = scene.imageProcessingConfiguration; ip.toneMappingEnabled = true; ip.toneMappingType = B.ImageProcessingConfiguration.TONEMAPPING_ACES; ip.exposure = 0.78; ip.contrast = 1.08;

  cam = new B.ArcRotateCamera('cam', -0.735, 0.9, 98, new V3(0, 0, 3.5), scene); cam.fov = 0.5; cam.minZ = 5; cam.maxZ = 400;
  R.fixed = LibraryTycoonFixedCamera.install({ BABYLON: B, scene, camera: cam, canvas: document.getElementById('game'), alpha: -0.735, elevationDegrees: 40, zoomMin: 16, zoomMax: 125, panMinX: -26, panMaxX: 26, panMinZ: -20, panMaxZ: 32, zoomSpeed: 0.0012 });
  window.__fixedCtl = R.fixed;
  sun = new B.DirectionalLight('sun', new V3(0.65, -0.88, -0.53).normalize(), scene);
  sun.intensity = 3.2; sun.diffuse = new B.Color3(1, 0.9, 0.74); sun.position = new V3(-40, 60, 35);
  const fill = new B.HemisphericLight('fill', new V3(0, 1, 0), scene); fill.intensity = 0.42; fill.groundColor = new B.Color3(0.72, 0.62, 0.48); fill.diffuse = new B.Color3(0.82, 0.9, 1);
  const Q0 = new URLSearchParams(location.search);
  csm = new B.CascadedShadowGenerator(3072, sun); csm.numCascades = 3; csm.lambda = 0.8; csm.shadowMaxZ = 160; csm.autoCalcDepthBounds = false;
  csm.filteringQuality = B.ShadowGenerator.QUALITY_MEDIUM; csm.usePercentageCloserFiltering = true; csm.bias = 0.004; csm.normalBias = 0.03; csm.stabilizeCascades = true;

  if (Q0.has('noshadow')) sun.shadowEnabled = false;
  // materials
  const wood = pbrTex('laminate_floor_02', 1, { environmentIntensity: 0.8 });
  const marble = pbrTex('marble001', 1, { environmentIntensity: 1 });
  const plaster = new B.PBRMaterial('plaster', scene); plaster.roughness = 0.78; plaster.metallic = 0;
  const pn = new B.Texture('assets/tex/beige_wall_001/nor.jpg', scene); plaster.bumpTexture = pn; plaster.bumpTexture.level = 0.6;
  const glass = new B.PBRMaterial('glass', scene); glass.albedoColor = new B.Color3(0.78, 0.9, 0.93); glass.alpha = 0.22; glass.roughness = 0.04; glass.metallic = 0; glass.backFaceCulling = false; glass.environmentIntensity = 1.4;
  wood.albedoColor = new B.Color3(1.45, 1.4, 1.3);
  const deskM = pbrTex('laminate_floor_02', 1, { environmentIntensity: 0.9 }); deskM.albedoColor = new B.Color3(1.5, 1.45, 1.3); deskM.roughness = 0.55;
  const chairM = new B.PBRMaterial('chairM', scene); chairM.albedoColor = hex('#2c3036'); chairM.roughness = 0.55; chairM.metallic = 0.1;
  R.mats = { wood, marble, plaster, glass, desk: deskM, chairM };
  [wood, marble, plaster].forEach(m => { m.backFaceCulling = false; });

  // 3D city skyline: ring of towers with a window-grid texture, plus light haze
  scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = 0.0042; scene.fogColor = new B.Color3(0.78, 0.87, 0.93);
  // Central Library institutional art direction. No camera/gameplay/save changes.
  if (window.LibraryTycoonVisualTheme) R.visualThemeApplied = window.LibraryTycoonVisualTheme.applyScene(scene, B, R.mats);
  { const T = new B.DynamicTexture('win', { width: 256, height: 512 }, scene), c = T.getContext(); c.fillStyle = '#9fb4c6'; c.fillRect(0, 0, 256, 512);
    for (let y = 8; y < 504; y += 16) for (let x = 6; x < 250; x += 14) { c.fillStyle = ((x * 7 + y * 3) % 5) ? 'rgba(235,245,255,.75)' : 'rgba(90,110,130,.7)'; c.fillRect(x, y, 8, 10); } T.update();
    const m = new B.PBRMaterial('tower', scene); m.albedoTexture = T; m.roughness = 0.35; m.metallic = 0.4; m.environmentIntensity = 1.2; m.emissiveTexture = T; m.emissiveColor = new B.Color3(0.25, 0.28, 0.32);
    const base = B.MeshBuilder.CreateBox('tower', { width: 1, height: 1, depth: 1 }, scene); base.material = m; base.isPickable = false; let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const mats = [];
    for (let k = 0; k < 150; k++) { const ang = rnd() * Math.PI * 2, d = 75 + rnd() * 80, w = 9 + rnd() * 14, h = 30 + rnd() * 110; mats.push(B.Matrix.Compose(new V3(w, h, w), B.Quaternion.RotationAxis(V3.Up(), rnd() * 3), new V3(Math.cos(ang) * d, h / 2 - 2, Math.sin(ang) * d + 5))); }
    const buf = new Float32Array(mats.length * 16); mats.forEach((q, k) => buf.set(q.toArray(), k * 16)); base.thinInstanceSetBuffer('matrix', buf, 16, true); base.alwaysSelectAsActiveMesh = true; base.thinInstanceRefreshBoundingInfo(true);
  }
  // models
  const L = (n, f) => B.SceneLoader.LoadAssetContainerAsync(`assets/models/${n}/`, f || n + '.gltf', scene);
  const X = n => B.SceneLoader.LoadAssetContainerAsync(`assets/models/${n}/`, n + '.gltf', scene);
  const U = f => B.SceneLoader.LoadAssetContainerAsync('assets/models/ubc/', f, scene);
  const [table, chair, desk, shelf, male, female, ual, ...hair] = await Promise.all([L('painted_wooden_table'), L('SchoolChair_01'), L('metal_office_desk'), L('wooden_bookshelf_worn'),
    U('Superhero_Male_FullBody.gltf'), U('Superhero_Female_FullBody.gltf'), U('UAL1_Standard.glb'), ...HAIR.map(h => U(h + '.gltf'))]);
  const veg = await Promise.all(['potted_plant_01', 'potted_plant_02', 'potted_plant_04', 'shrub_02'].map(X));
  const extra = await Promise.all(['steel_frame_shelves_01', 'wooden_display_shelves_01', 'sofa_02', 'modern_arm_chair_01', 'coffee_table_round_01', 'modern_wooden_cabinet', 'side_table_01', 'mid_century_lounge_chair'].map(X));
  containers = R.containers = { veg, ex: extra, table, chair, desk, shelf, male, female, ual, hair, human: male };
  // book colours for generated shelf books (thin instances)
  R.bookMesh = ['#9e3b33', '#2f5f80', '#3b7a5a', '#b9812a', '#6a548c', '#8c5a40'].map((c, i) => {
    const b = B.MeshBuilder.CreateBox('book' + i, { width: 1, height: 1, depth: 1 }, scene);
    const m = new B.PBRMaterial('bk' + i, scene); m.albedoColor = hex(c); m.roughness = 0.6; m.metallic = 0; b.material = m; b.isVisible = true; b.alwaysSelectAsActiveMesh = true; return b;
  });
  R.model = { M: 1.78 / measure(male), F: 1.66 / measure(female) };
  scene.onBeforeRenderObservable.add(() => { });
  buildGuardian();
  const pipe = new B.DefaultRenderingPipeline('pipe', true, scene, [cam]);
  pipe.fxaaEnabled = true; pipe.bloomEnabled = true; pipe.bloomThreshold = 0.9; pipe.bloomWeight = 0.28; pipe.bloomKernel = 48;
  const Q = new URLSearchParams(location.search);
  if (Q.has('ssao')) try {
    const ssao = new B.SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [cam]);
    ssao.radius = 2.2; ssao.totalStrength = 0.9; ssao.expensiveBlur = false; ssao.samples = 12; ssao.maxZ = 120;
    scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', cam);
  } catch (e) { say('ssao off: ' + e.message); }
  if (R.pending) apply();
  await scene.whenReadyAsync();
  R.on = true; if (window.__reroute) window.__reroute(); R._res(true); // replan actors spawned before PBR assets loaded
}

function measure(c) {  // height of the bind-pose body (m)
  const inst = c.instantiateModelsToScene(n => n, false), r = inst.rootNodes[0];
  const ms = r.getChildMeshes(); let mn = 1e9, mx = -1e9;
  ms.forEach(m => { m.computeWorldMatrix(true); const b = m.getBoundingInfo().boundingBox; mn = Math.min(mn, b.minimumWorld.y); mx = Math.max(mx, b.maximumWorld.y); });
  inst.animationGroups.forEach(a => a.dispose()); r.getChildMeshes().forEach(m => { if (m.name !== 'Eyes' && m.name !== 'Eyebrows') { /* only body counts */ } }); r.dispose(false, false);
  return (mx - mn) || 1;
}

// ---- convert legacy triangle soup into 4 PBR meshes: wood floor, marble lobby, glass, painted structure
function build(mesh) {
  const g = { wood: [], marble: [], glass: [], plaster: [] };
  const v = mesh.v, n = mesh.n, c = mesh.c;
  for (let t = 0; t < v.length / 9; t++) {
    const i = t * 9, ny = n[i + 1], cy = (v[i + 1] + v[i + 4] + v[i + 7]) / 3, cx = (v[i] + v[i + 3] + v[i + 6]) / 3, cz = (v[i + 2] + v[i + 5] + v[i + 8]) / 3;
    const r0 = c[i], g0 = c[i + 1], b0 = c[i + 2];
    let k = 'plaster'; if (Math.min(v[i + 1], v[i + 4], v[i + 7]) > (cz < 15 ? 2.15 : 2.78)) { R.stats.roofTris = (R.stats.roofTris || 0) + 1; continue; } // legacy roofs/canopies hide the interior from a close perspective camera
    if ((Math.abs(r0 - 0.70) < 0.03 && Math.abs(g0 - 0.827) < 0.03 && Math.abs(b0 - 0.839) < 0.03) || (Math.abs(r0 - 0.757) < 0.012 && Math.abs(g0 - 0.784) < 0.012 && Math.abs(b0 - 0.761) < 0.012 && Math.abs(cx) > 13)) k = 'glass';
    else if (ny < -0.9 && cy > 0.04 && cy < 0.32 && Math.abs(cx) < 20 && cz > -17 && cz < 26) k = (Math.abs(cx) < 4.4 && cz > -16 && cz < 20.5) ? 'marble' : 'wood';
    g[k].push(t);
  }
  const out = []; R.stats.tris = Object.fromEntries(Object.entries(g).map(([k, a]) => [k, a.length]));
  const groups2 = []; R.sectors = [];
  for (const k of Object.keys(g)) {
    if (k === 'plaster' || k === 'glass') { const sub = {}; g[k].forEach(t => { const i = t * 9, key = Math.floor(((v[i] + v[i + 3] + v[i + 6]) / 3 + 24) / 6) + '_' + Math.floor(((v[i + 2] + v[i + 5] + v[i + 8]) / 3 + 20) / 6); (sub[key] = sub[key] || []).push(t); }); for (const key in sub) groups2.push([k, sub[key], k + '_' + key]); }
    else groups2.push([k, g[k], k]);
  }
  for (const [k, ts, nm] of groups2) {
    if (!ts.length) continue;
    const P = new Float32Array(ts.length * 9), N = new Float32Array(ts.length * 9), C = new Float32Array(ts.length * 12), U = new Float32Array(ts.length * 6), I = new Uint32Array(ts.length * 3);
    ts.forEach((t, q) => {
      for (let j = 0; j < 3; j++) {
        const s = t * 9 + [0, 2, 1][j] * 3, d = q * 9 + j * 3, x = v[s], y = v[s + 1], z = v[s + 2]; // swap 2 verts: legacy winding is inverted for Babylon's CCW front faces
        P[d] = x; P[d + 1] = y; P[d + 2] = z; N[d] = -n[s]; N[d + 1] = -n[s + 1]; N[d + 2] = -n[s + 2];
        let r = c[s], gg = c[s + 1], b = c[s + 2];
        if (k === 'wood') { const l = 0.28; r = 1 - (1 - r) * l; gg = 1 - (1 - gg) * l; b = 1 - (1 - b) * l; } // keep wood grain colour, only a light room tint
        if (k === 'marble') { r = gg = b = 1; }
        const e = q * 12 + j * 4; C[e] = r; C[e + 1] = gg; C[e + 2] = b; C[e + 3] = 1;
        const nx = Math.abs(n[s]), nz = Math.abs(n[s + 2]), u = q * 6 + j * 2, rc = s; 
        if (k === 'wood') { U[u] = x / 2.6; U[u + 1] = z / 2.6; } else if (k === 'marble') { U[u] = x / 3; U[u + 1] = z / 3; }
        else if (Math.abs(n[s + 1]) > 0.5) { U[u] = x / 3; U[u + 1] = z / 3; } else if (nx > nz) { U[u] = z / 3; U[u + 1] = y / 3; } else { U[u] = x / 3; U[u + 1] = y / 3; }
        I[q * 3 + j] = q * 3 + j;
      }
    });
    const m = new B.Mesh('world_' + nm, scene), vd = new B.VertexData();
    vd.positions = P; vd.normals = N; vd.colors = C; vd.uvs = U; vd.indices = I; vd.applyToMesh(m);
    m.material = R.mats[k]; m.useVertexColors = k !== 'glass'; m.hasVertexAlpha = false; m.receiveShadows = k !== 'glass'; m.freezeWorldMatrix();
    if (k !== 'glass') csm.addShadowCaster(m);
    if (k === 'plaster' || k === 'glass') { let a = 1e9, b = -1e9, c0 = 1e9, d0 = -1e9; for (let q = 0; q < P.length; q += 3) { a = Math.min(a, P[q]); b = Math.max(b, P[q]); c0 = Math.min(c0, P[q + 2]); d0 = Math.max(d0, P[q + 2]); } R.sectors.push({ m, a, b, c: c0, d: d0 }); }
    out.push(m);
  }
  return out;
}

function inst(c, x, z, rot, sx = 1, sy = 1, sz = 1) {
  const i = c.instantiateModelsToScene(n => n, false), r = i.rootNodes[0];
  r.position.set(x, 0, z); r.rotation.set(0, -rot, 0); r.scaling.set(sx, sy, sz);
  r.getChildMeshes().forEach(m => { m.receiveShadows = true; csm.addShadowCaster(m); m.freezeWorldMatrix(); });
  worldNodes.push(r); return r;
}

function apply() {
  const p = R.pending; if (!p || !containers.human) return;
  worldNodes.forEach(n => n.dispose()); worldNodes = []; thin.forEach(t => t.thinInstanceSetBuffer('matrix', new Float32Array(0), 16)); thin = [];
  scene.meshes.filter(m => m.name.startsWith('world_')).forEach(m => m.dispose());
  worldNodes = build(p.mesh);
  const oldReservations = new Map(R.chairs.map(c => [`${c.x.toFixed(3)},${c.z.toFixed(3)}`, typeof c.taken === 'number' ? c.taken : null]));
  R.chairs = []; R.blockers = [];
  (p.trees || []).forEach((t, k) => shrub(t.x, t.z, k)); (p.pots || []).forEach(q => plant(q.x, q.z));
  (window.__LT22 ? window.__LT22.rooms() : []).filter(rm => p.level >= rm.unlock).forEach((rm, ri) => decorate(rm, ri));
  const tables = p.placements.filter(q => q.name === 'reading_table_premium' || q.name === 'computer_premium');
  const books = R.bookMesh.map(() => []);
  for (const q of p.placements) {
    const s = q.scale || 1;
    if (q.name === 'bookcase_premium') {
      const ca = Math.cos(q.rot), sa = Math.sin(q.rot);
      for (const o of [-0.7, 0.7]) blk(inst(containers.shelf, q.x + o * ca, q.z + o * sa, q.rot + Math.PI), 'shelf');
      for (const y of [0.42, 0.84, 1.26, 1.68]) for (let k = 0; k < 11; k++) {
        const o = -1.2 + k * 0.24 + (k % 3) * 0.01, h = 0.26 + ((k * 7) % 5) * 0.025, w = 0.1 + (k % 3) * 0.02;
        const M = B.Matrix.Compose(new V3(w, h, 0.34), B.Quaternion.RotationAxis(V3.Up(), -q.rot), new V3(q.x + o * ca - 0.0 * sa, y + h / 2, q.z + o * sa + 0.0 * ca));
        books[(k + Math.round(y * 5)) % books.length].push(M);
      }
    } else if (q.name === 'chair_premium') {
      let best = null, bd = 1.7; for (const t of tables) { const d = Math.hypot(t.x - q.x, t.z - q.z); if (d < bd) { bd = d; best = t; } }
      if (best && best.name === 'computer_premium') officeChair(q.x, q.z, Math.atan2(best.x - q.x, best.z - q.z)); else inst(containers.chair, q.x, q.z, best ? -Math.atan2(best.x - q.x, best.z - q.z) : 0, s, s, s).getChildMeshes().forEach(m => { m.material = R.mats.chairM; });
      if (best && best.name === 'computer_premium') { /* modern task chair replaces the school chair mesh below */ }
      R.blockers.push({ x0: q.x - 0.28, x1: q.x + 0.28, z0: q.z - 0.28, z1: q.z + 0.28, kind: 'chair' });
      R.chairs.push({ x: q.x, z: q.z, face: best ? Math.atan2(best.x - q.x, best.z - q.z) : 0, computer: best && best.name === 'computer_premium', taken: oldReservations.get(`${q.x.toFixed(3)},${q.z.toFixed(3)}`) || null });
    } else if (q.name === 'front_desk_premium') blk(inst(containers.desk, q.x, q.z, q.rot + Math.PI, 1.25, 1.0, 1.25), 'desk');
    else if (q.name === 'reading_table_premium' || q.name === 'computer_premium') {
      const tb = inst(containers.table, q.x, q.z, q.rot, 0.72, 0.8, 1.0); tb.getChildMeshes().forEach(m => { m.material = R.mats.desk; }); blk(tb, 'table');
      if (q.name === 'computer_premium') pc(q.x, q.z, q.rot);
    } else if (q.name === 'planter_premium') plant(q.x, q.z);
  }
  R.stats.books = books.map(a => a.length);
  if (window.__LT22) furnish(p.level, window.__LT22.rooms());
  books.forEach((arr, i) => { const m = R.bookMesh[i]; const buf = new Float32Array(arr.length * 16); arr.forEach((a, k) => buf.set(a.toArray(), k * 16)); m.thinInstanceSetBuffer('matrix', buf, 16, true); m.receiveShadows = true; thin.push(m); });
  R.stats.placements = p.placements.length;
  if (window.__reroute) window.__reroute();   // furniture changed: re-plan every active walker
}
const posterTex = {};
function poster(kind) {
  if (posterTex[kind]) return posterTex[kind];
  const T = new B.DynamicTexture('po' + kind, { width: 256, height: 192 }, scene), c = T.getContext(); c.fillStyle = kind === 'cork' ? '#b98c58' : '#f4f1e8'; c.fillRect(0, 0, 256, 192);
  if (kind === 'cork') { for (let i = 0; i < 7; i++) { c.fillStyle = ['#f6f1da', '#d6e3c8', '#f2d7b0'][i % 3]; c.fillRect(14 + (i % 4) * 58, 14 + Math.floor(i / 4) * 86, 46, 70); c.fillStyle = '#9a3b32'; c.fillRect(34 + (i % 4) * 58, 16 + Math.floor(i / 4) * 86, 6, 6); } }
  else { c.fillStyle = '#2f5f80'; c.fillRect(0, 0, 256, 26); [90, 130, 60, 110, 150].forEach((h, i) => { c.fillStyle = ['#c0564a', '#3b7a5a', '#d6a24a', '#4f7f9c', '#8d74ad'][i]; c.fillRect(24 + i * 44, 180 - h, 30, h); }); c.strokeStyle = '#999'; c.strokeRect(2, 2, 252, 188); }
  T.update(); const m = new B.StandardMaterial('po', scene); m.diffuseTexture = T; m.emissiveColor = new B.Color3(0.25, 0.25, 0.25); m.specularColor = B.Color3.Black(); return (posterTex[kind] = m);
}
function decorate(rm, ri) {          // wall boards on the hall's back wall + planters in front of the glass side wall
  const side = rm.x < 0 ? -1 : 1, nodes = [];
  [[-2.4, 'chart'], [0, 'cork'], [2.4, 'chart']].forEach(([dx, kind], k) => {
    const pl = B.MeshBuilder.CreatePlane('poster', { width: kind === 'cork' ? 1.7 : 1.1, height: 0.8 }, scene); pl.material = poster(kind);
    pl.position.set(rm.x + dx, 1.0, rm.z - 4.17); pl.isPickable = false; worldNodes.push(pl);
  });
  for (let k = -2; k <= 2; k++) { plant(rm.x + side * 3.5, rm.z + k * 1.6); }
}
const signTex = {};
function sign(text, w = 2.4, h = 0.55, bg = '#173f52') {
  const key = text + bg; if (signTex[key]) return signTex[key];
  const T = new B.DynamicTexture('sg', { width: 512, height: Math.round(512 * h / w) }, scene), c = T.getContext(); c.fillStyle = bg; c.fillRect(0, 0, 512, 512); c.fillStyle = '#e9c46a'; c.fillRect(0, 0, 512, 6);
  c.fillStyle = '#ffffff'; c.font = 'bold 64px "Segoe UI", Tahoma, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.fillText(text, 256, Math.round(256 * h / w)); T.update();
  const m = new B.StandardMaterial('sgm', scene); m.diffuseTexture = T; m.emissiveColor = new B.Color3(0.35, 0.35, 0.35); m.specularColor = B.Color3.Black(); return (signTex[key] = m);
}
function signAt(text, x, y, z, ry, w = 2.4, h = 0.55) { const pl = B.MeshBuilder.CreatePlane('sign', { width: w, height: h }, scene); pl.material = sign(text, w, h); pl.position.set(x, y, z); pl.rotation.y = ry; pl.isPickable = false; worldNodes.push(pl); }
function rug(x, z, w, d, base, trim) {
  const T = new B.DynamicTexture('rug', { width: 256, height: 256 }, scene), c = T.getContext(); c.fillStyle = base; c.fillRect(0, 0, 256, 256); c.strokeStyle = trim; c.lineWidth = 10; c.strokeRect(14, 14, 228, 228); c.lineWidth = 3; c.strokeRect(34, 34, 188, 188);
  for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect((i * 53) % 256, (i * 97) % 256, 22, 3); } T.update();
  const m = new B.PBRMaterial('rugm', scene); m.albedoTexture = T; m.roughness = 0.95; m.metallic = 0; const pl = B.MeshBuilder.CreateGround('rug', { width: w, height: d }, scene); pl.position.set(x, 0.2, z); pl.material = m; pl.receiveShadows = true; worldNodes.push(pl);
}
const EX = { shelf: 0, display: 1, sofa: 2, arm: 3, ctable: 4, cabinet: 5, side: 6, lounge: 7 };
function ex(name, x, z, rot, s = 1, y = 0.2) { const r = inst(containers.ex[EX[name]], x, z, -rot, s, s, s); r.position.y = y; r.getChildMeshes().forEach(m => { m.unfreezeWorldMatrix(); m.freezeWorldMatrix(); }); if (name !== 'rug') blk(r, name); return r; }
const CHAIRM = {};
function officeChair(x, z, rot) {     // modern task chair: 5-star base, post, seat, tilted back, arm rests
  const mat = CHAIRM.m || (CHAIRM.m = (() => { const m = new B.PBRMaterial('och', scene); m.albedoColor = hex('#2d3238'); m.roughness = 0.62; m.metallic = 0; return m; })());
  const met = CHAIRM.k || (CHAIRM.k = (() => { const m = new B.PBRMaterial('ocm', scene); m.albedoColor = hex('#b9bec4'); m.roughness = 0.3; m.metallic = 0.9; return m; })());
  const n = new B.TransformNode('och', scene); n.position.set(x, 0.2, z); n.rotation.y = -rot;
  const add = (g, mt, px, py, pz, rx = 0) => { g.parent = n; g.position.set(px, py, pz); g.rotation.x = rx; g.material = mt; csm.addShadowCaster(g); return g; };
  add(B.MeshBuilder.CreateCylinder('p', { diameter: 0.06, height: 0.3 }, scene), met, 0, 0.2, 0);
  for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5, leg = add(B.MeshBuilder.CreateBox('l', { width: 0.05, height: 0.03, depth: 0.3 }, scene), met, Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15); leg.rotation.y = a; }
  add(B.MeshBuilder.CreateBox('s', { width: 0.5, height: 0.08, depth: 0.5 }, scene), mat, 0, 0.42, 0);
  add(B.MeshBuilder.CreateBox('b', { width: 0.46, height: 0.55, depth: 0.07 }, scene), mat, 0, 0.74, -0.24, -0.12);
  [-0.27, 0.27].forEach(ax => add(B.MeshBuilder.CreateBox('a', { width: 0.04, height: 0.04, depth: 0.28 }, scene), met, ax, 0.62, -0.02));
  worldNodes.push(n); return n;
}
function ambientWorkers() {           // decorative seated colleagues (not simulation agents) at free computer chairs
  const free = (R.chairs || []).filter(c => c.computer && !c.taken); let i = 0;
  for (const c of free) { if (i >= R.ambientMax) break; const a = { id: 90 + i, x: c.x, z: c.z, heading: c.face, path: [], station: null, ambient: true, seat: c }; c.taken = 'amb' + i; R.ambient.push(a); i++; }
}
function furnish(level, rooms) {
  R.ambient = [];
  // reception: waiting lounge, back cabinets, display shelves, signage, rug
  if (level >= 1) { rug(0, 22.8, 5.2, 3.2, '#2f4a5c', '#d6b36a'); ex('sofa', -2.9, 24.3, Math.PI, 1.15); ex('sofa', 2.9, 24.3, Math.PI, 1.15); ex('ctable', 0, 22.7, 0, 0.8); ex('side', -4.5, 24.2, 0); ex('side', 4.5, 24.2, 0);   // central aisle kept clear for the entrance flow
  ex('arm', -4.4, 22.2, Math.PI * 0.5); ex('arm', 4.4, 22.2, -Math.PI * 0.5); }
  ex('cabinet', 0, 15.45, 0, 1.0); ex('display', -2.6, 15.6, Math.PI * 0.5, 1.3); ex('display', 2.6, 15.6, -Math.PI * 0.5, 1.3);
  [-3.9, 3.9].forEach(x => { for (let k = 0; k < 2; k++) ex('shelf', x, 17.2 + k * 1.15, x < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, 0.1); });
  signAt('الاستعارة', 0, 2.25, 19.6, 0, 2.4, 0.55); signAt('الاستقبال', 0, 2.8, 12.6, 0, 2.6, 0.6);
  // workstation bay: Al-Biruni computer hall - planters along the glass wall, wall notices, printer + files, ambient seated colleagues
  const bi = rooms.find(r => r.name === 'AL-BIRUNI'); if (bi && level >= bi.unlock) {
    const hx = bi.x, hz = bi.z; for (let k = -3; k <= 3; k++) plant(hx - 3.75, hz + k * 1.15);
    const pm = new B.PBRMaterial('prn', scene); pm.albedoColor = hex('#d6d8da'); pm.roughness = 0.4; pm.metallic = 0.1; const pr = B.MeshBuilder.CreateBox('printer', { width: 0.55, height: 0.3, depth: 0.45 }, scene); pr.material = pm; pr.position.set(hx + 3.6, 0.35, hz - 3.5); csm.addShadowCaster(pr); worldNodes.push(pr);
    ex('cabinet', hx + 3.7, hz - 3.5, Math.PI, 0.9); signAt('البيروني · محطات البحث', hx, 2.55, hz - 4.1, 0, 2.8, 0.55);
    R.ambient = []; R.ambientMax = 6; ambientWorkers();
  }
  // the first reading hall, fully dressed
  const hall = rooms.find(r => r.name === 'AL-KHWARIZMI'); if (hall && level >= hall.unlock) {
    const hx = hall.x, hz = hall.z; rug(hx, hz + 0.6, 4.6, 3.4, '#6b3a3a', '#e0c78a');
    [-2.6, 0, 2.6].forEach(dx => ex('shelf', hx + dx, hz - 3.75, 0, 0.1));              // steel stacks along the back wall
    ex('lounge', hx - 3.1, hz + 3.2, Math.PI * 0.75); ex('lounge', hx - 1.7, hz + 3.5, Math.PI * 1.1); ex('ctable', hx - 2.4, hz + 2.6, 0, 0.55); ex('side', hx - 3.6, hz + 2.2, 0);
    ex('cabinet', hx + 3.3, hz + 3.7, Math.PI, 0.9); ex('display', hx + 3.7, hz - 1.0, -Math.PI * 0.5, 1.4);
    signAt('قاعة الخوارزمي', hx, 2.55, hz - 4.1, 0, 2.6, 0.55);
  }
}
function pc(x, z, rot) {
  const mat = new B.PBRMaterial('pc', scene); mat.albedoColor = hex('#2a2d31'); mat.roughness = 0.4; mat.metallic = 0.25;
  const scr = new B.StandardMaterial('scr', scene); scr.emissiveColor = new B.Color3(0.45, 0.62, 0.78); scr.disableLighting = true;
  const n = new B.TransformNode('pc', scene); n.position.set(x, 0.78, z); n.rotation.y = -rot;
  const box = (w, h, d, px, py, pz, m) => { const b = B.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene); b.parent = n; b.position.set(px, py, pz); b.material = m; csm.addShadowCaster(b); return b; };
  for (const f of [1, -1]) {   // one monitor + keyboard per seat side
    box(0.66, 0.42, 0.04, 0.0, 0.36, -0.2 * f, mat); box(0.08, 0.2, 0.08, 0, 0.1, -0.2 * f, mat); box(0.3, 0.02, 0.16, 0, 0.01, -0.2 * f, mat); box(0.46, 0.02, 0.15, 0, 0.01, -0.02 * f - 0.2 * f * 0 + 0.3 * f * -1 * -1, mat);
    const sc = B.MeshBuilder.CreatePlane('s', { width: 0.6, height: 0.36 }, scene); sc.parent = n; sc.position.set(0, 0.36, -0.2 * f + 0.022 * f); sc.rotation.y = f > 0 ? Math.PI : 0; sc.material = scr;
  }
  ['#3b6fb0', '#d9822b', '#3f9a5f'].forEach((c, i) => { const m = new B.PBRMaterial('bn', scene); m.albedoColor = hex(c); m.roughness = 0.5; m.metallic = 0; box(0.07, 0.3, 0.26, 0.5 + i * 0.075, 0.15, -0.1, m); });
  const tray = new B.PBRMaterial('tr', scene); tray.albedoColor = hex('#8e9399'); tray.roughness = 0.45; tray.metallic = 0.4; box(0.3, 0.05, 0.22, -0.5, 0.03, 0.0, tray); box(0.3, 0.05, 0.22, -0.5, 0.09, 0.0, tray);
  worldNodes.push(n);
}
let plantN = 0;
function plant(x, z) {                 // licensed Poly Haven GLB potted plants (CC0); alternate two models for variety
  const big = (plantN++ % 3) !== 0, r = inst(containers.veg[big ? 1 : 0], x, z, (plantN * 1.7) % 6.28, big ? 1.25 : 1.0, big ? 1.25 : 1.0, big ? 1.25 : 1.0); r.position.y = big ? 0.3 : 0.2; blk(r, 'plant', 0.4); return r;
}
function shrub(x, z, k) { const q = 2.1 + (k % 3) * 0.25, r = inst(containers.veg[k % 2 ? 1 : 0], x, z, k * 2.1, q, q, q); r.position.y = 0.04; return r; }   // exterior: scaled CC0 potted plants (shrub_02 renders as leafless twigs)
function procPlanter(x, z, k) {        // procedural fallback (kit): used only if a GLB failed to load
  const v = LibraryTycoonVegetation.createPlanter(B, scene, { name: 'fb_planter_' + k, x, y: 0.2, z, height: 1.5, seed: 10 + k }); worldNodes.push(v.root); return v;
}
// ---- characters: Quaternius Universal Base Characters (Standard, CC0) dressed procedurally + Universal Animation Library clips retargeted by bone name
const CAT = n => /^(pelvis|thigh|calf)/.test(n) ? 'pants' : /^(foot|ball)/.test(n) ? 'shoes' : /^(spine|clavicle|upperarm)/.test(n) ? 'shirt' : /^lowerarm/.test(n) ? 'sleeve' : 'skin';
function dressGeom(body) {           // split the skinned body into clothing layers by dominant bone; torso/pelvis hem decided by height
  const P0 = body.getVerticesData('position'), N = body.getVerticesData('normal'), MI = body.getVerticesData('matricesIndices'), MW = body.getVerticesData('matricesWeights'), I = body.getIndices(), bones = body.skeleton.bones;
  const nv = P0.length / 3, cat = new Array(nv), bn = new Array(nv); let hmax = 0; for (let i = 1; i < P0.length; i += 3) hmax = Math.max(hmax, P0[i]);
  for (let v = 0; v < nv; v++) { let bi = 0, bw = -1; for (let k = 0; k < 4; k++) if (MW[v * 4 + k] > bw) { bw = MW[v * 4 + k]; bi = MI[v * 4 + k]; } cat[v] = CAT(bones[bi].name); bn[v] = bones[bi].name; }
  const idx = { pants: [], shoes: [], shirt: [], sleeve: [] }, waist = 1.02 * (hmax / 1.81), tor = v => /^(pelvis|spine_01)/.test(bn[v]);
  for (let t = 0; t < I.length; t += 3) {
    const c = [cat[I[t]], cat[I[t + 1]], cat[I[t + 2]]], m = c[0] === c[1] || c[0] === c[2] ? c[0] : c[1] === c[2] ? c[1] : null;
    const mm = m && tor(I[t]) && tor(I[t + 1]) && tor(I[t + 2]) ? ((P0[I[t] * 3 + 1] + P0[I[t + 1] * 3 + 1] + P0[I[t + 2] * 3 + 1]) / 3 > waist ? 'shirt' : 'pants') : m;
    if (mm && idx[mm]) idx[mm].push(I[t], I[t + 1], I[t + 2]);
  }
  return { P0, N, MI, MW, idx };
}
let gid = 0;
function dressMesh(body, g, kind, off, color, rough = 0.75) {
  const m = new B.Mesh(kind, scene, body.parent); body.geometry.copy('g' + (++gid)).applyToMesh(m);
  const P = new Float32Array(g.P0.length); for (let i = 0; i < P.length; i++) P[i] = g.P0[i] + g.N[i] * off;
  m.setVerticesData('position', P, false); m.setIndices(g.idx[kind]); m.skeleton = body.skeleton; m.numBoneInfluencers = body.numBoneInfluencers;
  const mat = new B.PBRMaterial(kind, scene); mat.albedoColor = hex(color); mat.roughness = rough; mat.metallic = 0; mat.backFaceCulling = false; m.material = mat; // glTF materials use flipped culling in a right-handed scene
  m.refreshBoundingInfo(); m.alwaysSelectAsActiveMesh = true; m.receiveShadows = true; csm.addShadowCaster(m); return m;
}
const SHIRTS = ['#e9edf2', '#c9d7e8', '#d9c7a8', '#9fb7a4', '#c98f86', '#7d93b3'], PANTS = ['#2b3345', '#3b4252', '#5a5246', '#1f2a3a'], STAFF_SHIRT = '#193f59'; // approved navy uniform; original character assets unchanged
function skin(male, dark) {
  const f = male ? (dark ? 'T_Superhero_Male_Dark' : 'T_Superhero_Male_Ligh') : (dark ? 'T_Superhero_Female_Dark_BaseColor' : 'T_Superhero_Female_Light_BaseColor');
  return skinTex[f] || (skinTex[f] = new B.Texture(`assets/models/ubc/${f}.png`, scene, false, false));
}
function makeActor(a, staff) {
  const isM = staff ? a.id % 2 === 1 : (a.id * 7 + 3) % 5 < 3, cn = containers[isM ? 'male' : 'female'], key = isM ? 'M' : 'F';
  const i = cn.instantiateModelsToScene(n => n, false), r = i.rootNodes[0], holder = new B.TransformNode('actor', scene); r.parent = holder;
  const sc = R.model[key] * (0.97 + ((a.id * 13) % 7) * 0.012); r.scaling.scaleInPlace(sc); holder.scaling.set(0.93, 1, 0.93);
  const body = r.getChildMeshes().find(m => m.name.startsWith('Super')); geomCache[key] = geomCache[key] || dressGeom(body);
  const dark = ((a.id * 11) % 4) < 2; body.material = (body.material || cn.materials.find(m => /Superhero/i.test(m.name))).clone('skin'); body.material.albedoTexture = skin(isM, dark); body.material.environmentIntensity = 0.8;
  const shirt = staff ? STAFF_SHIRT : SHIRTS[a.id % SHIRTS.length], pants = staff ? '#253746' : PANTS[a.id % PANTS.length], g = geomCache[key];
  dressMesh(body, g, 'shirt', 0.012, shirt, 0.8); dressMesh(body, g, 'pants', 0.01, pants, 0.8); dressMesh(body, g, 'shoes', 0.015, '#2a2523', 0.5);
  if (staff) dressMesh(body, g, 'sleeve', 0.01, shirt, 0.8);
  const hc = containers.hair[(isM ? [0, 2, 0, 2] : [1, 3, 4, 1])[a.id % 4]]; const hi = hc.instantiateModelsToScene(n => n, false);
  hi.rootNodes[0].getChildMeshes().forEach(hm => { hm.parent = body.parent; hm.skeleton = body.skeleton; hm.material = hm.material.clone('hm'); hm.material.albedoColor = hex(['#1b1512', '#3a2a1c', '#2a1e16', '#120e0c'][(a.id + (isM ? 0 : 1)) % 4]); hm.material.backFaceCulling = false; hm.alwaysSelectAsActiveMesh = true; csm.addShadowCaster(hm); });
  hi.rootNodes[0].setEnabled(false);
  r.getChildMeshes().forEach(m => { m.receiveShadows = true; m.alwaysSelectAsActiveMesh = true; if (m.name.startsWith('Super')) csm.addShadowCaster(m); });
  const nodes = {}; r.getChildTransformNodes(false).forEach(n => { nodes[n.name] = n; });
  const act = { holder, nodes, groups: {}, cur: null, staff, root: r, hairRoot: hi.rootNodes[0], seatedAt: null };
  actors.set(a, act); return act;
}
function clip(act, name) {            // lazily retarget one UAL clip onto this actor's bones
  if (act.groups[name]) return act.groups[name];
  const src = containers.ual.animationGroups.find(g => g.name === name); if (!src) return null;
  const g = src.clone(name + '_' + actors.size, t => act.nodes[t.name] || t); g.enableBlending = true; g.blendingSpeed = 0.08; act.groups[name] = g; return g;
}
function play(act, name, speed = 1) {
  if (act.cur === name) { const g = act.groups[name]; if (g) g.speedRatio = speed; return; }
  const g = clip(act, name); if (!g) return;
  if (act.cur && act.groups[act.cur]) act.groups[act.cur].stop();
  g.start(true, speed); act.cur = name; R.stats.clips = R.stats.clips || {}; R.stats.clips[name] = (R.stats.clips[name] || 0) + 1;
}
function seat() {                    // office chair under a seated employee (world-space, follows the actor)
  const i = containers.chair.instantiateModelsToScene(n => n, false), r = i.rootNodes[0];
  r.scaling.set(1.05, 1.05, 1.05); r.getChildMeshes().forEach(m => { m.material = R.mats.chairM; csm.addShadowCaster(m); }); return r;
}
const SEAT_BACK = 0.12;               // metres the pelvis sits behind the chair centre
function syncActors(dt) {
  const all = [...LT.agents().filter(a => !['gone'].includes(a.mode)).map(a => [a, false]), ...LT.staff().map(a => [a, true]), ...(R.ambient || []).map(a => [a, false])], seen = new Set();
  for (const [a, staff] of all) {
    seen.add(a); const act = actors.get(a) || makeActor(a, staff);
    const walking = !!(a.path && a.path.length), fy = Math.abs(a.x) < 4.4 && a.z > -16 && a.z < 20.5 ? 0.22 : 0.14;
    const atDesk = staff && a.station && a.id !== 3 && !walking && Math.hypot((a.stationApproach||a.station).x - a.x, (a.stationApproach||a.station).z - a.z) < 0.6;
    const seatedVisitor = !staff && a.seat && !walking && (a.mode === 'reading' || a.ambient);
    act.holder.position.set(a.x, fy, a.z);
    if (atDesk) {
      const cnt = LT.counterOf(a), rot = (cnt ? Math.atan2(cnt.x - a.x, cnt.z - a.z) : 0); act.holder.rotation.y = rot;
      if (!act.chair) act.chair = seat();
      act.chair.position.set(a.x, fy, a.z); act.chair.rotation.y = rot; act.holder.position.set(a.x - Math.sin(rot) * SEAT_BACK, fy, a.z - Math.cos(rot) * SEAT_BACK);
      const serving = LT.serving(a); play(act, serving ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop'); act.state = 'sit';
    } else if (seatedVisitor) {
      const rot = a.seat.face; act.holder.rotation.y = rot; act.holder.position.set(a.seat.x - Math.sin(rot) * SEAT_BACK, fy, a.seat.z - Math.cos(rot) * SEAT_BACK);
      play(act, 'Sitting_Idle_Loop'); act.state = 'sit';
    } else {
      act.holder.rotation.y = (a.heading || 0); if (act.chair) { act.chair.dispose(); act.chair = null; }
      const serving = !staff && a.mode === 'service';
      if (walking) { play(act, 'Walk_Formal_Loop', Math.min(1.8, (staff ? 1.85 : 2.05) / 1.25)); act.state = 'walk'; }
      else { play(act, serving ? 'Idle_Talking_Loop' : 'Idle_Loop'); act.state = serving ? 'talk' : 'idle'; }
    }
  }
  for (const [a, act] of actors) if (!seen.has(a)) { if (act.chair) act.chair.dispose(); Object.values(act.groups).forEach(g => g.dispose()); act.root.getChildMeshes().forEach(m => m.dispose()); act.holder.getChildMeshes().forEach(m => m.dispose()); act.holder.dispose(false, true); actors.delete(a); }
  R.stats.actors = actors.size; R.stats.states = {}; actors.forEach(x => { R.stats.states[x.state] = (R.stats.states[x.state] || 0) + 1; });
}
function vfx() {
  const m = LT.vfx();
  if (!m.v.length) { if (vfxMesh) vfxMesh.setEnabled(false); return; }
  if (!vfxMesh) { vfxMesh = new B.Mesh('vfx', scene); const mat = new B.StandardMaterial('vfx', scene); mat.emissiveColor = new B.Color3(0.9, 0.75, 0.3); mat.disableLighting = true; vfxMesh.material = mat; vfxMesh.useVertexColors = true; vfxMesh.alwaysSelectAsActiveMesh = true; }
  const vd = new B.VertexData(), C = []; for (let i = 0; i < m.c.length; i += 3) C.push(m.c[i], m.c[i + 1], m.c[i + 2], 1);
  vd.positions = m.v; vd.normals = m.n; vd.colors = C; vd.indices = m.v.map((_, i) => i).filter((_, i) => i % 3 === 0 ? false : false); vd.indices = Array.from({ length: m.v.length / 3 }, (_, i) => i); vd.applyToMesh(vfxMesh, true); vfxMesh.setEnabled(true);
}

let gSprite = null, gRing = null, gBtn = null, gLast = 0;
function buildGuardian() {           // official photograph as an alpha-masked billboard (pixels untouched), on a small plinth
  const W = 773, H = 802, height = 1.05, T = new B.Texture('assets/guardian/guardian_sprite.png', scene, false, true);
  T.hasAlpha = true; T.anisotropicFilteringLevel = 4;
  const m = new B.StandardMaterial('guardianM', scene); m.diffuseTexture = T; m.emissiveTexture = T; m.diffuseColor = B.Color3.Black(); m.emissiveColor = B.Color3.White(); m.specularColor = B.Color3.Black(); m.disableLighting = true;
  m.useAlphaFromDiffuseTexture = true; m.transparencyMode = B.Material.MATERIAL_ALPHATEST; m.alphaCutOff = 0.45; m.backFaceCulling = false;
  const pl = B.MeshBuilder.CreatePlane('guardian', { width: height * W / H, height }, scene); pl.material = m; pl.billboardMode = B.Mesh.BILLBOARDMODE_Y; pl.isPickable = true; pl.alwaysSelectAsActiveMesh = true;
  const gx = -2.9, gz = 21.3, fy = 0.22; pl.position.set(gx, fy + 0.3 + height / 2, gz); gSprite = { mesh: pl, base: pl.position.y, h: height, x: gx, z: gz };
  const pm = new B.PBRMaterial('plinth', scene); pm.albedoColor = hex('#e9e4d8'); pm.roughness = 0.5; pm.metallic = 0; const pd = B.MeshBuilder.CreateCylinder('plinth', { diameter: 0.62, height: 0.3, tessellation: 32 }, scene); pd.material = pm; pd.position.set(gx, fy + 0.15, gz); csm.addShadowCaster(pd);
  const rm = new B.StandardMaterial('gring', scene); rm.emissiveColor = hex('#f3d98b'); rm.disableLighting = true; rm.alpha = 0.9; gRing = B.MeshBuilder.CreateTorus('gring', { diameter: 0.74, thickness: 0.035, tessellation: 40 }, scene); gRing.material = rm; gRing.position.set(gx, fy + 0.03, gz); gRing.isPickable = false;
  gBtn = document.getElementById('guardianBtn'); gBtn.hidden = false;
}
R.hitGuardian = (cx, cy) => {         // mouse / tap on the canvas: scene pick restricted to the sprite
  if (!gSprite) return false; const r = canvas.getBoundingClientRect(), pk = scene.pick((cx - r.left) * engine.getRenderWidth() / r.width, (cy - r.top) * engine.getRenderHeight() / r.height, m => m === gSprite.mesh); return !!(pk && pk.hit);
};
function updateGuardian(dt) {
  if (!gSprite) return; const t = performance.now() / 1000, g = LT.guardian(), br = Math.sin(t * 1.7) * 0.012;
  gSprite.mesh.scaling.set(1 - br * 0.5, 1 + br, 1); gSprite.mesh.position.y = gSprite.base + Math.sin(t * 1.7) * 0.006;   // subtle breathing only
  gRing.visibility = g.ready ? 0.55 + 0.45 * Math.sin(t * 3) : 0.15;
  const pp = R.project(gSprite.x, gSprite.base + gSprite.h / 2 + 0.05, gSprite.z), vis = pp.z > 0 && pp.z < 1 && pp.x > -40 && pp.x < innerWidth + 40 && pp.y > 50 && pp.y < innerHeight;
  gBtn.style.display = vis ? '' : 'none'; if (!vis) return;
  gBtn.style.left = Math.max(70, Math.min(innerWidth - 70, pp.x)) + 'px'; gBtn.style.top = Math.max(60, Math.min(innerHeight - 8, pp.y)) + 'px';
  if (t - gLast > 0.4) { gLast = t; const st = document.getElementById('guardianState'), txt = g.ready ? 'مكافأة جاهزة · ' + new Intl.NumberFormat('ar-IQ').format(g.amount * 1000) + ' د.ع' : 'المتبقي ' + g.clock;
    if (st.textContent !== txt) st.textContent = txt; gBtn.classList.toggle('ready', g.ready); gBtn.setAttribute('aria-label', 'الحارس الصغير، ' + txt); gBtn.setAttribute('aria-disabled', String(!g.ready)); }
}
R.stateOf = a => { const x = actors.get(a); return x ? x.state + ':' + x.cur : null; };
function fadeSectors(inter, dt) {     // interior mode: walls/glass whose footprint lies on the camera->subject line ghost out (sectional visibility)
  const ex_ = cam.position.x, ez = cam.position.z, tx = cam.target.x, tz = cam.target.z, dx = tx - ex_, dz = tz - ez;
  for (const q of R.sectors || []) {
    let want = 1;
    if (inter) {
      let t0 = 0, t1 = 1, ok = true;
      for (const [o, dd, lo, hi] of [[ex_, dx, q.a - 0.3, q.b + 0.3], [ez, dz, q.c - 0.3, q.d + 0.3]]) { if (Math.abs(dd) < 1e-6) { if (o < lo || o > hi) ok = false; } else { let u0 = (lo - o) / dd, u1 = (hi - o) / dd; if (u0 > u1) [u0, u1] = [u1, u0]; t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); } }
      const inTarget = tx >= q.a - 0.3 && tx <= q.b + 0.3 && tz >= q.c - 0.3 && tz <= q.d + 0.3;
      if (ok && t0 <= t1 && t1 > 0 && t0 < 0.93 && !inTarget) want = 0.12;
    }
    q.m.visibility += (want - q.m.visibility) * Math.min(1, dt * 8);
  }
}
R.frame = dt => {
  if (!LT) LT = window.__LT22; if (!LT) return;
  const c = LT.cam(), inter = false; cam.fov = 0.5; cam.minZ = 5;
  const key = c.center[0] + ',' + c.center[2] + ',' + c.scale + ',' + (window.__camNonce || 0);    // legacy preset buttons / tests change centre+scale; user pan/zoom is owned by the fixed controller
  if (R.lastKey !== key) { R.lastKey = key; cam.setTarget(new V3(Math.max(-26, Math.min(26, c.center[0])), 0, Math.max(-20, Math.min(32, c.center[2])))); cam.radius = Math.max(16, Math.min(125, c.scale / Math.tan(cam.fov / 2))); R.fixed.forceOrientation(); }
  scene.fogDensity = 0.0014; fadeSectors(false, dt);
  syncActors(dt); vfx(); updateGuardian(dt); engine.resize(); scene.render(); R.stats.fps = engine.getFps();
};
R.project = (x, y, z) => {
  const w = engine.getRenderWidth(), h = engine.getRenderHeight(), p = V3.Project(new V3(x, y, z), B.Matrix.Identity(), scene.getTransformMatrix(), cam.viewport.toGlobal(w, h));
  return { x: p.x * canvas.clientWidth / w, y: p.y * canvas.clientHeight / h, z: p.z };
};
init().catch(e => { R.failed = true; R.on = false; say('init failed: ' + (e && e.stack || e)); document.getElementById('game').style.opacity = '1'; if (canvas) canvas.remove(); R._res(false); });
})();
