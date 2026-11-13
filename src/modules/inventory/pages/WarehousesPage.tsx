import { Pencil, Warehouse as WarehouseIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { WarehouseFormDialog } from '@/modules/inventory/components/WarehouseFormDialog';
import { useSetTracksStock, useStores, useToggleWarehouse, useUpdateStore, useWarehouses } from '@/modules/inventory/hooks/useInventory';
import type { Warehouse } from '@/modules/inventory/types/inventory.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Almacenes (plan §8.1 y §8.2): los almacenes de cada tienda, qué tiendas usan
// almacén y cuándo descuenta una venta (D4), y "maneja stock" en bloque (D14).
export function WarehousesPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);
  return (
    <div className="space-y-6">
      <PageHeader title="Almacenes" description="Almacenes por tienda, su configuración y qué productos manejan stock" />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {ready && (
        <Tabs defaultValue="warehouses" key={companyId ?? 'own'}>
          <TabsList>
            <TabsTrigger value="warehouses">Almacenes</TabsTrigger>
            <TabsTrigger value="stores">Tiendas</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
          </TabsList>
          <TabsContent value="warehouses"><WarehousesTab companyId={companyId} /></TabsContent>
          <TabsContent value="stores"><StoresTab companyId={companyId} /></TabsContent>
          <TabsContent value="products"><TracksStockTab companyId={companyId} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function WarehousesTab({ companyId }: { companyId?: number }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const canCreate = usePermissionButton('inventory.warehouses.create.button');
  const canUpdate = usePermissionButton('inventory.warehouses.update.button');
  const canDisable = usePermissionButton('inventory.warehouses.disable.button');
  const { data, isLoading } = useWarehouses({ page, limit: 20, companyId });
  const { mutate: toggle, isPending } = useToggleWarehouse();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{canCreate && <WarehouseFormDialog companyId={companyId} />}</div>
      <DataTable
        columns={[
          { header: 'Almacén', cell: (warehouse) => <div><p className="font-medium">{warehouse.name}</p><p className="font-mono text-xs text-muted-foreground">{warehouse.code}</p></div> },
          { header: 'Tienda', cell: (warehouse) => warehouse.businessUnitName ?? '—' },
          {
            header: 'Configuración',
            hideOnMobile: true,
            cell: (warehouse) => (
              <div className="flex flex-wrap gap-1">
                {warehouse.is_default && <Badge variant="default">Predeterminado</Badge>}
                {warehouse.allow_negative_stock && <Badge variant="warning">Permite negativo</Badge>}
                {warehouse.track_lots && <Badge variant="muted">Lotes</Badge>}
                {warehouse.track_expiry && <Badge variant="muted">Vencimiento ({warehouse.expiry_alert_days} d)</Badge>}
              </div>
            ),
          },
          { header: 'Estado', cell: (warehouse) => (warehouse.active ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>) },
          {
            header: '',
            align: 'right',
            cell: (warehouse) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Configurar ${warehouse.name}`} onClick={() => setEditing(warehouse)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={warehouse.active}
                    disabled={isPending}
                    entityLabel="almacén"
                    onToggle={() =>
                      toggle(warehouse.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Almacén habilitado' : 'Almacén deshabilitado'),
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
        rowKey={(warehouse) => warehouse.id}
        isLoading={isLoading}
        emptyIcon={WarehouseIcon}
        emptyTitle="Todavía no hay almacenes"
      />
      {data && <Pagination result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }} onPageChange={setPage} />}
      {editing && <WarehouseFormDialog warehouse={editing} companyId={companyId} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StoresTab({ companyId }: { companyId?: number }) {
  const { data, isLoading } = useStores({ page: 1, limit: 100, companyId });
  const canUpdate = usePermissionButton('inventory.stores.update.button');
  const { mutate: update, isPending } = useUpdateStore();
  const save = (id: number, inventory_enabled: boolean, inventory_exit_on: 'delivered' | 'dispatch_guide') =>
    update({ id, inventory_enabled, inventory_exit_on }, { onSuccess: () => toast.success('Tienda actualizada'), onError: (error) => toast.error((error as ApiClientError).message) });

  return (
    <DataTable
      columns={[
        { header: 'Tienda', cell: (store) => <span className="font-medium">{store.code ?? '—'}</span> },
        {
          header: 'Usa almacén',
          cell: (store) => (
            <ToggleSwitch checked={store.inventory_enabled} disabled={!canUpdate || isPending} label={`${store.code ?? 'Tienda'} usa almacén`}
              onCheckedChange={(checked) => save(store.id, checked, store.inventory_exit_on)} />
          ),
        },
        {
          header: 'La venta descuenta el stock',
          cell: (store) => (
            <Select value={store.inventory_exit_on} disabled={!canUpdate || isPending || !store.inventory_enabled}
              onValueChange={(value) => { if (!value) return; save(store.id, store.inventory_enabled, value as 'delivered' | 'dispatch_guide'); }}>
              <SelectTrigger className="w-64" aria-label={`Cuándo descuenta ${store.code ?? ''}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="delivered">Al marcar la cotización Entregada</SelectItem>
                <SelectItem value="dispatch_guide">Al emitir la guía de remisión</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
      ]}
      rows={data?.data ?? []}
      rowKey={(store) => store.id}
      isLoading={isLoading}
      emptyIcon={WarehouseIcon}
      emptyTitle="No hay tiendas"
    />
  );
}

function TracksStockTab({ companyId }: { companyId?: number }) {
  const [confirm, setConfirm] = useState(false);
  const canUpdate = usePermissionButton('inventory.products.tracksStock.button');
  const { mutateAsync: setTracks, isPending } = useSetTracksStock();
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 text-sm shadow-sm">
      <p>
        Al activar el inventario, los productos que ya existían arrancan <strong>sin manejar stock</strong>; los nuevos nacen manejándolo.
        Cada producto se puede cambiar en su ficha ("Maneja stock"). Los servicios e intangibles (diseño, delivery…) deben quedar apagados.
      </p>
      {canUpdate && (
        <Button disabled={isPending} onClick={() => setConfirm(true)}>
          Encender "Maneja stock" en todos los productos
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="¿Encender en todos?"
        description="Todos los productos activos de la empresa pasarán a manejar stock. Después apaga los servicios e intangibles uno por uno."
        confirmLabel="Sí, encender"
        onConfirm={async () => {
          try {
            const result = await setTracks({ all: true, tracksStock: true, ...(companyId ? { company_id: companyId } : {}) });
            toast.success(`${result.updated} producto(s) ahora manejan stock`);
          } catch (error: unknown) {
            toast.error((error as ApiClientError).message);
          }
        }}
      />
    </div>
  );
}
