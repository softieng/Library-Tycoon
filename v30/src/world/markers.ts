import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { EmoteKind } from '../gameplay/types';

const ICON: Record<EmoteKind | 'target' | 'broken' | 'done' | 'miss' | 'gift', { glyph: string; bg: string }> = {
  happy: { glyph: '😊', bg: '#2f7d4f' }, confused: { glyph: '❓', bg: '#c9772a' }, dissatisfied: { glyph: '😠', bg: '#b23a3a' }, celebrate: { glyph: '🎉', bg: '#c9a23a' },
  request: { glyph: '🙋', bg: '#2b5fa8' }, sleep: { glyph: '☕', bg: '#5a4a7a' }, vip: { glyph: '⭐', bg: '#c9a23a' }, wait: { glyph: '⏳', bg: '#a8672b' },
  target: { glyph: '📕', bg: '#c9a23a' }, broken: { glyph: '🔧', bg: '#b23a3a' }, done: { glyph: '✔', bg: '#2f7d4f' }, miss: { glyph: '✖', bg: '#7a7f8c' }, gift: { glyph: '🎁', bg: '#c9a23a' },
};
export type IconKind = keyof typeof ICON;

/** Speech-bubble style icon billboards (emotes, mission targets, device faults). Materials are shared per icon. */
export class IconFactory {
  private mats = new Map<string, StandardMaterial>();
  constructor(private scene: Scene) {}
  material(kind: IconKind) {
    let m = this.mats.get(kind); if (m) return m;
    const tex = new DynamicTexture(`icon_${kind}`, 128, this.scene, true), ctx = tex.getContext() as unknown as CanvasRenderingContext2D, d = ICON[kind];
    ctx.clearRect(0, 0, 128, 128);
    ctx.beginPath(); ctx.arc(64, 56, 50, 0, Math.PI * 2); ctx.fillStyle = '#fffaf0'; ctx.fill(); ctx.lineWidth = 9; ctx.strokeStyle = d.bg; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48, 100); ctx.lineTo(64, 126); ctx.lineTo(80, 100); ctx.closePath(); ctx.fillStyle = d.bg; ctx.fill();
    ctx.font = "62px 'Segoe UI Emoji','Noto Color Emoji','Apple Color Emoji',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = d.bg; ctx.fillText(d.glyph, 64, 60);
    tex.hasAlpha = true; tex.update(true);
    m = new StandardMaterial(`icon_${kind}_mat`, this.scene);
    m.diffuseTexture = tex; m.emissiveColor = Color3.White(); m.disableLighting = true; m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false;
    this.mats.set(kind, m); return m;
  }
  create(name: string, parent: TransformNode | null, size = 0.62): Mesh {
    const p = MeshBuilder.CreatePlane(name, { size }, this.scene);
    p.billboardMode = Mesh.BILLBOARDMODE_ALL; p.isPickable = false; p.renderingGroupId = 2; if (parent) p.parent = parent;
    p.setEnabled(false); return p;
  }
}
