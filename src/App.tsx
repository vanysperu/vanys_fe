import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/app/providers/QueryProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import PrivateRoutes from '@/app/routing/PrivateRoutes';
import PublicRoutes from '@/app/routing/PublicRoutes';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';

export function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>{token ? <PrivateRoutes /> : <PublicRoutes />}</BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
