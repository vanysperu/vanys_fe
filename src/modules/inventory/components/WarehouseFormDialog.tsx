import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiClientError } from '@/config/api.types';
import { useCreateWarehouse, useUpdateWarehouse } from '@/modules/inventory/hooks/useInventory';
import type { Warehouse } from '@/modules/inventory/types/inventory.types';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

// Mismas reglas que el backend (inventory.validator.ts + warehouse_shared.ts).
const schema = z
  .object({
    business_unit_id: z.number({ error: 'Elige la tienda' }).int().positive('Elige la tienda'),
    code: z.string().trim().regex(/^[A-Za-z0-9-]{1,20}$/, 'Letras, números o guiones (máximo 20)'),
    name: z.string().trim().min(1, 'Ponle un nombre').max(120, 'Máximo 120 caracteres'),
    address: z.string().max(255).optional(),
    ubigeo: z.string().regex(/^\d{6}$/, 'El ubigeo tiene 6 dígitos').optional().or(z.literal('')),
    sunat_establishment_code: z.string().regex(/^\d{4}$/, 'Son 4 dígitos (0000 = domicilio fiscal)').optional().or(z.literal('')),
    allow_negative_stock: z.boolean(),
    track_lots: z.boolean(),
    track_expiry: z.boolean(),
    expiry_alert_days: z.number().int().min(0).max(365),
    block_expired: z.boolean(),
    is_default: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // D5: un lote en negativo no tiene sentido.
    if (values.track_lots && values.allow_negative_stock) {
      ctx.addIssue({ code: 'custom', path: ['allow_negative_stock'], message: 'Con lotes no se permite stock negativo' });
    }
    if (values.track_expiry && !values.track_lots) {
      ctx.addIssue({ code: 'custom', path: ['track_expiry'], message: 'El vencimiento se controla por lote: activa los lotes' });
    }
  });
type FormValues = z.infer<typeof schema>;

const defaultsFor = (warehouse?: Warehouse): FormValues => ({
  business_unit_id: warehouse?.business_unit_id ?? 0,
  code: warehouse?.code ?? '',
  name: warehouse?.name ?? '',
  address: warehouse?.address ?? '',
  ubigeo: warehouse?.ubigeo ?? '',
  sunat_establishment_code: warehouse?.sunat_establishment_code ?? '',
  allow_negative_stock: warehouse?.allow_negative_stock ?? false,
  track_lots: warehouse?.track_lots ?? false,
  track_expiry: warehouse?.track_expiry ?? false,
  expiry_alert_days: warehouse?.expiry_alert_days ?? 30,
  block_expired: warehouse?.block_expired ?? true,
  is_default: warehouse?.is_default ?? false,
});

// Alta y configuración de un almacén (plan §8.2).
export function WarehouseFormDialog({ warehouse, onClose, companyId }: { warehouse?: Warehouse; onClose?: () => void; companyId?: number }) {
  const isEditing = Boolean(warehouse);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { data: stores } = useBusinessUnits({ page: 1, limit: 100, companyId: companyId ?? access?.companyId ?? undefined });
  const { mutate: create, isPending: isCreating } = useCreateWarehouse();
  const { mutate: update, isPending: isUpdating } = useUpdateWarehouse();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaultsFor(warehouse) });

  const handleOpenChange = (next: boolean) => {
    if (next && !warehouse) reset(defaultsFor());
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: FormValues) => {
    const dto = { ...values, ...(companyId ? { company_id: companyId } : {}) };
    const onError = (error: unknown) => toast.error((error as ApiClientError).message);
    if (isEditing && warehouse) {
      update({ id: warehouse.id, dto }, { onSuccess: () => { toast.success('Almacén actualizado'); handleOpenChange(false); }, onError });
      return;
    }
    create(dto, { onSuccess: () => { toast.success('Almacén creado'); handleOpenChange(false); }, onError });
  };

  const toggle = (name: 'allow_negative_stock' | 'track_lots' | 'track_expiry' | 'block_expired' | 'is_default', label: string, hint: string) => (
    <label className="flex items-start gap-3 rounded-lg border p-2.5 text-sm">
      <ToggleSwitch checked={watch(name)} label={label} onCheckedChange={(checked) => setValue(name, checked, { shouldValidate: true })} />
      <span className="space-y-0.5">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
        {errors[name] && <span className="block text-xs text-destructive">{errors[name]?.message}</span>}
      </span>
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nuevo almacén
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Configurar almacén' : 'Nuevo almacén'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Tienda</Label>
              <Select
                value={watch('business_unit_id') ? String(watch('business_unit_id')) : undefined}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue('business_unit_id', Number(value), { shouldValidate: true });
                }}
              >
                <SelectTrigger aria-label="Tienda">
                  <SelectValue placeholder="Elige la tienda" />
                </SelectTrigger>
                <SelectContent>
                  {(stores?.data ?? []).map((store) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.business_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.business_unit_id && <p className="text-xs text-destructive">{errors.business_unit_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="warehouse-code">Código</Label>
              <Input id="warehouse-code" placeholder="PRIN" {...register('code')} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="warehouse-name">Nombre</Label>
              <Input id="warehouse-name" placeholder="Almacén principal" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {toggle('is_default', 'Predeterminado de la tienda', 'De aquí salen las ventas al entregar.')}
            {toggle('allow_negative_stock', 'Permitir stock negativo', 'Deja sacar aunque el sistema no tenga stock.')}
            {toggle('track_lots', 'Controla lotes', 'Cada ingreso lleva su lote; la salida usa el que vence primero.')}
            {toggle('track_expiry', 'Controla vencimiento', 'Pide la fecha de vencimiento a los productos perecibles.')}
          </div>
          {watch('track_expiry') && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="warehouse-alert-days">Avisar con cuántos días de anticipación</Label>
                <Input id="warehouse-alert-days" type="number" min={0} max={365} {...register('expiry_alert_days', { valueAsNumber: true })} />
              </div>
              {toggle('block_expired', 'Bloquear lotes vencidos', 'Un lote vencido no puede salir.')}
            </div>
          )}

          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Para la guía de remisión (opcional)</legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor="warehouse-address" className="text-xs">Dirección</Label>
                <Input id="warehouse-address" {...register('address')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="warehouse-ubigeo" className="text-xs">Ubigeo</Label>
                <Input id="warehouse-ubigeo" inputMode="numeric" maxLength={6} {...register('ubigeo')} />
                {errors.ubigeo && <p className="text-xs text-destructive">{errors.ubigeo.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="warehouse-sunat" className="text-xs">Código de establecimiento SUNAT</Label>
                <Input id="warehouse-sunat" inputMode="numeric" maxLength={4} {...register('sunat_establishment_code')} />
                {errors.sunat_establishment_code && <p className="text-xs text-destructive">{errors.sunat_establishment_code.message}</p>}
              </div>
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="submit" disabled={isCreating || isUpdating}>
              <Check className="size-4" />
              {isEditing ? 'Guardar cambios' : 'Crear almacén'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
