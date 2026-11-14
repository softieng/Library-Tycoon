import { Color3, Constants, DynamicTexture, Mesh, MeshBuilder, PBRMaterial, Scene, StandardMaterial, Texture, TransformNode, Vector3, VertexData } from '@babylonjs/core';
import type { AssetLibrary } from '../assets/library';
import { TEXTURE_DIR } from '../assets/manifest';
import { DEWEY } from '../config/dewey';
import { DOOR, HALL, HALL_NAME_AR, PROPS, QUEUES, SEATS, type Prop } from '../config/layout';
import { makeImagePlane, makeSign } from './text';

const lin = (hex: string) => Color3.FromHexString(hex).toLinearSpace();
export const WALL_H = 4.3;
const CUT_H = 0.95;

export interface HallBuild {
  root: TransformNode;
  /** propId → node, so upgrades can show/hide furniture without rebuilding the scene. */
  propNodes: Map<string, TransformNode>;
  /** Clickable proxies. */
  pickables: Mesh[];
  shadowCasters: Mesh[];
  screens: Map<string, PBRMaterial>;
  printerLight: PBRMaterial;
}

/**
 * Builds the reading hall once. Architecture is procedural (walls, floor, windows, signage);
 * furniture comes from the GLB kit through GPU instances.
 */
