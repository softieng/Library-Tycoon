import { describe, expect, it } from 'vitest';
import { NullEngine, Scene } from '@babylonjs/core';
import { cameraDampingFactor, IsoCamera, wheelZoomSteps } from '../../src/engine/camera';

describe('game camera: stable input and interpolation', () => {
  it('uses the same travel fraction after a second at 30, 60 and 120 FPS', () => {
    const sample = (hz: number) => {
      const steps = 1 / hz;
      let remaining = 1;
      for (let i = 0; i < hz; i++) remaining *= 1 - cameraDampingFactor(steps);
      return remaining;
    };
    expect(sample(30)).toBeCloseTo(sample(60), 12);
    expect(sample(60)).toBeCloseTo(sample(120), 12);
    expect(sample(60)).toBeCloseTo(Math.exp(-9), 12);
  });

  it('rejects unbounded or invalid interpolation time without instability', () => {
    expect(cameraDampingFactor(0)).toBe(0);
    expect(cameraDampingFactor(-4)).toBe(0);
    expect(cameraDampingFactor(Number.NaN)).toBe(0);
    expect(cameraDampingFactor(0.5)).toBeCloseTo(cameraDampingFactor(0.25));
    expect(cameraDampingFactor(0.02)).toBeGreaterThan(0);
    expect(cameraDampingFactor(0.02)).toBeLessThan(1);
  });

  it('keeps small trackpad motions proportional rather than zooming one full notch per event', () => {
    expect(wheelZoomSteps(1)).toBeCloseTo(-0.01);
    expect(wheelZoomSteps(5)).toBeCloseTo(-0.05);
    expect(wheelZoomSteps(100)).toBeCloseTo(-1);
    expect(wheelZoomSteps(400)).toBe(-1.2);
    expect(wheelZoomSteps(-400)).toBe(1.2);
    expect(wheelZoomSteps(3, 1)).toBe(-1.2);
    expect(wheelZoomSteps(1, 2, 800)).toBe(-1.2);
    expect(wheelZoomSteps(Number.NaN)).toBe(0);
    expect(wheelZoomSteps(0)).toBe(0);
  });

  it('eases the real Babylon orthographic camera consistently and snaps only on explicit hall switches', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const cam = new IsoCamera(scene);
      cam.focus(3, 2, 5);
      for (let i = 0; i < 60; i++) cam.update(1 / 60);
      const sixty = cam.state;

      cam.reset(true);
      cam.focus(3, 2, 5);
      for (let i = 0; i < 30; i++) cam.update(1 / 30);
      const thirty = cam.state;

      expect(thirty.x).toBeCloseTo(sixty.x, 6);
      expect(thirty.z).toBeCloseTo(sixty.z, 6);
      expect(thirty.zoom).toBeCloseTo(sixty.zoom, 6);
      expect(cam.camera.mode).toBe(1); // Babylon orthographic camera
      cam.jump(3, 2, 7);
      expect(cam.state).toMatchObject({ x: 3, z: 2, zoom: 7 });
      cam.reset(true);
      expect(cam.state).toMatchObject({ x: 0.6, z: 0.9, zoom: 11.6 });
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
