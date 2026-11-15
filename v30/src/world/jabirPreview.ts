import { Mesh, MeshBuilder, Scene, TransformNode } from '@babylonjs/core';
import type { AssetLibrary } from '../assets/library';
import { CharacterView } from '../characters/CharacterView';
import { JABIR_BOUNDS, JABIR_DOOR, JABIR_POINTS, JABIR_SHELVES } from '../config/jabirHall';
import { makeImagePlane, makeSign } from './text';

/**
 * Self-contained 3D trial hall, loaded only when the player chooses to preview it.
 * Different x coordinates mean it never overlaps the live Khwarizmi simulation.
 * Uses the game's existing official logo and GLB models without modifying assets.
 */
export const JABIR_PREVIEW_OFFSET_X = 46;
export const jabirWorldX = (x: number): number => x + JABIR_PREVIEW_OFFSET_X;
export const JABIR_WORLD_BOUNDS = {
  minX: JABIR_PREVIEW_OFFSET_X + JABIR_BOUNDS.minX,
  maxX: JABIR_PREVIEW_OFFSET_X + JABIR_BOUNDS.maxX,
  minZ: JABIR_BOUNDS.minZ,
  maxZ: JABIR_BOUNDS.maxZ,
} as const;

export interface JabirPreviewBuild {
  root: TransformNode;
  targets: Map<string, { x: number; z: number }>;
  pickables: Mesh[];
}

