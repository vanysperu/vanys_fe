import { ChevronDown, Landmark, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useCashBalances } from '@/modules/cashClosings/hooks/useCashClosings';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePersistentToggle } from '@/presentation/hooks/shared/usePersistentToggle';

const OPEN_STORAGE_KEY = 'vanys.cashBalances.open';

interface CashBalancesPanelProps {
  companyId?: number;
  // El rol tiene el botón cash_closing.balances.button (solo administradores).
  enabled: boolean;
  // El rol puede abrir la vista de cierres.
  canOpenClosings: boolean;
}

// Saldos actuales por cuenta: lo que hay HOY en cada cuenta, calculado desde
// el último mes cerrado (o el saldo inicial) más los movimientos desde
// entonces. No depende de los filtros de la lista.
export function CashBalancesPanel({ companyId, enabled, canOpenClosings }: CashBalancesPanelProps) {
  const { data, isLoading } = useCashBalances(companyId, { enabled });
  // Abierto/cerrado recordado en este navegador; arranca cerrado.
  const [open, toggle] = usePersistentToggle(OPEN_STORAGE_KEY);

  if (!enabled) return null;
  if (isLoading) return <Skeleton className="h-28 w-full" />;
  if (!data) return null;

  if (!data.started) {
    return (
      <div
        className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground"
        data-testid="cash-balances-not-started"
      >
        Para ver los saldos por cuenta, configura el saldo inicial en{' '}
        {canOpenClosings ? (
          <Link to="/caja/cierres" className="font-medium text-primary underline-offset-2 hover:underline">
            Cierres de caja
          </Link>
        ) : (
          'Cierres de caja'
        )}
        .
      </div>
    );
  }

  const total = data.accounts.reduce((sum, account) => sum + account.current_balance, 0);
  const accountsLabel = `${data.accounts.length} ${data.accounts.length === 1 ? 'cuenta' : 'cuentas'}`;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" data-testid="cash-balances-panel">
      {/* Cabecera plegable (mismo patrón que "Órdenes de compra a mi cargo"):
          cerrada sigue mostrando el total y cuántas cuentas hay. */}
      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="cash-balances-body"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Landmark className="size-5" />
            <span
              className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground tabular-nums ring-2 ring-card"
              data-testid="cash-balances-count"
            >
              {data.accounts.length}
            </span>
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">Saldos de caja</span>
              {data.provisional_note && <Badge variant="warning">Provisional</Badge>}
            </span>
            <span className="block text-xs text-muted-foreground">
              {data.base_label ?? 'Saldo inicial'} + movimientos desde entonces · {accountsLabel}
            </span>
          </span>
        </button>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Total en cuentas</p>
          <p className={cn('text-xl font-semibold tabular-nums', total < 0 && 'text-destructive')}>
            {formatMoney(total)}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="cash-balances-body"
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          {open ? 'Ocultar' : 'Mostrar'}
          <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
        <div id="cash-balances-body" className="space-y-3 border-t bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            {data.provisional_note ? (
              <p className="flex-1 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs">
                {data.provisional_note}
              </p>
            ) : (
              <span />
            )}
            {canOpenClosings && (
              <Link to="/caja/cierres" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                Ver cierres
              </Link>
            )}
          </div>

          {/* Altura máxima con scroll: hay empresas con decenas de cuentas y el
          panel empujaba la tabla de movimientos fuera de la pantalla. */}
          <div className="scrollbar-thin -mr-1 max-h-72 overflow-y-auto pr-1" data-testid="cash-balances-scroll">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {data.accounts.map((account) => {
                const since = account.income - account.expense + account.adjustments;
                const AccountIcon = account.account_key === 0 ? Wallet : Landmark;
                return (
                  <div
                    key={account.account_key}
                    className="space-y-1.5 rounded-lg border bg-background/60 p-3 transition-colors hover:border-primary/30"
                    data-testid="cash-balance-card"
                  >
                    <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <AccountIcon className="size-3.5 shrink-0" />
                      <span className="truncate" title={account.name}>
                        {account.name}
                      </span>
                    </p>
                    <p
                      className={cn(
                        'text-lg font-semibold tabular-nums',
                        account.current_balance < 0 && 'text-destructive',
                      )}
                    >
                      {formatMoney(account.current_balance)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>Inició con {formatMoney(account.base_balance)}</span>
                      {since !== 0 && (
                        <Badge variant={since < 0 ? 'destructive' : 'success'} className="px-1.5 py-0 text-[10px]">
                          {since < 0 ? '−' : '+'}
                          {formatMoney(Math.abs(since))}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
