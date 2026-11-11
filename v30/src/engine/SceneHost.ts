import {
  Color3, Color4, DefaultRenderingPipeline, DirectionalLight, Engine, GlowLayer, HemisphericLight, ImageProcessingConfiguration, Matrix, Mesh, MeshBuilder,
  PBRMaterial, PointLight, Scene, SceneInstrumentation, ShadowGenerator, SSAO2RenderingPipeline, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import type { GameController, Quality, WorldApi } from '../app/controller';
import { AssetLibrary } from '../assets/library';
import { STAFF_MODEL } from '../assets/manifest';
import { CharacterView, clipForStaff, clipForVisitor } from '../characters/CharacterView';
import { PROPS, PROP_BY_ID, QUEUES, SHELVES, zoneAt } from '../config/layout';
import type { EmoteKind, GameState } from '../gameplay/types';
import { MascotView } from '../mascot/MascotView';
import { buildHall, type HallBuild } from '../world/hall';
import { IconFactory, type IconKind } from '../world/markers';
import { IsoCamera } from './camera';
import { createEnvironment } from './environment';

interface Agent { view: CharacterView; icon: Mesh; iconKind: string; seen: number }
export interface PickInfo { kind: string; id: string | number }

/**
 * Owns the Babylon.js engine, scene and render loop. Created exactly once per page;
 * React only hands it a canvas and the controller. All per-frame work reads the simulation
 * state directly — no React re-render ever touches the scene.
 */
export class SceneHost {
  engine!: Engine; scene!: Scene; cam!: IsoCamera; lib!: AssetLibrary; hall!: HallBuild;
  mascot!: MascotView;
  private sun!: DirectionalLight; private shadow: ShadowGenerator | null = null;
  private pipeline: DefaultRenderingPipeline | null = null; private ssao: SSAO2RenderingPipeline | null = null; private glow: GlowLayer | null = null;
  private visitors = new Map<number, Agent>(); private staff = new Map<number, Agent>();
  private dirt = new Map<number, TransformNode>(); private misplaced = new Map<number, TransformNode>();
  private shelfIcons = new Map<string, Mesh>(); private deviceIcons = new Map<string, Mesh>();
  private icons!: IconFactory; private giftIcon!: Mesh; private cartIcon!: Mesh;
  private ring!: Mesh; private bars = new Map<string, { root: TransformNode; fill: Mesh }>();
  private keys = new Set<string>(); private frame = 0; private disposed = false;
  private instr!: SceneInstrumentation; private cleanup: (() => void)[] = [];
  private brokenMat!: PBRMaterial; private okScreen!: PBRMaterial;
  quality: Quality = 'high'; private api: WorldApi | null = null;
  onUiRequest: (req: { type: 'dewey' }) => void = () => {};

  static async create(canvas: HTMLCanvasElement, controller: GameController, onProgress: (done: number, total: number) => void): Promise<SceneHost> {
    const host = new SceneHost(canvas, controller);
    await host.init(onProgress);
    return host;
  }
  private constructor(private canvas: HTMLCanvasElement, private controller: GameController) {}

  private async init(onProgress: (done: number, total: number) => void) {
    const engine = this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance', antialias: true }, true);
    const scene = this.scene = new Scene(engine);
    scene.clearColor = new Color4(0.075, 0.105, 0.19, 1);
    scene.skipPointerMovePicking = true; scene.autoClear = true;
    scene.imageProcessingConfiguration.toneMappingEnabled = true; scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure = 1.18; scene.imageProcessingConfiguration.contrast = 1.12;
    createEnvironment(scene);
    this.cam = new IsoCamera(scene);
    this.instr = new SceneInstrumentation(scene); this.instr.captureFrameTime = true;

    // Warm architectural lighting: soft ambient + a low sun through the west windows + lamp pools.
    const hemi = new HemisphericLight('ambient', new Vector3(0.2, 1, -0.1), scene);
    hemi.intensity = 0.62; hemi.diffuse = new Color3(1, 0.95, 0.86); hemi.groundColor = new Color3(0.42, 0.36, 0.32);
    this.sun = new DirectionalLight('sun', new Vector3(0.62, -1, 0.3).normalize(), scene);
    this.sun.position = new Vector3(-22, 34, -12); this.sun.intensity = 2.5; this.sun.diffuse = new Color3(1, 0.92, 0.78);
    this.sun.shadowMinZ = 5; this.sun.shadowMaxZ = 90; this.sun.autoUpdateExtends = true;
    for (const [x, z, i] of [[0.5, 2.6, 0.7], [3.5, -5.8, 0.6], [8.5, 7.2, 0.5], [-9.5, -4.4, 0.5]] as const) {
      const p = new PointLight('lamp', new Vector3(x, 2.4, z), scene); p.diffuse = new Color3(1, 0.82, 0.55); p.intensity = i * 14; p.range = 9; p.specular = Color3.Black();
    }

    this.lib = new AssetLibrary(scene);
    await this.lib.load(onProgress);
    await document.fonts?.ready;
    try { await Promise.all([document.fonts.load("700 32px Cairo", 'قاعة'), document.fonts.load("600 32px Cairo", 'A')]); } catch { /* font fallback is fine */ }
    this.hall = buildHall(scene, this.lib);
    this.icons = new IconFactory(scene);
    this.mascot = new MascotView(scene, this.lib);
    this.mascot.root.position.set(controller_x(this.controller.state), 0, this.controller.state.mascot.z); this.mascot.root.rotation.y = this.controller.state.mascot.yaw;
    this.giftIcon = this.icons.create('gift', this.mascot.root, 0.5); this.giftIcon.material = this.icons.material('gift'); this.giftIcon.position.y = 1.25;
    const cart = this.hall.propNodes.get('cart')!; this.cartIcon = this.icons.create('cart_icon', cart, 0.7); this.cartIcon.material = this.icons.material('target'); this.cartIcon.position.y = 1.9;
    this.ring = MeshBuilder.CreateTorus('selection', { diameter: 1.2, thickness: 0.07, tessellation: 40 }, scene);
    const rm = new StandardMaterial('sel', scene); rm.emissiveColor = new Color3(1, 0.8, 0.3); rm.disableLighting = true; this.ring.material = rm; this.ring.isPickable = false; this.ring.setEnabled(false);
    this.okScreen = this.lib.palette.get('screen')!;
    this.brokenMat = this.okScreen.clone('screen_broken'); this.brokenMat.albedoColor = new Color3(0.2, 0.02, 0.02); this.brokenMat.emissiveColor = new Color3(1.4, 0.08, 0.05);
    for (const q of ['borrow', 'print', 'research'] as const) this.bars.set(q, this.makeBar(q));

    // static world never moves: freeze it
    for (const m of this.hall.root.getChildMeshes()) { if (!m.metadata?.pick) m.freezeWorldMatrix(); m.doNotSyncBoundingInfo = true; }
    this.applyLayout();
    this.setQuality(this.controller.settings.quality);
    this.setRenderScale(this.controller.settings.renderScale);
    this.bindInput();
    this.cleanup.push(this.controller.onSimEvent((e) => { if (e.type === 'layout') this.applyLayout(); }));
    const ro = new ResizeObserver(() => engine.resize()); ro.observe(this.canvas); this.cleanup.push(() => ro.disconnect());

    const api: WorldApi = {
      zoom: (d) => this.cam.zoomBy(d), resetCamera: () => this.cam.reset(), focus: (x, z) => this.cam.focus(x, z),
      setQuality: (q) => this.setQuality(q), setRenderScale: (s) => this.setRenderScale(s),
      stats: () => ({ fps: engine.getFps(), drawCalls: this.instr.drawCallsCounter.current, activeMeshes: scene.getActiveMeshes().length, triangles: scene.getActiveIndices() / 3 }),
      project: (x, y, z) => this.project(x, y, z),
    };
    this.controller.world = this.api = api;
    scene.onAfterAnimationsObservable.add(() => { for (const a of this.visitors.values()) a.view.layer(engine.getDeltaTime() / 1000); });
    engine.runRenderLoop(() => {
      if (this.disposed) return;
      const dt = Math.min(0.1, engine.getDeltaTime() / 1000);
      this.controller.tick(dt);
      this.sync(dt);
      this.pan(dt); this.cam.update(dt);
      scene.render(); this.frame++;
    });
    await scene.whenReadyAsync();
  }

  /* ------------------------------------------------------------------ quality presets */
  setQuality(q: Quality) {
    this.quality = q;
    const scene = this.scene;
    this.shadow?.dispose(); this.shadow = null; this.pipeline?.dispose(); this.pipeline = null; this.ssao?.dispose(); this.ssao = null; this.glow?.dispose(); this.glow = null;
    if (q !== 'low') {
      const sg = this.shadow = new ShadowGenerator(q === 'high' ? 4096 : 1536, this.sun);
      sg.usePercentageCloserFiltering = true; sg.filteringQuality = q === 'high' ? ShadowGenerator.QUALITY_HIGH : ShadowGenerator.QUALITY_MEDIUM;
      sg.bias = 0.0012; sg.normalBias = 0.02; sg.darkness = 0.38;
      for (const m of this.hall.shadowCasters) sg.addShadowCaster(m, false);
      for (const m of this.mascot.meshes) sg.addShadowCaster(m, false);
      for (const a of [...this.visitors.values(), ...this.staff.values()]) for (const m of a.view.meshes) sg.addShadowCaster(m, false);
      const p = this.pipeline = new DefaultRenderingPipeline('post', true, scene, [this.cam.camera]);
      p.samples = q === 'high' ? 4 : 1; p.fxaaEnabled = true;
      p.bloomEnabled = true; p.bloomThreshold = 0.82; p.bloomWeight = 0.28; p.bloomKernel = 48; p.bloomScale = 0.5;
      p.sharpenEnabled = q === 'high'; p.sharpen.edgeAmount = 0.18;
      p.imageProcessing.vignetteEnabled = true; p.imageProcessing.vignetteWeight = 1.1; p.imageProcessing.vignetteColor = new Color4(0.05, 0.07, 0.14, 0);
      this.glow = new GlowLayer('glow', scene, { mainTextureRatio: 0.5, blurKernelSize: 32 }); this.glow.intensity = 0.45;
      if (q === 'high' && SSAO2RenderingPipeline.IsSupported) {
        const s = this.ssao = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 }, [this.cam.camera]);
        s.radius = 1.4; s.totalStrength = 0.95; s.base = 0.12; s.samples = 16; s.maxZ = 200; s.minZAspect = 0.5; s.expensiveBlur = true;
      }
    }
    this.sun.intensity = q === 'low' ? 2.0 : 2.5;
  }
  /** 1 = native resolution; lower values render fewer pixels (for weaker GPUs). */
  setRenderScale(s: number) { this.engine.setHardwareScalingLevel(1 / Math.max(0.5, Math.min(1, s)) / Math.min(window.devicePixelRatio || 1, this.quality === 'low' ? 1 : 1.5)); this.engine.resize(); }

  /* ------------------------------------------------------------------ layout (upgrades, device state) */
  private applyLayout() {
    const s = this.controller.state;
    for (const p of PROPS) { const n = this.hall.propNodes.get(p.id); if (n && p.requires) n.setEnabled(s.upgrades.includes(p.requires)); }
    for (const [id, mat] of this.hall.screens) { const broken = s.broken.includes(id as never); mat.albedoColor.copyFrom(broken ? this.brokenMat.albedoColor : this.okScreen.albedoColor); mat.emissiveColor.copyFrom(broken ? this.brokenMat.emissiveColor : this.okScreen.emissiveColor); }
  }

  /* ------------------------------------------------------------------ per-frame sync from the simulation */
  private agent(map: Map<number, Agent>, id: number, model: number, staff: boolean, x: number, z: number, yaw: number): Agent {
    let a = map.get(id);
    if (!a) {
      const view = new CharacterView(this.scene, this.lib, model, staff, staff ? 'staff' : 'visitor', id);
      view.root.position.set(x, 0, z); view.root.rotation.y = yaw;
      const icon = this.icons.create(`emote_${id}`, view.root); icon.position.y = 2.15;
      if (this.shadow) for (const m of view.meshes) this.shadow.addShadowCaster(m, false);
      a = { view, icon, iconKind: '', seen: 0 }; map.set(id, a);
    }
    a.seen = this.frame; return a;
  }
  private setIcon(a: { icon: Mesh; iconKind: string }, kind: EmoteKind | null) {
    const k = kind ?? '';
    if (k === a.iconKind) return;
    a.iconKind = k; a.icon.setEnabled(!!kind); if (kind) a.icon.material = this.icons.material(kind);
  }
  private sweep(map: Map<number, Agent>) {
    for (const [id, a] of map) if (a.seen !== this.frame) { if (this.shadow) for (const m of a.view.meshes) this.shadow.removeShadowCaster(m, false); a.icon.dispose(); a.view.dispose(); map.delete(id); }
  }
  private sync(dt: number) {
    const s = this.controller.state, t = performance.now() / 1000;
    for (const v of s.visitors) {
      const a = this.agent(this.visitors, v.id, v.model, false, v.x, v.z, v.yaw);
      const sitting = v.state === 'sit';
      a.view.follow(v.x, v.z, v.yaw, dt, sitting ? 0.2 : 0);
      a.view.activity = v.activity;
      a.view.play(clipForVisitor(v), v.moving ? v.speed / 1.5 : 1);
      a.view.setCarrying(v.carrying && !sitting);
      this.setIcon(a, v.emote?.kind ?? null);
      a.icon.position.y = 2.15 + Math.sin(t * 3 + v.id) * 0.05;
    }
    this.sweep(this.visitors);
    for (const st of s.staff) {
      const a = this.agent(this.staff, st.id, STAFF_MODEL[st.role] ?? 0, true, st.x, st.z, st.yaw);
      a.view.follow(st.x, st.z, st.yaw, dt);
      a.view.play(clipForStaff(st));
      this.setIcon(a, st.emote?.kind ?? null);
    }
    this.sweep(this.staff);
    this.mascot.update(s.mascot, dt);
    this.giftIcon.setEnabled(this.controller.mascotWait() <= 0); this.giftIcon.position.y = 1.2 + Math.sin(t * 2.4) * 0.05;

    // dirt spots
    for (const d of s.dirt) if (!this.dirt.has(d.id)) {
      const n = this.lib.place('spill', null, { shadows: false }); n.position.set(d.x, 0.03, d.z); n.rotation.y = d.id;
      const pick = MeshBuilder.CreateCylinder(`pick_dirt_${d.id}`, { diameter: 1.0, height: 0.3 }, this.scene); pick.parent = n; pick.isVisible = false; pick.metadata = { pick: { kind: 'dirt', id: d.id } };
      this.dirt.set(d.id, n);
    }
    for (const [id, n] of this.dirt) if (!s.dirt.some((d) => d.id === id)) { n.dispose(false, false); this.dirt.delete(id); }
    // misplaced books (tidy mission)
    for (const b of s.missions.misplaced) if (!this.misplaced.has(b.id)) {
      const n = this.lib.place('book_closed', null); n.position.set(b.x, 0.77, b.z); n.rotation.y = b.id * 1.3; n.scaling.setAll(1.25);
      const icon = this.icons.create(`mis_${b.id}`, n, 0.5); icon.material = this.icons.material('target'); icon.position.y = 0.6; icon.setEnabled(true);
      const pick = MeshBuilder.CreateCylinder(`pick_mis_${b.id}`, { diameter: 0.7, height: 0.9 }, this.scene); pick.parent = n; pick.position.y = 0.3; pick.isVisible = false; pick.metadata = { pick: { kind: 'misplaced', id: b.id } };
      this.misplaced.set(b.id, n);
    }
    for (const [id, n] of this.misplaced) if (!s.missions.misplaced.some((b) => b.id === id)) { n.dispose(false, false); this.misplaced.delete(id); }

    this.syncMissionIcons(s, t);
    // service progress bars
    for (const q of ['borrow', 'print', 'research'] as const) {
      const bar = this.bars.get(q)!, slot = s.service[q];
      bar.root.setEnabled(!!slot);
      if (slot) { const k = Math.min(1, slot.t / slot.dur); bar.fill.scaling.x = Math.max(0.001, k); bar.fill.position.x = -(1 - k) * 0.45; }
    }
    // selection ring
    const sel = this.controller.selection; let pos: { x: number; z: number } | null = null;
    if (sel?.kind === 'visitor') pos = s.visitors.find((v) => v.id === sel.id) ?? null;
    else if (sel?.kind === 'staff') pos = s.staff.find((v) => v.id === sel.id) ?? null;
    else if (sel?.kind === 'mascot') pos = s.mascot;
    else if (sel?.kind === 'shelf') pos = SHELVES.find((x) => x.id === sel.id)?.access ?? null;
    else if (sel?.kind === 'device') pos = PROP_BY_ID[String(sel.id)] ?? null;
    this.ring.setEnabled(!!pos);
    if (pos) { this.ring.position.set(pos.x, 0.06, pos.z); const k = 1 + Math.sin(t * 5) * 0.06; this.ring.scaling.set(k, 1, k); }
  }
  private syncMissionIcons(s: GameState, t: number) {
    const run = s.missions.active;
    const searched = run?.id === 'missing_book' ? String(run.data.searched).split(',').filter(Boolean) : [];
    for (const sh of SHELVES) {
      let icon = this.shelfIcons.get(sh.id); const on = searched.includes(sh.id);
      if (on && !icon) { icon = this.icons.create(`shelf_icon_${sh.id}`, this.hall.propNodes.get(sh.id)!, 0.6); icon.position.set(0, 3.1, 0.3); icon.material = this.icons.material('miss'); this.shelfIcons.set(sh.id, icon); }
      icon?.setEnabled(on);
    }
    for (const id of ['printer', 'pc_1', 'pc_2', 'pc_3', 'pc_4']) {
      let icon = this.deviceIcons.get(id); const on = s.broken.includes(id as never);
      if (on && !icon) { icon = this.icons.create(`dev_icon_${id}`, this.hall.propNodes.get(id)!, 0.7); icon.material = this.icons.material('broken'); this.deviceIcons.set(id, icon); }
      if (icon) { icon.setEnabled(on); icon.position.y = 2.0 + Math.sin(t * 4) * 0.08; }
    }
    this.cartIcon.setEnabled(run?.id === 'dewey_sort'); this.cartIcon.position.y = 1.9 + Math.sin(t * 4) * 0.08;
  }
  private makeBar(q: 'borrow' | 'print' | 'research') {
    const root = new TransformNode(`bar_${q}`, this.scene), sp = QUEUES[q][0]; root.position.set(sp.x, 2.75, sp.z); root.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const mk = (name: string, w: number, h: number, c: Color3, z: number) => { const p = MeshBuilder.CreatePlane(name, { width: w, height: h }, this.scene); const m = new StandardMaterial(name, this.scene); m.emissiveColor = c; m.disableLighting = true; p.material = m; p.parent = root; p.position.z = z; p.isPickable = false; p.renderingGroupId = 2; return p; };
    mk(`bar_bg_${q}`, 1.0, 0.16, new Color3(0.06, 0.1, 0.2), 0);
    const fill = mk(`bar_fill_${q}`, 0.9, 0.09, new Color3(0.95, 0.75, 0.25), -0.01);
    root.setEnabled(false); return { root, fill };
  }

  /* ------------------------------------------------------------------ input: pan / zoom / click (rotation is locked) */
  private bindInput() {
    const c = this.canvas; let down: { x: number; y: number; id: number } | null = null, dragged = false, lastHover = 0;
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragged = false; c.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (down) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!dragged && Math.hypot(dx, dy) > 5) dragged = true;
        if (dragged) { this.panPixels(e.movementX, e.movementY); c.style.cursor = 'grabbing'; }
        return;
      }
      const now = performance.now(); if (now - lastHover < 90) return; lastHover = now;
      const hit = this.pickAt(e.offsetX, e.offsetY); c.style.cursor = hit && hit.kind !== 'floor' ? 'pointer' : 'grab';
    };
    const onUp = (e: PointerEvent) => { if (down && !dragged) this.click(e.offsetX, e.offsetY); down = null; c.style.cursor = 'grab'; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); this.cam.zoomBy(-Math.sign(e.deltaY) * 1.2); };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName; if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.type === 'keydown') {
        this.keys.add(e.code);
        if (e.code === 'Equal' || e.code === 'NumpadAdd') this.cam.zoomBy(1); if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.cam.zoomBy(-1);
        if (e.code === 'Home' || e.code === 'Digit0') this.cam.reset();
      } else this.keys.delete(e.code);
    };
    const blur = () => this.keys.clear();
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp); c.addEventListener('pointercancel', onUp);
    c.addEventListener('wheel', onWheel, { passive: false }); window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', blur);
    c.style.cursor = 'grab'; c.style.touchAction = 'none';
    this.cleanup.push(() => { c.removeEventListener('pointerdown', onDown); c.removeEventListener('pointermove', onMove); c.removeEventListener('pointerup', onUp); c.removeEventListener('pointercancel', onUp); c.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', blur); });
  }
  private panPixels(dx: number, dy: number) {
    const unitsPerPx = (2 * this.cam.state.zoom) / Math.max(1, this.canvas.clientHeight);
    this.cam.panWorld(-dx * unitsPerPx, (dy * unitsPerPx) / 0.57);
  }
  private pan(dt: number) {
    const k = this.keys, sp = this.cam.state.zoom * 1.3 * dt; let r = 0, f = 0;
    if (k.has('ArrowLeft') || k.has('KeyA')) r -= 1; if (k.has('ArrowRight') || k.has('KeyD')) r += 1;
    if (k.has('ArrowUp') || k.has('KeyW')) f += 1; if (k.has('ArrowDown') || k.has('KeyS')) f -= 1;
    if (r || f) this.cam.panWorld(r * sp, f * sp * 1.4);
  }
  pickAt(x: number, y: number): (PickInfo & { px: number; pz: number }) | null {
    const s = this.engine.getHardwareScalingLevel() ? 1 : 1; void s;
    const hit = this.scene.pick(x, y, (m) => m.isEnabled() && !!m.metadata?.pick, false, this.cam.camera);
    if (!hit?.hit || !hit.pickedMesh) return null;
    return { ...(hit.pickedMesh.metadata.pick as PickInfo), px: hit.pickedPoint?.x ?? 0, pz: hit.pickedPoint?.z ?? 0 };
  }
  /** A click in the world. Every interaction goes through the controller as an explicit action. */
  click(x: number, y: number) { const hit = this.pickAt(x, y); if (hit) this.activate(hit, hit.px, hit.pz); else this.controller.select(null); }
  activate(hit: PickInfo, px = 0, pz = 0) {
    const c = this.controller;
    switch (hit.kind) {
      case 'shelf': c.select({ kind: 'shelf', id: hit.id }); c.dispatch({ type: 'clickShelf', id: String(hit.id) }); break;
      case 'visitor': c.select({ kind: 'visitor', id: hit.id }); c.dispatch({ type: 'clickVisitor', id: Number(hit.id) }); break;
      case 'staff': c.select({ kind: 'staff', id: hit.id }); break;
      case 'mascot': c.select({ kind: 'mascot', id: 'mascot' }); c.dispatch({ type: 'mascotReward', now: Date.now() }); break;
      case 'device': c.select({ kind: 'device', id: hit.id }); c.dispatch({ type: 'clickDevice', id: hit.id as never }); break;
      case 'station': c.select({ kind: 'station', id: hit.id }); c.dispatch({ type: 'serve', service: hit.id as never }); break;
      case 'cart': c.select({ kind: 'prop', id: 'cart' }); this.onUiRequest({ type: 'dewey' }); break;
      case 'dirt': c.dispatch({ type: 'cleanDirt', id: Number(hit.id) }); break;
      case 'misplaced': c.dispatch({ type: 'clickMisplaced', id: Number(hit.id) }); break;
      case 'floor': { const z = zoneAt(px, pz); c.select(z ? { kind: 'zone', id: z.id } : null); break; }
    }
  }
  project(x: number, y: number, z: number) {
    const e = this.engine, vp = this.cam.camera.viewport.toGlobal(e.getRenderWidth(), e.getRenderHeight());
    const p = Vector3.Project(new Vector3(x, y, z), Matrix.IdentityReadOnly, this.scene.getTransformMatrix(), vp);
    const k = this.canvas.clientWidth / Math.max(1, e.getRenderWidth());
    return { x: p.x * k, y: p.y * k };
  }
  /** Screen position of a pickable entity — used by browser QA to click real things in the world. */
  locate(kind: string, id: string | number): { x: number; y: number } | null {
    const s = this.controller.state;
    if (kind === 'visitor') { const v = s.visitors.find((x) => x.id === id); return v ? this.project(v.x, 0.9, v.z) : null; }
    if (kind === 'staff') { const v = s.staff.find((x) => x.id === id); return v ? this.project(v.x, 0.9, v.z) : null; }
    if (kind === 'mascot') return this.project(s.mascot.x, 0.5, s.mascot.z);
    if (kind === 'dirt') { const d = s.dirt.find((x) => x.id === id); return d ? this.project(d.x, 0.1, d.z) : null; }
    if (kind === 'misplaced') { const d = s.missions.misplaced.find((x) => x.id === id); return d ? this.project(d.x, 1.0, d.z) : null; }
    const p = PROP_BY_ID[String(id)]; return p ? this.project(p.x, kind === 'shelf' ? 1.4 : 0.8, p.z) : null;
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    if (this.controller.world === this.api) this.controller.world = null;
    for (const f of this.cleanup) f();
    this.engine.stopRenderLoop(); this.scene.dispose(); this.engine.dispose();
  }
}
const controller_x = (s: GameState) => s.mascot.x;
