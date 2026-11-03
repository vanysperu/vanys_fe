import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useCashOpening, useSetCashOpening } from '@/modules/cashClosings/hooks/useCashClosings';
import { cashOpeningSchema, type CashOpeningFormValues } from '@/modules/cashClosings/schemas/cashClosings.schema';
import type { CashOpeningResponse } from '@/modules/cashClosings/types/cashClosings.types';
import { formatDateEs, formatPeriodEs, formatPeriodTitle, periodOf, shiftPeriod } from '@/modules/cashClosings/utils/period';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

// Cuántos meses hacia atrás (además del actual) se ofrecen como mes de inicio.
const START_PERIOD_CHOICES = 12;

// Lo que el usuario ya escribió, para no perderlo al cambiar el mes de inicio
// (el formulario se vuelve a armar con las pistas del mes nuevo).
interface OpeningDraft {
  amountsByKey: Record<number, number | undefined>;
  notes: string;
}

// Meses que acepta el backend como inicio (cash_closing opening.service:
// desde 2000-01 hasta el mes ACTUAL): el actual y los 12 anteriores, más el
// guardado/elegido si quedó fuera de esa ventana.
function startPeriodOptions(...extra: string[]): string[] {
  const current = periodOf(todayLocalDateString());
  const recent = Array.from({ length: START_PERIOD_CHOICES + 1 }, (_, index) => shiftPeriod(current, -index));
  return Array.from(new Set([...recent, ...extra.filter((period) => period <= current)]))
    .sort()
    .reverse();
}

interface CashOpeningDialogProps {
  companyId?: number;
  onClose: () => void;
}

