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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

import type { ApiClientError } from '@/config/api.types';

interface QuickCreateTechniqueDialogProps {
  companyId?: number;
  onCreated: (id: number) => void;
}

// "+" al lado del select de Técnica — misma idea que producto/cliente.
export function QuickCreateTechniqueDialog({ companyId, onCreated }: QuickCreateTechniqueDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateTechnique();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTechniqueFormValues>({
    resolver: zodResolver(createTechniqueSchema),
    defaultValues: { extra_type: 'percentage' },
  });

  const onSubmit = (values: CreateTechniqueFormValues) => {
    if (!companyId) return;
    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (technique) => {
          toast.success('Técnica creada');
          onCreated(technique.id);
          reset({ extra_type: 'percentage' });
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
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tipo de costo</Label>
              {/* Solo "porcentual": el modo "fijo" necesita los 4 precios por
                  volumen (ver ProductsPage/TechniqueFormDialog), que este
                  formulario reducido (creación rápida inline) no expone —
                  ofrecerlo acá bloqueaba el submit en silencio (ningún precio
                  cargado, el error de ese campo no se mostraba en este diálogo). */}
              <Select value={watch('extra_type')} onValueChange={(value) => setValue('extra_type', value as 'fixed' | 'percentage')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Porcentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="quick-technique-value">Costo adicional</Label>
              <Input id="quick-technique-value" type="number" step="0.01" {...register('extra_value', { valueAsNumber: true })} />
              {errors.extra_value && <p className="text-xs text-destructive">{errors.extra_value.message}</p>}
            </div>
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
