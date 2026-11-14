import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHARACTER_MODELS, STAFF_MODEL } from '../../src/assets/manifest';

/** Structural checks on the character kit v2 GLBs (the mascot has its own, stricter identity test). */
function gltf(file: string) {
  const d = readFileSync(file), n = d.readUInt32LE(12);
  return JSON.parse(d.subarray(20, 20 + n).toString('utf8'));
}
const CLIPS = ['idle', 'walk', 'sit', 'pick-up', 'interact-right', 'emote-yes', 'emote-no', 'holding-right', 'holding-both', 'jump'];
const BONES = ['root', 'torso', 'head', 'arm-left', 'arm-right', 'forearm-left', 'forearm-right', 'leg-left', 'leg-right', 'shin-left', 'shin-right'];
const files = [
  ...CHARACTER_MODELS.map((n) => `public/assets/models/people/person-${n}.glb`),
  ...[...new Set(Object.values(STAFF_MODEL))].map((i) => `public/assets/models/people/person-${CHARACTER_MODELS[i]}-staff.glb`),
];

describe('character kit v2', () => {
  it('ships 12 student models and 5 staff variants', () => { expect(files).toHaveLength(17); for (const f of files) expect(existsSync(f), f).toBe(true); });
  for (const f of files) it(`${f.split('/').pop()} has the rig, all clips, vertex colours and a sane budget`, () => {
    const j = gltf(f), names = j.nodes.map((n: { name: string }) => n.name);
    for (const b of BONES) expect(names, b).toContain(b);
    expect(j.animations.map((a: { name: string }) => a.name).sort()).toEqual([...CLIPS].sort());
    expect(j.skins).toHaveLength(1);
    const prim = j.meshes[0].primitives[0].attributes;
    expect(prim).toHaveProperty('COLOR_0'); expect(prim).toHaveProperty('JOINTS_0'); expect(prim).toHaveProperty('WEIGHTS_0');
    const tris = j.accessors[j.meshes[0].primitives[0].indices].count / 3;
    expect(tris).toBeLessThan(12000);
    expect(j.images ?? []).toHaveLength(0); // no embedded or third-party textures
  });
});
