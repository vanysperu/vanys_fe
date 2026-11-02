import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useCorrectManualEmployeeDebt, useEmployeeDebtRecord } from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import {
  correctManualDebtSchema,
  INCOME_ONLY_CATEGORIES,
  type CorrectManualDebtFormValues,
} from '@/modules/employeeDebts/schemas/employeeDebt.schema';
import type { CorrectManualDebtDto, EmployeeDebtRecord } from '@/modules/employeeDebts/types/employeeDebt.types';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import { useCorrectionLookups } from '@/modules/moneyCorrections/hooks/useCorrectionLookups';
import type { MoneyCorrectionValues } from '@/modules/moneyCorrections/types/moneyCorrection.types';
import {
  buildCorrectionChanges,
  describeCorrectionChanges,
  formatMoney,
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
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
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface CorrectManualDebtDialogProps {
  debtId: number;
  onClose(): void;
}

// Campos que se comparan (mismas claves que el historial del backend).
const CORRECTABLE_FIELDS = ['amount', 'description', 'category', 'incurred_at', 'business_unit_id', 'user_id'] as const;

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Corregir una deuda MANUAL con un trabajador (monto, qué se pagó,
// categoría, fecha, tienda y — mientras no se le haya repuesto nada — el
// trabajador). Se abre desde el detalle del trabajador y desde Caja. Pide la
// fila actual al backend (/employee-debt/find/:id) y no la de una lista.
export function CorrectManualDebtDialog({ debtId, onClose }: CorrectManualDebtDialogProps) {
  const { data: debt, isLoading, isError, error } = useEmployeeDebtRecord(debtId);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Corregir deuda con un trabajador</DialogTitle>
          <DialogDescription>
            La corrección queda en el historial de la deuda, con el antes, el después y el motivo. No cambia Caja: la
            deuda no movió dinero de la empresa.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando deuda...</p>}
        {isError && (
          <p className="text-sm text-destructive">{(error as ApiClientError | null)?.message ?? 'No se pudo cargar la deuda'}</p>
        )}
        {debt && <ManualDebtCorrectionBody debt={debt} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ManualDebtCorrectionBody({ debt, onClose }: { debt: EmployeeDebtRecord; onClose(): void }) {
  if (debt.origin === 'purchase') {
    return (
      <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Esta deuda viene de una compra de orden: se corrige desde la compra (en su orden de compra o en Caja).
      </p>
    );
  }
  if (debt.status === 'cancelled') {
    return <p className="text-sm text-muted-foreground">Esta deuda está anulada: registra una nueva si correspondía.</p>;
  }
  return <ManualDebtCorrectionForm debt={debt} onClose={onClose} />;
}

function ManualDebtCorrectionForm({ debt, onClose }: { debt: EmployeeDebtRecord; onClose(): void }) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const lookups = useCorrectionLookups();
  const { mutateAsync: correctDebt, isPending } = useCorrectManualEmployeeDebt();
  const { data: usersResult } = useUsers({ limit: 100, isActive: true });
  const { data: categoriesResult } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });
  // Solo el Super Administrador elige la tienda (igual que al registrar).
  const { data: businessUnits } = useBusinessUnits(
    { page: 1, limit: 100, companyId: debt.company_id },
    { enabled: isSystem },
  );

  // Con algo ya repuesto el trabajador no se cambia (el backend lo revalida).
  const canChangeWorker = debt.paid_amount === 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CorrectManualDebtFormValues>({
    resolver: zodResolver(correctManualDebtSchema),
    defaultValues: {
      user_id: debt.user_id,
      description: debt.description ?? '',
      category: debt.category ?? '',
      amount: debt.amount,
      incurred_at: debt.incurred_at,
      business_unit_id: debt.business_unit_id,
      reason: '',
    },
  });

  const workers = (usersResult?.data ?? []).filter((user) => user.status && user.company_id === debt.company_id);
  const workerName = (userId: number): string | null => {
    if (userId === debt.user_id) return debt.user_name;
    const worker = workers.find((user) => user.id === userId);
    return worker ? `${worker.name} ${worker.paternal_lastname}` : null;
  };
  const workerOptions = [
    // El trabajador actual siempre figura, aunque ya no esté activo.
    ...(workers.some((user) => user.id === debt.user_id)
      ? []
      : [{ value: String(debt.user_id), label: debt.user_name ?? `Usuario #${debt.user_id}` }]),
    ...workers.map((user) => ({ value: String(user.id), label: `${user.name} ${user.paternal_lastname} · ${user.email}` })),
  ];
  // Las de ingreso no aplican; una categoría ya deshabilitada se conserva si no se toca.
  const categoryOptions = (categoriesResult?.data ?? [])
    .filter((item) => !INCOME_ONLY_CATEGORIES.includes(item.prefix_id))
    .filter((item) => !item.is_deleted || item.prefix_id === debt.category)
    .map((item) => ({ value: item.prefix_id, label: item.name }));
  const storeOptions = (businessUnits?.data ?? [])
    .filter((store) => store.company_id === debt.company_id && (!store.is_deleted || store.id === debt.business_unit_id))
    .map((store) => ({ value: String(store.id), label: store.business_code }));
  const storeName = (storeId: number | null): string | null => {
    if (storeId === null) return null;
    if (storeId === debt.business_unit_id) return debt.business_unit_name;
    return storeOptions.find((option) => option.value === String(storeId))?.label ?? null;
  };

  const watched = watch();
  const toValues = (values: {
    amount: number;
    description: string | null;
    category: string | null;
    incurred_at: string;
    business_unit_id: number | null;
    user_id: number;
  }): MoneyCorrectionValues => ({
    ...values,
    user_name: workerName(values.user_id),
    business_unit_name: storeName(values.business_unit_id),
  });
  const before = toValues({
    amount: debt.amount,
    description: normalizeText(debt.description),
    category: debt.category,
    incurred_at: debt.incurred_at,
    business_unit_id: debt.business_unit_id,
    user_id: debt.user_id,
  });
  const after = toValues({
    amount: Number(watched.amount),
    description: normalizeText(watched.description),
    category: normalizeText(watched.category),
    incurred_at: watched.incurred_at ?? '',
    business_unit_id: watched.business_unit_id ?? null,
    user_id: Number(watched.user_id),
  });
  const { previous, next, changedFields } = pickChangedValues(before, after, CORRECTABLE_FIELDS);
  const changes = buildCorrectionChanges(previous, next, lookups);

  const confirm = useCorrectionConfirm<CorrectManualDebtDto>({
    submit: (dto) => correctDebt({ id: debt.id, dto }),
    successMessage: 'Deuda corregida correctamente',
    fallbackErrorMessage: 'No se pudo corregir la deuda',
    onSuccess: onClose,
  });

  const onSubmit = (values: CorrectManualDebtFormValues) => {
    if (changedFields.length === 0) return;
    // Solo se envía lo que cambió (lo ausente se queda como está).
    const full: Omit<CorrectManualDebtDto, 'reason'> = {
      amount: values.amount,
      description: values.description.trim(),
      category: values.category,
      incurred_at: values.incurred_at,
      business_unit_id: values.business_unit_id ?? null,
      user_id: values.user_id,
    };
    const dto = changedFields.reduce<CorrectManualDebtDto>(
      (picked, field) => ({ ...picked, [field]: full[field as keyof typeof full] }),
      { reason: values.reason },
    );
    confirm.request(dto);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label>Trabajador que puso el dinero</Label>
          <SearchableSelect
            placeholder="Selecciona una persona"
            disabled={!canChangeWorker}
            value={String(watched.user_id)}
            onChange={(value) => setValue('user_id', Number(value), { shouldValidate: true })}
            options={workerOptions}
          />
          {!canChangeWorker && (
            <p className="text-[11px] text-muted-foreground">
              Ya se le repuso {formatMoney(debt.paid_amount)}: para cambiar el trabajador, anula primero esa reposición.
            </p>
          )}
          {errors.user_id && <p className="text-sm text-destructive">{errors.user_id.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct-debt-description">¿Qué pagó?</Label>
          <Input id="correct-debt-description" maxLength={300} {...register('description')} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Categoría del gasto</Label>
          <SearchableSelect
            placeholder="Selecciona una categoría"
            value={watched.category}
            onChange={(value) => setValue('category', value, { shouldValidate: true })}
            options={categoryOptions}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="correct-debt-amount">Monto (S/)</Label>
            <Input id="correct-debt-amount" type="number" step={DECIMAL_INPUT_STEP} {...register('amount', { valueAsNumber: true })} />
            {debt.paid_amount > 0 && (
              <p className="text-[11px] text-muted-foreground">Mínimo {formatMoney(debt.paid_amount)} (lo ya repuesto).</p>
            )}
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-debt-date">Fecha en que pagó</Label>
            <DateField
              id="correct-debt-date"
              value={watched.incurred_at}
              onChange={(value) => setValue('incurred_at', value, { shouldValidate: true })}
              disabled={disableFuture}
            />
            {errors.incurred_at && <p className="text-sm text-destructive">{errors.incurred_at.message}</p>}
          </div>
        </div>

        {isSystem && (
          <div className="space-y-2">
            <Label>
              Tienda <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <SearchableSelect
              placeholder="Sin tienda específica"
              value={watched.business_unit_id ? String(watched.business_unit_id) : undefined}
              onChange={(value) => setValue('business_unit_id', Number(value))}
              onClear={() => setValue('business_unit_id', null)}
              clearLabel="Sin tienda específica"
              options={storeOptions}
              emptyText="No se encontró esa tienda"
            />
          </div>
        )}

        <CorrectionReasonField
          id="correct-debt-reason"
          registration={register('reason')}
          error={errors.reason?.message}
          placeholder="Ej.: el recibo era de S/ 85.50, no de S/ 58.50"
        />

        <CorrectionPreview changes={changes} />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || changes.length === 0}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar corrección
          </Button>
        </DialogFooter>
      </form>

      <ConfirmDialog
        {...confirm.confirmProps}
        title="¿Confirmas la corrección?"
        description={`${describeCorrectionChanges(changes)}. Lo pendiente de reponer se recalcula y la corrección queda en el historial.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
