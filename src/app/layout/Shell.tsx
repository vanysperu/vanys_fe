import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AppSidebar } from '@/app/layout/AppSidebar';
import { CreateQuotationDialog } from '@/modules/quotations/components/CreateQuotationDialog';
import { ReminderBell } from '@/modules/reminders/components/ReminderBell';
import { ThemeToggle } from '@/presentation/components/shared/ThemeToggle';
import { Button } from '@/presentation/components/shared/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/presentation/components/shared/ui/sidebar';
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
          {/* Celular: el menú lateral vive escondido en un panel deslizable y
              su propio botón está adentro de él, así que sin este botón no
              había forma de abrirlo. En escritorio el menú ya está a la vista. */}
          <SidebarTrigger aria-label="Abrir menú" className="mr-auto size-9 md:hidden" />
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
            // Celular: menos margen (en 360 px, p-6 se comía el 13% del ancho)
            // y pb-24 para que el botón flotante de "Nueva cotización" no
            // tape la paginación ni el último elemento de la pantalla.
            className="min-w-0 w-full p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-24"
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
              // Naranja de marca: es la acción principal de Vanys y destaca
              // sobre cualquier pantalla (ícono blanco, ≥ 3:1).
              className="fixed right-4 bottom-4 z-20 size-14 rounded-full sm:right-6 sm:bottom-6 bg-brand-orange-deep text-white shadow-lg shadow-brand-orange/30 hover:bg-brand-orange"
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
