import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { routeAppearance } from '@/app/navigation/menuConfig';
import { resolveIcon } from '@/lib/resolveIcon';
import { TONE_CHIP, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  // Ícono y color del título. Por defecto, los de la pantalla en el menú (su
  // ícono y el color de su sección); null = sin ícono.
  icon?: LucideIcon | null;
  tone?: Tone;
}

// Ícono recibido como dato (del menú): se dibuja aquí para no declarar un
// componente nuevo en cada render (mismo patrón que AppSidebar).
function ChipIcon({ icon: IconComponent }: { icon: LucideIcon }) {
  return <IconComponent className="size-5" />;
}

// Título de pantalla con el ícono de su sección en color (27-nov, "colores
// vivos"): sale solo del menú, así ninguna pantalla tiene que pasarlo.
export function PageHeader({ title, description, action, icon, tone }: PageHeaderProps) {
  const { pathname } = useLocation();
  const { data: access } = useAccess();
  const fromMenu = access ? routeAppearance(access.views, pathname) : null;
  const Icon = icon === undefined ? (fromMenu?.icon ? resolveIcon(fromMenu.icon) : null) : icon;
  const chipTone = tone ?? fromMenu?.tone ?? 'blue';

  return (
    // Sin animación propia: la pantalla entera ya entra con una (Shell, animate-page).
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span
            aria-hidden
            className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5', TONE_CHIP[chipTone])}
          >
            <ChipIcon icon={Icon} />
          </span>
        )}
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
