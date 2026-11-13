import { useState } from 'react';
import { Pencil, Search, Users2 } from 'lucide-react';
import { toast } from 'sonner';

import { ClientFormDialog } from '@/modules/clients/components/ClientFormDialog';
import { useClients, useToggleClientStatus } from '@/modules/clients/hooks/useClients';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import type { Client } from '@/modules/clients/types/client.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

export function ClientsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState<Client | null>(null);
  // Ordenamiento elevado a la página (mismo criterio que Pagination): se
  // guarda acá y se pasa tal cual al hook de query, que dispara el refetch.
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  // Filtros por columna (teléfono, documento, estado) — se agregan al
  // buscador global existente, no lo reemplazan.
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const canCreate = usePermissionButton('cliente.create.button');
  const canUpdate = usePermissionButton('cliente.update.button');
  const canDisable = usePermissionButton('cliente.disable.button');

  const { data, isLoading } = useClients({
    page,
    limit: pageSize,
    searchTerm: search || undefined,
    orderBy,
    orderDir,
    name: columnFilters.name || undefined,
    email: columnFilters.email || undefined,
    phone: columnFilters.phone || undefined,
    documentNumber: columnFilters.documentNumber || undefined,
    status: columnFilters.status || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };
  const { mutate: toggleStatus, isPending: isToggling } = useToggleClientStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Datos de contacto e historial de cotizaciones"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-full pl-9 sm:w-64"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {canCreate && <ClientFormDialog />}
          </div>
        }
      />

      <FiltersBar
        hasActiveFilters={Boolean(dateRange.dateFrom || dateRange.dateTo)}
        onClear={() => {
          setDateRange({});
          setPage(1);
        }}
      >
        <DateRangeFilter
          placeholder="Fecha de registro"
          value={dateRange}
          onChange={(value) => {
            setDateRange(value);
            setPage(1);
          }}
        />
      </FiltersBar>

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (client) => <span className="font-medium">{client.name}</span>,
          },
          {
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            filterable: true,
            filterKey: 'email',
            cell: (client) => client.email ?? '—',
          },
          {
            header: 'Teléfono',
            sortable: true,
            sortKey: 'phone',
            filterable: true,
            filterKey: 'phone',
            cell: (client) => client.phone ?? '—',
          },
          {
            header: 'Documento',
            sortable: true,
            sortKey: 'document_number',
            filterable: true,
            filterKey: 'documentNumber',
            cell: (client) => client.document_number ?? '—',
          },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'is_deleted',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (client) =>
              client.is_deleted ? <Badge variant="destructive">Inactivo</Badge> : <Badge variant="success">Activo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (client) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditClient(client)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!client.is_deleted}
                    disabled={isToggling}
                    entityLabel="cliente"
                    onToggle={() =>
                      toggleStatus(client.id, {
                        onSuccess: () =>
                          toast.success(client.is_deleted ? 'Cliente habilitado' : 'Cliente deshabilitado'),
                        onError: () => toast.error('No se pudo actualizar el cliente'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(client) => client.id}
        isLoading={isLoading}
        emptyIcon={Users2}
        emptyTitle="No se encontraron clientes"
        sortBy={orderBy}
        sortDir={orderDir}
        onSortChange={handleSortChange}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
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

      {editClient && <ClientFormDialog client={editClient} onClose={() => setEditClient(null)} />}
    </div>
  );
}
