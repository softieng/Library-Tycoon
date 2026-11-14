import { Color3, DynamicTexture, Mesh, MeshBuilder, PBRMaterial, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';

export type Expression = 'neutral' | 'focus' | 'happy' | 'surprised' | 'unhappy' | 'sleepy';
/** Head ellipsoid in head-bone space (glTF axes, +z = front). Mirrors HEAD_C/HEAD_R in tools/blender/build_characters.py. */
const HC = { y: 0.12, z: 0.005 }, HR = { x: 0.112, y: 0.135, z: 0.12 };
const front = (x: number, y: number) => HC.z + HR.z * Math.sqrt(Math.max(0.05, 1 - (x / HR.x) ** 2 - ((y - HC.y) / HR.y) ** 2));

const MOUTH: Record<Expression, (g: CanvasRenderingContext2D) => void> = {
  neutral: (g) => { g.beginPath(); g.moveTo(34, 38); g.quadraticCurveTo(64, 44, 94, 38); g.stroke(); },
  focus: (g) => { g.beginPath(); g.moveTo(44, 40); g.lineTo(84, 40); g.stroke(); },
  happy: (g) => { g.beginPath(); g.moveTo(26, 30); g.quadraticCurveTo(64, 72, 102, 30); g.stroke(); g.fillStyle = '#7a2230'; g.beginPath(); g.moveTo(34, 33); g.quadraticCurveTo(64, 62, 94, 33); g.closePath(); g.fill(); },
  surprised: (g) => { g.fillStyle = '#5a1822'; g.beginPath(); g.ellipse(64, 44, 14, 18, 0, 0, Math.PI * 2); g.fill(); },
  unhappy: (g) => { g.beginPath(); g.moveTo(32, 52); g.quadraticCurveTo(64, 30, 96, 52); g.stroke(); },
  sleepy: (g) => { g.beginPath(); g.ellipse(64, 42, 9, 7, 0, 0, Math.PI * 2); g.stroke(); },
};
// brow tilt (radians, inner end up = +) and lift above the eyes
const BROW: Record<Expression, { tilt: number; lift: number }> = {
  neutral: { tilt: 0, lift: 0 }, focus: { tilt: -0.14, lift: -0.003 }, happy: { tilt: 0.05, lift: 0.006 },
  surprised: { tilt: 0, lift: 0.014 }, unhappy: { tilt: 0.34, lift: 0.002 }, sleepy: { tilt: 0.12, lift: -0.004 },
};
const EYE_OPEN: Record<Expression, number> = { neutral: 1, focus: 0.82, happy: 0.75, surprised: 1.25, unhappy: 0.9, sleepy: 0.35 };

/** Shared per-expression mouth textures (one per scene). */
const texCache = new WeakMap<Scene, Map<Expression, DynamicTexture>>();
function mouthTex(scene: Scene, e: Expression) {
  let m = texCache.get(scene); if (!m) texCache.set(scene, (m = new Map()));
  let t = m.get(e);
  if (!t) {
    t = new DynamicTexture(`mouth_${e}`, { width: 128, height: 64 }, scene, true); t.hasAlpha = true;
    const g = t.getContext() as unknown as CanvasRenderingContext2D; g.clearRect(0, 0, 128, 64); g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#6b2a2a'; MOUTH[e](g); t.update();
    m.set(e, t);
  }
  return t;
}

/** Eyes that blink and glance, brows and a mouth that change with the character's mood. Parented to the head bone. */
export class Face {
  private eyes: Mesh[] = []; private irises: Mesh[] = []; private brows: Mesh[] = []; private mouth: Mesh; private mouthMat: StandardMaterial;
  private expr: Expression = 'neutral'; private blink = 0; private nextBlink = 1 + Math.random() * 3; private t = Math.random() * 20;
  private lookX = 0; private lookY = 0; private openK = 1;
  constructor(scene: Scene, head: TransformNode, hairColor: Color3, shared: { white: PBRMaterial; dark: PBRMaterial }, id: string) {
    const browMat = shared.dark;
    for (const s of [1, -1]) {
      const ex = s * 0.044, ey = HC.y - 0.006;
      const eye = MeshBuilder.CreateSphere(`${id}_eye`, { diameter: 1, segments: 8 }, scene); eye.scaling.set(0.042, 0.046, 0.022); eye.parent = head; eye.position.set(ex, ey, front(ex, ey) - 0.002); eye.material = shared.white;
      const iris = MeshBuilder.CreateSphere(`${id}_iris`, { diameter: 1, segments: 8 }, scene); iris.scaling.set(0.022, 0.027, 0.012); iris.parent = eye; iris.scaling.set(0.62, 0.7, 0.6); iris.position.set(0, 0, 0.42); iris.material = shared.dark;
      const brow = MeshBuilder.CreateBox(`${id}_brow`, { width: 0.04, height: 0.0075, depth: 0.007 }, scene); brow.parent = head; brow.material = browMat; brow.metadata = { s };
      for (const m of [eye, iris, brow]) { m.isPickable = false; m.metadata = { ...(m.metadata ?? {}), face: true }; }
      this.eyes.push(eye); this.irises.push(iris); this.brows.push(brow);
    }
    this.mouthMat = new StandardMaterial(`${id}_mouthmat`, scene); this.mouthMat.disableLighting = true; this.mouthMat.emissiveColor = Color3.Black(); this.mouthMat.specularColor = Color3.Black(); this.mouthMat.backFaceCulling = false;
    this.mouth = MeshBuilder.CreatePlane(`${id}_mouth`, { width: 0.078, height: 0.04 }, scene); this.mouth.parent = head; this.mouth.isPickable = false;
    const my = HC.y - 0.06; this.mouth.position.set(0, my, front(0.0, my) + 0.0035); this.mouth.rotation.x = 0.12; this.mouth.material = this.mouthMat;
    this.mouth.rotation.y = Math.PI; // plane faces -z by default; flip it to face the front (+z)
    this.apply();
  }
  get meshes(): Mesh[] { return [...this.eyes, ...this.irises, ...this.brows, this.mouth]; }
  set(e: Expression) { if (e !== this.expr) { this.expr = e; this.apply(); } }
  /** Look direction in -1..1 (x: toward the character's left, y: up). */
  look(x: number, y: number) { this.lookX = x; this.lookY = y; }
  private apply() {
    const mt = mouthTex(this.mouth.getScene(), this.expr); this.mouthMat.emissiveTexture = mt; this.mouthMat.opacityTexture = mt;
    const b = BROW[this.expr];
    this.brows.forEach((br, i) => { const s = br.metadata.s as number, ex = s * 0.046, by = HC.y + 0.034 + b.lift; br.position.set(ex, by, front(ex, by) + 0.002); br.rotation.set(-0.25, 0, s * b.tilt * -1 * -1); br.rotation.z = -s * b.tilt; });
    this.openK = EYE_OPEN[this.expr];
  }
  update(dt: number) {
    this.t += dt; this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 0.16; this.nextBlink = 2 + Math.random() * 4.5; }
    if (this.blink > 0) this.blink -= dt;
    const k = this.expr === 'sleepy' ? 1 : this.blink > 0 ? 0.08 : 1;
    this.eyes.forEach((e) => { e.scaling.y += (0.046 * this.openK * k - e.scaling.y) * Math.min(1, dt * 30); });
    this.irises.forEach((i) => { i.position.x += (this.lookX * 0.22 - i.position.x) * Math.min(1, dt * 8); i.position.y += (this.lookY * 0.2 - i.position.y) * Math.min(1, dt * 8); });
  }
}
