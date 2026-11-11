import { useCallback, useEffect, useState } from 'react';
import { DeweyGame } from '../ui/DeweyGame';
import { GameCanvas, type SceneStatus } from '../ui/GameCanvas';
import { GameContext, num, useGame } from '../ui/hooks';
import { CameraControls, Dialogs, Floaters, Inspector, MissionResult, MissionTracker, Toasts, TopBar } from '../ui/Hud';
import { PANELS, PanelBody, type PanelId } from '../ui/panels';
import { playSfx } from './audio';
import type { GameController } from './controller';

function Dock({ panel, setPanel }: { panel: PanelId | null; setPanel: (p: PanelId | null) => void }) {
  const c = useGame(), s = c.state;
  const badge: Partial<Record<PanelId, number>> = { events: (s.event ? 1 : 0) + s.broken.length, missions: s.missions.active ? 1 : 0 };
  return (
    <nav className="dock" aria-label="لوحات الإدارة">
      {PANELS.map((p) => (
        <button key={p.id} className={panel === p.id ? 'is-on' : ''} onClick={() => setPanel(panel === p.id ? null : p.id)} title={p.title} aria-pressed={panel === p.id} data-testid={`dock-${p.id}`}>
          <span>{p.icon}</span><small>{p.title}</small>{!!badge[p.id] && <i>{num(badge[p.id]!)}</i>}
        </button>
      ))}
    </nav>
  );
}
function Panel({ id, close, go }: { id: PanelId; close: () => void; go: (p: PanelId) => void }) {
  useGame();
  const meta = PANELS.find((p) => p.id === id)!;
  return (
    <aside className="panel" data-testid={`panel-${id}`} aria-label={meta.title}>
      <header><h2>{meta.icon} {meta.title}</h2><button className="x" onClick={close} aria-label="إغلاق اللوحة">✕</button></header>
      <div className="panel__body"><PanelBody id={id} go={go} /></div>
    </aside>
  );
}
function Loading({ status }: { status: SceneStatus }) {
  if (status.phase === 'ready') return null;
  if (status.phase === 'error') return (
    <div className="loading loading--error" role="alert" data-testid="webgl-error">
      <img src="assets/branding/central-library-logo.png" alt="" />
      <h1>تعذّر تشغيل العرض ثلاثي الأبعاد</h1>
      <p>المتصفح لم يتمكن من تشغيل WebGL أو تحميل المجسمات. لوحات الإدارة والحفظ تعمل، لكن مشهد القاعة غير متاح.</p>
      <p className="note">فعّل تسريع العتاد في المتصفح أو جرّب Chrome / Edge حديثاً.</p>
      <pre dir="ltr">{status.message.slice(0, 220)}</pre>
    </div>
  );
  const p = Math.round((status.done / Math.max(1, status.total)) * 100);
  return (
    <div className="loading" data-testid="loading">
      <img src="assets/branding/central-library-logo.png" alt="شعار المكتبة المركزية" />
      <h1>Library Tycoon</h1><p>المكتبة المركزية · الجامعة التكنولوجية · بغداد</p>
      <div className="loading__bar"><div style={{ width: `${p}%` }} /></div>
      <small>تحميل المجسمات {num(status.done)} / {num(status.total)}</small>
    </div>
  );
}

export function App({ controller }: { controller: GameController }) {
  const [status, setStatus] = useState<SceneStatus>({ phase: 'loading', done: 0, total: 1 });
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [dewey, setDewey] = useState(false);
  const onUi = useCallback((r: { type: 'dewey' }) => { if (r.type === 'dewey') setDewey(true); }, []);
  useEffect(() => controller.onSimEvent((e) => { if (e.type === 'sfx' && controller.settings.sound) playSfx(e.name); }), [controller]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === 'Escape') { setPanel(null); controller.select(null); } if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); controller.setSpeed(controller.paused ? 1 : 0); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [controller]);
  return (
    <GameContext.Provider value={controller}>
      <div className={`app ${panel ? 'has-panel' : ''}`}>
        <GameCanvas controller={controller} onStatus={setStatus} onUiRequest={onUi} />
        <TopBar />
        <Dock panel={panel} setPanel={setPanel} />
        {panel && <Panel id={panel} close={() => setPanel(null)} go={setPanel} />}
        <MissionTracker open={setPanel} />
        <Inspector />
        <CameraControls />
        <Floaters />
        <Toasts />
        <Dialogs />
        <MissionResult />
        {dewey && <DeweyGame onClose={() => setDewey(false)} onDone={(correct, total) => controller.dispatch({ type: 'deweyResult', correct, total })} />}
        <Loading status={status} />
      </div>
    </GameContext.Provider>
  );
}
