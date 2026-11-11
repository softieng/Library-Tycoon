import { Camera, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import { HALL } from '../config/layout';

/**
 * Fixed-rotation orthographic "isometric" camera. The player may pan and zoom only;
 * rotation is locked by construction (there is no input that changes the view direction).
 */
export class IsoCamera {
  readonly camera: FreeCamera;
  private target = new Vector3(0, 0, 0); private goal = new Vector3(0, 0, 0);
  private zoom = 10.5; private zoomGoal = 10.5;
  static readonly MIN_ZOOM = 3.2; static readonly MAX_ZOOM = 14.5; static readonly HOME_ZOOM = 11.6;
  // View direction: from the south-east corner toward the north-west back walls, 36° above the floor.
  private static readonly DIR = new Vector3(1, 0.98, -1).normalize();
  private right = new Vector3(1, 0, 1).normalize(); private fwd = new Vector3(-1, 0, 1).normalize();

  constructor(private scene: Scene) {
    this.camera = new FreeCamera('iso', Vector3.Zero(), scene);
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA; this.camera.minZ = 0.5; this.camera.maxZ = 160;
    this.camera.inputs.clear(); // no built-in controls: rotation can never be introduced by accident
    this.reset(true);
  }
  reset(immediate = false) { this.goal.set(0.6, 0, 0.9); this.zoomGoal = IsoCamera.HOME_ZOOM; if (immediate) { this.target.copyFrom(this.goal); this.zoom = this.zoomGoal; this.apply(); } }
  zoomBy(steps: number) { this.zoomGoal = Math.min(IsoCamera.MAX_ZOOM, Math.max(IsoCamera.MIN_ZOOM, this.zoomGoal * Math.pow(0.86, steps))); }
  /** Pan by screen pixels. */
  panPixels(dx: number, dy: number) {
    const h = this.scene.getEngine().getRenderHeight() / this.scene.getEngine().getHardwareScalingLevel() || 1;
    const unitsPerPx = (2 * this.zoom) / (h * this.scene.getEngine().getHardwareScalingLevel());
    this.panWorld(-dx * unitsPerPx, dy * unitsPerPx / Math.sin(Math.asin(IsoCamera.DIR.y)));
  }
  panWorld(rightUnits: number, fwdUnits: number) {
    this.goal.addInPlace(this.right.scale(rightUnits)).addInPlace(this.fwd.scale(fwdUnits));
    this.goal.x = Math.min(HALL.maxX, Math.max(HALL.minX, this.goal.x)); this.goal.z = Math.min(HALL.maxZ, Math.max(HALL.minZ, this.goal.z));
  }
  focus(x: number, z: number, zoom?: number) { this.goal.set(x, 0, z); this.panWorld(0, 0); if (zoom) this.zoomGoal = zoom; }
  /** Used by QA/photo hooks: jump without easing. */
  jump(x: number, z: number, zoom: number) { this.goal.set(x, 0, z); this.zoomGoal = zoom; this.target.copyFrom(this.goal); this.zoom = zoom; this.apply(); }
  update(dt: number) {
    const k = Math.min(1, dt * 9);
    this.target.addInPlace(this.goal.subtract(this.target).scale(k)); this.zoom += (this.zoomGoal - this.zoom) * k;
    this.apply();
  }
  private apply() {
    const e = this.scene.getEngine(), aspect = e.getRenderWidth() / Math.max(1, e.getRenderHeight());
    this.camera.orthoTop = this.zoom; this.camera.orthoBottom = -this.zoom; this.camera.orthoLeft = -this.zoom * aspect; this.camera.orthoRight = this.zoom * aspect;
    this.camera.position.copyFrom(this.target.add(IsoCamera.DIR.scale(60)));
    this.camera.setTarget(this.target);
  }
  get state() { return { x: this.target.x, z: this.target.z, zoom: this.zoom }; }
}
