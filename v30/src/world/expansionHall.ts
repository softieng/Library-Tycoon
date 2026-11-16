import { Mesh, MeshBuilder, Scene, TransformNode } from '@babylonjs/core';
import type { AssetLibrary } from '../assets/library';
import { CharacterView } from '../characters/CharacterView';
import { EXPANSION_BY_ID, type ExpansionHallId } from '../config/expansionHalls';
import { makeImagePlane, makeSign } from './text';

/**
 * Lazily instantiated, cut-away 3D rooms built from the game's existing GLB
 * asset library. These are interactive educational previews, NOT final
 * production halls with autonomous service simulations.
 */
export interface ExpansionHallBuild {
  root: TransformNode;
  targets: Map<string, { x: number; z: number }>;
  pickables: Mesh[];
}
export function expansionBounds(id: ExpansionHallId) {
  const offset = EXPANSION_BY_ID[id].offsetX;
  return { minX: offset - 10.7, maxX: offset + 10.7, minZ: -7.7, maxZ: 7.7 };
}
export function buildExpansionHall(scene: Scene, lib: AssetLibrary, id: ExpansionHallId): ExpansionHallBuild {
  const def = EXPANSION_BY_ID[id];
  const root = new TransformNode(`expansion_${id}_root`, scene);
  root.position.x = def.offsetX;
  const pickables: Mesh[] = [];
  const targets = new Map<string, { x: number; z: number }>();
  const mat = (key: string) => lib.palette.get(key)!;
  const block = (suffix: string, w: number, h: number, d: number, x: number, y: number, z: number, material: string) => {
    const m = MeshBuilder.CreateBox(`${id}_${suffix}`, { width: w, height: h, depth: d }, scene);
    m.parent = root; m.position.set(x, y, z); m.material = mat(material);
    m.isPickable = false; m.receiveShadows = true;
    return m;
  };
  const floor = MeshBuilder.CreateGround(`${id}_floor`, { width: 22, height: 16 }, scene);
  floor.parent = root; floor.position.y = -0.006; floor.material = mat('marble');
  floor.isPickable = false; floor.receiveShadows = true;
  block('north_wall', 22.4, 4.15, 0.3, 0, 2.08, 8.13, 'ivory');
  block('west_wall', 0.3, 4.15, 16.4, -11.16, 2.08, 0, 'ivory');
  block('south_left', 9.1, 1.0, 0.3, -6.5, 0.5, -8.13, 'ivory');
  block('south_right', 9.1, 1.0, 0.3, 6.5, 0.5, -8.13, 'ivory');
  block('east_cut', 0.3, 1.0, 16.4, 11.14, 0.5, 0, 'ivory');
  block('north_railing', 22.4, 0.09, 0.2, 0, 4.16, 8.1, 'wood');
  block('north_accent', 22.1, 0.04, 0.04, 0, 3.3, 8.01, 'brass');
  block('runner', 2.1, 0.013, 12.2, 0, 0.008, -1.5, 'navy_fabric');
  for (const side of [-1, 1])
    block('entrance_' + side, 0.22, 2.5, 0.32, side * 1.25, 1.25, -8, 'wood');

  const heading = makeSign(scene, `${id}_sign_main`, {
    w: 5.0, h: 0.82, text: def.nameAr, sub: def.nameEn + ' · GAME PREVIEW',
    px: 220, bg: '#142c52', fg: '#fff2d2', border: def.accent,
  }, root);
  heading.position.set(-3.6, 3.43, 7.99);
  // Official branding is loaded from the immutable supplied asset.
  const logo = makeImagePlane(scene, `${id}_official_logo`,
    'assets/branding/central-library-logo.png', 1.35, 1.35, root);
  logo.position.set(4.4, 3.3, 7.99);

  for (const target of def.targets) {
    const node = new TransformNode(`${id}_node_${target.id}`, scene);
    node.parent = root; node.position.set(target.x, 0, target.z);
    if (target.kind === 'shelf') node.rotation.y = 0;
    const model = lib.place(target.model, node, { shadows: false });
    // Reuse ordinary models, with no new asset downloads or draw calls
    // beyond the actual instanced props in this hall.
    void model;
    targets.set(target.id, { x: def.offsetX + target.x, z: target.z });
    if (target.kind === 'study') {
      for (const z of [-0.95, 0.95]) {
        const chair = lib.place('chair_read', node, { shadows: false });
        chair.position.set(0, 0, z); chair.rotation.y = z > 0 ? Math.PI : 0;
      }
      const book = lib.place('book_stack', node, { shadows: false });
      book.position.set(-0.46, 0.8, 0); book.scaling.setAll(0.7);
    }
    const h = target.kind === 'shelf' ? 2.53 : target.kind === 'study' ? 1.52 : 2.05;
    const label = makeSign(scene, `${id}_sign_${target.id}`, {
      w: target.kind === 'study' ? 1.7 : 2.0, h: 0.43,
      text: (target.code ? target.code + ' · ' : '') + target.titleAr,
      px: 108, bg: '#182d50', fg: '#fff4d2', border: def.accent,
    }, node);
    label.position.set(0, h, target.kind === 'shelf' ? 0.37 : -0.2);
    const pick = MeshBuilder.CreateBox(`${id}_pick_${target.id}`, {
      width: target.kind === 'study' ? 2.2 : 1.85,
      depth: target.kind === 'study' ? 1.5 : 1.05,
      height: target.kind === 'shelf' ? 2.5 : 1.85,
    }, scene);
    pick.parent = node; pick.position.y = target.kind === 'shelf' ? 1.25 : 0.93;
    pick.isVisible = false; pick.isPickable = true;
    pick.metadata = { pick: { kind: 'expansion', id: target.id, hall: id } };
    pickables.push(pick);
  }
  // Institutionally uniformed fixed worker, not an autonomous wandering actor.
  const steward = new CharacterView(scene, lib, id === 'theses' ? 3 : 5, true, 'staff', 98000 + def.offsetX);
  steward.root.parent = root; steward.root.position.set(-8.7, 0, -4.7);
  steward.root.rotation.y = Math.PI;
  steward.pick.isPickable = false;

  root.setEnabled(false);
  return { root, targets, pickables };
}
