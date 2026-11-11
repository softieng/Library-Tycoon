import { DynamicTexture, Mesh, MeshBuilder, PBRMaterial, Scene, StandardMaterial, Texture, Color3, type TransformNode } from '@babylonjs/core';

const FONT = "'Cairo', 'Segoe UI', Tahoma, sans-serif";
export interface SignOpts { w: number; h: number; text: string; sub?: string; bg?: string; fg?: string; px?: number; border?: string; emissive?: number; icon?: string }

/** A sign plane whose text is drawn by the browser (correct Arabic shaping, RTL). */
export function makeSign(scene: Scene, name: string, o: SignOpts, parent?: TransformNode | null): Mesh {
  const px = o.px ?? 256, tw = Math.round(px * (o.w / o.h)), th = px;
  const tex = new DynamicTexture(`${name}_tex`, { width: tw, height: th }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = o.bg ?? '#16264d'; ctx.fillRect(0, 0, tw, th);
  if (o.border !== 'none') { ctx.strokeStyle = o.border ?? '#c9a23a'; ctx.lineWidth = th * 0.045; ctx.strokeRect(th * 0.06, th * 0.06, tw - th * 0.12, th - th * 0.12); }
  ctx.fillStyle = o.fg ?? '#e3bf62'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
  const main = (o.icon ? o.icon + ' ' : '') + o.text;
  let size = th * (o.sub ? 0.36 : 0.46);
  ctx.font = `700 ${size}px ${FONT}`;
  while (ctx.measureText(main).width > tw * 0.86 && size > 10) { size *= 0.93; ctx.font = `700 ${size}px ${FONT}`; }
  ctx.fillText(main, tw / 2, o.sub ? th * 0.40 : th * 0.52);
  if (o.sub) {
    let s2 = th * 0.2; ctx.font = `600 ${s2}px ${FONT}`; ctx.direction = 'ltr';
    while (ctx.measureText(o.sub).width > tw * 0.84 && s2 > 8) { s2 *= 0.93; ctx.font = `600 ${s2}px ${FONT}`; }
    ctx.globalAlpha = 0.92; ctx.fillText(o.sub, tw / 2, th * 0.74); ctx.globalAlpha = 1;
  }
  tex.update(true);
  const mat = new PBRMaterial(`${name}_mat`, scene);
  mat.albedoTexture = tex; mat.roughness = 0.55; mat.metallic = 0; mat.emissiveTexture = tex; mat.emissiveColor = Color3.White().scale(o.emissive ?? 0.35);
  const plane = MeshBuilder.CreatePlane(name, { width: o.w, height: o.h }, scene);
  plane.material = mat; plane.isPickable = false; if (parent) plane.parent = parent;
  return plane;
}
/** Image plane (used for the official logo — the file is displayed as-is, never redrawn). */
export function makeImagePlane(scene: Scene, name: string, url: string, w: number, h: number, parent?: TransformNode | null): Mesh {
  const tex = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE); tex.hasAlpha = true;
  const mat = new StandardMaterial(`${name}_mat`, scene);
  mat.diffuseTexture = tex; mat.useAlphaFromDiffuseTexture = true; mat.emissiveColor = new Color3(0.55, 0.55, 0.55); mat.specularColor = Color3.Black(); mat.backFaceCulling = false;
  mat.transparencyMode = 1; mat.alphaCutOff = 0.5;
  const plane = MeshBuilder.CreatePlane(name, { width: w, height: h }, scene);
  plane.material = mat; plane.isPickable = false; if (parent) plane.parent = parent;
  return plane;
}
