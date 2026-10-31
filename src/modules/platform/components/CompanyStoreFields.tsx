import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface CompanyStoreFieldsProps {
  companyId: number | undefined;
  onCompanyChange: (companyId: number) => void;
  // Sin estos dos, solo se pide la empresa (ej. productos/técnicas, que son
  // de toda la empresa y no de una tienda).
  businessUnitId?: number | undefined;
  onBusinessUnitChange?: (businessUnitId: number | undefined) => void;
  companyError?: string;
  businessUnitError?: string;
}

// "Empresa" y luego "Tienda" para el Super Administrador (pedido explícito
// del usuario: "el super admin debería poder hacer todo y siempre escoger la
// empresa o tienda para que se guarde donde debe ... escoger la empresa y
// luego listarse las tiendas de esa empresa para evitar mezcla de
// información"). Un usuario de empresa no ve nada de esto: el backend
// siempre usa su propia empresa/tienda (CLAUDE.md sección 10).
//
// La lista de tiendas sale SOLO de la empresa elegida (se filtra además por
// company_id en el cliente: el listado usa keepPreviousData, y al cambiar de
// empresa no deben asomarse ni un instante las tiendas de la anterior).
export function CompanyStoreFields({
  companyId,
  onCompanyChange,
  businessUnitId,
  onBusinessUnitChange,
  companyError,
  businessUnitError,
}: CompanyStoreFieldsProps) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const showStore = Boolean(onBusinessUnitChange);

  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const { data: businessUnits } = useBusinessUnits(
    { page: 1, limit: 100, companyId },
    { enabled: isSystem && showStore && Boolean(companyId) },
  );

  if (!isSystem) return null;

  const companyOptions = (companies?.data ?? [])
    .filter((company) => !company.is_deleted)
    .map((company) => ({ value: String(company.id), label: company.business_name }));
  const storeOptions = (businessUnits?.data ?? [])
    .filter((businessUnit) => businessUnit.company_id === companyId && !businessUnit.is_deleted)
    .map((businessUnit) => ({ value: String(businessUnit.id), label: businessUnit.business_code }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label>Empresa</Label>
        <SearchableSelect
          placeholder="Selecciona una empresa"
          value={companyId ? String(companyId) : undefined}
          onChange={(value) => {
            onCompanyChange(Number(value));
            // La tienda elegida antes era de otra empresa: se descarta.
            onBusinessUnitChange?.(undefined);
          }}
          options={companyOptions}
          emptyText="No se encontró esa empresa"
        />
        {companyError && <p className="text-sm text-destructive">{companyError}</p>}
      </div>
      {showStore && (
        <div className="min-w-0 space-y-2">
          <Label>
            Tienda <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          {companyId && businessUnits && storeOptions.length === 0 ? (
            <p className="flex h-9 items-center text-sm text-muted-foreground">Esta empresa no tiene tiendas.</p>
          ) : (
            <SearchableSelect
              placeholder={companyId ? 'Sin tienda específica' : 'Primero elige la empresa'}
              disabled={!companyId}
              value={businessUnitId ? String(businessUnitId) : undefined}
              onChange={(value) => onBusinessUnitChange?.(Number(value))}
              onClear={() => onBusinessUnitChange?.(undefined)}
              clearLabel="Sin tienda específica"
              options={storeOptions}
              emptyText="No se encontró esa tienda"
            />
          )}
          {businessUnitError && <p className="text-sm text-destructive">{businessUnitError}</p>}
        </div>
      )}
    </div>
  );
}
