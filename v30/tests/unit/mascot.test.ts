import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MASCOT_CLIPS } from '../../src/assets/manifest';
import { MASCOT_CLIP_TIME } from '../../src/mascot/brain';

/** Reads the JSON chunk of the shipped mascot GLB — this tests the real exported asset, not the script. */
function gltf(file: string) { const b = readFileSync(file); return JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))); }
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
const g = gltf('public/assets/models/mascot.glb');
const joints: string[] = g.skins[0].joints.map((i: number) => g.nodes[i].name);

describe('mascot identity (protected institutional design)', () => {
  it('has EXACTLY eight walking legs and two pedipalps with claws', () => {
    expect(joints.filter((n) => /^leg\d_upper\./.test(n))).toHaveLength(8);
    expect(joints.filter((n) => /^leg\d_lower\./.test(n))).toHaveLength(8);
    expect(joints.filter((n) => /^leg/.test(n)).length).toBe(16); // 8 legs × 2 segments, nothing extra
    expect(joints.filter((n) => /^palp_upper\./.test(n))).toHaveLength(2);
    expect(joints.filter((n) => /^claw\./.test(n))).toHaveLength(2);
    expect(joints.filter((n) => /^thumb\./.test(n))).toHaveLength(2);
    for (const side of ['L', 'R']) expect(joints.filter((n) => n.startsWith('leg') && n.endsWith('.' + side) && n.includes('upper'))).toHaveLength(4);
  });
  it('has no tail and no stinger', () => {
    const names = [...g.nodes.map((n: any) => n.name), ...g.meshes.map((m: any) => m.name), ...g.materials.map((m: any) => m.name)].join(' ').toLowerCase();
    expect(names).not.toMatch(/tail|sting|telson|metasoma/);
    expect(joints.some((n) => n === 'abdomen')).toBe(true);
    // nothing is parented behind the abdomen
    const abdomen = g.nodes.find((n: any) => n.name === 'abdomen');
    expect(abdomen.children ?? []).toHaveLength(0);
  });
  it('wears the graduation cap with tassel, the inscribed sash and the logo pendant', () => {
    const mats = g.materials.map((m: any) => m.name);
    for (const m of ['plush_brown', 'cap_navy_felt', 'gold_thread', 'sash_inscribed', 'pendant_logo']) expect(mats).toContain(m);
    expect(joints).toContain('tassel'); expect(joints).toContain('pendant');
    const images = g.images.map((i: any) => i.name);
    expect(images.some((n: string) => n.includes('mascot_sash'))).toBe(true);
    expect(images.some((n: string) => n.includes('mascot_pendant'))).toBe(true);
  });
  it('sash inscriptions are exactly the approved Arabic and English texts', () => {
    const src = readFileSync('tools/textures/render-sash.mjs', 'utf8');
    for (const t of ['>المكتبة المركزية<', '>CENTRAL LIBRARY<', '>الجامعة التكنولوجية<', '>UNIVERSITY OF TECHNOLOGY<']) expect(src).toContain(t);
  });
  it('ships all twelve required animation clips, and the state machine knows each one', () => {
    const clips = g.animations.map((a: any) => a.name).sort();
    expect(clips).toEqual([...MASCOT_CLIPS].sort());
    expect(Object.keys(MASCOT_CLIP_TIME).sort()).toEqual([...MASCOT_CLIPS].sort());
  });
  it('walk and turn animate all eight legs (no humanoid gait reused)', () => {
    for (const clip of ['walk', 'turn']) {
      const a = g.animations.find((x: any) => x.name === clip);
      const animated = new Set(a.channels.map((c: any) => g.nodes[c.target.node].name));
      const legs = joints.filter((n) => /^leg\d_(upper|lower)\./.test(n));
      for (const l of legs) expect(animated.has(l), `${clip} animates ${l}`).toBe(true);
    }
    expect(joints.some((n) => /spine|hips|thigh|shin|foot/i.test(n))).toBe(false); // not a humanoid rig
  });
});

describe('protected brand files', () => {
  it('official logo and approved mascot master are byte-identical to the owner originals', () => {
    expect(sha('assets-src/branding/central-library-logo.original.png')).toBe('da6dd6995ff79cb57c073f5ba0ae18c08605b557211a27a7a34027ba4f57af26');
    expect(sha('public/assets/branding/central-library-logo.png')).toBe('da6dd6995ff79cb57c073f5ba0ae18c08605b557211a27a7a34027ba4f57af26');
    expect(sha('assets-src/branding/mascot.original.jpg')).toBe('d2325f445a3050192469264300f5fab2554e926e3fe33343bf5d4aed7ad30954');
  });
});