export function buildJabirPreview(scene: Scene, lib: AssetLibrary): JabirPreviewBuild {
  const root = new TransformNode('jabir_preview_root', scene);
  root.position.set(JABIR_PREVIEW_OFFSET_X, 0, 0);
  const pickables: Mesh[] = [];
  const targets = new Map<string, { x: number; z: number }>();
  const pal = (id: string) => lib.palette.get(id)!;

  const block = (id: string, w: number, h: number, d: number, x: number, y: number, z: number, material: string) => {
    const m = MeshBuilder.CreateBox('jabir_' + id, { width: w, height: h, depth: d }, scene);
    m.parent = root; m.position.set(x, y, z); m.material = pal(material);
    m.isPickable = false; m.receiveShadows = true; return m;
  };
  const floor = MeshBuilder.CreateGround('jabir_floor', { width: 22, height: 16 }, scene);
  floor.parent = root; floor.position.y = -0.005; floor.material = pal('marble');
  floor.receiveShadows = true; floor.isPickable = false;

  // Cut-away architecture, matching the visual language of the main hall.
  block('north_wall', 22.4, 4.3, 0.32, 0, 2.15, 8.18, 'ivory');
  block('west_wall', 0.32, 4.3, 16.4, -11.18, 2.15, 0, 'ivory');
  block('south_left', 9.6, 0.95, 0.3, -6.2, 0.475, -8.16, 'ivory');
  block('south_right', 9.6, 0.95, 0.3, 6.2, 0.475, -8.16, 'ivory');
  block('east_cut', 0.3, 0.95, 16, 11.15, 0.475, 0, 'ivory');
  block('north_rail', 22.4, 0.1, 0.2, 0, 4.25, 8.08, 'wood');
  block('north_brass', 22, 0.035, 0.04, 0, 3.35, 8.0, 'brass');
  block('west_rail', 0.22, 0.12, 16.4, -11.1, 4.24, 0, 'wood');
  block('south_left_cap', 9.6, 0.08, 0.4, -6.2, 0.99, -8.12, 'wood');
  block('south_right_cap', 9.6, 0.08, 0.4, 6.2, 0.99, -8.12, 'wood');
  block('runner', 2.2, 0.014, 12.2, 0, 0.006, -1.7, 'navy_fabric');
  block('door_top', JABIR_DOOR.width + 0.45, 0.25, 0.35, 0, 2.6, -8, 'wood');
  for (const side of [-1, 1]) block('door_frame_' + side, 0.24, 2.6, 0.32, side * 1.3, 1.3, -8, 'wood');

  const mainSign = makeSign(scene, 'jabir_main_sign', {
    w: 5.2, h: 0.85, text: 'قاعة جابر بن حيان',
    sub: 'JABIR IBN HAYYAN HALL · GAME PREVIEW',
    px: 256, bg: '#16264d', fg: '#f8ebd3', border: '#d1a34c',
  }, root);
  mainSign.position.set(-3.2, 3.55, 8.0);
  // Display the supplied identity unchanged. Never redraw the institutional logo.
  const logo = makeImagePlane(scene, 'jabir_official_logo', 'assets/branding/central-library-logo.png', 1.35, 1.35, root);
  logo.position.set(4.3, 3.35, 8.0);

  const proxy = (node: TransformNode, id: string, w: number, d: number, h = 1.9) => {
    const p = MeshBuilder.CreateBox('jabir_pick_' + id, { width: w, depth: d, height: h }, scene);
    p.parent = node; p.position.y = h / 2; p.isVisible = false; p.isPickable = true;
    p.metadata = { pick: { kind: 'jabir', id } };
    pickables.push(p);
  };
  const place = (id: string, model: Parameters<AssetLibrary['place']>[0], x: number, z: number, rot = 0) => {
    const n = new TransformNode('jabir_node_' + id, scene);
    n.parent = root; n.position.set(x, 0, z); n.rotation.y = rot;
    lib.place(model, n, { shadows: false });
    targets.set(id, { x: jabirWorldX(x), z });
    return n;
  };

  for (const sh of JABIR_SHELVES) {
    const west = sh.x < -9;
    const n = place(sh.id, 'shelf', sh.x, sh.z, west ? -Math.PI / 2 : 0);
    const board = makeSign(scene, 'jabir_sign_' + sh.id, {
      w: 1.9, h: 0.45, text: sh.code + ' · ' + sh.titleAr,
      sub: sh.topicsAr.join(' · '), subDir: 'rtl',
      px: 128, bg: '#182c53', fg: '#fff7df', border: '#d7ad56',
    }, n);
    board.position.set(0, 2.53, 0.37);
    proxy(n, sh.id, 2, 0.9, 2.5);
  }

  const componentModels: Record<string, Parameters<AssetLibrary['place']>[0]> = {
    jabir_reception: 'counter',
    jabir_materials_exhibit: 'display',
    jabir_library_desk: 'refdesk',
    jabir_study_table_1: 'table',
    jabir_study_table_2: 'table',
    jabir_study_table_3: 'table',
  };
  for (const pt of JABIR_POINTS) {
    const n = place(pt.id, componentModels[pt.id], pt.x, pt.z);
    const sign = makeSign(scene, 'jabir_sign_' + pt.id, {
      w: pt.kind === 'study' ? 1.5 : 2.2, h: 0.42,
      text: pt.titleAr, px: 96,
      bg: '#182c53', fg: '#fff7df', border: '#d7ad56',
    }, n);
    sign.position.set(0, pt.kind === 'study' ? 1.55 : 2.05, -0.2);
    // A visible desk, exhibition or table has a generous pick surface.
    proxy(n, pt.id, pt.kind === 'study' ? 2.4 : 2.2, pt.kind === 'study' ? 1.6 : 1.2);
    if (pt.kind === 'study') {
      const books = lib.place('book_stack', n, { shadows: false });
      books.position.set(-0.52, 0.78, -0.12); books.scaling.setAll(0.75);
      for (const z of [-1.05, 1.05]) {
        const chair = lib.place('chair_read', n, { shadows: false });
        chair.position.set(0, 0, z);
        chair.rotation.y = z < 0 ? Math.PI : 0;
      }
    }
  }

  // One fixed-position uniformed hall attendant. No autonomous movement, wages,
  // production inventory, or transfer of real library records.
  const attendant = new CharacterView(scene, lib, 3, true, 'staff', 91001);
  attendant.root.parent = root;
  attendant.root.position.set(-6.5, 0, -4.3);
  attendant.root.rotation.y = Math.PI;
  attendant.pick.isPickable = false;

  root.setEnabled(false);
  return { root, targets, pickables };
}
