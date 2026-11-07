import type { ComponentProps } from 'react';

import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';

interface OperationNumberFieldProps extends ComponentProps<typeof Input> {
  id: string;
  error?: string;
}

// N.° de operación del dinero que sale de la empresa: siempre opcional. Recibe
// lo mismo que un Input, así sirve con register() o con estado propio.
export function OperationNumberField({ id, error, ...inputProps }: OperationNumberFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>N.° de operación (opcional)</Label>
      <Input id={id} maxLength={50} autoComplete="off" {...inputProps} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
