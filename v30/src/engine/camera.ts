import { Camera, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { HALL } from '../config/layout';

/** A stable exponential camera interpolation factor at any render frame rate. */
export function cameraDampingFactor(dt: number, response = 9): number {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(response) || response <= 0) return 0;
  return 1 - Math.exp(-response * Math.min(dt, 0.25));
}

/** Normalize a mouse wheel notch and the much smaller trackpad deltas. */
export function wheelZoomSteps(deltaY: number, deltaMode = 0, viewportHeight = 800): number {
  if (!Number.isFinite(deltaY)) return 0;
  const multiplier = deltaMode === 1 ? 40 : deltaMode === 2 ? Math.max(1, viewportHeight) : 1;
  return Math.max(-1.2, Math.min(1.2, -deltaY * multiplier / 100));
}

/**
 * Fixed-rotation orthographic "isometric" camera. The player may pan and zoom only;
 * rotation is locked by construction (there is no input that changes the view direction).
 */
export class IsoCamera {
  readonly camera: FreeCamera;
  private target = new Vector3(0, 0, 0); private goal = new Vector3(0, 0, 0);
  // Reuse vector storage each frame instead of allocating during camera easing.
  private readonly travel = new Vector3();
  private zoom = 10.5; private zoomGoal = 10.5;
  static readonly MIN_ZOOM = 3.2; static readonly MAX_ZOOM = 14.5; static readonly HOME_ZOOM = 11.6;
  // View direction: from the south-east corner toward the north-west back walls, 36° above the floor.
  private static readonly DIR = new Vector3(1, 0.98, -1).normalize();
  private static readonly OFFSET = IsoCamera.DIR.scale(60);
  private right = new Vector3(1, 0, 1).normalize(); private fwd = new Vector3(-1, 0, 1).normalize();
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number } = HALL;

  constructor(private scene: Scene) {
    this.camera = new FreeCamera('iso', Vector3.Zero(), scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA; this.camera.minZ = 0.5; this.camera.maxZ = 160;
    this.camera.inputs.clear(); // no built-in controls: rotation can never be introduced by accident
    this.reset(true);
  }
  reset(immediate = false) { this.goal.set(0.6, 0, 0.9); this.zoomGoal = IsoCamera.HOME_ZOOM; if (immediate) { this.target.copyFrom(this.goal); this.zoom = this.zoomGoal; this.apply(); } }
  zoomBy(steps: number) { this.zoomGoal = Math.min(IsoCamera.MAX_ZOOM, Math.max(IsoCamera.MIN_ZOOM, this.zoomGoal * Math.pow(0.86, steps))); }
  /** Constrain panning to the currently previewed hall, leaving the old default unchanged. */
  setBounds(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }) {
    this.bounds = { ...bounds };
    this.panWorld(0, 0);
  }
  /** Pan by screen pixels. */
  panPixels(dx: number, dy: number) {
    const h = this.scene.getEngine().getRenderHeight() / this.scene.getEngine().getHardwareScalingLevel() || 1;
    const unitsPerPx = (2 * this.zoom) / (h * this.scene.getEngine().getHardwareScalingLevel());
    this.panWorld(-dx * unitsPerPx, dy * unitsPerPx / Math.sin(Math.asin(IsoCamera.DIR.y)));
  }
  panWorld(rightUnits: number, fwdUnits: number) {
    this.goal.x += this.right.x * rightUnits + this.fwd.x * fwdUnits;
    this.goal.z += this.right.z * rightUnits + this.fwd.z * fwdUnits;
    this.goal.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.goal.x));
    this.goal.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.goal.z));
  }
  focus(x: number, z: number, zoom?: number) { this.goal.set(x, 0, z); this.panWorld(0, 0); if (zoom) this.zoomGoal = zoom; }
  /** Used by QA/photo hooks: jump without easing. */
  jump(x: number, z: number, zoom: number) { this.goal.set(x, 0, z); this.zoomGoal = zoom; this.target.copyFrom(this.goal); this.zoom = zoom; this.apply(); }
  update(dt: number) {
    // Framerate-independent movement: the camera travels the same distance
    // in one second at 30, 60, or 120 FPS, without an abrupt final snap.
    const k = cameraDampingFactor(dt);
    this.goal.subtractToRef(this.target, this.travel);
    this.target.addInPlace(this.travel.scaleInPlace(k));
    this.zoom += (this.zoomGoal - this.zoom) * k;
    this.apply();
  }
  private apply() {
    const e = this.scene.getEngine(), aspect = e.getRenderWidth() / Math.max(1, e.getRenderHeight());
    this.camera.orthoTop = this.zoom; this.camera.orthoBottom = -this.zoom; this.camera.orthoLeft = -this.zoom * aspect; this.camera.orthoRight = this.zoom * aspect;
    this.camera.position.copyFrom(this.target).addInPlace(IsoCamera.OFFSET);
    this.camera.setTarget(this.target);
  }
  get state() { return { x: this.target.x, z: this.target.z, zoom: this.zoom }; }
}
