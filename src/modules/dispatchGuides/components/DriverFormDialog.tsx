import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useSaveDriver } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { driverSchema, type DriverFormValues } from '@/modules/dispatchGuides/schemas/dispatchGuide.schema';
import { IDENTITY_DOC_TYPES, type Driver } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface DriverFormDialogProps {
  // Con conductor = editar; null = crear.
  driver: Driver | null;
  onClose: () => void;
}

// Conductor para el transporte privado de la guía (DNI y licencia, plan §9.2).
export function DriverFormDialog({ driver, onClose }: DriverFormDialogProps) {
  const { data: access } = useAccess();
  const { mutate: save, isPending } = useSaveDriver();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      doc_type: driver?.doc_type ?? '1',
      doc_number: driver?.doc_number ?? '',
      first_names: driver?.first_names ?? '',
      last_names: driver?.last_names ?? '',
      license_number: driver?.license_number ?? '',
    },
  });

  const submit = (values: DriverFormValues) => {
    if (access?.isSystem && !driver && !values.company_id) {
      toast.error('Elige la empresa');
      return;
    }
    save(
      { id: driver?.id, dto: values },
      {
        onSuccess: () => {
          toast.success(driver ? 'Conductor actualizado' : 'Conductor creado');
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
          <DialogTitle>{driver ? 'Editar conductor' : 'Nuevo conductor'}</DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            event.stopPropagation();
            void handleSubmit(submit)(event);
          }}
          className="space-y-3"
        >
          {access?.isSystem && !driver && (
            <CompanyStoreFields companyId={watch('company_id')} onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Documento</Label>
              <Select
                value={watch('doc_type')}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue('doc_type', value, { shouldValidate: true });
                }}
              >
                <SelectTrigger id="driver-doc-type" aria-label="Tipo de documento">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IDENTITY_DOC_TYPES)
                    .filter(([code]) => code !== '6')
                    .map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="driver-doc-number">Número</Label>
              <Input id="driver-doc-number" {...register('doc_number')} />
              {errors.doc_number && <p className="text-xs text-destructive">{errors.doc_number.message}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="driver-first-names">Nombres</Label>
            <Input id="driver-first-names" {...register('first_names')} />
            {errors.first_names && <p className="text-xs text-destructive">{errors.first_names.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="driver-last-names">Apellidos</Label>
            <Input id="driver-last-names" {...register('last_names')} />
            {errors.last_names && <p className="text-xs text-destructive">{errors.last_names.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="driver-license">Licencia de conducir</Label>
            <Input id="driver-license" placeholder="Q12345678" {...register('license_number')} />
            {errors.license_number && <p className="text-xs text-destructive">{errors.license_number.message}</p>}
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
