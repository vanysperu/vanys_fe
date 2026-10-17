import { Ban, Power } from 'lucide-react';

import { Button } from '@/presentation/components/shared/ui/button';

interface ToggleStatusButtonProps {
  // true = el registro está ACTIVO ahora mismo (se ofrece deshabilitarlo);
  // false = está deshabilitado (se ofrece habilitarlo). No es "isDeleted"
  // para no obligar a cada pantalla a invertir la lógica al llamarlo.
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  // Se usa en el `title` (tooltip nativo) y en el aria-label — como el botón
  // ya no lleva texto visible, este es el único lugar donde queda claro qué
  // hace para lectores de pantalla y al pasar el mouse por encima.
  entityLabel: string;
}

// Botón de deshabilitar/habilitar reducido a un solo ícono — antes cada
// pantalla de catálogo (usuarios, roles, empresas, tiendas, productos,
// técnicas, clientes) repetía el mismo botón de texto ("Deshabilitar"/
// "Habilitar"), ocupando demasiado espacio en la fila de acciones (pedido
// explícito del usuario). Un solo componente para las 7 pantallas que lo
// usan, mismo patrón que los botones de ícono de editar/eliminar
// (CLAUDE.md sección 7 — reutilización, vista consistente).
export function ToggleStatusButton({ active, onToggle, disabled, entityLabel }: ToggleStatusButtonProps) {
  const label = active ? `Deshabilitar ${entityLabel}` : `Habilitar ${entityLabel}`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      disabled={disabled}
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      {active ? (
        <Ban className="size-4 text-destructive" />
      ) : (
        <Power className="size-4 text-[var(--success)]" />
      )}
    </Button>
  );
}
