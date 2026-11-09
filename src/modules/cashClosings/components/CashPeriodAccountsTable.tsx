import { Landmark } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CashPeriodAccountBalance, CashPeriodTotals } from '@/modules/cashClosings/types/cashClosings.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { DataTable, type DataTableColumn } from '@/presentation/components/shared/DataTable';

interface CashPeriodAccountsTableProps {
  balances: CashPeriodAccountBalance[];
  totals: CashPeriodTotals;
}

interface AccountRow extends CashPeriodAccountBalance {
  isTotal: boolean;
}

const NEGATIVE_HINT = 'Saldo negativo: probablemente falta registrar un ingreso o el saldo inicial no es el real';

// Cuánto hubo en cada cuenta (Efectivo, bancos, Yape, Plin) y el total.
export function CashPeriodAccountsTable({ balances, totals }: CashPeriodAccountsTableProps) {
  const rows: AccountRow[] = [
    ...balances.map((balance) => ({ ...balance, isTotal: false })),
    { ...totals, account_key: -1, payment_account_id: null, account_name: 'Total', isTotal: true },
  ];
  // La columna de transferencias entre cuentas solo aparece si el mes tuvo
  // alguna (en el total de la empresa siempre suman 0).
  const hasTransfers = balances.some((balance) => (balance.transfers ?? 0) !== 0);

  const moneyColumn = (header: string, pick: (row: AccountRow) => number, negativeHint = false): DataTableColumn<AccountRow> => ({
    header,
    align: 'right',
    cell: (row) => {
      const value = pick(row);
      const isNegative = negativeHint && value < 0;
      return (
        <span
          className={cn('whitespace-nowrap', row.isTotal && 'font-semibold', isNegative && 'text-destructive')}
          title={isNegative ? NEGATIVE_HINT : undefined}
        >
          {formatMoney(value)}
        </span>
      );
    },
  });

  return (
    <div data-testid="cash-period-accounts">
      <DataTable<AccountRow>
        columns={[
          {
            header: 'Cuenta',
            cell: (row) => <span className={cn(row.isTotal && 'font-semibold')}>{row.account_name}</span>,
          },
          moneyColumn('Saldo inicial', (row) => row.opening),
          moneyColumn('Ingresos', (row) => row.income),
          moneyColumn('Egresos', (row) => row.expense),
          ...(hasTransfers ? [moneyColumn('Transferencias', (row) => row.transfers ?? 0)] : []),
          moneyColumn('Ajustes', (row) => row.adjustments),
          moneyColumn('Saldo final', (row) => row.closing, true),
        ]}
        rows={rows}
        rowKey={(row) => row.account_key}
        emptyIcon={Landmark}
        emptyTitle="Sin cuentas"
      />
    </div>
  );
}
