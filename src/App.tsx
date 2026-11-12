import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { InstallAppPrompt } from '@/app/layout/InstallAppPrompt';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import PrivateRoutes from '@/app/routing/PrivateRoutes';
import PublicRoutes from '@/app/routing/PublicRoutes';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';

// Pantallas que se abren desde un enlace del correo: funcionan con o sin
// sesión (ej. alguien con la app abierta toca el enlace de recuperación), así
// que van antes del cambio Private/Public.
const ForgotPasswordPage = lazy(() =>
  import('@/modules/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const PasswordLinkPage = lazy(() =>
  import('@/modules/auth/pages/PasswordLinkPage').then((m) => ({ default: m.PasswordLinkPage })),
);

export function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
              <Route path="/restablecer-contrasena" element={<PasswordLinkPage purpose="reset" />} />
              <Route path="/activar-cuenta" element={<PasswordLinkPage purpose="invite" />} />
              <Route path="*" element={token ? <PrivateRoutes /> : <PublicRoutes />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <InstallAppPrompt />
      </QueryProvider>
    </ThemeProvider>
  );
}
