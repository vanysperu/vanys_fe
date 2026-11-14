import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useSaveVehicle } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { vehicleSchema, type VehicleFormValues } from '@/modules/dispatchGuides/schemas/dispatchGuide.schema';
import type { Vehicle } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface VehicleFormDialogProps {
  // Con vehículo = editar; null = crear.
  vehicle: Vehicle | null;
  onClose: () => void;
}

// Vehículo propio para el transporte privado de la guía (Sprint 2, ítem 1).
export function VehicleFormDialog({ vehicle, onClose }: VehicleFormDialogProps) {
  const { data: access } = useAccess();
  const { mutate: save, isPending } = useSaveVehicle();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { plate: vehicle?.plate ?? '', description: vehicle?.description ?? '', authorization_number: vehicle?.authorization_number ?? '' },
  });

  const submit = (values: VehicleFormValues) => {
    if (access?.isSystem && !vehicle && !values.company_id) {
      toast.error('Elige la empresa');
      return;
    }
    save(
      { id: vehicle?.id, dto: { ...values, description: values.description || null, authorization_number: values.authorization_number || null } },
      {
        onSuccess: () => {
          toast.success(vehicle ? 'Vehículo actualizado' : 'Vehículo creado');
          onClose();
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar vehículo' : 'Nuevo vehículo'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            // El diálogo puede abrirse sobre otro formulario: el submit no sube.
            event.stopPropagation();
            void handleSubmit(submit)(event);
          }}
          className="space-y-3"
        >
          {access?.isSystem && !vehicle && (
            <CompanyStoreFields companyId={watch('company_id')} onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })} />
          )}
          <div className="space-y-1">
            <Label htmlFor="vehicle-plate">Placa</Label>
            <Input id="vehicle-plate" placeholder="ABC-123" {...register('plate')} />
            {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="vehicle-description">Descripción (opcional)</Label>
            <Input id="vehicle-description" placeholder="Furgoneta blanca" {...register('description')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vehicle-authorization">Autorización especial (opcional)</Label>
            <Input id="vehicle-authorization" {...register('authorization_number')} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