// Saldo inicial de la caja: con cuánto dinero empezó cada cuenta el primer
// día del mes de inicio. Desde ahí el sistema calcula los saldos solo.
export function CashOpeningDialog({ companyId, onClose }: CashOpeningDialogProps) {
  // Mes elegido en el selector: las pistas ("Según lo registrado antes de esa
  // fecha") y la fecha de la descripción salen de la respuesta de ESE mes.
  const [requestedPeriod, setRequestedPeriod] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<OpeningDraft | null>(null);
  const { data, isLoading, isError, error, isPlaceholderData } = useCashOpening(companyId, { startPeriod: requestedPeriod });


  // Mientras llegan las pistas del mes nuevo se muestra la fecha del mes elegido.
  const pendingStartDate = requestedPeriod ? `${requestedPeriod}-01` : data?.start_date;
  const startDate = data && !isPlaceholderData ? data.start_date : pendingStartDate;

  const renderBody = () => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Cargando cuentas...</p>;
    if (isError || !data) {
      return <p className="text-sm text-destructive">{(error as ApiClientError | null)?.message ?? 'No se pudo cargar el saldo inicial'}</p>;
    }
    return (
      <CashOpeningForm
        // Nuevo mes con sus pistas = formulario nuevo (con lo ya escrito en `draft`).
        key={data.start_period}
        opening={data}
        selectedPeriod={requestedPeriod ?? data.start_period}
        hintsPending={isPlaceholderData}
        draft={draft}
        companyId={companyId}
        onDraftChange={setDraft}
        onStartPeriodChange={setRequestedPeriod}
        onClose={onClose}
      />
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent expandable className="sm:max-w-xl" data-testid="cash-opening-dialog">
        <DialogHeader>
          <DialogTitle>Saldo inicial de la caja</DialogTitle>
          <DialogDescription>
            {startDate
              ? `Indica con cuánto dinero empezó cada cuenta el ${formatDateEs(startDate)}: lo contado en efectivo y lo que decía el estado de cuenta de cada banco, Yape o Plin. Desde esa fecha el sistema calcula los saldos solo.`
              : 'Indica con cuánto dinero empezó cada cuenta (efectivo, bancos, Yape, Plin).'}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}

interface CashOpeningFormProps {
  opening: CashOpeningResponse;
  selectedPeriod: string;
  hintsPending: boolean;
  draft: OpeningDraft | null;
  companyId?: number;
  onDraftChange: (draft: OpeningDraft) => void;
  onStartPeriodChange: (period: string) => void;
  onClose: () => void;
}

// Un input numérico vacío llega como NaN (valueAsNumber): eso es "sin dato".
const finiteOrUndefined = (value: number | undefined): number | undefined =>
  value === undefined || Number.isNaN(value) ? undefined : value;

function CashOpeningForm({
  opening,
  selectedPeriod,
  hintsPending,
  draft,
  companyId,
  onDraftChange,
  onStartPeriodChange,
  onClose,
}: CashOpeningFormProps) {
  const { mutateAsync: saveOpening, isPending } = useSetCashOpening();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CashOpeningFormValues>({
    resolver: zodResolver(cashOpeningSchema),
    defaultValues: {
      start_period: opening.start_period,
      amounts: opening.accounts.map((account) => ({
        payment_account_id: account.payment_account_id,
        amount: draft?.amountsByKey[account.account_key] ?? account.amount ?? undefined,
      })),
      notes: draft?.notes ?? opening.notes ?? '',
    },
  });

  const periodOptions = startPeriodOptions(opening.start_period, selectedPeriod);
  const readOnly = !opening.editable;

  // Lo escrito se guarda por cuenta en el padre a medida que cambia: al
  // elegir otro mes, el formulario se vuelve a armar con sus pistas y con lo
  // escrito hasta ESE momento (aunque se haya escrito mientras llegaban).
  useEffect(() => {
    const subscription = watch((values) => {
      const amountsByKey = Object.fromEntries(
        opening.accounts.map((account, index) => [account.account_key, finiteOrUndefined(values.amounts?.[index]?.amount)]),
      );
      onDraftChange({ amountsByKey, notes: values.notes ?? '' });
    });
    return () => subscription.unsubscribe();
  }, [watch, opening.accounts, onDraftChange]);

  const onSubmit = async (values: CashOpeningFormValues) => {
    // try/catch solo para avisar: el mensaje ya viene normalizado.
    try {
      await saveOpening({
        company_id: companyId,
        start_period: values.start_period,
        openings: values.amounts,
        notes: values.notes?.trim() || null,
      });
      toast.success('Saldo inicial guardado');
      onClose();
    } catch (mutationError) {
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo guardar el saldo inicial');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {readOnly && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          El saldo inicial ya forma parte del cierre de {formatPeriodEs(opening.start_period)}: reábrelo para cambiarlo.
        </p>
      )}

      <div className="space-y-2">
        <Label>Mes de inicio</Label>
        <Select
          value={selectedPeriod}
          onValueChange={onStartPeriodChange}
          disabled={readOnly || !opening.start_period_editable}
        >
          <SelectTrigger aria-label="Mes de inicio" data-testid="opening-start-period">
            <SelectValue placeholder="Selecciona el mes" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((period) => (
              <SelectItem key={period} value={period}>
                {formatPeriodTitle(period)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.start_period && <p className="text-sm text-destructive">{errors.start_period.message}</p>}
      </div>

      <div className="space-y-3">
        {opening.accounts.map((account, index) => (
          <div key={account.account_key} className="space-y-1 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`opening-amount-${account.account_key}`}>
                {account.name}
                {!account.active && <span className="ml-1 text-xs text-muted-foreground">(deshabilitada)</span>}
              </Label>
              <Input
                id={`opening-amount-${account.account_key}`}
                type="number"
                step={DECIMAL_INPUT_STEP}
                className="w-40"
                disabled={readOnly}
                placeholder="0.00"
                {...register(`amounts.${index}.amount`, { valueAsNumber: true })}
              />
            </div>
            <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
              {hintsPending
                ? 'Calculando lo registrado antes de esa fecha...'
                : `Según lo registrado antes de esa fecha: ${formatMoney(account.history_amount)}`}
              {!readOnly && !hintsPending && (
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setValue(`amounts.${index}.amount`, account.history_amount, { shouldValidate: true })}
                >
                  Usar este valor
                </button>
              )}
            </p>
            {errors.amounts?.[index]?.amount && (
              <p className="text-sm text-destructive">{errors.amounts[index]?.amount?.message}</p>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="opening-notes">Nota (opcional)</Label>
        <Textarea id="opening-notes" rows={2} maxLength={500} disabled={readOnly} {...register('notes')} />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      <DialogFooter>
        <Button type="submit" disabled={isPending || readOnly || hintsPending} data-testid="opening-save">
          <Check className="size-4" />
          {isPending ? 'Guardando...' : 'Guardar saldo inicial'}
        </Button>
      </DialogFooter>
    </form>
  );
}
