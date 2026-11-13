import { Pencil, Search, Truck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { SupplierFormDialog } from '@/modules/suppliers/components/SupplierFormDialog';
import { useSuppliers, useToggleSupplierStatus } from '@/modules/suppliers/hooks/useSuppliers';
import type { Supplier } from '@/modules/suppliers/types/supplier.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Catálogo de proveedores (Sprint 2, base común): misma composición que
// Clientes — PageHeader con buscador y "Nuevo", tabla, acciones a la derecha
// (editar → deshabilitar) y paginación (CLAUDE.md §7, consistencia).
export function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const canCreate = usePermissionButton('supplier.create.button');
  const canUpdate = usePermissionButton('supplier.update.button');
  const canDisable = usePermissionButton('supplier.disable.button');
  const { mutate: toggleStatus, isPending: isToggling } = useToggleSupplierStatus();

  const { data, isLoading } = useSuppliers({
    page,
    limit: pageSize,
    searchTerm: search || undefined,
    orderBy,
    orderDir,
    status: columnFilters.status || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        description="Importadoras y proveedores: sus códigos de producto y su stock"
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
            {canCreate && <SupplierFormDialog />}
          </div>
        }
      />

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            cell: (supplier) => (
              <div className="min-w-0">
                <p className="font-medium">{supplier.name}</p>
                {supplier.trade_name && <p className="text-xs text-muted-foreground">{supplier.trade_name}</p>}
              </div>
            ),
          },
          {
            header: 'Documento',
            sortable: true,
            sortKey: 'document_number',
            cell: (supplier) => supplier.document_number ?? '—',
          },
          {
            header: 'Contacto',
            cell: (supplier) => [supplier.email, supplier.phone].filter(Boolean).join(' · ') || '—',
          },
          {
            header: 'Transportista',
            cell: (supplier) => (supplier.is_carrier ? <Badge variant="default">Sí</Badge> : '—'),
          },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'active',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (supplier) =>
              supplier.active ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (supplier) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Editar ${supplier.name}`}
                    onClick={() => setEditSupplier(supplier)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={supplier.active}
                    disabled={isToggling}
                    entityLabel="proveedor"
                    onToggle={() =>
                      toggleStatus(supplier.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Proveedor habilitado' : 'Proveedor deshabilitado'),
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
        rowKey={(supplier) => supplier.id}
        isLoading={isLoading}
        emptyIcon={Truck}
        emptyTitle="No se encontraron proveedores"
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

      {editSupplier && <SupplierFormDialog supplier={editSupplier} onClose={() => setEditSupplier(null)} />}
    </div>
  );
}
