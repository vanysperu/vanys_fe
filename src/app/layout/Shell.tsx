import { Plus } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { AppSidebar } from '@/app/layout/AppSidebar';
import { ReminderBell } from '@/modules/reminders/components/ReminderBell';
import { useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import { ThemeToggle } from '@/presentation/components/shared/ThemeToggle';
import { Button } from '@/presentation/components/shared/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/presentation/components/shared/ui/sidebar';
import {
  flattenViewRoutes,
  usePermissionButton,
  useAccess,
} from '@/presentation/hooks/shared/useAccess';
import { useBrandTheme } from '@/presentation/hooks/shared/useBrandTheme';

// Velocidad (27-nov): lo que no se usa al entrar se descarga recién cuando
// hace falta. El modo enseñanza (lecciones, motor) solo en la empresa de
// práctica; el diálogo de cotización, en cuanto se dibuja el botón flotante
// (mientras tanto se ve el mismo botón).
const CreateQuotationDialog = lazy(() =>
  import('@/modules/quotations/components/CreateQuotationDialog').then((m) => ({ default: m.CreateQuotationDialog })),
);
const PracticeModeBanner = lazy(() =>
  import('@/modules/tutorial/components/PracticeModeBanner').then((m) => ({ default: m.PracticeModeBanner })),
);
const TutorialOverlay = lazy(() =>
  import('@/modules/tutorial/components/TutorialOverlay').then((m) => ({ default: m.TutorialOverlay })),
);

// Shell de la app autenticada: valida en cada navegación que la ruta actual
// esté dentro del árbol de vistas que useAccess() (GET /access/me) otorgó
// al rol, y renderiza el sidebar + el contenido (CLAUDE.md sección 7).
export function Shell() {
  const location = useLocation();
  const { data: access, isLoading } = useAccess();
  const canCreateQuotation = usePermissionButton('cotizacion.create.button');
  // Modo enseñanza: con una lección en curso, el botón flotante se esconde (salvo
  // en "Conoce el sistema", que lo presenta). Quedaba encima de botones que la
  // lección pide tocar, como "Guardar" al pie de una pantalla (26-nov).
  // (Solo en la práctica: en la cuenta real nunca hay lección, aunque quede una guardada en el navegador.)
  const lessonCode = useTutorialStore((state) => state.active?.code ?? null);
  const hidesQuickQuotation = Boolean(access?.isPractice) && lessonCode !== null && lessonCode !== 'tour';
  const showQuickQuotation = canCreateQuotation && !hidesQuickQuotation;
  useBrandTheme();

  if (isLoading) return <ShellSkeleton />;

  const allowedRoutes = access ? flattenViewRoutes(access.views) : [];
  const isRouteAllowed = location.pathname === '/' || allowedRoutes.includes(location.pathname);

  if (access && !isRouteAllowed) return <Navigate to="/" replace />;

  return (
    <SidebarProvider className="app-backdrop h-svh">
      <AppSidebar />
      <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto">
        {/* Fijo arriba al desplazarse. En la empresa de práctica incluye la franja
            del modo enseñanza (21-nov): así "Volver a mi cuenta" siempre está a
            la vista (antes se iba con el scroll; pedido del usuario 26-nov). */}
        <div className="sticky top-0 z-10">
          {access?.isPractice && (
            <Suspense fallback={null}>
              <PracticeModeBanner />
            </Suspense>
          )}
          <div className="flex items-center justify-end gap-2 border-b bg-background/80 px-4 py-2 backdrop-blur">
            {/* Celular: el menú lateral vive escondido en un panel deslizable y
                su propio botón está adentro de él, así que sin este botón no
                había forma de abrirlo. En escritorio el menú ya está a la vista. */}
            <SidebarTrigger aria-label="Abrir menú" className="mr-auto size-9 md:hidden" />
            <ReminderBell />
            <ThemeToggle />
          </div>
        </div>
        {/* Entrada suave de cada pantalla, en CSS (27-nov, velocidad). Antes
            AnimatePresence "wait" esperaba a que la anterior se desvaneciera
            (0,36 s por navegación) y montaba la nueva dos veces. */}
        <div
          key={location.pathname}
          // Celular: menos margen (en 360 px, p-6 se comía el 13% del ancho)
          // y pb-24 para que el botón flotante de "Nueva cotización" no
          // tape la paginación ni el último elemento de la pantalla.
          className="animate-page min-w-0 w-full p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-24"
        >
          <Outlet />
        </div>
      </main>

      {/* Fijo en toda la app autenticada (pedido explícito del usuario:
          "siempre esté un botón... para crear cotización"), no solo en
          /cotizaciones — mismo diálogo que ya usa QuotationsPage.tsx, con
          un trigger circular flotante en vez del botón con texto de ahí. */}
      {showQuickQuotation && (
        <Suspense fallback={QUICK_QUOTATION_BUTTON}>
          <CreateQuotationDialog trigger={QUICK_QUOTATION_BUTTON} />
        </Suspense>
      )}
      {/* Capa del modo enseñanza: solo dibuja algo con una lección en curso. */}
      {access?.isPractice && (
        <Suspense fallback={null}>
          <TutorialOverlay />
        </Suspense>
      )}
    </SidebarProvider>
  );
}

// Botón flotante de "Nueva cotización" (el mismo mientras se descarga el diálogo).
const QUICK_QUOTATION_BUTTON = (
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
);

function ShellSkeleton() {
  return (
    <div className="flex h-svh items-center justify-center bg-muted/30">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
