import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useCashPeriodStatus } from '@/modules/cashClosings/hooks/useCashClosings';
import { lockedDatesExcept } from '@/modules/cashClosings/utils/period';
import { useCreateCashTransfer } from '@/modules/cashMovements/hooks/useCashMovements';
import {
  createCashTransferSchema,
  type CreateCashTransferFormValues,
} from '@/modules/cashMovements/schemas/cashMovement.schema';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { DateField } from '@/presentation/components/shared/DateField';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
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
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const EMPTY_VALUES: Partial<CreateCashTransferFormValues> = {
  from_payment_account_id: null,
  to_payment_account_id: null,
};

const toNullableText = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Pasar plata de una cuenta propia a otra (banco → Yape, efectivo → banco…).
// No es ingreso ni egreso: en Caja aparece como dos filas que mueven el saldo
// de cada cuenta, sin inflar los totales (pedido explícito del usuario). Mismo
// patrón que "Nuevo movimiento".
export function CreateCashTransferDialog() {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { mutate: create, isPending } = useCreateCashTransfer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateCashTransferFormValues>({
    resolver: zodResolver(createCashTransferSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Super Administrador: primero la empresa; recién ahí sus cuentas.
  const selectedCompanyId = isSystem ? watch('company_id') : undefined;
  const listsEnabled = !isSystem || Boolean(selectedCompanyId);
  // Fechas de meses cerrados no se pueden usar.
  const { data: periodStatus } = useCashPeriodStatus(selectedCompanyId, { enabled: listsEnabled });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset(EMPTY_VALUES);
  };

  const handleCompanyChange = (companyId: number) => {
    setValue('company_id', companyId, { shouldValidate: true });
    // Las cuentas elegidas antes eran de otra empresa.
    setValue('from_payment_account_id', null);
    setValue('to_payment_account_id', null);
  };

  const onSubmit = (values: CreateCashTransferFormValues) => {
    if (isSystem && !values.company_id) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    create(
      {
        ...values,
        description: toNullableText(values.description),
        operation_number: toNullableText(values.operation_number),
      },
      {
        onSuccess: () => {
          toast.success('Transferencia registrada correctamente');
          handleOpenChange(false);
        },
        onError: (mutationError) => {
          toast.error((mutationError as ApiClientError).message ?? 'No se pudo registrar la transferencia');
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="size-4" />
          Transferir
        </Button>
      </DialogTrigger>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferencia entre cuentas</DialogTitle>
          <DialogDescription>
            Mueve dinero de una cuenta a otra de la empresa. No cuenta como ingreso ni como egreso: solo cambia el saldo de
            cada cuenta.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CompanyStoreFields
            companyId={watch('company_id')}
            onCompanyChange={handleCompanyChange}
            businessUnitId={watch('business_unit_id')}
            onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
            companyError={errors.company_id?.message}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash-transfer-from">Sale de</Label>
              <PaymentAccountSelect
                id="cash-transfer-from"
                value={watch('from_payment_account_id')}
                onChange={(value) => setValue('from_payment_account_id', value, { shouldValidate: true })}
                cashLabel="Efectivo"
                companyId={selectedCompanyId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-transfer-to">Entra a</Label>
              <PaymentAccountSelect
                id="cash-transfer-to"
                value={watch('to_payment_account_id')}
                onChange={(value) => setValue('to_payment_account_id', value, { shouldValidate: true })}
                cashLabel="Efectivo"
                companyId={selectedCompanyId}
              />
              {errors.to_payment_account_id && (
                <p className="text-sm text-destructive">{errors.to_payment_account_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash-transfer-amount">Monto (S/)</Label>
              <Input id="cash-transfer-amount" type="number" step={DECIMAL_INPUT_STEP} {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-transfer-date">Fecha</Label>
              <DateField
                id="cash-transfer-date"
                value={watch('occurred_at')}
                onChange={(value) => setValue('occurred_at', value, { shouldValidate: true })}
                disabled={combineDisabled(disableFuture, lockedDatesExcept(periodStatus))}
              />
              {errors.occurred_at && <p className="text-sm text-destructive">{errors.occurred_at.message}</p>}
            </div>
          </div>

          <OperationNumberField id="cash-transfer-operation" error={errors.operation_number?.message} {...register('operation_number')} />

          <div className="space-y-2">
            <Label htmlFor="cash-transfer-description">Descripción (opcional)</Label>
            <Textarea
              id="cash-transfer-description"
              rows={2}
              placeholder="Ej.: depósito del efectivo de la semana al banco"
              {...register('description')}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : 'Registrar transferencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
