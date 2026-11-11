import { useState } from 'react';
import { GameCanvas, type SceneStatus } from '../ui/GameCanvas';
import type { GameController } from './controller';

export function App({ controller }: { controller: GameController }) {
  const [status, setStatus] = useState<SceneStatus>({ phase: 'loading', done: 0, total: 1 });
  return (
    <div className="app">
      <GameCanvas controller={controller} onStatus={setStatus} onUiRequest={() => {}} />
      {status.phase !== 'ready' && <div style={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}>{JSON.stringify(status)}</div>}
    </div>
  );
}
