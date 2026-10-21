import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Label } from '@/presentation/components/shared/ui/label';

interface RequiresCustomizationFieldProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// "¿Este producto se personaliza?" — mismo campo en el formulario de Lista de
// precios y en el alta rápida desde la cotización. Apagado: el producto se
// cotiza sin técnica (ni selector en la cotización ni columna en el PDF).
export function RequiresCustomizationField({ id, checked, onChange }: RequiresCustomizationFieldProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg border p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="cursor-pointer">
          Requiere personalización
        </Label>
        <p className="text-xs text-muted-foreground">
          Márcalo si al cotizar hay que elegir una técnica (serigrafía, bordado, etc.). Si no, se cotiza solo con el
          precio del producto.
        </p>
      </div>
    </div>
  );
}
