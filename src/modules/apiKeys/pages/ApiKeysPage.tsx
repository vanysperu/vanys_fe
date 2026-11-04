import { useState } from 'react';
import { KeyRound, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { ApiKeyFormDialog } from '@/modules/apiKeys/components/ApiKeyFormDialog';
import { CreatedApiKeyDialog } from '@/modules/apiKeys/components/CreatedApiKeyDialog';
import { useApiKeys, useRevokeApiKey } from '@/modules/apiKeys/hooks/useApiKeys';
import type { ApiKey, ApiKeyStatusFilter, CreatedApiKey, LocalDateTime } from '@/modules/apiKeys/types/apiKey.types';
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
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'revoked', label: 'Revocada' },
];

// El filtro de columna es multiselección ("active,revoked"): una sola opción
// filtra; ninguna o las dos = todas.
const toStatusFilter = (value: string | undefined): ApiKeyStatusFilter => {
  const selected = (value ?? '').split(',').filter(Boolean);
  if (selected.length !== 1) return 'all';
  return selected[0] === 'revoked' ? 'revoked' : 'active';
};

const formatDateTime = (value: LocalDateTime | null) => (value ? `${value.date} ${value.time}` : '—');

// "API keys" de integración (ej. la web pública que envía pedidos de
// cotización). Pantalla EXCLUSIVA del Super Administrador (pedido explícito
// del usuario): el backend la protege con requireSystemRole y el módulo es
// system-only, así que ningún rol de empresa la recibe en el menú.
export function ApiKeysPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const [editApiKey, setEditApiKey] = useState<ApiKey | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [createdApiKey, setCreatedApiKey] = useState<CreatedApiKey | null>(null);
  const canCreate = usePermissionButton('api_key.create.button');
  const canUpdate = usePermissionButton('api_key.update.button');
  const canRevoke = usePermissionButton('api_key.disable.button');

  const { data, isLoading } = useApiKeys({
    page,
    limit: pageSize,
    companyId,
    name: columnFilters.name || undefined,
    status: toStatusFilter(columnFilters.status),
  });
  const { data: companies } = useCompanies({ page: 1, limit: 100 });
  const { mutateAsync: revoke } = useRevokeApiKey();

  const companyOptions = (companies?.data ?? []).map((company) => ({
    value: String(company.id),
    label: company.business_name,
  }));

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revoke(revokeTarget.id);
      toast.success(`API key "${revokeTarget.name}" revocada: dejó de funcionar`);
    } catch (error) {
      toast.error((error as ApiClientError).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        description="Keys de integración por empresa (ej. la web que envía pedidos de cotización)"
        action={canCreate && <ApiKeyFormDialog onCreated={setCreatedApiKey} />}
      />

      <FiltersBar
        hasActiveFilters={Boolean(companyId)}
        onClear={() => {
          setCompanyId(undefined);
          setPage(1);
        }}
      >
        <SearchableSelect
          className="sm:w-72"
          placeholder="Todas las empresas"
          value={companyId ? String(companyId) : undefined}
          onChange={(value) => {
            setCompanyId(Number(value));
            setPage(1);
          }}
          onClear={() => {
            setCompanyId(undefined);
            setPage(1);
          }}
          clearLabel="Todas las empresas"
          options={companyOptions}
          emptyText="No se encontró esa empresa"
        />
      </FiltersBar>

      <DataTable
        columns={[
          {
            header: 'Nombre',
            filterable: true,
            filterKey: 'name',
            cell: (apiKey) => (
              <div className="min-w-0">
                <p className="font-medium">{apiKey.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{apiKey.key_prefix}…</p>
              </div>
            ),
          },
          {
            header: 'Empresa',
            cell: (apiKey) => (
              <div className="min-w-0">
                <p>{apiKey.company.name}</p>
                <p className="text-xs text-muted-foreground">{apiKey.business_unit?.code ?? 'Sin tienda específica'}</p>
                {apiKey.replicate_companies.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Replica a: {apiKey.replicate_companies.map((company) => company.name).join(', ')}
                  </p>
                )}
              </div>
            ),
          },
          {
            header: 'Último uso',
            cell: (apiKey) => (
              <span className="text-sm text-muted-foreground">
                {apiKey.last_used_at ? formatDateTime(apiKey.last_used_at) : 'Nunca'}
              </span>
            ),
          },
          {
            header: 'Creada',
            cell: (apiKey) => (
              <div className="text-sm">
                <p>{formatDateTime(apiKey.created_at)}</p>
                {apiKey.created_by && <p className="text-xs text-muted-foreground">por {apiKey.created_by.name}</p>}
              </div>
            ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: STATUS_FILTER_OPTIONS,
            cell: (apiKey) =>
              apiKey.is_revoked ? (
                <div>
                  <Badge variant="destructive">Revocada</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(apiKey.revoked_at)}</p>
                </div>
              ) : (
                <Badge variant="success">Activa</Badge>
              ),
          },
          {
            header: '',
            align: 'right',
            cell: (apiKey) =>
              // Revocar es de una sola vía: una key revocada ya no se edita ni
              // se reactiva (si hace falta, se crea otra).
              apiKey.is_revoked ? null : (
                <div className="flex justify-end gap-1">
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Editar API key"
                      aria-label="Editar API key"
                      onClick={() => setEditApiKey(apiKey)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {canRevoke && (
                    <ToggleStatusButton active entityLabel="API key" onToggle={() => setRevokeTarget(apiKey)} />
                  )}
                </div>
              ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(apiKey) => apiKey.id}
        isLoading={isLoading}
        emptyIcon={KeyRound}
        emptyTitle="No hay API keys"
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

      {editApiKey && <ApiKeyFormDialog apiKey={editApiKey} onClose={() => setEditApiKey(null)} />}

      <CreatedApiKeyDialog apiKey={createdApiKey} onClose={() => setCreatedApiKey(null)} />

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="¿Revocar esta API key?"
        description={
          revokeTarget
            ? `"${revokeTarget.name}" (${revokeTarget.company.name}) dejará de funcionar al instante y no se puede reactivar. La web que la use dejará de enviar pedidos hasta que le pongas una key nueva.`
            : ''
        }
        confirmLabel="Revocar"
        onConfirm={handleRevoke}
      />
    </div>
  );
}
