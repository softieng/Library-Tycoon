import { AssetContainer, Color3, LoadAssetContainerAsync, Mesh, PBRMaterial, Scene, Texture, TransformNode, type AbstractMesh, type InstantiatedEntries } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { CHARACTER_MODELS, STAFF_MODEL, MASCOT_MODEL, MODEL_DIR, PROP_MODELS, TEXTURE_DIR, TOTAL_ASSETS, type PropModel } from './manifest';

const C = (hex: string) => Color3.FromHexString(hex).toLinearSpace();

/**
 * Loads every GLB once, binds the shared palette materials (the material half of the
 * normalisation pipeline) and hands out GPU instances for static props.
 */
export class AssetLibrary {
  readonly palette = new Map<string, PBRMaterial>();
  private props = new Map<string, Mesh[]>();
  private characters: AssetContainer[] = [];
  /** Character kit v2 (natural proportions, own rig). Falls back to the legacy mini-figures if a file is missing. */
  private people: (AssetContainer | null)[] = []; private peopleStaff = new Map<number, AssetContainer>(); personMat!: PBRMaterial;
  mascot!: AssetContainer;
  studentMat!: PBRMaterial; staffMat!: PBRMaterial;
  failures: string[] = [];

  constructor(private scene: Scene) { this.buildPalette(); }

  private tex(file: string, u = 1, v = 1) { const t = new Texture(TEXTURE_DIR + file, this.scene); t.uScale = u; t.vScale = v; return t; }
  private pbr(name: string, color: string, rough: number, metal = 0) {
    const m = new PBRMaterial(`pal_${name}`, this.scene);
    m.albedoColor = C(color); m.roughness = rough; m.metallic = metal; m.environmentIntensity = 0.9;
    this.palette.set(name, m); return m;
  }
  private buildPalette() {
    const wood = this.pbr('wood', '#ffffff', 0.5); wood.albedoTexture = this.tex('wood_albedo.jpg', 1.2, 1.2); wood.bumpTexture = this.tex('wood_normal.jpg', 1.2, 1.2); wood.bumpTexture.level = 0.5;
    const wd = this.pbr('wood_dark', '#8d7a70', 0.45); wd.albedoTexture = wood.albedoTexture; wd.bumpTexture = wood.bumpTexture;
    const wl = this.pbr('wood_light', '#ffe9cf', 0.55); wl.albedoTexture = wood.albedoTexture;
    this.pbr('navy', '#1c2f5e', 0.42); const nf = this.pbr('navy_fabric', '#24397a', 0.95); nf.bumpTexture = this.tex('carpet_normal.jpg', 3, 3); nf.bumpTexture.level = 0.6;
    const brass = this.pbr('brass', '#d2a441', 0.28, 1); brass.environmentIntensity = 1.3;
    const gl = this.pbr('gold_leaf', '#e0b450', 0.3, 1); gl.environmentIntensity = 1.3;
    this.pbr('ivory', '#efe8d6', 0.6); const marble = this.pbr('marble', '#ffffff', 0.22); marble.albedoTexture = this.tex('marble_albedo.jpg', 0.6, 0.6);
    this.pbr('dark', '#1d1f26', 0.4, 0.2); this.pbr('steel', '#9aa0a8', 0.32, 0.9); this.pbr('leaf', '#3f7d49', 0.75); this.pbr('terracotta', '#ded5c2', 0.65);
    const screen = this.pbr('screen', '#16335c', 0.15); screen.emissiveColor = C('#5fa8e8').scale(0.9);
    const lamp = this.pbr('lamp_glow', '#fff0cf', 0.5); lamp.emissiveColor = C('#ffd89a').scale(2.2);
    this.pbr('paper', '#f4f0e2', 0.85); this.pbr('rope', '#1c2f5e', 0.9);
    this.pbr('books', '#ffffff', 0.7); // colour comes from vertex colours
    this.studentMat = this.charMat('char_students.png'); this.staffMat = this.charMat('char_staff.png');
  }
  private charMat(file: string) {
    const m = new PBRMaterial(`char_${file}`, this.scene);
    const t = new Texture(TEXTURE_DIR + file, this.scene, false, false, Texture.NEAREST_SAMPLINGMODE);
    m.albedoTexture = t; m.roughness = 0.75; m.metallic = 0; m.environmentIntensity = 0.7;
    return m;
  }

