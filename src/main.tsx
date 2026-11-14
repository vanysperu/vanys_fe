import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { listenForInstallPrompt } from '@/lib/installPrompt';
import { registerServiceWorker } from '@/lib/serviceWorker';
import { reloadOnStaleBuild } from '@/lib/staleBuild';
import '@/lib/zodErrors';

import './index.css';

listenForInstallPrompt();
reloadOnStaleBuild();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
