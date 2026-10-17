import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { resolveIcon } from '@/lib/resolveIcon';
import { cn } from '@/lib/utils';
import { logout } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';
import { Avatar, AvatarFallback } from '@/presentation/components/shared/ui/avatar';
import { Badge } from '@/presentation/components/shared/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/presentation/components/shared/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/presentation/components/shared/ui/tooltip';
import type { MyAccessViewItem } from '@/presentation/hooks/shared/useAccess';
import { getStoreOrCompanyLabel, useAccess } from '@/presentation/hooks/shared/useAccess';

// El backend arma el árbol completo (módulos -> vistas -> sub-vistas) según
// lo que el rol tiene otorgado (GET /access/me). El front NO decide qué
// mostrar: una sola vista de menú para todos los roles, solo cambia qué
// nodos llegan en la respuesta (CLAUDE.md sección 7 - Menú dinámico).
//
// Cada módulo aporta su(s) vista(s) de nivel raíz directamente a la lista
// (sin envolver cada módulo en una tarjeta/caja) — si una vista tiene
// hijos (ej. "Productos" -> "Técnicas de personalización") se convierte en
// un grupo colapsable, si no, es un link plano de una sola línea.
//
// El colapsado/expandido se maneja con el primitivo shadcn (SidebarProvider
// en Shell.tsx, sección 7 CLAUDE.md) — este componente solo consume
// useSidebar() para adaptar su propio contenido (header, footer) al estado
// "collapsed" (icon-only), la mecánica de colapso en sí ya la resuelve el
// primitivo (cookie `sidebar_state`, atajo Ctrl/Cmd+B, SidebarRail, etc.).
export function AppSidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: access } = useAccess();
  const clearToken = useAuthStore((state) => state.clearToken);
  const user = useAuthStore((state) => state.user);
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const rootViews = useMemo(
    () => (access?.views ?? []).flatMap((module) => module.views.filter((view) => view.show_in_menu)),
    [access],
  );

  const { mutate: signOut, isPending } = useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Misma razón que en LoginPage: limpiar la caché de React Query para
      // que el siguiente login (otro usuario/empresa) no arranque con
      // datos/permisos de esta sesión todavía en memoria.
      queryClient.clear();
      clearToken();
      navigate('/login', { replace: true });
    },
  });

  // Rol mostrado en el bloque de usuario: viene de /access/me (roleName), con
  // el mismo fallback de "Super Administrador" para roles de plataforma sin
  // nombre propio cargado.
  const roleLabel = access?.roleName ?? (access?.isSystem ? 'Super Administrador' : 'Usuario');
  // Tienda del usuario si tiene una asignada, si no la empresa (fallback
  // centralizado en useAccess para no repetirlo en otra pantalla).
  const storeLabel = getStoreOrCompanyLabel(access);
  // Subtítulo del tooltip (modo colapsado), donde no hay espacio para el
  // badge: mismo formato de texto plano "Rol · Tienda-o-empresa".
  const subtitleLabel = storeLabel ? `${roleLabel} · ${storeLabel}` : roleLabel;
  const initials = getInitials(user?.fullName);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="p-0">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <NavLink
            to="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sidebar-accent text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30">
              G
            </div>
            {!isCollapsed && <span className="text-lg font-semibold tracking-tight">Grulla</span>}
          </NavLink>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin gap-0.5 px-3 pb-4">
        <AnimatePresence>
          {rootViews.map((view, index) => (
            <RootViewItem key={view.id} view={view} index={index} isCollapsed={isCollapsed} />
          ))}
        </AnimatePresence>
      </SidebarContent>

      <SidebarFooter className="gap-0 border-t border-white/10 p-3">
        {/* Bloque de sesión compacto: avatar con iniciales + nombre/rol-tienda
            apilados a la derecha, y el botón de cerrar sesión (solo ícono)
            alineado al final de la misma fila. En modo colapsado se reduce
            al avatar con un tooltip disparado desde el botón de logout. */}
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={isPending}
                onClick={() => signOut()}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="group flex w-full items-center justify-center rounded-lg px-0 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground disabled:opacity-50"
              >
                <Avatar className="ring-1 ring-white/10">
                  <AvatarFallback className="bg-white/10 text-xs font-semibold text-sidebar-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{user?.fullName ?? 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">{subtitleLabel}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex flex-col gap-2 px-1 py-1">
            {/* Fila 1: avatar + nombre/rol, siguiendo el patrón que shadcn/ui
                recomienda para el footer de sesión (SidebarMenuButton size="lg",
                avatar a la izquierda + 2 líneas de texto a la derecha). */}
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar className="size-8 shrink-0 ring-1 ring-white/10">
                  <AvatarFallback className="bg-white/10 text-xs font-semibold text-sidebar-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col leading-tight">
                  <p className="truncate text-sm font-bold text-sidebar-foreground">
                    {user?.fullName ?? 'Usuario'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => signOut()}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground disabled:opacity-50"
              >
                <LogOut className="size-4" />
              </button>
            </div>
            {/* Fila 2: badge de tienda/empresa en su propia línea, con ancho
                libre (w-fit) para que no se corte por el ancho angosto del
                sidebar como pasaba cuando compartía fila con el nombre. */}
            {storeLabel && (
              <Badge
                variant="secondary"
                title={storeLabel}
                className="w-fit max-w-full truncate px-2 py-0.5 text-[11px] font-medium leading-4"
              >
                {storeLabel}
              </Badge>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// Un item "contiene" la ruta activa si él mismo o cualquiera de sus
// descendientes apunta a ella — se usa para autoexpandir el grupo correcto
// al entrar directo a una sub-vista (ej. recargar en /productos/tecnicas).
function containsActiveRoute(view: MyAccessViewItem, pathname: string): boolean {
  if (view.route && matchesRoute(view.route, pathname)) return true;
  return view.children.some((child) => containsActiveRoute(child, pathname));
}

function matchesRoute(route: string, pathname: string): boolean {
  return route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`);
}

// Iniciales para el avatar del bloque de usuario: primera letra del primer
// nombre + primera letra del último apellido (ej. "Admin Depilab" -> "AD").
function getInitials(fullName: string | undefined): string {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

function RootViewItem({
  view,
  index,
  isCollapsed,
}: {
  view: MyAccessViewItem;
  index: number;
  isCollapsed: boolean;
}) {
  const { pathname } = useLocation();
  const menuChildren = view.children.filter((child) => child.show_in_menu);
  const isGroup = menuChildren.length > 0;
  const [isOpen, setIsOpen] = useState(() => containsActiveRoute(view, pathname));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      {isGroup ? (
        <GroupHeader view={view} isOpen={isOpen} onToggle={() => setIsOpen((open) => !open)} isCollapsed={isCollapsed} />
      ) : (
        <ViewLink view={view} isCollapsed={isCollapsed} />
      )}
      {isGroup && !isCollapsed && (
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {/* Línea conectora: marca visualmente que estos items pertenecen al grupo de arriba. */}
              <div className="relative ml-4 border-l border-white/10 pl-2">
                {menuChildren.map((child) => (
                  <ViewLink key={child.id} view={child} isCollapsed={isCollapsed} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}

function GroupHeader({
  view,
  isOpen,
  onToggle,
  isCollapsed,
}: {
  view: MyAccessViewItem;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
}) {
  const { pathname } = useLocation();
  const Icon = resolveIcon(view.icon);
  const isActiveGroup = containsActiveRoute(view, pathname);

  const button = (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors',
        isCollapsed && 'justify-center px-0',
        isActiveGroup ? 'text-white' : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate text-left">{view.name}</span>
          <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
        </>
      )}
    </button>
  );

  if (!isCollapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{view.name}</TooltipContent>
    </Tooltip>
  );
}

function ViewLink({ view, isCollapsed }: { view: MyAccessViewItem; isCollapsed: boolean }) {
  const ViewIcon = resolveIcon(view.icon);
  if (!view.route) return null;

  const link = (
    <NavLink
      to={view.route}
      end={view.route === '/'}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 rounded-lg py-2 pr-3 pl-2.5 text-sm font-medium transition-colors',
          isCollapsed && 'justify-center px-0',
          isActive
            ? 'bg-primary/20 font-semibold text-white'
            : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !isCollapsed && (
            <motion.span
              layoutId="sidebar-active-pill"
              className="absolute inset-y-1 left-0 w-1 rounded-full bg-sidebar-accent"
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          <ViewIcon className={cn('size-4 shrink-0', isActive && 'text-sidebar-accent')} />
          {!isCollapsed && <span className="truncate">{view.name}</span>}
        </>
      )}
    </NavLink>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{view.name}</TooltipContent>
    </Tooltip>
  );
}
