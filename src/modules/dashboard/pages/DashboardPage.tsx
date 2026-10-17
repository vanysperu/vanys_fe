import { LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

import { QuotationDetailDialog } from '@/modules/quotations/components/QuotationDetailDialog';
import { QuotationPdfPreviewDialog } from '@/modules/quotations/components/QuotationPdfPreviewDialog';
import { QuotationsByStatus, type QuotationQuickActionTab } from '@/modules/quotations/components/QuotationsByStatus';
import { QuotationsKanbanBoard } from '@/modules/quotations/components/QuotationsKanbanBoard';
import { useQuotations } from '@/modules/quotations/hooks/useQuotations';
import { MyPurchaseOrdersWidget } from '@/modules/purchaseOrders/components/MyPurchaseOrdersWidget';
import type { Quotation } from '@/modules/quotations/types/quotation.types';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { useAccess, usePermission, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';
type TabKey = 'todas' | 'accion' | 'cobrar' | 'produccion';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'accion', label: 'Requieren acción' },
  { key: 'cobrar', label: 'Por cobrar' },
  { key: 'produccion', label: 'Producción' },
];

function matchesTab(quotation: Quotation, tab: TabKey): boolean {
  const balance = Number(quotation.total) - Number(quotation.total_paid);
  if (tab === 'accion') return ['pending', 'design_pending', 'expired'].includes(quotation.status);
  if (tab === 'cobrar') return balance > 0 && !['rejected', 'expired'].includes(quotation.status);
  if (tab === 'produccion') return ['design_pending', 'in_process', 'ready'].includes(quotation.status);
  return true;
}

// "Panel principal": la pantalla de inicio que ve cualquier rol no-superadmin
// con sus propias cotizaciones agrupadas por estado — mismo componente que
// usa la página de Cotizaciones (CLAUDE.md sección 7 - reuso de componentes).
// Los KPIs mostrados son solo los calculables con datos reales hoy (no hay
// módulo de Finanzas todavía) — el spec de diseño Vanys pide 7 KPIs, de los
// cuales 5 dependen de Ingresos/Egresos, aún sin construir.
export function DashboardPage() {
  const [tab, setTab] = useState<TabKey>('todas');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [initialTab, setInitialTab] = useState<QuotationQuickActionTab | 'products'>('products');
  const { data: access } = useAccess();
  const canSeeQuotations = usePermission('cotizacion');
  const canChangeStatus = usePermissionButton('cotizacion.changeStatus.button');

  const { data, isLoading } = useQuotations({ page: 1, limit: 100 });

  const quotations = data?.data ?? [];
  const filtered = quotations.filter((quotation) => matchesTab(quotation, tab));

  const totalPorCobrar = quotations
    .filter((quotation) => !['rejected', 'expired'].includes(quotation.status))
    .reduce((sum, quotation) => sum + (Number(quotation.total) - Number(quotation.total_paid)), 0);
  const conSaldoCount = quotations.filter(
    (quotation) =>
      !['rejected', 'expired'].includes(quotation.status) && Number(quotation.total) - Number(quotation.total_paid) > 0,
  ).length;

  const vencido = quotations
    .filter((quotation) => quotation.status === 'expired')
    .reduce((sum, quotation) => sum + (Number(quotation.total) - Number(quotation.total_paid)), 0);
  const vencidoCount = quotations.filter((quotation) => quotation.status === 'expired').length;

  const money = (n: number) =>
    'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (!canSeeQuotations) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Panel principal</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenido{access?.isSystem ? '' : ''} — tu rol no tiene acceso al módulo de cotizaciones.
          </p>
        </div>
        <MyPurchaseOrdersWidget />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">Panel principal</h1>
          <p className="text-sm text-muted-foreground">De un vistazo: qué cotizaciones requieren acción</p>
        </div>
        <div className="flex items-center rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <List className="size-3.5" /> Lista
          </button>
          <button
            type="button"
            onClick={() => setView('board')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              view === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <LayoutGrid className="size-3.5" /> Tablero
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {[
          { label: 'Total por cobrar', value: totalPorCobrar, note: `${conSaldoCount} cotizaciones con saldo`, color: 'var(--primary)' },
          { label: 'Vencido', value: vencido, note: `${vencidoCount} sin respuesta`, color: '#B4231F' },
        ].map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            className="flex flex-col gap-1.5 rounded-xl border bg-card p-3.5 shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: kpi.color }} />
              <span className="text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                {kpi.label}
              </span>
            </div>
            <div className="font-mono-nums text-xl font-semibold" style={{ color: kpi.color }}>
              {isLoading ? <Skeleton className="h-6 w-24" /> : money(kpi.value)}
            </div>
            <span className="text-[10.5px] font-semibold text-muted-foreground">{kpi.note}</span>
          </motion.div>
        ))}
      </div>

      <MyPurchaseOrdersWidget />

      {view === 'list' && (
        <nav className="flex gap-1 border-b">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 pb-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors',
                tab === t.key && 'font-bold text-foreground shadow-[inset_0_-2px_0_var(--primary)]',
              )}
            >
              {t.label}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 font-mono-nums text-[10px] font-semibold',
                  tab === t.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {quotations.filter((q) => matchesTab(q, t.key)).length}
              </span>
            </button>
          ))}
        </nav>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : view === 'list' ? (
        <QuotationsByStatus
          quotations={filtered}
          onSelect={(id) => {
            setInitialTab('products');
            setSelectedId(id);
          }}
          onQuickAction={(id, quickTab) => {
            setInitialTab(quickTab);
            setSelectedId(id);
          }}
          onPreviewPdf={setPreviewId}
        />
      ) : (
        <QuotationsKanbanBoard quotations={quotations} onSelect={setSelectedId} canChangeStatus={canChangeStatus} />
      )}

      <QuotationDetailDialog quotationId={selectedId} initialTab={initialTab} onClose={() => setSelectedId(null)} />
      <QuotationPdfPreviewDialog quotationId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
