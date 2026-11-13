import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP, toOptionalNumber } from '@/lib/inputRestrictions';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useCreateTechnique, useUpdateTechnique } from '@/modules/products/hooks/useTechniques';
import { createTechniqueSchema, type CreateTechniqueFormValues } from '@/modules/products/schemas/product.schema';
import type { CustomizationTechnique } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface TechniqueFormDialogProps {
  // Con técnica = editar (el diálogo nace abierto); sin técnica = crear.
  technique?: CustomizationTechnique;
  onClose?: () => void;
  // Crear desde otro formulario (ej. Nueva cotización): la empresa ya se
  // eligió allá y no se vuelve a pedir.
  fixedCompanyId?: number;
  // Se llama con la técnica recién creada (para seleccionarla donde se pidió).
  onCreated?: (technique: CustomizationTechnique) => void;
  // Botón que abre el diálogo al crear. Por defecto, "Nueva técnica".
  trigger?: ReactNode;
  // Prefijo de los id de los campos: si este formulario se abre encima de otro
  // (Nueva cotización), los id no pueden repetirse en la página.
  idPrefix?: string;
}

// Igual que el producto: un precio POR UNIDAD según el volumen pedido. El
// item cobra (producto + técnica) en el mismo modo × cantidad (pedido
// explícito del usuario).
const PRICE_FIELDS = [
  { id: 'tech_price_unit', name: 'price_unit', label: 'Por unidad (S/)' },
  { id: 'tech_price_hundred', name: 'price_hundred', label: 'Por ciento (S/)' },
  { id: 'tech_price_half_thousand', name: 'price_half_thousand', label: 'Medio millar (S/)' },
  { id: 'tech_price_thousand', name: 'price_thousand', label: 'Por millar (S/)' },
] as const;

// Formulario único de técnica de personalización (Sprint 2, ítem 9: mismo
// criterio que cliente y producto). Lo usan la pestaña Técnicas de Productos
// y el "+" de Nueva cotización.
export function TechniqueFormDialog({
  technique,
  onClose,
  fixedCompanyId,
  onCreated,
  trigger,
  idPrefix = '',
}: TechniqueFormDialogProps) {
  const isEditing = Boolean(technique);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { mutate: create, isPending: isCreating, error: createError, reset: clearCreateError } = useCreateTechnique();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateTechnique();
  const fieldId = (name: string) => `${idPrefix}${name}`;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateTechniqueFormValues>({
    resolver: zodResolver(createTechniqueSchema),
  });

  useEffect(() => {
    if (technique) {
      reset({
        name: technique.name,
        description: technique.description ?? '',
        price_unit: technique.price_unit != null ? Number(technique.price_unit) : undefined,
        price_hundred: technique.price_hundred != null ? Number(technique.price_hundred) : undefined,
        price_half_thousand: technique.price_half_thousand != null ? Number(technique.price_half_thousand) : undefined,
        price_thousand: technique.price_thousand != null ? Number(technique.price_thousand) : undefined,
      });
    }
  }, [technique, reset]);

  const handleOpenChange = (next: boolean) => {
    // Al abrir para crear se parte de cero (y sin el error de un intento anterior).
    if (next && !technique) {
      reset();
      clearCreateError();
    }
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateTechniqueFormValues) => {
    if (isEditing && technique) {
      const { company_id: _companyId, ...dto } = values;
      update(
        { id: technique.id, dto },
        {
          onSuccess: () => {
            toast.success('Técnica actualizada correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    // La empresa ya elegida en el formulario de origen, o: un usuario de
    // empresa crea en la suya; el Super Administrador en la que eligió acá.
    const companyId = fixedCompanyId ?? (access?.isSystem ? values.company_id : access?.companyId);
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (created) => {
          toast.success('Técnica creada correctamente');
          onCreated?.(created);
          reset();
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;
  const showCompanyFields = !isEditing && fixedCompanyId === undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="size-4" />
              Nueva técnica
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar técnica' : 'Nueva técnica de personalización'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            // Abierto encima de Nueva cotización: sin esto, el submit también
            // enviaría el formulario de la cotización (React propaga el evento
            // por el árbol de componentes aunque el diálogo esté en un portal).
            event.stopPropagation();
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          {showCompanyFields && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor={fieldId('tech-name')}>Nombre</Label>
            <Input id={fieldId('tech-name')} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Precio por unidad según volumen (carga el/los que apliquen)</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRICE_FIELDS.map(({ id, name, label }) => (
                <div key={id} className="space-y-1">
                  <Label htmlFor={fieldId(id)} className="text-xs font-normal text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={fieldId(id)}
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register(name, { setValueAs: toOptionalNumber })}
                  />
                </div>
              ))}
            </div>
            {errors.price_unit && <p className="text-sm text-destructive">{errors.price_unit.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor={fieldId('tech-description')}>Descripción</Label>
            <Input id={fieldId('tech-description')} {...register('description')} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear técnica'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
