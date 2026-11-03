import type { UseFormRegisterReturn } from 'react-hook-form';

import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

interface CorrectionReasonFieldProps {
  id: string;
  // `register('reason')` del formulario del diálogo.
  registration: UseFormRegisterReturn;
  error?: string;
  placeholder?: string;
  // Opcional: por defecto "Motivo de la corrección" (reabrir un mes o anular
  // un movimiento de un mes cerrado usan otra etiqueta).
  label?: string;
}

// Motivo obligatorio de toda corrección de dinero (5 a 500 caracteres, mismo
// rango que valida el backend). Va en todos los diálogos de corrección con
// la misma etiqueta y forma.
export function CorrectionReasonField({
  id,
  registration,
  error,
  placeholder = 'Ej.: se tipeó mal el monto',
  label = 'Motivo de la corrección',
}: CorrectionReasonFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={2} maxLength={500} placeholder={placeholder} {...registration} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
