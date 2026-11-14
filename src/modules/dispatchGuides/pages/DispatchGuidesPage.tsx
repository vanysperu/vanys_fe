import { Eye, FileCheck2, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { GuideDetailDialog } from '@/modules/dispatchGuides/components/GuideDetailDialog';
import { GuideFormDialog } from '@/modules/dispatchGuides/components/GuideFormDialog';
import { GuideStatusBadge } from '@/modules/dispatchGuides/components/GuideStatusBadge';
import { RegisterGuideDialog } from '@/modules/dispatchGuides/components/RegisterGuideDialog';
import { useDiscardGuide, useGuides } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { GUIDE_STATUS_LABEL, type GuideSummary } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const STATUS_OPTIONS = (['draft', 'manual', 'voided'] as const).map((status) => ({ value: status, label: GUIDE_STATUS_LABEL[status] }));

const actionClass = 'rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary';

// Logística → Guías de remisión (Sprint 2, ítem 1, modo manual): borradores
// por emitir, guías registradas con su número de SUNAT y anuladas.
export function DispatchGuidesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  // undefined = cerrado; null = guía nueva de cero; número = editar ese borrador.
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const [viewing, setViewing] = useState<number | null>(null);
  const [registering, setRegistering] = useState<GuideSummary | null>(null);
  const [discarding, setDiscarding] = useState<GuideSummary | null>(null);
  const canCreate = usePermissionButton('dispatch_guide.create.button');
  const canUpdate = usePermissionButton('dispatch_guide.update.button');
  const canRegister = usePermissionButton('dispatch_guide.register.button');
  const canDiscard = usePermissionButton('dispatch_guide.discard.button');
  const { mutate: discard } = useDiscardGuide();

  const { data, isLoading } = useGuides({
    page,
    limit: pageSize,
    searchTerm: search.trim() || undefined,
    status,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guías de remisión"
        description="Arma la guía, emítela en SUNAT (SEE-SOL o App Emprender) y registra aquí su número y PDF"
        action={
          canCreate && (
            <Button onClick={() => setEditing(null)}>
              <Plus className="size-4" />
              Nueva guía
            </Button>
          )
        }
      />

      <FiltersBar
        hasActiveFilters={Boolean(search || status || dateRange.dateFrom || dateRange.dateTo)}
        onClear={() => {
          setSearch('');
          setStatus(undefined);
          setDateRange({});
          setPage(1);
        }}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar número (T001-12), destinatario o cotización..."
            className="h-9 w-80 pl-9"
            value={search}
            onChange={(event) => withPageReset(setSearch)(event.target.value)}
          />
        </div>
        <FilterSelect aria-label="Estado" allLabel="Todos los estados" value={status} onChange={withPageReset(setStatus)} options={STATUS_OPTIONS} />
        <DateRangeFilter placeholder="Fecha de creación" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<GuideSummary>
        columns={[
          {
            header: 'Guía',
            cell: (guide) => (
              <span>
                <span className="font-mono font-medium">{guide.number_text ?? `Borrador #${guide.id}`}</span>
                <span className="block text-[10px] text-muted-foreground">{formatDate(guide.issue_date ?? guide.createdAt.date)}</span>
              </span>
            ),
          },
          { header: 'Motivo', cell: (guide) => `${guide.reason_code} · ${guide.reason_label}`, hideOnMobile: true },
          {
            header: 'Destinatario',
            cell: (guide) => (
              <span>
                {guide.recipient_name ?? '—'}
                <span className="block max-w-56 truncate text-[10px] text-muted-foreground">{guide.destination_address ?? ''}</span>
              </span>
            ),
          },
          { header: 'Cotización', cell: (guide) => (guide.quotation_id ? `#${guide.quotation_id}` : '—'), hideOnMobile: true },
          { header: 'Estado', cell: (guide) => <GuideStatusBadge status={guide.status} /> },
          {
            header: '',
            align: 'right',
            cell: (guide) => (
              <div className="flex justify-end gap-1">
                <button type="button" title="Ver guía" className={actionClass} onClick={() => setViewing(guide.id)}>
                  <Eye className="size-3.5" />
                </button>
                {guide.status === 'draft' && canUpdate && (
                  <button type="button" title="Editar borrador" className={actionClass} onClick={() => setEditing(guide.id)}>
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {guide.status === 'draft' && canRegister && (
                  <button type="button" title="Registrar guía emitida" className={actionClass} onClick={() => setRegistering(guide)} data-testid={`guide-register-${guide.id}`}>
                    <FileCheck2 className="size-3.5" />
                  </button>
                )}
                {guide.status === 'draft' && canDiscard && (
                  <button type="button" title="Descartar borrador" className={actionClass} onClick={() => setDiscarding(guide)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(guide) => guide.id}
        isLoading={isLoading}
        emptyIcon={FileText}
        emptyTitle="No hay guías de remisión"
        emptyDescription='Arma una con "Nueva guía" o desde una cotización Lista para entregar.'
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

      {editing !== undefined && <GuideFormDialog guideId={editing ?? undefined} onClose={() => setEditing(undefined)} />}
      {viewing !== null && <GuideDetailDialog guideId={viewing} onClose={() => setViewing(null)} />}
      {registering && <RegisterGuideDialog guide={registering} onClose={() => setRegistering(null)} />}
      <ConfirmDialog
        open={discarding !== null}
        onOpenChange={(open) => !open && setDiscarding(null)}
        title="¿Descartar el borrador?"
        description="El borrador queda anulado y lo que llevaba deja de contar como despachado."
        confirmLabel="Descartar"
        variant="destructive"
        onConfirm={() => {
          if (!discarding) return;
          const target = discarding;
          setDiscarding(null);
          discard(target.id, {
            onSuccess: () => toast.success('Borrador descartado'),
            onError: (error) => toast.error((error as ApiClientError).message),
          });
        }}
      />
    </div>
  );
}
