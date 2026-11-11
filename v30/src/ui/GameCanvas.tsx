import { useEffect, useRef, useState } from 'react';
import type { GameController } from '../app/controller';
import { PROP_BY_ID, STATIONS } from '../config/layout';
import type { SceneHost } from '../engine/SceneHost';

export type SceneStatus = { phase: 'loading'; done: number; total: number } | { phase: 'ready' } | { phase: 'error'; message: string };

/**
 * Mounts the Babylon.js world exactly once. React state changes elsewhere never re-create the
 * engine: this component has no props that change and renders a single stable <canvas>.
 */
export function GameCanvas({ controller, onStatus, onUiRequest }: { controller: GameController; onStatus: (s: SceneStatus) => void; onUiRequest: (r: { type: 'dewey' }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onStatus, onUiRequest }); cb.current = { onStatus, onUiRequest };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let host: SceneHost | null = null, cancelled = false, fallback = 0;
    // Deferred by one task so React StrictMode's throw-away first mount never creates an engine.
    const start = window.setTimeout(async () => {
      try {
        const { SceneHost } = await import('../engine/SceneHost');
        const h = await SceneHost.create(ref.current!, controller, (done, total) => cb.current.onStatus({ phase: 'loading', done, total }));
        if (cancelled) { h.dispose(); return; }
        host = h; h.onUiRequest = (r) => cb.current.onUiRequest(r);
        (window as any).__TYCOON__ = {
          controller, host, ready: true, layout: { PROP_BY_ID, STATIONS },
          /** QA: advance the simulation without waiting for rendered frames (software WebGL is slow). */
          fastForward: (seconds: number) => { for (let i = 0; i < seconds * 10; i++) (controller as any).handle(controller.sim.step([])); controller.notify(); },
        };
        cb.current.onStatus({ phase: 'ready' });
      } catch (err) {
        console.error('3D scene failed', err);
        if (cancelled) return;
        setFailed(true);
        (window as any).__TYCOON__ = { controller, host: null, ready: false, error: String((err as Error)?.message ?? err) };
        cb.current.onStatus({ phase: 'error', message: String((err as Error)?.message ?? err) });
        // Keep the simulation and UI alive without WebGL so saves and management still work.
        let last = performance.now();
        fallback = window.setInterval(() => { const now = performance.now(); controller.tick((now - last) / 1000); last = now; }, 100);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(start); window.clearInterval(fallback); host?.dispose(); };
  }, [controller]);
  return <canvas ref={ref} className={failed ? 'world world--failed' : 'world'} aria-label="مشهد المكتبة ثلاثي الأبعاد" />;
}
