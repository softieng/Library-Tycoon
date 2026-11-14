import { describe, expect, it } from 'vitest';
import { GameController } from '../../src/app/controller';
import { AutoQualitySampler, nextAutoProfile, recommendedAutoProfile } from '../../src/engine/autoQuality';
import type { StorageLike } from '../../src/persistence/save';

function store(initial: Record<string, string> = {}): StorageLike {
  const mem = new Map(Object.entries(initial));
  return { getItem: key => mem.get(key) ?? null, setItem: (key, value) => { mem.set(key, value); }, removeItem: key => { mem.delete(key); } };
}
const SETTINGS_KEY = 'uot-library-tycoon-v30-settings';

describe('hardware-adaptive quality profile (no GPU hardware probing in tests)', () => {
  it('starts with the best high-quality preset for a strong dedicated desktop', () => {
    const p = recommendedAutoProfile({ logicalCores: 20, memoryGB: 8, renderer: 'ANGLE (NVIDIA GeForce RTX 3070 Ti Laptop GPU)', width: 1920, height: 1080, pixelRatio: 1 });
    expect(p).toEqual({ quality: 'high', renderScale: 1, tier: 'performance' });
  });
  it('uses a light preset for an old laptop with 2GB and two cores', () => {
    expect(recommendedAutoProfile({ logicalCores: 2, memoryGB: 2 })).toEqual({ quality: 'low', renderScale: 0.7, tier: 'entry' });
  });
  it('does not mistake a software renderer for a dedicated GPU', () => {
    expect(recommendedAutoProfile({ logicalCores: 24, memoryGB: 8, renderer: 'Google SwiftShader' })).toMatchObject({ quality: 'low', renderScale: 0.55 });
    expect(recommendedAutoProfile({ logicalCores: 24, memoryGB: 8, renderer: 'llvmpipe' }).quality).toBe('low');
  });
  it('starts conservatively when the browser hides GPU identity and RAM', () => {
    expect(recommendedAutoProfile({ logicalCores: 16 }).quality).toBe('medium');
    expect(recommendedAutoProfile({}).quality).toBe('medium');
  });
  it('does not choose high for a coarse touchscreen or oversized render target', () => {
    expect(recommendedAutoProfile({ logicalCores: 16, memoryGB: 8, coarsePointer: true, width: 720 }).quality).toBe('low');
    expect(recommendedAutoProfile({ logicalCores: 16, memoryGB: 8, renderer: 'NVIDIA GeForce RTX', width: 3840, height: 2160, pixelRatio: 1 }).renderScale).toBe(0.9);
  });
  it('moves by one profile only and never goes below the scale floor', () => {
    expect(nextAutoProfile({ quality: 'high', renderScale: 1 }, 22)).toEqual({ quality: 'medium', renderScale: 0.85 });
    expect(nextAutoProfile({ quality: 'medium', renderScale: 0.85 }, 22)).toEqual({ quality: 'low', renderScale: 0.7 });
    expect(nextAutoProfile({ quality: 'low', renderScale: 0.56 }, 22)).toEqual({ quality: 'low', renderScale: 0.55 });
    expect(nextAutoProfile({ quality: 'low', renderScale: 0.55 }, 22)).toBeNull();
    expect(nextAutoProfile({ quality: 'medium', renderScale: 0.85 }, 62)).toEqual({ quality: 'high', renderScale: 0.9 });
    expect(nextAutoProfile({ quality: 'high', renderScale: 0.9 }, 48)).toBeNull();
  });
  it('waits for stable FPS, ignores hidden tabs and does not bounce immediately', () => {
    const s = new AutoQualitySampler();
    const high = { quality: 'high' as const, renderScale: 1 };
    expect(s.sample(22, 0, high)).toBeNull();
    expect(s.sample(22, 3000, high)).toBeNull();
    let downgrade = null;
    for (let t = 4500; t <= 25000; t += 1500) {
      const change = s.sample(21, t, high);
      if (change) { downgrade = change; break; }
    }
    expect(downgrade).toEqual({ quality: 'medium', renderScale: 0.85 });
    // Insufficient elapsed time since the first decision.
    for (let t = 26000; t < 35000; t += 1500)
      expect(s.sample(62, t, downgrade!)).toBeNull();
    expect(s.sample(62, 36000, downgrade!, false)).toBeNull();
    // A hidden tab must not trigger an upgrade based on stale samples.
    expect(s.sample(62, 37500, downgrade!)).toBeNull();
  });
});

describe('graphics preferences are separate from the gameplay save', () => {
  it('defaults to auto, while manual choices disable auto without touching game economy', () => {
    const st = store();
    const c = new GameController(st);
    expect(c.settings.autoQuality).toBe(true);
    const savedMoney = c.state.money;
    c.updateSettings({ quality: 'low', renderScale: 0.65 });
    expect(c.settings.autoQuality).toBe(false);
    expect(c.state.money).toBe(savedMoney);
    const reread = new GameController(st);
    expect(reread.settings).toMatchObject({ autoQuality: false, quality: 'low', renderScale: 0.65 });
    reread.updateSettings({ autoQuality: true });
    expect(reread.settings.autoQuality).toBe(true);
    expect(reread.state.money).toBe(savedMoney);
  });
  it('respects manual quality settings persisted by older game versions', () => {
    const st = store({ [SETTINGS_KEY]: JSON.stringify({ quality: 'high', renderScale: 0.75, sound: false }) });
    const c = new GameController(st);
    expect(c.settings).toMatchObject({ quality: 'high', renderScale: 0.75, sound: false, autoQuality: false });
  });
  it('rejects unreasonable or malformed numeric scales without breaking settings', () => {
    const st = store({ [SETTINGS_KEY]: JSON.stringify({ renderScale: 400, quality: 'ultra', autoQuality: true }) });
    const c = new GameController(st);
    expect(c.settings.renderScale).toBe(1);
    expect(c.settings.quality).not.toBe('ultra');
    c.updateSettings({ renderScale: Number.NaN });
    expect(Number.isFinite(c.settings.renderScale)).toBe(true);
  });
});
