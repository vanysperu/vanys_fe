import { HandCoins } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useEmployeeDebts, usePayEmployeeDebt } from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import type { EmployeeDebtSummaryItem } from '@/modules/employeeDebts/types/employeeDebt.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "¿A quién se le debe y cuánto?" (pedido explícito del usuario) — se
// agrupa por trabajador: cuando alguien paga una compra de orden de compra
// con su propia plata (ver PurchaseOrderItemsChecklist), queda acá como
// deuda pendiente hasta que la empresa se la devuelve.
export function EmployeeDebtsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [payingDebt, setPayingDebt] = useState<EmployeeDebtSummaryItem | null>(null);

  const canPay = usePermissionButton('employee_debt.pay.button');

  const { data, isLoading } = useEmployeeDebts({ page, limit: pageSize });
  const { mutateAsync: payDebt } = usePayEmployeeDebt();

  return (
    <div className="space-y-6">
      <PageHeader title="Deudas a personal" description="Dinero propio que un trabajador adelantó en una compra y la empresa aún le debe" />

      <DataTable<EmployeeDebtSummaryItem>
        columns={[
          { header: 'Trabajador', cell: (row) => row.employee_name },
          {
            header: 'Compras pendientes',
            cell: (row) => <Badge variant="secondary">{row.pending_count}</Badge>,
          },
          {
            header: 'Total que se le debe',
            align: 'right',
            cell: (row) => <span className="font-semibold text-destructive">{money(row.pending_amount)}</span>,
          },
          {
            header: '',
            align: 'right',
            cell: (row) =>
              canPay ? (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setPayingDebt(row)}>
                    Marcar como pagado
                  </Button>
                </div>
              ) : null,
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.user_id}
        isLoading={isLoading}
        emptyIcon={HandCoins}
        emptyTitle="No hay deudas pendientes con el personal"
      />

      {data && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <ConfirmDialog
        open={payingDebt !== null}
        onOpenChange={(open) => !open && setPayingDebt(null)}
        variant="default"
        title="Marcar deuda como pagada"
        description={
          payingDebt
            ? `Se marcarán como pagadas las ${payingDebt.pending_count} compra(s) pendientes de ${payingDebt.employee_name} por ${money(payingDebt.pending_amount)}.`
            : ''
        }
        confirmLabel="Marcar como pagado"
        onConfirm={async () => {
          if (!payingDebt) return;
          // mutateAsync (no mutate+callbacks): ConfirmDialog espera esta
          // promesa para mantener su propio spinner mientras la petición
          // sigue en vuelo, y para que un error se propague y el diálogo
          // NO se cierre solo (antes el toggle de "confirmando" terminaba
          // de inmediato aunque la llamada siguiera pendiente).
          try {
            await payDebt(payingDebt.user_id);
            toast.success('Deuda saldada correctamente');
            setPayingDebt(null);
          } catch {
            toast.error('No se pudo saldar la deuda');
          }
        }}
      />
    </div>
  );
}
