import { AnimationGroup, Color3, Mesh, MeshBuilder, PBRMaterial, Quaternion, Scene, TransformNode, Vector3, type InstantiatedEntries } from '@babylonjs/core';
import { Face, type Expression } from './face';
import type { AssetLibrary } from '../assets/library';
import type { Staff, Visitor } from '../gameplay/types';
import { angDiff } from '../navigation/movement';

/** Which Kenney clip shows each simulation state. One place to retarget when better clips arrive. */
export type CharClip = 'idle' | 'walk' | 'sit' | 'pick-up' | 'interact-right' | 'emote-yes' | 'emote-no' | 'holding-right' | 'holding-both' | 'jump';
export const CHARACTER_HEIGHT = 1.5;
const HEAD_SCALE = 0.72;
/** Character kit v2 is 1.585 m tall in its source units (tools/blender/build_characters.py). */
const V2_HEIGHT = 1.585;
const faceMats = new WeakMap<Scene, { white: PBRMaterial; dark: PBRMaterial }>();
function sharedFaceMats(scene: Scene) {
  let m = faceMats.get(scene);
  if (!m) {
    const white = new PBRMaterial('face_white', scene); white.albedoColor = new Color3(0.9, 0.9, 0.88); white.roughness = 0.25; white.metallic = 0; white.environmentIntensity = 0.5;
    const dark = new PBRMaterial('face_dark', scene); dark.albedoColor = new Color3(0.012, 0.01, 0.01); dark.roughness = 0.2; dark.metallic = 0; dark.environmentIntensity = 0.9;
    faceMats.set(scene, (m = { white, dark }));
  }
  return m;
}
const AXIS_X = new Vector3(1, 0, 0), AXIS_Y = new Vector3(0, 1, 0), AXIS_Z = new Vector3(0, 0, 1);
/** Add a rotation on top of whatever the animation just wrote (bones of kit v2 share one rest orientation). */
function addRot(n: TransformNode | null, axis: Vector3, angle: number) { if (n?.rotationQuaternion && angle) n.rotationQuaternion = Quaternion.RotationAxis(axis, angle).multiply(n.rotationQuaternion); }
export const expressionFor = (kind: string | null | undefined): Expression | null =>
  kind === 'happy' || kind === 'celebrate' || kind === 'vip' ? 'happy' : kind === 'confused' || kind === 'request' ? 'surprised' : kind === 'dissatisfied' ? 'unhappy' : kind === 'sleep' ? 'sleepy' : null;

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
  readonly pick: Mesh; private body!: TransformNode;
  private entries: InstantiatedEntries;
  private clips = new Map<string, AnimationGroup>();
  private current: AnimationGroup | null = null; private currentName = '';
  private book: TransformNode | null = null;
  meshes: Mesh[] = [];
  private head: TransformNode | null = null;
  private armR: TransformNode | null = null; private armL: TransformNode | null = null;
  private foreR: TransformNode | null = null; private foreL: TransformNode | null = null; private torso: TransformNode | null = null;
  v2 = false; private face: Face | null = null; private pageT = 3 + Math.random() * 5; private page = 0; private glance = 0; private nextGlance = 2 + Math.random() * 4;
  /** Set by the scene each frame: mood-driven expression (null = derive from activity) and a point of interest to glance at. */
  mood: Expression | null = null; moving = false;
  private t = Math.random() * 10;
  activity: string | null = null;

  constructor(scene: Scene, lib: AssetLibrary, model: number, staff: boolean, kind: 'visitor' | 'staff', id: number) {
    this.root = new TransformNode(`${kind}_${id}`, scene);
    this.entries = lib.character(model, staff);
    for (const r of this.entries.rootNodes) { r.parent = this.root; this.meshes.push(...(r.getChildMeshes(false) as Mesh[])); }
    // Normalisation: the mini-figure head is scaled to 72% for more natural proportions, and the whole
    // figure to 1.5 m (raw rig: body 0.346 + head 0.433 units).
    const nodes0 = this.root.getChildTransformNodes(false);
    this.v2 = nodes0.some((n) => n.name === 'forearm-right');
    const hv = 0.95 + ((id * 37) % 13) / 13 * 0.1; // individual height 0.95–1.05
    const raw = 0.69, s = this.v2 ? (CHARACTER_HEIGHT * hv) / V2_HEIGHT * (staff ? 1.02 : 1) : (CHARACTER_HEIGHT / (0.346 + 0.433 * HEAD_SCALE)) * (staff ? 1.03 : 1);
    this.body = new TransformNode(`${kind}_${id}_body`, scene); this.body.parent = this.root; this.body.scaling.setAll(s);
    for (const r of this.entries.rootNodes) r.parent = this.body;
    for (const g of this.entries.animationGroups) { g.stop(); this.clips.set(g.name, g); }
    const nodes = this.root.getChildTransformNodes(false);
    this.armR = nodes.find((n) => n.name === 'arm-right') ?? null; this.armL = nodes.find((n) => n.name === 'arm-left') ?? null; this.head = nodes.find((n) => n.name === 'head') ?? null;
    this.foreR = nodes.find((n) => n.name === 'forearm-right') ?? null; this.foreL = nodes.find((n) => n.name === 'forearm-left') ?? null; this.torso = nodes.find((n) => n.name === 'torso') ?? null;
    if (this.v2 && this.head) { this.face = new Face(scene, this.head, Color3.Black(), sharedFaceMats(scene), `${kind}_${id}`); this.meshes.push(...this.face.meshes); }
    this.pick = MeshBuilder.CreateCylinder(`pick_${kind}_${id}`, { diameter: 0.85, height: 1.75 }, scene);
    this.pick.parent = this.root; this.pick.position.y = 0.87; this.pick.isVisible = false; this.pick.isPickable = true; this.pick.metadata = { pick: { kind, id } };
    // carried book, attached to the right arm
    if (this.v2 && this.foreR) { const b = lib.place('book_closed', this.foreR, { shadows: false }); const k = 1 / s; b.scaling.setAll(k * 0.95); b.position.set(-0.01, -0.27, 0.06); b.rotation.set(Math.PI / 2, 0, 0.3); b.setEnabled(false); this.book = b; }
    else if (this.armR) { const bk = lib.place('book_closed', this.armR, { shadows: false }); const b = bk; const k = 1 / s; b.scaling.setAll(k * 1.1); b.position.set(0.0, -0.13 * (raw / 0.69), 0.03 * (raw / 0.69)); b.rotation.set(Math.PI / 2, 0, 0); b.setEnabled(false); this.book = b; }
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
  /** Procedural layer on top of the authored clip: reading, writing and typing look different; eyes blink and glance. */
  layer(dt: number) {
    this.t += dt;
    if (!this.v2) {
      this.head?.scaling.setAll(HEAD_SCALE);
      if (!this.armR || !this.armL || this.currentName !== 'sit' || !this.activity) return;
      const t = this.t;
      const a = this.activity === 'write' ? { r: -1.15 + Math.sin(t * 9) * 0.07, l: -0.75 } : this.activity === 'computer' ? { r: -1.2 + Math.sin(t * 13) * 0.06, l: -1.2 + Math.cos(t * 11) * 0.06 } : { r: -1.0 + Math.sin(t * 0.7) * 0.03, l: -1.0 + Math.sin(t * 0.7) * 0.03 };
      this.armR.rotationQuaternion = Quaternion.FromEulerAngles(a.r, 0, 0); this.armL.rotationQuaternion = Quaternion.FromEulerAngles(a.l, 0, 0);
      return;
    }
    const t = this.t, sit = this.currentName === 'sit', act = sit ? this.activity : null;
    // --- seated work poses ---
    if (act === 'read') {
      this.pageT -= dt; if (this.pageT <= 0) { this.page = 0.55; this.pageT = 6 + Math.random() * 7; }
      this.page = Math.max(0, this.page - dt);
      const flick = Math.sin(Math.min(1, (0.55 - this.page) / 0.55) * Math.PI) * (this.page > 0 ? 1 : 0);
      addRot(this.foreL, AXIS_X, -0.5 + Math.sin(t * 0.8) * 0.015); addRot(this.foreR, AXIS_X, -0.5 - flick * 0.25 + Math.sin(t * 0.8 + 1) * 0.015);
      addRot(this.armR, AXIS_Z, flick * 0.08); addRot(this.head, AXIS_X, 0.14 + Math.sin(t * 0.6) * 0.012 - flick * 0.06); addRot(this.torso, AXIS_X, -0.05);
      // eyes sweep along the lines of text
      this.face?.look(-0.5 + ((t * 0.55) % 1) * 1.0, -0.6);
    } else if (act === 'write') {
      addRot(this.foreR, AXIS_X, -0.1 + Math.sin(t * 9) * 0.05); addRot(this.armR, AXIS_Z, Math.sin(t * 4.5) * 0.045); addRot(this.foreL, AXIS_X, -0.1);
      addRot(this.head, AXIS_X, 0.2 + Math.sin(t * 0.9) * 0.02); addRot(this.head, AXIS_Y, Math.sin(t * 1.3) * 0.05); addRot(this.torso, AXIS_X, -0.09);
      this.face?.look(0.15 + Math.sin(t * 4.5) * 0.12, -0.7);
    } else if (act === 'computer') {
      addRot(this.foreR, AXIS_X, -0.1 + Math.sin(t * 13) * 0.045); addRot(this.foreL, AXIS_X, -0.1 + Math.cos(t * 11) * 0.045);
      addRot(this.head, AXIS_X, -0.02 + Math.sin(t * 0.4) * 0.015); addRot(this.torso, AXIS_X, 0.02);
      this.face?.look(Math.sin(t * 1.1) * 0.3, 0.1);
    } else if (!this.moving) {
      this.nextGlance -= dt; if (this.nextGlance <= 0) { this.glance = (Math.random() - 0.5) * 1.6; this.nextGlance = 1.8 + Math.random() * 4; }
      addRot(this.head, AXIS_Z, this.glance * 0.08); this.face?.look(this.glance, this.glance * 0.1);
    } else this.face?.look(0, 0);
    // --- expression: explicit mood wins, else derived from what the character is doing ---
    this.face?.set(this.mood ?? (act ? 'focus' : 'neutral'));
    this.face?.update(dt);
  }
  dispose() { for (const g of this.entries.animationGroups) g.dispose(); for (const sk of this.entries.skeletons) sk.dispose(); this.root.dispose(false, false); }
}
