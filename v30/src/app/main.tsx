import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-600.css';
import '@fontsource/cairo/latin-700.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/theme.css';
import { App } from './App';
import { GameController } from './controller';
import { ErrorBoundary } from '../ui/ErrorBoundary';

// One controller for the lifetime of the page (StrictMode double-mounts components, never this).
const controller = new GameController();
window.addEventListener('pagehide', () => controller.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) controller.save(); });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App controller={controller} />
    </ErrorBoundary>
  </StrictMode>,
);
