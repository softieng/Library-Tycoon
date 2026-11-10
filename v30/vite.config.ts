import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Relative base so the same build works on GitHub Pages sub-paths, a LAN server, or file hosting.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 4000, sourcemap: false },
  server: { port: 5173, host: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
