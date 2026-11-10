import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/App';
import { listenForInstallPrompt } from '@/lib/installPrompt';
import { registerServiceWorker } from '@/lib/serviceWorker';
import '@/lib/zodErrors';

import './index.css';

listenForInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
