import { Pencil, Plus, Search, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { VehicleFormDialog } from '@/modules/dispatchGuides/components/VehicleFormDialog';
import { useToggleVehicleStatus, useVehicles } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import type { Vehicle } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Logística → Vehículos (Sprint 2, ítem 1): misma composición que los demás
// catálogos — buscador y "Nuevo" arriba, tabla con editar → deshabilitar, paginación.
export function VehiclesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  // undefined = cerrado; null = crear; vehículo = editar.
  const [editing, setEditing] = useState<Vehicle | null | undefined>(undefined);
  const canCreate = usePermissionButton('dispatch_guide.vehicles.create.button');
  const canUpdate = usePermissionButton('dispatch_guide.vehicles.update.button');
  const canDisable = usePermissionButton('dispatch_guide.vehicles.disable.button');
  const { mutate: toggleStatus, isPending: isToggling } = useToggleVehicleStatus();
  const { data, isLoading } = useVehicles({ page, limit: pageSize, searchTerm: search || undefined, status: columnFilters.status || undefined, orderBy, orderDir });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehículos"
        description="Vehículos propios para el transporte privado de las guías de remisión"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar placa..."
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
                Nuevo vehículo
              </Button>
            )}
          </div>
        }
      />

      <DataTable<Vehicle>
        columns={[
          { header: 'Placa', sortable: true, sortKey: 'plate', cell: (vehicle) => <span className="font-mono font-medium">{vehicle.plate}</span> },
          { header: 'Descripción', cell: (vehicle) => vehicle.description ?? '—' },
          { header: 'Autorización', cell: (vehicle) => vehicle.authorization_number ?? '—', hideOnMobile: true },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'active',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (vehicle) => (vehicle.active ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>),
          },
          {
            header: '',
            align: 'right',
            cell: (vehicle) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${vehicle.plate}`} onClick={() => setEditing(vehicle)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={vehicle.active}
                    disabled={isToggling}
                    entityLabel="vehículo"
                    onToggle={() =>
                      toggleStatus(vehicle.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Vehículo habilitado' : 'Vehículo deshabilitado'),
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
        rowKey={(vehicle) => vehicle.id}
        isLoading={isLoading}
        emptyIcon={Truck}
        emptyTitle="No hay vehículos"
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

      {editing !== undefined && <VehicleFormDialog vehicle={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
