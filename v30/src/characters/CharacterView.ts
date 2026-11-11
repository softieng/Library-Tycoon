import { AnimationGroup, Mesh, MeshBuilder, Quaternion, Scene, TransformNode, type InstantiatedEntries } from '@babylonjs/core';
import type { AssetLibrary } from '../assets/library';
import type { Staff, Visitor } from '../gameplay/types';
import { angDiff } from '../navigation/movement';

/** Which Kenney clip shows each simulation state. One place to retarget when better clips arrive. */
export type CharClip = 'idle' | 'walk' | 'sit' | 'pick-up' | 'interact-right' | 'emote-yes' | 'emote-no' | 'holding-right' | 'holding-both' | 'jump';
export const CHARACTER_HEIGHT = 1.55;
const RAW_HEIGHT = 0.69;

export function clipForVisitor(v: Visitor): CharClip {
  if (v.gesture === 'pickup') return 'pick-up';
  if (v.gesture === 'receive') return 'interact-right';
  if (v.gesture === 'no') return 'emote-no';
  if (v.gesture === 'yes') return 'emote-yes';
  if (v.state === 'sit') return 'sit';
  if (v.moving) return 'walk';
  if (v.state === 'browse') return 'interact-right';
  if (v.emote?.kind === 'celebrate') return 'jump';
  if (v.state === 'served') return 'holding-right';
  return 'idle';
}
export function clipForStaff(s: Staff): CharClip {
  if (s.moving) return 'walk';
  if (s.state === 'serving') return 'interact-right';
  if (s.state === 'cleaning') return 'pick-up';
  if (s.state === 'break') return 'sit';
  if (s.emote?.kind === 'happy') return 'emote-yes';
  return 'idle';
}

export class CharacterView {
  readonly root: TransformNode;
  readonly pick: Mesh;
  private entries: InstantiatedEntries;
  private clips = new Map<string, AnimationGroup>();
  private current: AnimationGroup | null = null; private currentName = '';
  private book: TransformNode | null = null;
  meshes: Mesh[] = [];
  private armR: TransformNode | null = null; private armL: TransformNode | null = null;
  private t = Math.random() * 10;
  activity: string | null = null;

  constructor(scene: Scene, lib: AssetLibrary, model: number, staff: boolean, kind: 'visitor' | 'staff', id: number) {
    this.root = new TransformNode(`${kind}_${id}`, scene);
    this.entries = lib.character(model, staff);
    const s = CHARACTER_HEIGHT / RAW_HEIGHT * (staff ? 1.04 : 1);
    for (const r of this.entries.rootNodes) { r.parent = this.root; (r as TransformNode).scaling.scaleInPlace(s); this.meshes.push(...(r.getChildMeshes(false) as Mesh[])); }
    for (const g of this.entries.animationGroups) { g.stop(); this.clips.set(g.name, g); }
    const nodes = this.root.getChildTransformNodes(false);
    this.armR = nodes.find((n) => n.name === 'arm-right') ?? null; this.armL = nodes.find((n) => n.name === 'arm-left') ?? null;
    this.pick = MeshBuilder.CreateCylinder(`pick_${kind}_${id}`, { diameter: 0.85, height: 1.75 }, scene);
    this.pick.parent = this.root; this.pick.position.y = 0.87; this.pick.isVisible = false; this.pick.isPickable = true; this.pick.metadata = { pick: { kind, id } };
    // carried book, attached to the right arm
    if (this.armR) { const b = lib.place('book_closed', this.armR, { shadows: false }); b.scaling.setAll(0.42 / s * 1.45); b.position.set(0.0, -0.13, 0.03); b.rotation.set(Math.PI / 2, 0, 0); b.setEnabled(false); this.book = b; }
    this.play('idle');
  }
  play(name: CharClip, speed = 1) {
    if (name === this.currentName) { if (this.current) this.current.speedRatio = speed; return; }
    const g = this.clips.get(name) ?? this.clips.get('idle'); if (!g) return;
    this.current?.stop(); this.current = g; this.currentName = name;
    g.start(true, speed);
  }
  setCarrying(on: boolean) { this.book?.setEnabled(on); }
  /** Smoothly follow the simulation position/heading (the sim runs at 10 Hz). */
  follow(x: number, z: number, yaw: number, dt: number, y = 0) {
    const k = Math.min(1, dt * 11), p = this.root.position;
    if (Math.abs(p.x - x) + Math.abs(p.z - z) > 3) { p.x = x; p.z = z; } else { p.x += (x - p.x) * k; p.z += (z - p.z) * k; }
    p.y += (y - p.y) * k;
    this.root.rotation.y += angDiff(this.root.rotation.y, yaw) * Math.min(1, dt * 9);
  }
  /** Procedural upper-body layer on top of the "sit" clip so reading, writing and typing look different. */
  layer(dt: number) {
    this.t += dt;
    if (!this.armR || !this.armL || this.currentName !== 'sit' || !this.activity) return;
    const t = this.t;
    const a = this.activity === 'write' ? { r: -1.15 + Math.sin(t * 9) * 0.07, l: -0.75 } : this.activity === 'computer' ? { r: -1.2 + Math.sin(t * 13) * 0.06, l: -1.2 + Math.cos(t * 11) * 0.06 } : { r: -1.0 + Math.sin(t * 0.7) * 0.03, l: -1.0 + Math.sin(t * 0.7) * 0.03 };
    this.armR.rotationQuaternion = Quaternion.FromEulerAngles(a.r, 0, 0); this.armL.rotationQuaternion = Quaternion.FromEulerAngles(a.l, 0, 0);
  }
  dispose() { for (const g of this.entries.animationGroups) g.dispose(); for (const sk of this.entries.skeletons) sk.dispose(); this.root.dispose(false, false); }
}
