import { useState } from 'react';
import { ArrowDown, ArrowUp, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { buildAssetUrl } from '@/lib/utils';
import { AdvertisementFormDialog } from '@/modules/advertisements/components/AdvertisementFormDialog';
import {
  useAdvertisementZones,
  useAdvertisements,
  useDeleteAdvertisement,
  useMoveAdvertisement,
  useToggleAdvertisementStatus,
} from '@/modules/advertisements/hooks/useAdvertisements';
import type { Advertisement, AdvertisementStatusFilter } from '@/modules/advertisements/types/advertisement.types';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Visible' },
  { value: 'inactive', label: 'Apagado' },
];

// Filtro de columna multiselección: una sola opción filtra; ninguna o las dos = todos.
const toStatusFilter = (value: string | undefined): AdvertisementStatusFilter => {
  const selected = (value ?? '').split(',').filter(Boolean);
  if (selected.length !== 1) return 'all';
  return selected[0] === 'inactive' ? 'inactive' : 'active';
};

// Filtro de zona: una zona, "sin zona" o todas.
const NO_ZONE = 'none';

// "Anuncios": imágenes publicitarias de la web (pedido explícito del usuario).
// Cada anuncio va en una zona (lugar de la web) con su orden; la web los pide
// por zona con su API key (advertisement/README.md en el backend). Misma
// composición que los demás catálogos: encabezado → filtros → tabla → paginación.
export function AdvertisementsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);
  const [editAdvertisement, setEditAdvertisement] = useState<Advertisement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const canCreate = usePermissionButton('advertisement.create.button');
  const canUpdate = usePermissionButton('advertisement.update.button');
  const canMove = usePermissionButton('advertisement.position.button');
  const canToggle = usePermissionButton('advertisement.disable.button');
  const canDelete = usePermissionButton('advertisement.delete.button');

  const { data, isLoading } = useAdvertisements({
    page,
    limit: pageSize,
    companyId,
    zoneId: zoneFilter === NO_ZONE ? NO_ZONE : zoneFilter ? Number(zoneFilter) : undefined,
    status: toStatusFilter(columnFilters.status),
    title: columnFilters.title || undefined,
  });
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  // Todas las zonas (también las deshabilitadas) para poder filtrar por ellas.
  const { data: zones } = useAdvertisementZones(isSystem ? companyId : access?.companyId ?? undefined, false);
  const { mutate: move, isPending: isMoving } = useMoveAdvertisement();
  const { mutate: toggle } = useToggleAdvertisementStatus();
  const { mutateAsync: remove } = useDeleteAdvertisement();

  const companyOptions = (companies?.data ?? []).map((company) => ({ value: String(company.id), label: company.business_name }));
  const zoneOptions = [
    { value: NO_ZONE, label: 'Sin zona' },
    ...(zones?.data ?? []).map((zone) => ({
      value: String(zone.id),
      label: zone.is_deleted ? `${zone.name} (deshabilitada)` : zone.name,
    })),
  ];

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const showError = (error: unknown) => toast.error((error as ApiClientError).message);

  const moveTo = (advertisement: Advertisement, position: number) =>
    move({ id: advertisement.id, position }, { onError: showError });

  const handleToggle = (advertisement: Advertisement) =>
    toggle(
      { id: advertisement.id, isActive: !advertisement.is_active },
      {
        onSuccess: (saved) => toast.success(saved.is_active ? 'Anuncio prendido: ya sale en la web' : 'Anuncio apagado: ya no sale en la web'),
        onError: showError,
      },
    );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
      toast.success(`Anuncio "${deleteTarget.title}" eliminado, junto con su imagen`);
    } catch (error) {
      showError(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Anuncios"
        description="Imágenes publicitarias de la web, por zona y en el orden en que salen"
        action={canCreate && <AdvertisementFormDialog />}
      />

      <FiltersBar
        hasActiveFilters={Boolean(companyId || zoneFilter)}
        onClear={() => {
          setCompanyId(undefined);
          setZoneFilter(undefined);
          setPage(1);
        }}
      >
        {isSystem && (
          <SearchableSelect
            className="sm:w-64"
            placeholder="Todas las empresas"
            value={companyId ? String(companyId) : undefined}
            onChange={(value) => {
              setCompanyId(Number(value));
              // Las zonas dependen de la empresa elegida.
              setZoneFilter(undefined);
              setPage(1);
            }}
            onClear={() => {
              setCompanyId(undefined);
              setZoneFilter(undefined);
              setPage(1);
            }}
            clearLabel="Todas las empresas"
            options={companyOptions}
            emptyText="No se encontró esa empresa"
          />
        )}
        <SearchableSelect
          className="sm:w-64"
          placeholder="Todas las zonas"
          value={zoneFilter}
          onChange={(value) => {
            setZoneFilter(value);
            setPage(1);
          }}
          onClear={() => {
            setZoneFilter(undefined);
            setPage(1);
          }}
          clearLabel="Todas las zonas"
          options={zoneOptions}
          emptyText="No se encontró esa zona"
        />
      </FiltersBar>

      <DataTable
        columns={[
          {
            header: 'Orden',
            cell: (advertisement) => (
              <div className="flex items-center gap-1">
                <span className="font-mono-nums w-6 text-sm font-semibold" data-testid="advertisement-position">
                  {advertisement.position}
                </span>
                {canMove && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Subir (sale antes en la web)"
                      aria-label={`Subir ${advertisement.title}`}
                      disabled={isMoving || advertisement.position <= 1}
                      onClick={() => moveTo(advertisement, advertisement.position - 1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      title="Bajar (sale después en la web)"
                      aria-label={`Bajar ${advertisement.title}`}
                      disabled={isMoving || advertisement.position >= advertisement.zone_total}
                      onClick={() => moveTo(advertisement, advertisement.position + 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
          {
            header: 'Imagen',
            cell: (advertisement) => {
              const imageUrl = buildAssetUrl(advertisement.image_path);
              return imageUrl ? (
                <a href={imageUrl} target="_blank" rel="noreferrer" title="Abrir la imagen en otra pestaña">
                  <img
                    src={imageUrl}
                    alt={advertisement.title}
                    className="h-12 w-20 rounded border bg-muted/40 object-contain"
                    data-testid="advertisement-thumbnail"
                  />
                </a>
              ) : null;
            },
          },
          {
            header: 'Anuncio',
            filterable: true,
            filterKey: 'title',
            cell: (advertisement) => (
              <div className="min-w-0">
                <p className="font-medium">{advertisement.title}</p>
                {advertisement.link_url && (
                  <p className="max-w-64 truncate text-xs text-muted-foreground" title={advertisement.link_url}>
                    {advertisement.link_url}
                  </p>
                )}
              </div>
            ),
          },
          {
            header: 'Zona',
            cell: (advertisement) =>
              advertisement.zone ? (
                <div className="min-w-0">
                  <p className="text-sm">{advertisement.zone.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{advertisement.zone.code}</p>
                  {!advertisement.zone.is_active && (
                    <Badge variant="warning" className="mt-1">
                      Zona deshabilitada
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Sin zona</span>
              ),
          },
          // Solo el Super Administrador ve anuncios de varias empresas.
          ...(isSystem
            ? [
                {
                  header: 'Empresa',
                  cell: (advertisement: Advertisement) => <span className="text-sm">{advertisement.company_name ?? '—'}</span>,
                },
              ]
            : []),
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: STATUS_FILTER_OPTIONS,
            cell: (advertisement) =>
              advertisement.is_active ? <Badge variant="success">Visible</Badge> : <Badge variant="muted">Apagado</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (advertisement) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Editar anuncio"
                    aria-label="Editar anuncio"
                    onClick={() => setEditAdvertisement(advertisement)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canToggle && (
                  <ToggleStatusButton
                    active={advertisement.is_active}
                    entityLabel="anuncio"
                    onToggle={() => handleToggle(advertisement)}
                  />
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Eliminar anuncio"
                    aria-label="Eliminar anuncio"
                    onClick={() => setDeleteTarget(advertisement)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(advertisement) => advertisement.id}
        isLoading={isLoading}
        emptyIcon={Megaphone}
        emptyTitle="No hay anuncios"
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

      {editAdvertisement && (
        <AdvertisementFormDialog advertisement={editAdvertisement} onClose={() => setEditAdvertisement(null)} />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar este anuncio?"
        description={
          deleteTarget
            ? `"${deleteTarget.title}" se borra para siempre, junto con su imagen: no se puede recuperar. Si solo quieres que no salga en la web, apágalo.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
