import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { formatDate } from '@/lib/dateUtils';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { useUpdateCashTransfer } from '@/modules/cashMovements/hooks/useCashMovements';
import {
  updateCashTransferSchema,
  type UpdateCashTransferFormValues,
} from '@/modules/cashMovements/schemas/cashMovement.schema';
import type { CashMovementListItem, CashTransferLegInfo, UpdateCashTransferDto } from '@/modules/cashMovements/types/cashMovement.types';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import {
  describeCorrectionChanges,
  formatMoney,
  type CorrectionChange,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface EditCashTransferDialogProps {
  // Cualquiera de las dos filas (salida o entrada) de la transferencia.
  row: CashMovementListItem & { transfer: CashTransferLegInfo };
  onClose: () => void;
}

const CASH_LABEL = 'Efectivo';

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

interface TransferValues {
  amount: number;
  occurred_at: string;
  from_payment_account_id: number | null;
  to_payment_account_id: number | null;
  operation_number: string | null;
  description: string | null;
}

type TransferField = keyof TransferValues;

const FIELDS: readonly TransferField[] = [
  'amount',
  'occurred_at',
  'from_payment_account_id',
  'to_payment_account_id',
  'operation_number',
  'description',
];

const LABELS: Record<TransferField, string> = {
  amount: 'Monto',
  occurred_at: 'Fecha',
  from_payment_account_id: 'Sale de',
  to_payment_account_id: 'Entra a',
  operation_number: 'N.° de operación',
  description: 'Descripción',
};

// Corregir una transferencia entre cuentas (mismo patrón que corregir un
// movimiento manual): solo se envía lo que cambió, con motivo obligatorio y
// el resumen "Antes → Después" antes de confirmar. El backend deja el antes,
// el después y el motivo en el registro de auditoría.
export function EditCashTransferDialog({ row, onClose }: EditCashTransferDialogProps) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const companyScope = isSystem ? row.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(companyScope);
  const closedGuard = useClosedPeriodGuard(companyScope, row.occurred_at);
  const { mutateAsync: updateTransfer, isPending } = useUpdateCashTransfer();
  const { transfer } = row;

  const original: TransferValues = {
    amount: Math.abs(row.amount),
    occurred_at: row.occurred_at,
    from_payment_account_id: transfer.from_payment_account_id,
    to_payment_account_id: transfer.to_payment_account_id,
    operation_number: normalizeText(row.operation_number),
    description: normalizeText(row.description),
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateCashTransferFormValues>({
    resolver: zodResolver(updateCashTransferSchema),
    defaultValues: {
      ...original,
      operation_number: original.operation_number ?? undefined,
      description: original.description ?? undefined,
      reason: '',
    },
  });

  const confirmation = useCorrectionConfirm<UpdateCashTransferDto>({
    submit: (dto) => updateTransfer({ id: transfer.transfer_id, dto }),
    successMessage: 'Transferencia corregida correctamente',
    fallbackErrorMessage: 'No se pudo corregir la transferencia',
    onSuccess: onClose,
  });

  // Nombre de una cuenta: las de la transferencia ya vienen con nombre (aunque
  // se hayan deshabilitado después); el resto sale del selector.
  const accountName = (accountId: number | null): string => {
    if (accountId === null) return CASH_LABEL;
    if (accountId === transfer.from_payment_account_id) return transfer.from_account_name;
    if (accountId === transfer.to_payment_account_id) return transfer.to_account_name;
    return accountsResult?.data.find((account) => account.id === accountId)?.name ?? `Cuenta #${accountId}`;
  };

  const display = (field: TransferField, values: TransferValues): string => {
    if (field === 'amount') return formatMoney(values.amount);
    if (field === 'occurred_at') return formatDate(values.occurred_at);
    if (field === 'from_payment_account_id' || field === 'to_payment_account_id') return accountName(values[field]);
    return values[field] ?? '—';
  };

  const watched = watch();
  const current: TransferValues = {
    amount: Number(watched.amount),
    occurred_at: watched.occurred_at ?? '',
    from_payment_account_id: watched.from_payment_account_id ?? null,
    to_payment_account_id: watched.to_payment_account_id ?? null,
    operation_number: normalizeText(watched.operation_number),
    description: normalizeText(watched.description),
  };
  const changedFields = FIELDS.filter((field) => original[field] !== current[field]);
  const changes: CorrectionChange[] = changedFields.map((field) => ({
    field,
    label: LABELS[field],
    before: display(field, original),
    after: display(field, current),
  }));

  const onSubmit = (values: UpdateCashTransferFormValues) => {
    if (changedFields.length === 0) return;
    const submitted: TransferValues = {
      amount: values.amount,
      occurred_at: values.occurred_at,
      from_payment_account_id: values.from_payment_account_id,
      to_payment_account_id: values.to_payment_account_id,
      operation_number: normalizeText(values.operation_number),
      description: normalizeText(values.description),
    };
    // Solo lo que cambió (lo ausente se queda como está).
    const dto = changedFields.reduce<UpdateCashTransferDto>(
      (picked, field) => ({ ...picked, [field]: submitted[field] }),
      { reason: values.reason },
    );
    confirmation.request(dto);
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent expandable className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Corregir transferencia</DialogTitle>
            <DialogDescription>
              {transfer.from_account_name} → {transfer.to_account_name}. La corrección queda registrada con el antes, el
              después y el motivo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash-transfer-edit-from">Sale de</Label>
                <PaymentAccountSelect
                  id="cash-transfer-edit-from"
                  value={watched.from_payment_account_id}
                  onChange={(value) => setValue('from_payment_account_id', value, { shouldValidate: true })}
                  cashLabel={CASH_LABEL}
                  companyId={companyScope}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-transfer-edit-to">Entra a</Label>
                <PaymentAccountSelect
                  id="cash-transfer-edit-to"
                  value={watched.to_payment_account_id}
                  onChange={(value) => setValue('to_payment_account_id', value, { shouldValidate: true })}
                  cashLabel={CASH_LABEL}
                  companyId={companyScope}
                />
                {errors.to_payment_account_id && (
                  <p className="text-sm text-destructive">{errors.to_payment_account_id.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash-transfer-edit-amount">Monto (S/)</Label>
                <Input
                  id="cash-transfer-edit-amount"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-transfer-edit-date">Fecha</Label>
                <DateField
                  id="cash-transfer-edit-date"
                  value={watched.occurred_at}
                  onChange={(value) => setValue('occurred_at', value, { shouldValidate: true })}
                  disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
                />
                {errors.occurred_at && <p className="text-sm text-destructive">{errors.occurred_at.message}</p>}
              </div>
            </div>

            <OperationNumberField id="cash-transfer-edit-operation" error={errors.operation_number?.message} {...register('operation_number')} />

            <div className="space-y-2">
              <Label htmlFor="cash-transfer-edit-description">Descripción</Label>
              <Textarea id="cash-transfer-edit-description" rows={2} {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <CorrectionReasonField
              id="cash-transfer-edit-reason"
              registration={register('reason')}
              error={errors.reason?.message}
              placeholder="Ej.: el pase fue a Yape, no al banco"
            />

            <CorrectionPreview changes={changes} />

            <DialogFooter>
              <Button type="submit" disabled={isPending || changes.length === 0}>
                <Check className="size-4" />
                {isPending ? 'Guardando...' : 'Guardar corrección'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        {...confirmation.confirmProps}
        title="¿Confirmas la corrección?"
        description={`${describeCorrectionChanges(changes)}. Los saldos de las cuentas se recalculan.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
