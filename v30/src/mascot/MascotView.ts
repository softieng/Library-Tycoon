import { AnimationGroup, Mesh, MeshBuilder, Quaternion, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { AssetLibrary } from '../assets/library';
import { MASCOT_CLIPS } from '../assets/manifest';
import type { Mascot, MascotState } from '../gameplay/types';
import { angDiff } from '../navigation/movement';

const LOOPING: MascotState[] = ['idle', 'walk', 'turn', 'guide', 'search', 'read'];
/** Renders the rigged mascot GLB and cross-fades between its twelve authored clips. */
export class MascotView {
  readonly root: TransformNode; readonly pick: Mesh; meshes: Mesh[] = [];
  private clips = new Map<string, AnimationGroup>();
  private weights = new Map<string, number>();
  current: MascotState = 'idle';
  readonly missingClips: string[];
  // --- procedural locomotion/expression layer (additive, runs after the authored clip is evaluated) ---
  private legs: { node: TransformNode; side: 1 | -1; parity: 0 | 1; seg: 'upper' | 'lower' }[] = [];
  private parts: Record<string, TransformNode | undefined> = {};
  private phase = 0; private gaitAmt = 0; private lookYaw = 0; private lookPitch = 0; private t = 0; private lastX = 0; private lastZ = 0; private speedEst = 0;
  /** World position of whatever the mascot should glance at (nearest student), or null. */
  lookTarget: { x: number; z: number } | null = null;

  constructor(scene: Scene, lib: AssetLibrary) {
    this.root = new TransformNode('mascot', scene);
    const e = lib.instantiateMascot();
    for (const r of e.rootNodes) { r.parent = this.root; this.meshes.push(...(r.getChildMeshes(false) as Mesh[])); }
    for (const g of e.animationGroups) { this.clips.set(g.name, g); g.start(true, 1); g.setWeightForAllAnimatables(0); this.weights.set(g.name, 0); g.loopAnimation = LOOPING.includes(g.name as MascotState); }
    this.missingClips = MASCOT_CLIPS.filter((c) => !this.clips.has(c));
    this.pick = MeshBuilder.CreateCylinder('pick_mascot', { diameter: 1.15, height: 1.0 }, scene);
    this.pick.parent = this.root; this.pick.position.y = 0.5; this.pick.isVisible = false; this.pick.isPickable = true; this.pick.metadata = { pick: { kind: 'mascot', id: 'mascot' } };
    this.root.scaling.setAll(1.25);
    const nodes = this.root.getChildTransformNodes(false), by = (n: string) => nodes.find((x) => x.name === n);
    for (let i = 1; i <= 4; i++) for (const sd of ['L', 'R'] as const) for (const seg of ['upper', 'lower'] as const) {
      const node = by(`leg${i}_${seg}.${sd}`); if (node) this.legs.push({ node, side: sd === 'L' ? 1 : -1, parity: ((i + (sd === 'L' ? 0 : 1)) % 2) as 0 | 1, seg });
    }
    for (const n of ['head', 'abdomen', 'tassel', 'pendant', 'palp_upper.L', 'palp_upper.R']) this.parts[n] = by(n);
    this.lastX = this.root.position.x; this.lastZ = this.root.position.z;
  }
  /** Premultiply a rotation expressed in the parent (body) frame, on top of the authored pose. */
  private add(node: TransformNode | undefined, axis: Vector3, angle: number) {
    if (!node || !node.rotationQuaternion || Math.abs(angle) < 1e-4) return;
    node.rotationQuaternion = Quaternion.RotationAxis(axis, angle).multiply(node.rotationQuaternion);
  }
  /**
   * Alternating-tetrapod eight-leg gait (legs 1L,2R,3L,4R swing against 1R,2L,3R,4L), a lifted foot on the
   * swing phase, body bob, head glance toward students, breathing, tassel/pendant inertia and palp fidgets.
   * Never touches meshes or materials, so the protected anatomy and branding are unchanged.
   */
  layer(dt: number, m: Mascot) {
    this.t += dt;
    const p = this.root.position, sp = Math.hypot(p.x - this.lastX, p.z - this.lastZ) / Math.max(dt, 1e-3);
    this.lastX = p.x; this.lastZ = p.z; this.speedEst += (Math.min(sp, 2.2) - this.speedEst) * Math.min(1, dt * 8);
    const walking = m.anim === 'walk' ? 1 : 0;
    this.gaitAmt += (walking - this.gaitAmt) * Math.min(1, dt * 7);
    this.phase += dt * (3.2 + this.speedEst * 3.4);
    const Y = Vector3.Up(), Z = new Vector3(0, 0, 1), X = new Vector3(1, 0, 0);
    const g = this.gaitAmt;
    if (g > 0.01) for (const l of this.legs) {
      const ph = this.phase + (l.parity ? Math.PI : 0), idx = l.node.name.match(/leg(\d)/)?.[1] ?? '1', wave = (Number(idx) - 1) * 0.35;
      if (l.seg === 'upper') {
        this.add(l.node, Y, Math.sin(ph + wave) * 0.42 * g * l.side);   // fore/aft stride
        this.add(l.node, Z, Math.max(0, Math.cos(ph + wave)) * 0.34 * g * l.side); // foot lift on swing
      } else this.add(l.node, X, Math.max(0, Math.cos(ph + wave)) * 0.3 * g); // knee tuck
    }
    // low idle shuffle so the legs are never frozen while standing
    const idleAmt = (1 - g) * 0.05; if (idleAmt > 0.001) for (const l of this.legs) if (l.seg === 'upper') this.add(l.node, Z, Math.sin(this.t * 1.3 + l.node.position.z * 9 + l.side) * idleAmt * l.side);
    // body: bob with the gait, breathe at rest
    const body = this.root.getChildTransformNodes(false).find((n) => n.name === 'body');
    if (body) { body.position.y += Math.abs(Math.sin(this.phase)) * 0.022 * g + Math.sin(this.t * 2.1) * 0.004; }
    // head glance: only when standing and free (one-shot gestures keep their authored head)
    let ty = 0, tp = 0;
    if (this.lookTarget && g < 0.3) {
      const dx = this.lookTarget.x - p.x, dz = this.lookTarget.z - p.z, d = Math.hypot(dx, dz);
      if (d < 4.2) { let a = Math.atan2(dx, dz) - this.root.rotation.y; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; ty = Math.max(-0.7, Math.min(0.7, a)); tp = -0.1; }
    } else if (g < 0.3) ty = Math.sin(this.t * 0.45) * 0.12; // idle look-around
    const kk = Math.min(1, dt * 4); this.lookYaw += (ty - this.lookYaw) * kk; this.lookPitch += (tp - this.lookPitch) * kk;
    this.add(this.parts['head'], Y, this.lookYaw); this.add(this.parts['head'], X, this.lookPitch);
    // tassel + pendant swing against acceleration, palps fidget
    this.add(this.parts['tassel'], Z, Math.sin(this.t * 2.6) * 0.1 + Math.sin(this.phase) * 0.18 * g);
    this.add(this.parts['pendant'], Z, Math.sin(this.phase * 0.5) * 0.08 * g);
    const f = (m.anim === 'idle' ? 1 : 0.35) * 0.06; this.add(this.parts['palp_upper.L'], Z, Math.sin(this.t * 1.7) * f); this.add(this.parts['palp_upper.R'], Z, Math.sin(this.t * 1.5 + 1) * -f);
  }
  update(m: Mascot, dt: number) {
    const p = this.root.position, k = Math.min(1, dt * 11);
    p.x += (m.x - p.x) * k; p.z += (m.z - p.z) * k;
    this.root.rotation.y += angDiff(this.root.rotation.y, m.yaw) * Math.min(1, dt * 9);
    if (m.anim !== this.current) {
      this.current = m.anim;
      const g = this.clips.get(m.anim);
      if (g && !LOOPING.includes(m.anim)) { g.stop(); g.start(false, 1); g.setWeightForAllAnimatables(this.weights.get(m.anim) ?? 0); } // one-shots restart from frame 0
      else if (g && !g.isPlaying) g.start(true, 1);
    }
    for (const [name, g] of this.clips) { // cross-fade
      const target = name === this.current ? 1 : 0, w = this.weights.get(name)!;
      const nw = w + Math.sign(target - w) * Math.min(Math.abs(target - w), dt * 6);
      if (nw !== w) { this.weights.set(name, nw); g.setWeightForAllAnimatables(nw); }
      if (name === 'walk') g.speedRatio = 1.25;
    }
  }
}
