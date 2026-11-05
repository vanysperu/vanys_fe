import { Eye, FileText, RefreshCw, Search, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { InvoiceFileDialog } from '@/modules/invoices/components/InvoiceFileDialog';
import { UploadInvoiceDialog } from '@/modules/invoices/components/UploadInvoiceDialog';
import { useInvoices, useRetryInvoiceDrive } from '@/modules/invoices/hooks/useInvoices';
import {
  DRIVE_STATUS_LABEL,
  INVOICE_TYPE_LABEL,
  type Invoice,
  type InvoiceDriveStatus,
  type InvoiceType,
} from '@/modules/invoices/types/invoice.types';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { formatDate } from '@/lib/dateUtils';

type TypeTab = 'all' | InvoiceType;

const DRIVE_BADGE: Record<InvoiceDriveStatus, 'muted' | 'warning' | 'success' | 'destructive'> = {
  none: 'muted',
  pending: 'warning',
  copied: 'success',
  failed: 'destructive',
};

const sizeLabel = (bytes: number | null) => (bytes === null ? '' : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Facturas emitidas (al cerrar una cotización) y de compras (al registrar una
// compra de una orden de compra), con la lista de las que "faltan subir" —
// pedido explícito del usuario: tener todas las facturas mapeadas.
export function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [onlyPending, setOnlyPending] = useState(false);
  const [driveFilter, setDriveFilter] = useState<string | undefined>(undefined);
  const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [uploading, setUploading] = useState<Invoice | null>(null);
  // Factura abierta en el visor (modal).
  const [viewing, setViewing] = useState<Invoice | null>(null);

  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const canUpload = usePermissionButton('invoice.file.upload.button');
  const canView = usePermissionButton('invoice.file.view.button');
  const canRetry = usePermissionButton('invoice.drive.retry.button');

  const { data, isLoading } = useInvoices({
    page,
    limit: pageSize,
    type: typeTab === 'all' ? undefined : typeTab,
    file: onlyPending ? 'pending' : undefined,
    drive: driveFilter as InvoiceDriveStatus | undefined,
    companyId: companyFilter ? Number(companyFilter) : undefined,
    search: search.trim() || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const { mutate: retryDrive, isPending: isRetrying } = useRetryInvoiceDrive();

  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const hasActiveFilters = Boolean(onlyPending || driveFilter || companyFilter || search || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setOnlyPending(false);
    setDriveFilter(undefined);
    setCompanyFilter(undefined);
    setSearch('');
    setDateRange({});
    setPage(1);
  };

  const showError = (error: unknown) => toast.error((error as ApiClientError).message);
  const pendingCount = data?.summary.pending_count ?? 0;
  const failedCount = data?.summary.drive_failed_count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Facturas" description="Facturas emitidas a clientes y facturas de las compras" />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={typeTab} onValueChange={(value) => withPageReset(setTypeTab)(value as TypeTab)}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="issued">Emitidas</TabsTrigger>
            <TabsTrigger value="purchase">Compras</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          type="button"
          size="sm"
          variant={onlyPending ? 'default' : 'outline'}
          onClick={() => withPageReset(setOnlyPending)(!onlyPending)}
          data-testid="invoices-pending-toggle"
        >
          <Upload className="size-4" />
          Faltan subir ({pendingCount})
        </Button>
        {failedCount > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={() => withPageReset(setDriveFilter)('failed')}>
            <Badge variant="destructive">{failedCount}</Badge>
            no se copiaron a Drive
          </Button>
        )}
      </div>

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cotización, cliente o producto..."
            className="h-9 w-72 pl-9"
            value={search}
            onChange={(event) => withPageReset(setSearch)(event.target.value)}
          />
        </div>
        {isSystem && (
          <FilterSelect
            aria-label="Empresa"
            allLabel="Todas las empresas"
            value={companyFilter}
            onChange={withPageReset(setCompanyFilter)}
            options={(companies?.data ?? []).map((row) => ({ value: String(row.id), label: row.business_name }))}
          />
        )}
        <FilterSelect
          aria-label="Copia en Drive"
          allLabel="Drive: todas"
          value={driveFilter}
          onChange={withPageReset(setDriveFilter)}
          options={(['copied', 'pending', 'failed', 'none'] as const).map((status) => ({ value: status, label: `Drive: ${DRIVE_STATUS_LABEL[status]}` }))}
        />
        <DateRangeFilter placeholder="Fecha de registro" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<Invoice>
        columns={[
          {
            header: 'Fecha',
            cell: (row) => (
              <span>
                {formatDate(row.created_at.date)}
                <span className="block text-[10px] text-muted-foreground">{row.created_by_name ?? ''}</span>
              </span>
            ),
          },
          { header: 'Tipo', cell: (row) => <Badge variant={row.type === 'issued' ? 'default' : 'secondary'}>{INVOICE_TYPE_LABEL[row.type]}</Badge> },
          {
            header: 'Cotización',
            cell: (row) => (
              <span>
                {row.quotation_code}
                <span className="block max-w-64 truncate text-[10px] text-muted-foreground" title={row.description}>
                  {row.description}
                </span>
              </span>
            ),
          },
          ...(isSystem ? [{ header: 'Empresa', cell: (row: Invoice) => row.company_name ?? '—' }] : []),
          {
            header: 'Archivo',
            cell: (row) =>
              row.has_file ? (
                <span className="text-xs">
                  <Badge variant="success">Subida</Badge>
                  <span className="block text-[10px] text-muted-foreground">
                    {formatDate(row.file_uploaded_at?.date)} · {sizeLabel(row.size_bytes)}
                  </span>
                </span>
              ) : (
                <Badge variant="warning">Falta subir</Badge>
              ),
          },
          {
            header: 'Drive',
            cell: (row) => (
              <span title={row.drive_error ?? undefined}>
                <Badge variant={DRIVE_BADGE[row.drive_status]}>{DRIVE_STATUS_LABEL[row.drive_status]}</Badge>
              </span>
            ),
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <div className="flex justify-end gap-1">
                {canView && row.has_file && (
                  <button
                    type="button"
                    title="Ver factura"
                    onClick={() => setViewing(row)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="size-3.5" />
                  </button>
                )}
                {canUpload && (
                  <button
                    type="button"
                    title={row.has_file ? 'Reemplazar archivo' : 'Subir factura'}
                    onClick={() => setUploading(row)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    data-testid={`invoice-upload-${row.id}`}
                  >
                    <Upload className="size-3.5" />
                  </button>
                )}
                {canRetry && row.drive_status === 'failed' && (
                  <button
                    type="button"
                    title="Reintentar copia a Drive"
                    disabled={isRetrying}
                    onClick={() =>
                      retryDrive(row.id, {
                        onSuccess: () => toast.success('Copia a Drive reintentada'),
                        onError: showError,
                      })
                    }
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={FileText}
        emptyTitle={onlyPending ? 'No faltan facturas por subir' : 'No se encontraron facturas'}
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

      <UploadInvoiceDialog invoice={uploading} onClose={() => setUploading(null)} />
      <InvoiceFileDialog invoice={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