  async load(onProgress: (done: number, total: number) => void) {
    let done = 0;
    const one = async (file: string, optional = false) => {
      try { return await LoadAssetContainerAsync(MODEL_DIR + file + '.glb', this.scene); }
      catch (err) { console.error('asset failed', file, err); if (!optional) this.failures.push(file); return null; }
      finally { onProgress(++done, TOTAL_ASSETS); }
    };
    const propC = await Promise.all(PROP_MODELS.map((n) => one(n)));
    PROP_MODELS.forEach((name, i) => {
      const c = propC[i]; if (!c) return;
      const meshes = c.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
      for (const m of meshes) {
        const key = m.material?.name ?? 'ivory';
        const old = m.material; m.material = this.palette.get(key) ?? this.palette.get('ivory')!; old?.dispose();
        m.bakeTransformIntoVertices(m.computeWorldMatrix(true)); // flatten glTF handedness + node transforms
        m.parent = null; m.name = `src_${name}_${key}`; m.isVisible = false; m.isPickable = false;
        m.receiveShadows = true; m.freezeNormals(); m.doNotSyncBoundingInfo = true;
        if (key === 'books') { m.useVertexColors = true; m.hasVertexAlpha = false; }
        this.scene.addMesh(m);
      }
      this.props.set(name, meshes);
    });
    const chars = await Promise.all(CHARACTER_MODELS.map((n) => one('characters/character-' + n)));
    this.characters = chars.map((c) => c!).filter(Boolean);
    this.people = await Promise.all(CHARACTER_MODELS.map((n) => one('people/person-' + n, true)));
    for (const [idx, mi] of [...new Set(Object.values(STAFF_MODEL))].map((i) => [i, i] as const)) { const c = await one(`people/person-${CHARACTER_MODELS[mi]}-staff`, true); if (c) this.peopleStaff.set(idx, c); }
    this.personMat = new PBRMaterial('char_person', this.scene); this.personMat.albedoColor = Color3.White(); this.personMat.roughness = 0.72; this.personMat.metallic = 0; this.personMat.environmentIntensity = 0.6;
    this.personMat.sheen.isEnabled = true; this.personMat.sheen.intensity = 0.25; this.personMat.sheen.roughness = 0.6;
    const mascot = await one(MASCOT_MODEL);
    if (mascot) this.mascot = mascot;
    if (this.failures.length) throw new Error('Missing 3D assets: ' + this.failures.join(', '));
  }

  /** Place a static prop as GPU instances under one transform node. */
  place(name: PropModel, parent?: TransformNode | null, opts: { shadows?: boolean } = {}): TransformNode {
    const root = new TransformNode(`prop_${name}`, this.scene);
    if (parent) root.parent = parent;
    for (const src of this.props.get(name) ?? []) {
      const inst = src.createInstance(`${name}_i`);
      inst.parent = root; inst.isPickable = false; inst.metadata = { castShadow: opts.shadows !== false };
    }
    return root;
  }
  /** A unique (non-instanced) copy, for props that need their own material (e.g. tinted books, broken screens). */
  clone(name: PropModel, parent?: TransformNode | null): { root: TransformNode; meshes: Mesh[] } {
    const root = new TransformNode(`prop_${name}`, this.scene);
    if (parent) root.parent = parent;
    const meshes = (this.props.get(name) ?? []).map((src) => { const m = src.clone(`${name}_c`, root)!; m.isVisible = true; m.isPickable = false; m.doNotSyncBoundingInfo = false; return m; });
    return { root, meshes };
  }
  character(model: number, staff: boolean): InstantiatedEntries {
    const v2 = (staff ? this.peopleStaff.get(model) : null) ?? this.people[model % this.people.length];
    const c = v2 ?? this.characters[model % this.characters.length];
    const e = c.instantiateModelsToScene((n) => n, false, { doNotInstantiate: true });
    const mat = v2 ? this.personMat : staff ? this.staffMat : this.studentMat;
    for (const root of e.rootNodes) for (const m of root.getChildMeshes(false)) { m.material = mat; m.isPickable = false; m.alwaysSelectAsActiveMesh = true; if (v2) { m.useVertexColors = true; m.hasVertexAlpha = false; } }
    return e;
  }
  instantiateMascot(): InstantiatedEntries {
    const e = this.mascot.instantiateModelsToScene((n) => n, false, { doNotInstantiate: true });
    for (const root of e.rootNodes) for (const m of root.getChildMeshes(false)) { m.isPickable = false; m.alwaysSelectAsActiveMesh = true; tunePlush(m); }
    return e;
  }
}
/** The exported plush materials get a touch more sheen and no mirror-like reflection. */
function tunePlush(m: AbstractMesh) {
  const mat = m.material as PBRMaterial | null; if (!mat || !(mat instanceof PBRMaterial)) return;
  if (mat.name.startsWith('plush')) { mat.sheen.isEnabled = true; mat.sheen.intensity = 0.9; mat.sheen.roughness = 0.5; mat.sheen.color = new Color3(0.9, 0.62, 0.42); mat.roughness = 1; mat.environmentIntensity = 0.55; }
  if (mat.name.startsWith('gold')) mat.environmentIntensity = 1.4;
}
