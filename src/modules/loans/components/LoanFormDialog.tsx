import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { formatSoles } from '@/lib/money';
import { useCashPeriodStatus } from '@/modules/cashClosings/hooks/useCashClosings';
import { lockedDatesExcept } from '@/modules/cashClosings/utils/period';
import { useCreateLoan, useUpdateLoan } from '@/modules/loans/hooks/useLoans';
import { loanSchema, type LoanFormValues } from '@/modules/loans/schemas/loan.schema';
import type { Loan, SaveLoanDto } from '@/modules/loans/types/loan.types';
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

interface LoanFormDialogProps {
  // Con préstamo = corregir (el diálogo nace abierto); sin préstamo = nuevo.
  loan?: Loan;
  onClose?: () => void;
}

const EMPTY_FORM: Partial<LoanFormValues> = {
  borrower_name: '',
  borrower_document: '',
  borrower_phone: '',
  interest_rate: 0,
  payment_account_id: null,
  operation_number: '',
  notes: '',
};

const toNullableText = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Registrar o corregir un préstamo (pedido del usuario, 21-nov): a quién,
// cuánto y qué % de interés. El dinero sale de Caja ese día por la cuenta
// elegida. Con cobros ya registrados, el monto, el %, la fecha y la cuenta no
// se pueden cambiar (el backend lo vuelve a validar).
export function LoanFormDialog({ loan, onClose }: LoanFormDialogProps) {
  const isEditing = Boolean(loan);
  const moneyLocked = Boolean(loan && loan.payments_count > 0);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { mutate: create, isPending: isCreating } = useCreateLoan();
  const { mutate: update, isPending: isUpdating } = useUpdateLoan();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<LoanFormValues>({ resolver: zodResolver(loanSchema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!loan) return;
    reset({
      borrower_name: loan.borrower_name,
      borrower_document: loan.borrower_document ?? '',
      borrower_phone: loan.borrower_phone ?? '',
      principal: loan.principal,
      interest_rate: loan.interest_rate,
      loaned_at: loan.loaned_at,
      due_date: loan.due_date ?? undefined,
      payment_account_id: loan.payment_account_id,
      operation_number: loan.operation_number ?? '',
      notes: loan.notes ?? '',
    });
  }, [loan, reset]);

  // Super Administrador: primero la empresa; recién ahí sus cuentas.
  const selectedCompanyId = isSystem ? (loan?.company_id ?? watch('company_id')) : undefined;
  const listsEnabled = !isSystem || Boolean(selectedCompanyId);
  // Fechas de meses de caja cerrados no se pueden usar.
  const { data: periodStatus } = useCashPeriodStatus(selectedCompanyId, { enabled: listsEnabled });

  // Vista previa del interés (mismo cálculo que el backend: simple, una vez).
  const principal = Number(watch('principal')) || 0;
  const rate = Number(watch('interest_rate')) || 0;
  const interest = Math.round(principal * rate) / 100;

  const handleOpenChange = (next: boolean) => {
    if (next && !loan) reset(EMPTY_FORM);
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: LoanFormValues) => {
    const personFields: SaveLoanDto = {
      borrower_name: values.borrower_name.trim(),
      borrower_document: toNullableText(values.borrower_document),
      borrower_phone: toNullableText(values.borrower_phone),
      due_date: values.due_date || null,
      notes: toNullableText(values.notes),
    };
    const moneyFields: Partial<SaveLoanDto> = {
      principal: values.principal,
      interest_rate: values.interest_rate,
      loaned_at: values.loaned_at,
      payment_account_id: values.payment_account_id ?? null,
      operation_number: toNullableText(values.operation_number),
    };
    const onError = (error: unknown) => toast.error((error as ApiClientError).message ?? 'No se pudo guardar el préstamo');

    if (loan) {
      // Con cobros, solo los datos de la persona (el backend rechazaría el resto).
      const dto = moneyLocked ? personFields : { ...personFields, ...moneyFields };
      update(
        { id: loan.id, dto },
        {
          onSuccess: () => {
            toast.success('Préstamo actualizado');
            handleOpenChange(false);
          },
          onError,
        },
      );
      return;
    }

    if (isSystem && !values.company_id) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    create(
      { ...personFields, ...moneyFields, company_id: values.company_id, business_unit_id: values.business_unit_id },
      {
        onSuccess: () => {
          toast.success('Préstamo registrado');
          handleOpenChange(false);
        },
        onError,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nuevo préstamo
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Corregir préstamo' : 'Nuevo préstamo'}</DialogTitle>
          <DialogDescription>
            El dinero sale de Caja en la fecha del préstamo. El interés es simple: se cobra una sola vez sobre lo prestado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {!isEditing && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(companyId) => {
                setValue('company_id', companyId, { shouldValidate: true });
                // La cuenta elegida antes era de otra empresa.
                setValue('payment_account_id', null);
              }}
              businessUnitId={watch('business_unit_id')}
              onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="loan-borrower">¿A quién se le prestó?</Label>
            <Input id="loan-borrower" maxLength={150} placeholder="Nombre de la persona" {...register('borrower_name')} />
            {errors.borrower_name && <p className="text-sm text-destructive">{errors.borrower_name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loan-document">DNI / documento (opcional)</Label>
              <Input id="loan-document" maxLength={20} {...register('borrower_document')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-phone">Celular (opcional)</Label>
              <Input id="loan-phone" inputMode="tel" maxLength={20} {...register('borrower_phone')} />
            </div>
          </div>

          {moneyLocked && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Este préstamo ya tiene cobros: el monto, el interés, la fecha y la cuenta no se pueden cambiar. Para hacerlo, anula
              los cobros primero.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loan-principal">Monto prestado (S/)</Label>
              <Input
                id="loan-principal"
                type="number"
                step={DECIMAL_INPUT_STEP}
                disabled={moneyLocked}
                {...register('principal', { valueAsNumber: true })}
              />
              {errors.principal && <p className="text-sm text-destructive">{errors.principal.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-rate">Interés (%)</Label>
              <Input
                id="loan-rate"
                type="number"
                step={DECIMAL_INPUT_STEP}
                min={0}
                disabled={moneyLocked}
                {...register('interest_rate', { valueAsNumber: true })}
              />
              {errors.interest_rate && <p className="text-sm text-destructive">{errors.interest_rate.message}</p>}
            </div>
          </div>
          {principal > 0 && (
            <p className="text-xs text-muted-foreground" data-testid="loan-interest-preview">
              Interés {formatSoles(interest)} · se cobra en total <span className="font-semibold text-foreground">{formatSoles(principal + interest)}</span>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="loan-date">Fecha del préstamo</Label>
              <DateField
                id="loan-date"
                value={watch('loaned_at')}
                onChange={(value) => setValue('loaned_at', value, { shouldValidate: true })}
                disabled={combineDisabled(disableFuture, lockedDatesExcept(periodStatus))}
              />
              {errors.loaned_at && <p className="text-sm text-destructive">{errors.loaned_at.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan-due">Vence (opcional)</Label>
              <DateField id="loan-due" value={watch('due_date')} onChange={(value) => setValue('due_date', value, { shouldValidate: true })} />
              {errors.due_date && <p className="text-sm text-destructive">{errors.due_date.message}</p>}
            </div>
          </div>

          {!moneyLocked && (
            <>
              <div className="space-y-2">
                <Label htmlFor="loan-account">Sale de</Label>
                <PaymentAccountSelect
                  id="loan-account"
                  value={watch('payment_account_id')}
                  onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
                  cashLabel="Efectivo"
                  companyId={selectedCompanyId}
                />
              </div>
              <OperationNumberField id="loan-operation" error={errors.operation_number?.message} {...register('operation_number')} />
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="loan-notes">Notas (opcional)</Label>
            <Textarea id="loan-notes" rows={2} maxLength={500} placeholder="Ej.: se devuelve en dos partes" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isCreating || isUpdating}>
              <Check className="size-4" />
              {isCreating || isUpdating ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar préstamo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
