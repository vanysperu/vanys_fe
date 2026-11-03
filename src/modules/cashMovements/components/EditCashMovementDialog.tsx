import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useUpdateCashMovement } from '@/modules/cashMovements/hooks/useCashMovements';
import {
  updateCashMovementSchema,
  type UpdateCashMovementFormValues,
} from '@/modules/cashMovements/schemas/cashMovement.schema';
import {
  CASH_MOVEMENT_DIRECTION_LABEL,
  type CashMovementListItem,
  type UpdateCashMovementDto,
} from '@/modules/cashMovements/types/cashMovement.types';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { ClosedPeriodNotice } from '@/modules/cashClosings/components/ClosedPeriodNotice';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import {
  buildCorrectionChanges,
  describeCorrectionChanges,
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface EditCashMovementDialogProps {
  movement: CashMovementListItem;
  onClose: () => void;
}

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Campos que se comparan para saber qué cambió de verdad.
const EDITABLE_FIELDS = ['amount', 'occurred_at', 'category', 'payment_account_id', 'description'] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

// Corregir un movimiento MANUAL de Caja (las demás filas abren el diálogo de
// su módulo). El backend guarda la corrección en el lugar y deja una fila
// inmutable en el historial con el antes/después, quién y el motivo. Antes de
// enviar se muestra el resumen "Antes → Después" y se pide confirmación: es
// dinero.
export function EditCashMovementDialog({ movement, onClose }: EditCashMovementDialogProps) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  // Super Administrador: las cuentas y categorías de la empresa del
  // movimiento. Un usuario de empresa siempre recibe las suyas (sin
  // companyId, misma key que el resto de la pantalla).
  const companyScope = isSystem ? movement.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(companyScope);
  const { data: categories } = useVariableGenerals({
    category: 'cash_movement_type',
    ignorePagination: true,
    companyId: companyScope,
  });
  // Si el movimiento es de un mes cerrado, la corrección se registra como ajuste.
  const closedGuard = useClosedPeriodGuard(companyScope, movement.occurred_at);
  const { mutateAsync: updateMovement, isPending } = useUpdateCashMovement();

  const original = {
    amount: movement.amount,
    category: movement.category ?? '',
    occurred_at: movement.occurred_at,
    payment_account_id: movement.payment_account_id,
    description: normalizeText(movement.description),
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateCashMovementFormValues>({
    resolver: zodResolver(updateCashMovementSchema),
    defaultValues: {
      amount: original.amount,
      category: original.category,
      occurred_at: original.occurred_at,
      payment_account_id: original.payment_account_id,
      description: original.description ?? undefined,
      reason: '',
    },
  });

  const confirmation = useCorrectionConfirm<UpdateCashMovementDto>({
    submit: (dto) => updateMovement({ id: movement.source_id, dto }),
    successMessage: 'Movimiento corregido correctamente',
    fallbackErrorMessage: 'No se pudo corregir el movimiento',
    onSuccess: onClose,
  });

  // Una categoría deshabilitada ya no se ofrece, salvo la que el movimiento
  // ya tiene (si no se toca, se conserva).
  const categoryOptions = (categories?.data ?? [])
    .filter((item) => !item.is_deleted || item.prefix_id === original.category)
    .map((item) => ({ value: item.prefix_id, label: item.name }));
  const categoryName = (code: string) => categories?.data.find((item) => item.prefix_id === code)?.name ?? code;
  const accounts = accountsResult?.data ?? [];
  const accountName = (accountId: number | null): string | null => {
    if (accountId === null) return null;
    if (accountId === movement.payment_account_id) return movement.payment_account_name;
    return accounts.find((account) => account.id === accountId)?.name ?? null;
  };
  // La cuenta actual pudo deshabilitarse después: el selector ya no la
  // ofrece, pero si no se toca se conserva (el backend lo permite).
  const currentAccountUnavailable =
    movement.payment_account_id !== null &&
    !accounts.some((account) => account.id === movement.payment_account_id && !account.is_deleted);

  const watched = watch();
  const current = {
    amount: Number(watched.amount),
    category: watched.category ?? '',
    occurred_at: watched.occurred_at ?? '',
    payment_account_id: watched.payment_account_id ?? null,
    description: normalizeText(watched.description),
  };

  // Fotos en el mismo formato que el historial (la cuenta lleva su nombre).
  const { previous, next, changedFields } = pickChangedValues(
    { ...original, payment_account_name: movement.payment_account_name },
    { ...current, payment_account_name: accountName(current.payment_account_id) },
    EDITABLE_FIELDS,
  );
  const changes = buildCorrectionChanges(previous, next, { categoryName });

  const onSubmit = (values: UpdateCashMovementFormValues) => {
    if (changedFields.length === 0) return;
    // Solo se envía lo que cambió (lo ausente se queda como está).
    const submitted = {
      amount: values.amount,
      category: values.category,
      occurred_at: values.occurred_at,
      payment_account_id: values.payment_account_id ?? null,
      description: normalizeText(values.description),
    };
    const dto = (changedFields as EditableField[]).reduce<UpdateCashMovementDto>(
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
            <DialogTitle>Corregir movimiento</DialogTitle>
            <DialogDescription>
              La corrección queda registrada en el historial del movimiento, con el antes, el después y el motivo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                {/* El sentido no se corrige: si era el equivocado, se anula y
                    se registra otro movimiento. */}
                <div className="flex h-9 items-center gap-2">
                  <Badge variant={movement.direction === 'income' ? 'success' : 'destructive'}>
                    {CASH_MOVEMENT_DIRECTION_LABEL[movement.direction]}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">No se puede cambiar</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <SearchableSelect
                  placeholder="Selecciona una categoría"
                  value={watched.category}
                  onChange={(value) => setValue('category', value, { shouldValidate: true })}
                  options={categoryOptions}
                />
                {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cash-movement-edit-amount">Monto (S/)</Label>
                <Input
                  id="cash-movement-edit-amount"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash-movement-edit-date">Fecha</Label>
                <DateField
                  id="cash-movement-edit-date"
                  value={watched.occurred_at}
                  onChange={(value) => setValue('occurred_at', value, { shouldValidate: true })}
                  disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
                />
                {errors.occurred_at && <p className="text-sm text-destructive">{errors.occurred_at.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-movement-edit-account">{movement.direction === 'income' ? 'Entró a' : 'Salió de'}</Label>
              <PaymentAccountSelect
                id="cash-movement-edit-account"
                value={watched.payment_account_id}
                onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
                companyId={companyScope}
              />
              {currentAccountUnavailable && watched.payment_account_id === movement.payment_account_id && (
                <p className="text-[11px] text-muted-foreground">
                  Cuenta actual: {movement.payment_account_name ?? `#${movement.payment_account_id}`} (ya no está disponible para
                  elegir; si no la cambias, se mantiene).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash-movement-edit-description">Descripción</Label>
              <Textarea id="cash-movement-edit-description" rows={2} {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            {closedGuard.closedLabel && (
              <ClosedPeriodNotice periodLabel={closedGuard.closedLabel} today={closedGuard.status?.today} canAdjust={closedGuard.canAdjustClosed} />
            )}

            <CorrectionReasonField
              id="cash-movement-edit-reason"
              registration={register('reason')}
              error={errors.reason?.message}
              placeholder="Ej.: se tipeó mal el monto del depósito"
            />

            {/* Antes → Después, en vivo: lo que va a quedar en el historial. */}
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
        description={`${describeCorrectionChanges(changes)}. Los totales de Caja se recalculan y la corrección queda en el historial.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
