import { IdCard, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DriverFormDialog } from '@/modules/dispatchGuides/components/DriverFormDialog';
import { useDrivers, useToggleDriverStatus } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { IDENTITY_DOC_TYPES, type Driver } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Logística → Conductores (Sprint 2, ítem 1): mismo patrón que Vehículos.
export function DriversPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  // undefined = cerrado; null = crear; conductor = editar.
  const [editing, setEditing] = useState<Driver | null | undefined>(undefined);
  const canCreate = usePermissionButton('dispatch_guide.drivers.create.button');
  const canUpdate = usePermissionButton('dispatch_guide.drivers.update.button');
  const canDisable = usePermissionButton('dispatch_guide.drivers.disable.button');
  const { mutate: toggleStatus, isPending: isToggling } = useToggleDriverStatus();
  const { data, isLoading } = useDrivers({ page, limit: pageSize, searchTerm: search || undefined, status: columnFilters.status || undefined, orderBy, orderDir });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conductores"
        description="Conductores para el transporte privado de las guías de remisión"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nombre o documento..."
                className="w-full pl-9 sm:w-64"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {canCreate && (
              <Button onClick={() => setEditing(null)}>
                <Plus className="size-4" />
                Nuevo conductor
              </Button>
            )}
          </div>
        }
      />

      <DataTable<Driver>
        columns={[
          {
            header: 'Conductor',
            sortable: true,
            sortKey: 'last_names',
            cell: (driver) => (
              <span className="font-medium">
                {driver.first_names} {driver.last_names}
              </span>
            ),
          },
          { header: 'Documento', cell: (driver) => `${IDENTITY_DOC_TYPES[driver.doc_type] ?? driver.doc_type} ${driver.doc_number}` },
          { header: 'Licencia', cell: (driver) => driver.license_number },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'active',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (driver) => (driver.active ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>),
          },
          {
            header: '',
            align: 'right',
            cell: (driver) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${driver.first_names}`} onClick={() => setEditing(driver)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={driver.active}
                    disabled={isToggling}
                    entityLabel="conductor"
                    onToggle={() =>
                      toggleStatus(driver.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Conductor habilitado' : 'Conductor deshabilitado'),
                        onError: (error) => toast.error((error as ApiClientError).message),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(driver) => driver.id}
        isLoading={isLoading}
        emptyIcon={IdCard}
        emptyTitle="No hay conductores"
        sortBy={orderBy}
        sortDir={orderDir}
        onSortChange={(key, dir) => {
          setOrderBy(dir ? key : undefined);
          setOrderDir(dir);
          setPage(1);
        }}
        columnFilters={columnFilters}
        onColumnFilterChange={(key, value) => {
          setColumnFilters((previous) => ({ ...previous, [key]: value }));
          setPage(1);
        }}
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

      {editing !== undefined && <DriverFormDialog driver={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
