import { AnimationGroup, Mesh, MeshBuilder, Scene, TransformNode } from '@babylonjs/core';
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

  constructor(scene: Scene, lib: AssetLibrary) {
    this.root = new TransformNode('mascot', scene);
    const e = lib.instantiateMascot();
    for (const r of e.rootNodes) { r.parent = this.root; this.meshes.push(...(r.getChildMeshes(false) as Mesh[])); }
    for (const g of e.animationGroups) { this.clips.set(g.name, g); g.start(true, 1); g.setWeightForAllAnimatables(0); this.weights.set(g.name, 0); g.loopAnimation = LOOPING.includes(g.name as MascotState); }
    this.missingClips = MASCOT_CLIPS.filter((c) => !this.clips.has(c));
    this.pick = MeshBuilder.CreateCylinder('pick_mascot', { diameter: 1.15, height: 1.0 }, scene);
    this.pick.parent = this.root; this.pick.position.y = 0.5; this.pick.isVisible = false; this.pick.isPickable = true; this.pick.metadata = { pick: { kind: 'mascot', id: 'mascot' } };
    this.root.scaling.setAll(1.25);
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
