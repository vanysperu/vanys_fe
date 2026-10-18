import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AppSidebar } from '@/app/layout/AppSidebar';
import { CreateQuotationDialog } from '@/modules/quotations/components/CreateQuotationDialog';
import { ReminderBell } from '@/modules/reminders/components/ReminderBell';
import { ThemeToggle } from '@/presentation/components/shared/ThemeToggle';
import { Button } from '@/presentation/components/shared/ui/button';
import { SidebarProvider } from '@/presentation/components/shared/ui/sidebar';
import { flattenViewRoutes, usePermissionButton, useAccess } from '@/presentation/hooks/shared/useAccess';
import { useBrandTheme } from '@/presentation/hooks/shared/useBrandTheme';

// Shell de la app autenticada: valida en cada navegación que la ruta actual
// esté dentro del árbol de vistas que useAccess() (GET /access/me) otorgó
// al rol, y renderiza el sidebar + el contenido (CLAUDE.md sección 7).
export function Shell() {
  const location = useLocation();
  const { data: access, isLoading } = useAccess();
  const canCreateQuotation = usePermissionButton('cotizacion.create.button');
  useBrandTheme();

  if (isLoading) return <ShellSkeleton />;

  const allowedRoutes = access ? flattenViewRoutes(access.views) : [];
  const isRouteAllowed = location.pathname === '/' || allowedRoutes.includes(location.pathname);

  if (access && !isRouteAllowed) return <Navigate to="/" replace />;

  return (
    <SidebarProvider className="h-svh bg-muted/30">
      <AppSidebar />
      <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-end gap-2 border-b bg-background/80 px-4 py-2 backdrop-blur">
          <ReminderBell />
          <ThemeToggle />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-w-0 w-full p-6 lg:p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fijo en toda la app autenticada (pedido explícito del usuario:
          "siempre esté un botón... para crear cotización"), no solo en
          /cotizaciones — mismo diálogo que ya usa QuotationsPage.tsx, con
          un trigger circular flotante en vez del botón con texto de ahí. */}
      {canCreateQuotation && (
        <CreateQuotationDialog
          trigger={
            <Button
              size="icon"
              title="Nueva cotización"
              aria-label="Nueva cotización"
              className="fixed right-6 bottom-6 z-20 size-14 rounded-full shadow-lg"
            >
              <Plus className="size-6" />
            </Button>
          }
        />
      )}
    </SidebarProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex h-svh items-center justify-center bg-muted/30">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
