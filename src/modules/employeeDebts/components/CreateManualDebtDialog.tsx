import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useCreateManualEmployeeDebt } from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import {
  createManualDebtSchema,
  INCOME_ONLY_CATEGORIES,
  type CreateManualDebtFormValues,
} from '@/modules/employeeDebts/schemas/employeeDebt.schema';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { DateField } from '@/presentation/components/shared/DateField';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const DESCRIPTION_MAX = 300;

// Deuda manual (pedido explícito del usuario: "si un empleado fue a pagar los
// servicios y los pagó de su plata"). No mueve Caja al registrarse: la
// empresa queda debiéndole al trabajador, y el egreso será la reposición.
export function CreateManualDebtDialog() {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { mutate: createDebt, isPending } = useCreateManualEmployeeDebt();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    resetField,
    formState: { errors },
  } = useForm<CreateManualDebtFormValues>({
    resolver: zodResolver(createManualDebtSchema),
    defaultValues: { incurred_at: todayLocalDateString(), business_unit_id: null },
  });

  const companyId = isSystem ? watch('company_id') : (access?.companyId ?? undefined);
  const { data: usersResult } = useUsers({ limit: 100, isActive: true });
  const { data: categoriesResult } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });

  // Solo trabajadores activos de la empresa elegida (el Super Administrador
  // ve usuarios de todas). El backend lo revalida.
  const workers = (usersResult?.data ?? []).filter(
    (user) => user.status && (companyId === undefined || user.company_id === companyId),
  );
  const categories = (categoriesResult?.data ?? []).filter(
    (item) => !item.is_deleted && !INCOME_ONLY_CATEGORIES.includes(item.prefix_id),
  );

  const close = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = (values: CreateManualDebtFormValues) => {
    if (isSystem && !values.company_id) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    createDebt(
      { ...values, company_id: isSystem ? values.company_id : undefined },
      {
        onSuccess: () => {
          toast.success('Deuda registrada: la empresa le debe este monto al trabajador');
          close();
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Registrar deuda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar deuda con un trabajador</DialogTitle>
          <DialogDescription>Un gasto de la empresa que el trabajador pagó con su propia plata.</DialogDescription>
        </DialogHeader>

        <form id="manual-debt-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <CompanyStoreFields
            companyId={watch('company_id')}
            onCompanyChange={(value) => {
              setValue('company_id', value, { shouldValidate: true });
              // El trabajador elegido era de la empresa anterior.
              resetField('user_id');
            }}
            businessUnitId={watch('business_unit_id') ?? undefined}
            onBusinessUnitChange={(value) => setValue('business_unit_id', value ?? null)}
            companyError={errors.company_id?.message}
          />

          <div className="space-y-1">
            <Label>Trabajador que puso el dinero</Label>
            <SearchableSelect
              placeholder="Selecciona una persona"
              disabled={isSystem && !companyId}
              value={watch('user_id') ? String(watch('user_id')) : undefined}
              onChange={(value) => setValue('user_id', Number(value), { shouldValidate: true })}
              options={workers.map((user) => ({
                value: String(user.id),
                label: `${user.name} ${user.paternal_lastname} · ${user.email}`,
              }))}
            />
            {errors.user_id && <p className="text-xs text-destructive">{errors.user_id.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="manual-debt-description">¿Qué pagó?</Label>
            <Input
              id="manual-debt-description"
              placeholder="Luz de octubre, recibo N.° 123…"
              maxLength={DESCRIPTION_MAX}
              {...register('description')}
            />
            <div className="flex items-center justify-between">
              {errors.description ? <p className="text-xs text-destructive">{errors.description.message}</p> : <span />}
              <CharCounter value={watch('description')} max={DESCRIPTION_MAX} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Categoría del gasto</Label>
            <SearchableSelect
              placeholder="Selecciona una categoría"
              value={watch('category')}
              onChange={(value) => setValue('category', value, { shouldValidate: true })}
              options={categories.map((item) => ({ value: item.prefix_id, label: item.name }))}
            />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="manual-debt-amount">Monto (S/)</Label>
              <Input
                id="manual-debt-amount"
                type="number"
                step={DECIMAL_INPUT_STEP}
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-debt-date">Fecha en que pagó</Label>
              <DateField
                id="manual-debt-date"
                value={watch('incurred_at')}
                onChange={(value) => setValue('incurred_at', value, { shouldValidate: true })}
                disabled={disableFuture}
              />
              {errors.incurred_at && <p className="text-xs text-destructive">{errors.incurred_at.message}</p>}
            </div>
          </div>

          <p className="flex gap-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            No mueve Caja: la plata salió del bolsillo del trabajador. El egreso se registra cuando se le repone
            ("Marcar como pagado").
          </p>
        </form>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="manual-debt-form" disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Registrar deuda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
