import { Constants, RawCubeTexture, Scene } from '@babylonjs/core';

/**
 * A small procedural reflection environment (no external HDRI file): warm ceiling light,
 * ivory horizon, dark walnut floor and a bright window side. Enough for brass, marble and
 * lacquered wood to read as materials while keeping the game fully self-hosted.
 */
export function createEnvironment(scene: Scene) {
  const size = 32, faces: Uint8Array[] = [];
  const dirs: ((u: number, v: number) => [number, number, number])[] = [
    (u, v) => [1, -v, -u], (u, v) => [-1, -v, u], (u, v) => [u, 1, v], (u, v) => [u, -1, -v], (u, v) => [u, -v, 1], (u, v) => [-u, -v, -1],
  ];
  for (const f of dirs) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const [dx, dy, dz] = f(((x + 0.5) / size) * 2 - 1, ((y + 0.5) / size) * 2 - 1), l = Math.hypot(dx, dy, dz), nx = dx / l, ny = dy / l, nz = dz / l;
      const up = Math.max(0, ny), down = Math.max(0, -ny), horizon = 1 - Math.abs(ny);
      let r = 0.30 * down + 0.80 * horizon + 1.0 * up, g = 0.20 * down + 0.74 * horizon + 0.95 * up, b = 0.13 * down + 0.62 * horizon + 0.84 * up;
      const window = Math.max(0, -nx * 0.9 + nz * 0.2) ** 6 * (1 - Math.abs(ny)) * 0.9; // bright west windows
      const lamps = Math.max(0, ny) ** 10 * 0.5;
      r += window + lamps; g += window * 0.92 + lamps * 0.9; b += window * 0.7 + lamps * 0.7;
      const i = (y * size + x) * 4;
      data[i] = Math.min(255, r * 205); data[i + 1] = Math.min(255, g * 205); data[i + 2] = Math.min(255, b * 205); data[i + 3] = 255;
    }
    faces.push(data);
  }
  const tex = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_UNSIGNED_BYTE, true, false, Constants.TEXTURE_TRILINEAR_SAMPLINGMODE);
  tex.gammaSpace = true; tex.name = 'procedural_env';
  scene.environmentTexture = tex; scene.environmentIntensity = 0.95;
  return tex;
}
