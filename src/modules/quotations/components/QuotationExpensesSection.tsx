import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCreateQuotationExpense } from '@/modules/quotations/hooks/useQuotations';
import {
  createQuotationExpenseSchema,
  type CreateQuotationExpenseFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { QuotationExpense } from '@/modules/quotations/types/quotation.types';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { DateField } from '@/presentation/components/shared/DateField';
import { ExpandableText } from '@/presentation/components/shared/ExpandableText';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuotationExpensesSectionProps {
  quotationId: number;
  expenses: QuotationExpense[];
  canRegister: boolean;
}

export function QuotationExpensesSection({ quotationId, expenses, canRegister }: QuotationExpensesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const { mutate: createExpense, isPending } = useCreateQuotationExpense(quotationId);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateQuotationExpenseFormValues>({
    resolver: zodResolver(createQuotationExpenseSchema),
    defaultValues: { spent_at: todayLocalDateString() },
  });

  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const onSubmit = (values: CreateQuotationExpenseFormValues) => {
    createExpense(values, {
      onSuccess: () => {
        toast.success('Gasto registrado');
        reset({ spent_at: todayLocalDateString() });
        setFormOpen(false);
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">Total gastado</p>
        <p className="text-base font-semibold text-destructive">{money(total)}</p>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Sin gastos registrados.</p>
        )}
        {expenses.map((expense) => (
          <div key={expense.id} className="space-y-1 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <ExpandableText text={expense.description} className="min-w-0 flex-1 font-medium" />
              <span className="font-mono-nums shrink-0 font-semibold text-destructive">{money(expense.amount)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>{expense.spent_at}</span>
              {expense.category && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium capitalize">{expense.category}</span>
              )}
              {expense.actor && (
                <span>
                  · {expense.actor.name} {expense.actor.paternal_lastname}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {canRegister && (
        <div>
          {!formOpen ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Registrar gasto
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="expense-description">Descripción</Label>
                <Input
                  id="expense-description"
                  placeholder="Tela, envío, insumos…"
                  maxLength={300}
                  {...register('description')}
                />
                <div className="flex items-center justify-between">
                  {errors.description ? (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  ) : (
                    <span />
                  )}
                  <CharCounter value={watch('description')} max={300} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="expense-amount">Monto (S/)</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expense-date">Fecha</Label>
                  <DateField
                    id="expense-date"
                    value={watch('spent_at')}
                    onChange={(value) => setValue('spent_at', value, { shouldValidate: true })}
                    disabled={disableFuture}
                  />
                  {errors.spent_at && <p className="text-xs text-destructive">{errors.spent_at.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expense-category">Categoría (opcional)</Label>
                <Input id="expense-category" placeholder="Insumos, envío…" maxLength={50} {...register('category')} />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  <Check className="size-4" />
                  Guardar gasto
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