export function buildHall(scene: Scene, lib: AssetLibrary): HallBuild {
  const root = new TransformNode('hall', scene);
  const propNodes = new Map<string, TransformNode>(), pickables: Mesh[] = [], shadowCasters: Mesh[] = [], screens = new Map<string, PBRMaterial>();
  const P = (n: string) => lib.palette.get(n)!;
  const W = HALL.maxX - HALL.minX, D = HALL.maxZ - HALL.minZ;

  const statics: { m: Mesh; cast: boolean }[] = [];
  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: PBRMaterial, cast = false) => {
    const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); m.material = mat; m.parent = root; m.receiveShadows = true; m.isPickable = false;
    statics.push({ m, cast });
    return m;
  };
  const pbr = (name: string, hex: string, rough: number, metal = 0) => { const m = new PBRMaterial(name, scene); m.albedoColor = lin(hex); m.roughness = rough; m.metallic = metal; return m; };

  /* ---------------- floor: polished ivory marble tiles, brass inlay, navy carpets ---------------- */
  const floorMat = pbr('floor_marble', '#d9d1c0', 0.5);
  const ft = new Texture(TEXTURE_DIR + 'floor_tiles.jpg', scene); ft.uScale = W / 4; ft.vScale = D / 4; floorMat.albedoTexture = ft; ft.anisotropicFilteringLevel = 8;
  const fr = new Texture(TEXTURE_DIR + 'floor_rough.jpg', scene); fr.uScale = W / 4; fr.vScale = D / 4;
  floorMat.metallicTexture = fr; floorMat.useRoughnessFromMetallicTextureGreen = true; floorMat.useRoughnessFromMetallicTextureAlpha = false; floorMat.useMetallnessFromMetallicTextureBlue = false; floorMat.metallic = 0; floorMat.roughness = 1;
  floorMat.environmentIntensity = 0.85;
  const floor = MeshBuilder.CreateGround('floor', { width: W, height: D }, scene);
  floor.material = floorMat; floor.receiveShadows = true; floor.parent = root; floor.isPickable = true; floor.metadata = { pick: { kind: 'floor', id: 'floor' } };
  pickables.push(floor);
  const brass = P('brass');
  for (const [w, d, x, z] of [[W - 1.2, 0.05, 0, HALL.minZ + 0.6], [W - 1.2, 0.05, 0, HALL.maxZ - 0.6], [0.05, D - 1.2, HALL.minX + 0.6, 0], [0.05, D - 1.2, HALL.maxX - 0.6, 0]] as const) box('inlay', w, 0.006, d, x, 0.003, z, brass);

  const carpetMat = pbr('carpet', '#ffffff', 0.97);
  const ct = new Texture(TEXTURE_DIR + 'carpet_albedo.jpg', scene), cn = new Texture(TEXTURE_DIR + 'carpet_normal.jpg', scene);
  carpetMat.albedoTexture = ct; carpetMat.bumpTexture = cn; carpetMat.environmentIntensity = 0.3;
  const carpet = (name: string, x: number, z: number, w: number, d: number) => {
    box(name + '_trim', w + 0.22, 0.012, d + 0.22, x, 0.006, z, P('gold_leaf'));
    const c = box(name, w, 0.02, d, x, 0.012, z, carpetMat);
    return c;
  };
  ct.uScale = 5; ct.vScale = 3.2; cn.uScale = 5; cn.vScale = 3.2;
  carpet('rug_reading', 0.55, 2.6, 9.2, 6.6);
  carpet('rug_lounge', -5.7, -7.5, 5.0, 2.5);
  carpet('rug_runner', 10, -6.2, 2.2, 4.6);
  carpet('rug_borrow', -7.4, -4.4, 5.8, 1.1);

  /* ---------------- back walls (north + west): plaster, walnut wainscot, brass rail ---------------- */
  const plaster = pbr('plaster', '#efe6d2', 0.9); const wood = P('wood'), woodDark = P('wood_dark'), navy = P('navy');
  const T = 0.35;
  box('wall_n', W + T * 2, WALL_H, T, 0, WALL_H / 2, HALL.maxZ + T / 2, plaster, true);
  box('wall_w', T, WALL_H, D + T, HALL.minX - T / 2, WALL_H / 2, T / 2, plaster, true);
  box('cornice_n', W + T * 2, 0.22, T + 0.16, 0, WALL_H + 0.11, HALL.maxZ + T / 2, wood); box('cornice_w', T + 0.16, 0.22, D + T, HALL.minX - T / 2, WALL_H + 0.11, T / 2, wood);
  box('cornice_brass_n', W, 0.03, 0.03, 0, WALL_H - 0.02, HALL.maxZ - 0.015, brass); box('cornice_brass_w', 0.03, 0.03, D, HALL.minX + 0.015, WALL_H - 0.02, 0, brass);
  // navy frieze band behind the tall shelves' cornice, ivory above
  box('frieze_n', W, 0.5, 0.03, 0, 2.72, HALL.maxZ - 0.015, navy); box('frieze_w', 0.03, 0.5, D, HALL.minX + 0.015, 2.72, 0, navy);
  box('frieze_rail_n', W, 0.035, 0.04, 0, 2.99, HALL.maxZ - 0.02, brass); box('frieze_rail_w', 0.04, 0.035, D, HALL.minX + 0.02, 2.99, 0, brass);
  // wainscot panels where there are no shelves
  const wainscotN = (x0: number, x1: number) => {
    box('wains', x1 - x0, 1.25, 0.06, (x0 + x1) / 2, 0.625, HALL.maxZ - 0.03, wood);
    box('wains_cap', x1 - x0, 0.05, 0.1, (x0 + x1) / 2, 1.27, HALL.maxZ - 0.05, brass);
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 1.0) box('wains_p', 0.74, 0.86, 0.02, x, 0.62, HALL.maxZ - 0.07, woodDark);
  };
  wainscotN(2.1, HALL.maxX);
  const wainscotW = (z0: number, z1: number) => {
    box('wains', 0.06, 1.25, z1 - z0, HALL.minX + 0.03, 0.625, (z0 + z1) / 2, wood);
    box('wains_cap', 0.1, 0.05, z1 - z0, HALL.minX + 0.05, 1.27, (z0 + z1) / 2, brass);
    for (let z = z0 + 0.5; z < z1 - 0.3; z += 1.0) box('wains_p', 0.02, 0.86, 0.74, HALL.minX + 0.07, 0.62, z, woodDark);
  };
  wainscotW(HALL.minZ, 0.4); wainscotW(6.6, HALL.maxZ);

  /* ---------------- tall arched windows on the west wall (warm daylight) ---------------- */
  const glass = pbr('window_glass', '#fff3d6', 0.2); glass.emissiveColor = lin('#ffe2a8').scale(1.25);
  for (const z of [-7.2, -4.4, -1.6]) {
    box('win_frame', 0.1, 2.5, 1.5, HALL.minX + 0.06, 2.75, z, woodDark);
    box('win_glass', 0.06, 2.3, 1.3, HALL.minX + 0.10, 2.75, z, glass);
    const arch = MeshBuilder.CreateCylinder('win_arch', { diameter: 1.5, height: 0.1, tessellation: 32, arc: 0.5 }, scene);
    arch.rotation.set(0, 0, Math.PI / 2); arch.rotation.y = 0; arch.position.set(HALL.minX + 0.06, 4.0, z); arch.material = woodDark; arch.parent = root;
    arch.rotation = new Vector3(Math.PI / 2, 0, Math.PI / 2);
    const archG = MeshBuilder.CreateCylinder('win_archg', { diameter: 1.3, height: 0.06, tessellation: 32, arc: 0.5 }, scene);
    archG.rotation = new Vector3(Math.PI / 2, 0, Math.PI / 2); archG.position.set(HALL.minX + 0.10, 3.9, z); archG.material = glass; archG.parent = root;
    for (const dz of [-0.33, 0.33]) box('mullion', 0.05, 2.3, 0.045, HALL.minX + 0.14, 2.75, z + dz, woodDark);
    for (const y of [2.2, 3.2]) box('transom', 0.05, 0.045, 1.3, HALL.minX + 0.14, y, z, woodDark);
    box('sill', 0.3, 0.07, 1.7, HALL.minX + 0.15, 1.5, z, wood);
  }
  // soft volumetric daylight shafts falling from each arched window across the floor (additive, no depth write)
  {
    const gt = new DynamicTexture('shaft_grad', { width: 64, height: 128 }, scene, true); gt.hasAlpha = true;
    const g = gt.getContext() as unknown as CanvasRenderingContext2D; const lg = g.createLinearGradient(0, 0, 0, 128);
    lg.addColorStop(0, 'rgba(255,236,190,0.55)'); lg.addColorStop(0.55, 'rgba(255,226,170,0.2)'); lg.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = lg; g.fillRect(0, 0, 64, 128); g.globalCompositeOperation = 'destination-in';
    const hg = g.createLinearGradient(0, 0, 64, 0); hg.addColorStop(0, 'rgba(0,0,0,0)'); hg.addColorStop(0.22, 'rgba(0,0,0,1)'); hg.addColorStop(0.78, 'rgba(0,0,0,1)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hg; g.fillRect(0, 0, 64, 128); gt.update();
    const sm = new StandardMaterial('shaft', scene); sm.disableLighting = true; sm.emissiveColor = new Color3(1, 0.88, 0.62); sm.opacityTexture = gt; sm.backFaceCulling = false;
    sm.alphaMode = Constants.ALPHA_ADD; sm.disableDepthWrite = true; sm.alpha = 0.9;
    for (const z of [-7.2, -4.4, -1.6]) {
      const x0 = HALL.minX + 0.12, top = 3.7, w = 0.62, dx = 2.9, dz = 1.2;
      const pos = [x0, top, z - w, x0, top, z + w, x0 + dx, 0.02, z + w + dz, x0 + dx, 0.02, z - w + dz];
      const m = new Mesh('shaft', scene); const vd = new VertexData(); vd.positions = pos; vd.indices = [0, 1, 2, 0, 2, 3]; vd.uvs = [0.5 - 0.5, 0, 1, 0, 1, 1, 0, 1]; vd.normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]; vd.applyToMesh(m);
      m.material = sm; m.parent = root; m.isPickable = false; m.renderingGroupId = 0; m.alphaIndex = 5;
    }
  }
  // wall sconces between the north shelves and on the east part of the north wall
  const glow = P('lamp_glow');
  for (const x of [3.3, 6.5, 8.5, 10.5, 12.4]) { box('sconce_arm', 0.05, 0.3, 0.12, x, 3.35, HALL.maxZ - 0.07, brass); const s = MeshBuilder.CreateSphere('sconce', { diameter: 0.26, segments: 12 }, scene); s.position.set(x, 3.55, HALL.maxZ - 0.2); s.material = glow; s.parent = root; s.isPickable = false; }

  /* ---------------- cut-away front walls (south + east) with brass cap rail and pilasters ---------------- */
  const cutMat = pbr('cut_wall', '#e9dfc8', 0.85);
  const south = (x0: number, x1: number) => { const w = x1 - x0, x = (x0 + x1) / 2; box('wall_s', w, CUT_H, T, x, CUT_H / 2, HALL.minZ - T / 2, cutMat, true); box('wall_s_w', w, 0.5, 0.03, x, 0.27, HALL.minZ + 0.012, wood); box('wall_s_cap', w + 0.04, 0.06, T + 0.1, x, CUT_H + 0.03, HALL.minZ - T / 2, wood); box('wall_s_rail', w, 0.03, 0.04, x, CUT_H + 0.075, HALL.minZ - T / 2, brass); };
  south(HALL.minX - T, DOOR.minX); south(DOOR.maxX, HALL.maxX + T);
  box('wall_e', T, CUT_H, D, HALL.maxX + T / 2, CUT_H / 2, 0, cutMat, true); box('wall_e_w', 0.03, 0.5, D, HALL.maxX - 0.012, 0.27, 0, wood);
  box('wall_e_cap', T + 0.1, 0.06, D + 0.04, HALL.maxX + T / 2, CUT_H + 0.03, 0, wood); box('wall_e_rail', 0.04, 0.03, D, HALL.maxX + T / 2, CUT_H + 0.075, 0, brass);
  const pilaster = (x: number, z: number, h: number) => { box('pil', 0.5, h, 0.5, x, h / 2, z, plaster, true); box('pil_base', 0.6, 0.3, 0.6, x, 0.15, z, wood); box('pil_cap', 0.62, 0.12, 0.62, x, h + 0.06, z, wood); box('pil_band', 0.52, 0.05, 0.52, x, h - 0.12, z, brass); };
  pilaster(HALL.maxX + T / 2, HALL.maxZ + T / 2, WALL_H); pilaster(HALL.minX - T / 2, HALL.minZ - T / 2, WALL_H);
  pilaster(HALL.maxX + T / 2, HALL.minZ - T / 2, 1.5);
  for (const x of [DOOR.minX - 0.1, DOOR.maxX + 0.1]) { pilaster(x, HALL.minZ - T / 2, 2.5); const lamp = MeshBuilder.CreateSphere('door_lamp', { diameter: 0.34, segments: 12 }, scene); lamp.position.set(x, 2.84, HALL.minZ - T / 2); lamp.material = glow; lamp.parent = root; lamp.isPickable = false; }
  box('door_mat', 1.8, 0.02, 1.0, 10, 0.011, HALL.minZ + 0.7, P('navy_fabric'));
  box('threshold', 2.0, 0.02, T + 0.5, 10, 0.006, HALL.minZ - T / 2 - 0.1, wood);
  // outside apron so the building does not float in space
  const apronMat = pbr('apron', '#22304f', 0.95); apronMat.environmentIntensity = 0.2;
  const apron = MeshBuilder.CreateGround('apron', { width: 90, height: 90 }, scene); apron.position.y = -0.06; apron.material = apronMat; apron.parent = root; apron.isPickable = false; apron.receiveShadows = true;
  box('plinth', W + 1.6, 0.1, D + 1.6, 0, -0.07, 0, pbr('plinth', '#d8ccb2', 0.8));

  /* ---------------- signage: hall name + official logo (image file used unmodified) ---------------- */
  const title = makeSign(scene, 'hall_title', { w: 4.6, h: 0.82, text: HALL_NAME_AR, sub: 'AL-KHWARIZMI HALL', px: 256, emissive: 0.5 }, root);
  title.position.set(-5, 3.62, HALL.maxZ - 0.04);
  const logo = makeImagePlane(scene, 'wall_logo', 'assets/branding/central-library-logo.png', 1.5, 1.5, root);
  logo.position.set(3.3, 3.25, HALL.maxZ - 0.05); logo.scaling.setAll(1.1);
  const logoW = makeImagePlane(scene, 'wall_logo_w', 'assets/branding/central-library-logo.png', 1.5, 1.5, root);
  logoW.position.set(HALL.minX + 0.05, 3.4, 7.8); logoW.rotation.y = -Math.PI / 2;

  /* ---------------- furniture from the layout ---------------- */
  const yawOf = (p: Prop) => Math.PI + (p.rot * Math.PI) / 2;
  const cast = (n: TransformNode) => { for (const m of n.getChildMeshes()) shadowCasters.push(m as Mesh); };
  const pickBox = (id: string, kind: string, p: Prop, h: number, parent: TransformNode) => {
    const m = MeshBuilder.CreateBox(`pick_${id}`, { width: p.w + 0.1, height: h, depth: p.d + 0.3 }, scene);
    m.parent = parent; m.position.y = h / 2; m.isVisible = false; m.isPickable = true; m.metadata = { pick: { kind, id } };
    pickables.push(m); return m;
  };
  const place = (model: Parameters<AssetLibrary['place']>[0], parent: TransformNode, x = 0, y = 0, z = 0, yaw = 0, s = 1) => { const n = lib.place(model, parent); n.position.set(x, y, z); n.rotation.y = yaw; n.scaling.setAll(s); cast(n); return n; };
  const signPost = (parent0: TransformNode, text: string, icon: string, y = 2.25, w = 2.2, xOff = 0) => {
    const parent = new TransformNode('signpost', scene); parent.parent = parent0; parent.position.x = xOff;
    for (const sx of [-1, 1]) { const post = MeshBuilder.CreateCylinder('post', { diameter: 0.05, height: y - 0.9 }, scene); post.material = brass; post.parent = parent; post.position.set(sx * (w / 2 - 0.1), (y + 0.9) / 2 - 0.15, 0.2); post.isPickable = false; }
    const board = box('sign_board', w + 0.12, 0.56, 0.06, 0, 0, 0, navy); board.parent = parent; board.position.set(0, y, 0.2);
    const s = makeSign(scene, 'sign', { w, h: 0.46, text, icon, px: 128, emissive: 0.55 }, parent); s.position.set(0, y, 0.2 - 0.04); s.rotation.y = 0;
    const b = makeSign(scene, 'sign_b', { w, h: 0.46, text, icon, px: 128, emissive: 0.55 }, parent); b.position.set(0, y, 0.2 + 0.04); b.rotation.y = Math.PI;
  };
  const screenMat = (id: string) => { const m = P('screen').clone(`screen_${id}`); screens.set(id, m); return m; };

  for (const p of PROPS) {
    if (p.type === 'staffonly' || p.type === 'gate' || p.type === 'halldoor') continue;
    const node = new TransformNode(`p_${p.id}`, scene); node.parent = root; node.position.set(p.x, 0, p.z); node.rotation.y = yawOf(p);
    propNodes.set(p.id, node);
    switch (p.type) {
      case 'shelf': {
        place('shelf', node);
        const c = DEWEY.find((d) => d.code === p.code)!;
        const label = makeSign(scene, `label_${p.id}`, { w: 1.7, h: 0.3, text: `${c.code}  ${c.nameAr}`, px: 96, bg: c.color, fg: '#fff6dc', border: '#e0b450', emissive: 0.6 }, node);
        label.position.set(0, 2.52, 0.3); label.rotation.y = 0; label.rotation.x = -0.18;
        pickBox(p.id, 'shelf', p, 2.5, node).position.z = 0.25;
        break;
      }
      case 'lowshelf': place('lowshelf', node); break;
      case 'backshelf': place('backshelf', node); break;
      case 'table': {
        place('table', node);
        // real chairs at the real seat positions
        for (const s of SEATS.filter((x) => x.table === p.id)) { const ch = lib.place('chair_read', root); ch.parent = node; ch.position.set(-(s.spot.x - p.x), 0, -(s.spot.z - p.z)); ch.rotation.y = s.spot.z < p.z ? Math.PI : 0; cast(ch); }
        break;
      }
      case 'pcdesk': {
        place('pcdesk', node);
        const mon = lib.clone('monitor', node); mon.root.position.set(0, 0.76, -0.12);
        for (const m of mon.meshes) { m.isVisible = true; if (m.material?.name === 'pal_ivory') m.material = P('dark'); if (m.material?.name === 'pal_dark') m.material = screenMat(p.id); shadowCasters.push(m); }
        place('keyboard', node, 0, 0.76, 0.18, 0, 1.5); place('mouse', node, -0.36, 0.76, 0.2, 0, 1.4);
        const seat = SEATS.find((s) => s.table === p.id)!; const ch = lib.place('chair_pc', node); ch.position.set(0, 0, seat.spot.z - p.z > 0 ? -0.88 : 0.88); ch.rotation.y = 0; cast(ch);
        ch.position.set(0, 0, 0.88);
        pickBox(p.id, 'device', p, 1.4, node);
        break;
      }
      case 'counter': {
        place('counter', node); signPost(node, p.label!, '📚', 2.5, 1.9, -1.9);
        const mon = place('monitor', node, -1.0, 1.06, -0.2, Math.PI, 1); void mon; place('keyboard', node, -1.0, 1.06, -0.42, Math.PI, 1.4);
        place('lamp_table', node, 2.05, 1.06, -0.1, 0, 1);
        pickBox(p.id, 'station', p, 1.3, node).metadata = { pick: { kind: 'station', id: 'borrow' } };
        break;
      }
      case 'refdesk': {
        place('refdesk', node); signPost(node, p.label!, '🔎', 2.4, 1.3, 0.75);
        place('monitor', node, 0.6, 1.0, -0.2, Math.PI, 1); place('lamp_table', node, -0.2, 1.0, -0.15, 0, 0.9);
        pickBox(p.id, 'station', p, 1.3, node).metadata = { pick: { kind: 'station', id: 'research' } };
        break;
      }
      case 'digitaldesk': {
        place('digitaldesk', node); signPost(node, p.label!, '🖨️', 2.4, 1.5, 0.6);
        place('laptop', node, 0.4, 0.98, -0.1, Math.PI, 1.3); place('plant_small', node, -0.8, 0.98, 0, 0, 1);
        pickBox(p.id, 'station', p, 1.3, node).metadata = { pick: { kind: 'station', id: 'print' } };
        break;
      }
      case 'printer': { place('printer', node); pickBox(p.id, 'device', p, 1.4, node); break; }
      case 'podium': place('podium', node); break;
      case 'display': place('display', node); break;
      case 'kiosk': place('kiosk', node); break;
      case 'armchair': place('armchair', node); break;
      case 'floorlamp': place('lamp_floor', node, 0, 0, 0, 0, 1.05); break;
      case 'cart': { place('cart', node); pickBox(p.id, 'cart', p, 1.3, node); break; }
      case 'cleancart': place('cleancart', node); break;
      case 'bench': place('bench', node); break;
      case 'sofa': place('sofa', node, 0, 0, 0, 0, 1); break;
      case 'coffeetable': { place('coffeetable', node); place('book_stack', node, 0.1, 0.42, 0, 0.4, 1.2); break; }
      case 'plant': { place('planter', node, 0, 0, 0, 0, 0.95); place('plant_tall', node, 0, 0.42, 0, p.x * 1.7, 0.95); break; }
      case 'totem': {
        place('totem', node);
        const face = makeSign(scene, 'totem_face', { w: 0.74, h: 0.5, text: 'الاستعلامات', sub: 'INFORMATION', px: 128, emissive: 0.6 }, node); face.position.set(0, 0.62, 0.08); face.rotation.y = 0;
        const lg = makeImagePlane(scene, 'totem_logo', 'assets/branding/central-library-logo.png', 0.92, 0.92, node); lg.position.set(0, 1.44, 0.075); lg.rotation.y = 0;
        const back = makeImagePlane(scene, 'totem_logo_b', 'assets/branding/central-library-logo.png', 0.92, 0.92, node); back.position.set(0, 1.44, -0.075); back.rotation.y = Math.PI;
        const plate = box('totem_plate', 0.78, 1.0, 0.012, 0, 0, 0, P('ivory')); plate.parent = node; plate.position.set(0, 1.44, 0.068);
        const plateB = box('totem_plate_b', 0.78, 1.0, 0.012, 0, 0, 0, P('ivory')); plateB.parent = node; plateB.position.set(0, 1.44, -0.068);
        break;
      }
      case 'rope': {
        const n = 4, len = p.w;
        for (let i = 0; i < n; i++) { const s = place('stanchion', node, -len / 2 + (len * i) / (n - 1), 0, 0); void s; }
        for (let i = 0; i < n - 1; i++) {
          const x0 = -len / 2 + (len * i) / (n - 1), x1 = -len / 2 + (len * (i + 1)) / (n - 1);
          const pts = Array.from({ length: 9 }, (_, k) => { const t = k / 8; return new Vector3(x0 + (x1 - x0) * t, 0.93 - Math.sin(Math.PI * t) * 0.16, 0); });
          const rope = MeshBuilder.CreateTube('rope', { path: pts, radius: 0.022, tessellation: 8 }, scene); rope.material = P('rope'); rope.parent = node; rope.isPickable = false;
        }
        break;
      }
    }
  }
  // a locked door to the next hall (gated behind the multiHall feature flag)
  const door = new TransformNode('door_jabir', scene); door.parent = root; door.position.set(3.3, 0, HALL.maxZ - 0.04);
  { const f = box('door_frame', 1.7, 2.5, 0.08, 0, 0, 0, P('wood_dark')); f.parent = door; f.position.set(0, 1.25, 0);
    const l = box('door_leaf', 1.46, 2.3, 0.06, 0, 0, 0, P('wood')); l.parent = door; l.position.set(0, 1.19, -0.04);
    for (const sx of [-1, 1]) { const pnl = box('door_panel', 0.56, 1.9, 0.02, 0, 0, 0, navy); pnl.parent = door; pnl.position.set(sx * 0.35, 1.2, -0.08); const h = box('door_handle', 0.04, 0.3, 0.05, 0, 0, 0, brass); h.parent = door; h.position.set(sx * 0.07, 1.1, -0.1); }
    const s = makeSign(scene, 'door_sign', { w: 1.5, h: 0.3, text: 'قاعة جابر بن حيان — قريباً', px: 96, emissive: 0.5 }, door); s.position.set(0, 2.72, -0.06); s.rotation.y = 0; }

  // floor markers for the queue positions (subtle brass discs)
  for (const q of Object.values(QUEUES)) q.forEach((s, i) => { const d = MeshBuilder.CreateDisc('qmark', { radius: i === 0 ? 0.2 : 0.11, tessellation: 24 }, scene); d.rotation.x = Math.PI / 2; d.position.set(s.x, 0.026, s.z); d.material = brass; d.parent = root; d.isPickable = false; });

  // Merge the static architecture per material: hundreds of boxes become a handful of draw calls.
  const groups = new Map<string, Mesh[]>();
  for (const { m, cast } of statics) {
    if (m.parent !== root || m.isDisposed()) { if (cast) shadowCasters.push(m); continue; }
    const key = `${m.material!.uniqueId}_${cast ? 1 : 0}`; (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
  }
  for (const [key, list] of groups) {
    const merged = list.length > 1 ? Mesh.MergeMeshes(list, true, true)! : list[0];
    merged.parent = root; merged.receiveShadows = true; merged.isPickable = false; merged.name = `static_${key}`;
    if (key.endsWith('_1')) shadowCasters.push(merged);
  }
  const printerLight = P('lamp_glow').clone('printer_light');
  return { root, propNodes, pickables, shadowCasters, screens, printerLight };
}
