import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Label } from '@/presentation/components/shared/ui/label';

// Categorías y subcategorías de productos: filas de Variables Generales
// (pedido explícito del usuario). La subcategoría guarda en ref1 el id de su
// categoría. Mismos códigos que el backend (product/services/shared/catalog.ts).
export const PRODUCT_CATEGORY = 'product_category';
export const PRODUCT_SUBCATEGORY = 'product_subcategory';

interface ProductCategoryFieldsProps {
  // Empresa del producto: el listado trae sus categorías + las globales.
  companyId: number | undefined;
  categoryId: number | undefined;
  subcategoryId: number | undefined;
  onChange: (value: { categoryId: number | undefined; subcategoryId: number | undefined }) => void;
}

export function ProductCategoryFields({ companyId, categoryId, subcategoryId, onChange }: ProductCategoryFieldsProps) {
  const listParams = { ignorePagination: true, status: 'active', companyId } as const;
  const { data: categories } = useVariableGenerals({ ...listParams, category: PRODUCT_CATEGORY });
  const { data: subcategories } = useVariableGenerals({ ...listParams, category: PRODUCT_SUBCATEGORY });

  const categoryOptions = (categories?.data ?? []).map((row) => ({ value: String(row.id), label: row.name }));
  // Solo las subcategorías de la categoría elegida.
  const subcategoryOptions = (subcategories?.data ?? [])
    .filter((row) => categoryId !== undefined && row.ref1 === String(categoryId))
    .map((row) => ({ value: String(row.id), label: row.name }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-2">
        <Label>
          Categoría <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <SearchableSelect
          placeholder="Sin categoría"
          value={categoryId ? String(categoryId) : undefined}
          // Otra categoría: la subcategoría anterior colgaba de la vieja.
          onChange={(value) => onChange({ categoryId: Number(value), subcategoryId: undefined })}
          onClear={() => onChange({ categoryId: undefined, subcategoryId: undefined })}
          clearLabel="Sin categoría"
          options={categoryOptions}
          emptyText="Créalas en Configuración → Generales (product_category)"
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label>
          Subcategoría <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <SearchableSelect
          placeholder={categoryId ? 'Sin subcategoría' : 'Primero elige la categoría'}
          disabled={!categoryId}
          value={subcategoryId ? String(subcategoryId) : undefined}
          onChange={(value) => onChange({ categoryId, subcategoryId: Number(value) })}
          onClear={() => onChange({ categoryId, subcategoryId: undefined })}
          clearLabel="Sin subcategoría"
          options={subcategoryOptions}
          emptyText="Esta categoría no tiene subcategorías"
        />
      </div>
    </div>
  );
}
