import type { Quality } from '../app/controller';

/**
 * Browser privacy restrictions mean exact CPU model, GPU VRAM and system RAM
 * are not reliably available. Use coarse optional hints, then observed FPS.
 * No device identifiers leave the browser or enter the game save.
 */
export interface HardwareHints {
  logicalCores?: number;
  memoryGB?: number;
  renderer?: string;
  width?: number;
  height?: number;
  pixelRatio?: number;
  coarsePointer?: boolean;
  reducedMotion?: boolean;
}
export interface QualityProfile { quality: Quality; renderScale: number }
export type HardwareTier = 'entry' | 'balanced' | 'performance';

export function browserHardwareHints(renderer = ''): HardwareHints {
  const nav = typeof navigator === 'undefined' ? null : navigator as Navigator & { deviceMemory?: number };
  const win = typeof window === 'undefined' ? null : window;
  const matches = (q: string): boolean => {
    try { return !!win?.matchMedia?.(q).matches; } catch { return false; }
  };
  return {
    logicalCores: nav?.hardwareConcurrency,
    memoryGB: nav?.deviceMemory,
    renderer,
    width: win?.innerWidth,
    height: win?.innerHeight,
    pixelRatio: win?.devicePixelRatio,
    coarsePointer: matches('(pointer: coarse)'),
    reducedMotion: matches('(prefers-reduced-motion: reduce)'),
  };
}

const clampScale = (v: number): number => Math.round(Math.max(0.5, Math.min(1, v)) * 100) / 100;

export function recommendedAutoProfile(h: HardwareHints): QualityProfile & { tier: HardwareTier } {
  const renderer = (h.renderer ?? '').toLowerCase();
  const software = /swiftshader|llvmpipe|softpipe|software raster|microsoft basic render|warp adapter/.test(renderer);
  const discrete = /nvidia|geforce|\brtx\b|radeon\s*rx|radeon\s*pro|intel\s*arc/.test(renderer);
  const weakCPU = h.logicalCores !== undefined && h.logicalCores <= 4;
  const weakRAM = h.memoryGB !== undefined && h.memoryGB <= 4;
  const touch = !!h.coarsePointer && (h.width ?? 1000) <= 900;
  const reduced = !!h.reducedMotion;
  if (software) return { quality: 'low', renderScale: 0.55, tier: 'entry' };
  if (weakCPU || weakRAM || touch) return { quality: 'low', renderScale: 0.7, tier: 'entry' };
  const fastCPU = (h.logicalCores ?? 0) >= 8;
  const enoughRAM = (h.memoryGB ?? 0) >= 8;
  const heavyPixels = (h.width ?? 0) * (h.height ?? 0) * Math.pow(h.pixelRatio ?? 1, 2) > 5_000_000;
  if (discrete && fastCPU && enoughRAM && !reduced) {
    return { quality: 'high', renderScale: heavyPixels ? 0.9 : 1, tier: 'performance' };
  }
  return { quality: 'medium', renderScale: reduced ? 0.8 : heavyPixels ? 0.8 : 0.85, tier: 'balanced' };
}

/** One conservative step in one direction. Manual settings never call this. */
export function nextAutoProfile(current: QualityProfile, fps: number): QualityProfile | null {
  if (!Number.isFinite(fps) || fps <= 0) return null;
  if (fps < 40) {
    if (current.quality === 'high') return { quality: 'medium', renderScale: Math.min(0.85, current.renderScale) };
    if (current.quality === 'medium') return { quality: 'low', renderScale: Math.min(0.7, current.renderScale) };
    if (current.renderScale > 0.55) return { quality: 'low', renderScale: clampScale(Math.max(0.55, current.renderScale - 0.1)) };
  }
  if (fps > 59) {
    if (current.quality === 'low') {
      if (current.renderScale < 0.8) return { quality: 'low', renderScale: clampScale(Math.min(0.8, current.renderScale + 0.1)) };
      return { quality: 'medium', renderScale: 0.8 };
    }
    if (current.quality === 'medium') return { quality: 'high', renderScale: 0.9 };
    if (current.renderScale < 1) return { quality: 'high', renderScale: clampScale(Math.min(1, current.renderScale + 0.05)) };
  }
  return null;
}

/**
 * Slow decisions prevent jumping between quality tiers during brief spikes.
 * Suspended/hidden tabs reset their observation window, not the user's choice.
 */
export class AutoQualitySampler {
  private firstVisibleAt: number | null = null;
  private lastSampleAt = -Infinity;
  private lastChangeAt = -Infinity;
  private samples: number[] = [];
  private slowStreak = 0;
  private fastStreak = 0;

  reset(): void {
    this.firstVisibleAt = null;
    this.lastSampleAt = -Infinity;
    this.samples = [];
    this.slowStreak = 0;
    this.fastStreak = 0;
  }

  sample(fps: number, nowMs: number, current: QualityProfile, visible = true): QualityProfile | null {
    if (!visible || !Number.isFinite(fps) || fps <= 0 || !Number.isFinite(nowMs)) {
      this.reset(); return null;
    }
    if (this.firstVisibleAt === null) this.firstVisibleAt = nowMs;
    if (nowMs - this.firstVisibleAt < 6000 || nowMs - this.lastSampleAt < 1500) return null;
    this.lastSampleAt = nowMs;
    this.samples.push(fps);
    if (this.samples.length > 8) this.samples.shift();
    if (this.samples.length < 8) return null;
    const average = this.samples.reduce((sum, v) => sum + v, 0) / this.samples.length;
    this.slowStreak = average < 40 ? this.slowStreak + 1 : 0;
    this.fastStreak = average > 59 ? this.fastStreak + 1 : 0;
    if (nowMs - this.lastChangeAt < 20000) return null;
    if (this.slowStreak < 2 && this.fastStreak < 6) return null;
    const proposed = nextAutoProfile(current, average);
    if (!proposed) return null;
    this.lastChangeAt = nowMs;
    this.samples = [];
    this.slowStreak = 0;
    this.fastStreak = 0;
    return proposed;
  }
}
