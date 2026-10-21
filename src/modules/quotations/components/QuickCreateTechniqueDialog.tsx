import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCreateTechnique } from '@/modules/products/hooks/useTechniques';
import { createTechniqueSchema, type CreateTechniqueFormValues } from '@/modules/products/schemas/product.schema';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';
import { toOptionalNumber, DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';

interface QuickCreateTechniqueDialogProps {
  companyId?: number;
  onCreated: (id: number) => void;
}

const TIER_FIELDS = [
  { id: 'quick-technique-price-unit', field: 'price_unit', label: 'Unidad' },
  { id: 'quick-technique-price-hundred', field: 'price_hundred', label: 'Ciento' },
  { id: 'quick-technique-price-half-thousand', field: 'price_half_thousand', label: 'Medio millar' },
  { id: 'quick-technique-price-thousand', field: 'price_thousand', label: 'Millar' },
] as const;

// "+" al lado del select de Técnica — mismo formulario que la creación
// rápida de productos: la técnica tiene sus propios 4 precios por volumen,
// y el item cobra (producto + técnica) en el mismo modo × cantidad. Antes
// este diálogo solo ofrecía el modo "porcentual", así que toda técnica
// creada desde la cotización se cobraba como un % del producto.
export function QuickCreateTechniqueDialog({ companyId, onCreated }: QuickCreateTechniqueDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateTechnique();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTechniqueFormValues>({ resolver: zodResolver(createTechniqueSchema) });

  const onSubmit = (values: CreateTechniqueFormValues) => {
    if (!companyId) return;
    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (technique) => {
          toast.success('Técnica creada');
          onCreated(technique.id);
          reset();
          setOpen(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title="Nueva técnica">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva técnica de personalización</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="quick-technique-name">Nombre</Label>
            <Input id="quick-technique-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Precio por unidad según volumen (carga los que apliquen)</Label>
            <div className="grid grid-cols-2 gap-2">
              {TIER_FIELDS.map(({ id, field, label }) => (
                <div key={id} className="space-y-1">
                  <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
                    {label}
                  </Label>
                  <Input id={id} type="number" step={DECIMAL_INPUT_STEP} min="0" {...register(field, { setValueAs: toOptionalNumber })} />
                </div>
              ))}
            </div>
            {errors.price_unit && <p className="text-xs text-destructive">{errors.price_unit.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={isPending}>
              <Check className="size-4" />
              Crear técnica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
