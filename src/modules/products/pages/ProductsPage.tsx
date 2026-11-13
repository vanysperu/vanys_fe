import { useState } from 'react';
import { Package, Pencil, Search, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useProducts, useToggleProductStatus } from '@/modules/products/hooks/useProducts';
import { useTechniques, useToggleTechniqueStatus } from '@/modules/products/hooks/useTechniques';
import { PRODUCT_CATEGORY } from '@/modules/products/components/ProductCategoryFields';
import { ProductDetailDialog } from '@/modules/products/components/ProductDetailDialog';
import { ProductFormDialog } from '@/modules/products/components/ProductFormDialog';
import { TechniqueFormDialog } from '@/modules/products/components/TechniqueFormDialog';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { buildAssetUrl } from '@/lib/utils';
import type { CustomizationTechnique, Product } from '@/modules/products/types/product.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Dos vistas del sidebar apuntan acá (/productos y /productos/tecnicas, ver
// PrivateRoutes.tsx) — antes esta página ignoraba cuál de las dos rutas te
// trajo y siempre abría "Productos" primero, así que "Técnicas de
// personalización" nunca se sentía como su propia pantalla. El tab activo
// ahora sigue la URL en los dos sentidos: entrar por /productos/tecnicas
// abre esa pestaña, y cambiar de pestaña actualiza la URL.
const TECHNIQUES_PATH = '/productos/tecnicas';

export function ProductsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname === TECHNIQUES_PATH ? 'techniques' : 'products';

  return (
    <div className="space-y-6">
      <PageHeader title="Productos" description="Productos y técnicas de personalización, con sus precios por volumen" />

      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(value === 'techniques' ? TECHNIQUES_PATH : '/productos')}
      >
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="techniques">Técnicas de personalización</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="techniques">
          <TechniquesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  // Ordenamiento elevado a la página (mismo criterio que ClientsPage/Pagination).
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  // Producto cuya ficha se está viendo (clic en su nombre).
  const [viewProduct, setViewProduct] = useState<Product | null>(null);
  const canCreate = usePermissionButton('producto.create.button');
  const canUpdate = usePermissionButton('producto.update.button');
  const canDisable = usePermissionButton('producto.disable.button');
  // Pedido explícito del usuario: el Super Administrador ve productos de todas
  // las empresas, así que solo él tiene la columna y el filtro de empresa (el
  // backend ignora companyId para los demás usuarios).
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const companyOptions = (companies?.data ?? []).map((company) => ({
    value: String(company.id),
    label: company.business_name,
  }));
  const { data: categories } = useVariableGenerals({
    category: PRODUCT_CATEGORY,
    ignorePagination: true,
    status: 'active',
    companyId,
  });
  const categoryOptions = (categories?.data ?? []).map((row) => ({ value: String(row.id), label: row.name }));
  // El Super Administrador también crea productos: elige la empresa en el
  // formulario (ver CompanyStoreFields en ProductFormDialog).
  const canCreateHere = canCreate;

  const { data, isLoading } = useProducts({
    page,
    limit: pageSize,
    orderBy,
    orderDir,
    searchTerm: search || undefined,
    name: columnFilters.name || undefined,
    sku: columnFilters.sku || undefined,
    status: columnFilters.status || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    categoryId,
    color: columnFilters.color || undefined,
    companyId,
  });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleProductStatus();

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltersBar
          hasActiveFilters={Boolean(search || dateRange.dateFrom || dateRange.dateTo || categoryId || companyId)}
          onClear={() => {
            setSearch('');
            setDateRange({});
            setCategoryId(undefined);
            setCompanyId(undefined);
            setPage(1);
          }}
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, SKU o código..."
              className="h-9 w-64 pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <DateRangeFilter
            placeholder="Fecha de registro"
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              setPage(1);
            }}
          />
          {isSystem && (
            <SearchableSelect
              className="w-56"
              placeholder="Todas las empresas"
              value={companyId ? String(companyId) : undefined}
              onChange={(value) => {
                setCompanyId(Number(value));
                // Las categorías dependen de la empresa elegida.
                setCategoryId(undefined);
                setPage(1);
              }}
              onClear={() => {
                setCompanyId(undefined);
                setCategoryId(undefined);
                setPage(1);
              }}
              clearLabel="Todas las empresas"
              options={companyOptions}
              emptyText="No se encontró esa empresa"
            />
          )}
          <SearchableSelect
            className="w-56"
            placeholder="Todas las categorías"
            value={categoryId ? String(categoryId) : undefined}
            onChange={(value) => {
              setCategoryId(Number(value));
              setPage(1);
            }}
            onClear={() => {
              setCategoryId(undefined);
              setPage(1);
            }}
            clearLabel="Todas las categorías"
            options={categoryOptions}
            emptyText="No hay categorías"
          />
        </FiltersBar>
        {canCreateHere && <ProductFormDialog />}
      </div>

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (product) => <ProductNameCell product={product} onView={setViewProduct} />,
          },
          ...(isSystem
            ? [
                {
                  header: 'Empresa',
                  cell: (product: Product) => <span className="text-sm">{product.company_name ?? '—'}</span>,
                },
              ]
            : []),
          {
            header: 'SKU',
            sortable: true,
            sortKey: 'sku',
            filterable: true,
            filterKey: 'sku',
            // Un solo SKU; debajo, los códigos de proveedores.
            cell: (product) => (
              <div className="min-w-0">
                <p>{product.sku ?? '—'}</p>
                {product.codes && product.codes.length > 0 && (
                  <p className="text-xs text-muted-foreground" title="Códigos de proveedores">
                    {product.codes.map((entry) => (entry.color ? `${entry.code} (${entry.color})` : entry.code)).join(' · ')}
                  </p>
                )}
              </div>
            ),
          },
          {
            header: 'Categoría',
            cell: (product) =>
              product.category ? (
                <div className="min-w-0 text-sm">
                  <p>{product.category.name}</p>
                  {product.subcategory && <p className="text-xs text-muted-foreground">{product.subcategory.name}</p>}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
          {
            header: 'Colores',
            filterable: true,
            filterKey: 'color',
            cell: (product) => <ProductColorSwatches product={product} />,
          },
          {
            header: 'Precios',
            cell: (product) => (
              <div className="flex flex-wrap gap-1">
                {product.price_unit != null && (
                  <Badge variant="outline">Unidad: S/ {Number(product.price_unit).toFixed(2)}</Badge>
                )}
                {product.price_hundred != null && (
                  <Badge variant="outline">Ciento: S/ {Number(product.price_hundred).toFixed(2)}</Badge>
                )}
                {product.price_half_thousand != null && (
                  <Badge variant="outline">Medio millar: S/ {Number(product.price_half_thousand).toFixed(2)}</Badge>
                )}
                {product.price_thousand != null && (
                  <Badge variant="outline">Millar: S/ {Number(product.price_thousand).toFixed(2)}</Badge>
                )}
              </div>
            ),
          },
          {
            header: 'Pedido mín.',
            cell: (product) =>
              product.min_order_quantity != null ? (
                <span className="font-mono-nums">{product.min_order_quantity}</span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
          {
            header: 'Personalización',
            cell: (product) =>
              product.requires_customization ? (
                <Badge variant="secondary">Sí</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">No</span>
              ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (product) =>
              product.is_deleted ? <Badge variant="destructive">Inactivo</Badge> : <Badge variant="success">Activo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (product) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Editar producto"
                    aria-label="Editar producto"
                    onClick={() => setEditProduct(product)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!product.is_deleted}
                    disabled={isToggling}
                    entityLabel="producto"
                    onToggle={() =>
                      toggleStatus(product.id, {
                        onSuccess: () =>
                          toast.success(product.is_deleted ? 'Producto habilitado' : 'Producto deshabilitado'),
                        onError: () => toast.error('No se pudo actualizar el producto'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(product) => product.id}
        isLoading={isLoading}
        emptyIcon={Package}
        emptyTitle="No se encontraron productos"
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

      {editProduct && <ProductFormDialog product={editProduct} onClose={() => setEditProduct(null)} />}
      <ProductDetailDialog product={viewProduct} onClose={() => setViewProduct(null)} />
    </div>
  );
}

// Nombre del producto: el clic abre su ficha completa, tenga foto o no (pedido
// explícito del usuario). La miniatura sale solo si la empresa tiene fotos.
function ProductNameCell({ product, onView }: { product: Product; onView: (product: Product) => void }) {
  const thumbnail = product.images_enabled ? buildAssetUrl(product.image_path) : null;

  return (
    <button
      type="button"
      className="flex items-center gap-2 text-left font-medium hover:underline"
      onClick={() => onView(product)}
      title="Ver ficha del producto"
      data-testid="product-view-detail"
    >
      {thumbnail && <img src={thumbnail} alt="" className="size-8 shrink-0 rounded border object-cover" />}
      {product.name}
    </button>
  );
}

function ProductColorSwatches({ product }: { product: Product }) {
  const colors = product.colors ?? [];
  if (colors.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {colors.map((color) => (
        <Badge key={color.name} variant="outline" className="gap-1">
          {color.hex && <span className="size-2.5 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden />}
          {color.name}
        </Badge>
      ))}
    </div>
  );
}

function TechniquesTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editTechnique, setEditTechnique] = useState<CustomizationTechnique | null>(null);
  // Mismo criterio que ProductsTab: orden y filtros por columna elevados acá.
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const canCreate = usePermissionButton('producto.technique.create.button');
  const canUpdate = usePermissionButton('producto.technique.update.button');
  const canDisable = usePermissionButton('producto.technique.disable.button');
  // Igual que productos: el Super Administrador también crea técnicas,
  // eligiendo la empresa en el formulario.
  const canCreateHere = canCreate;

  const { data, isLoading } = useTechniques({
    page,
    limit: pageSize,
    orderBy,
    orderDir,
    name: columnFilters.name || undefined,
    status: columnFilters.status || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleTechniqueStatus();

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {canCreateHere && <TechniqueFormDialog />}
      </div>

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (technique) => <span className="font-medium">{technique.name}</span>,
          },
          {
            header: 'Precios',
            cell: (technique) => (
                <div className="flex flex-wrap gap-1">
                  {technique.price_unit != null && (
                    <Badge variant="outline">Unidad: S/ {Number(technique.price_unit).toFixed(2)}</Badge>
                  )}
                  {technique.price_hundred != null && (
                    <Badge variant="outline">Ciento: S/ {Number(technique.price_hundred).toFixed(2)}</Badge>
                  )}
                  {technique.price_half_thousand != null && (
                    <Badge variant="outline">1/2 millar: S/ {Number(technique.price_half_thousand).toFixed(2)}</Badge>
                  )}
                  {technique.price_thousand != null && (
                    <Badge variant="outline">Millar: S/ {Number(technique.price_thousand).toFixed(2)}</Badge>
                  )}
                </div>
            ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (technique) =>
              technique.is_deleted ? (
                <Badge variant="destructive">Inactiva</Badge>
              ) : (
                <Badge variant="success">Activa</Badge>
              ),
          },
          {
            header: '',
            align: 'right',
            cell: (technique) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditTechnique(technique)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!technique.is_deleted}
                    disabled={isToggling}
                    entityLabel="técnica"
                    onToggle={() =>
                      toggleStatus(technique.id, {
                        onSuccess: () =>
                          toast.success(technique.is_deleted ? 'Técnica habilitada' : 'Técnica deshabilitada'),
                        onError: () => toast.error('No se pudo actualizar la técnica'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(technique) => technique.id}
        isLoading={isLoading}
        emptyIcon={Sparkles}
        emptyTitle="No se encontraron técnicas"
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

      {editTechnique && <TechniqueFormDialog technique={editTechnique} onClose={() => setEditTechnique(null)} />}
    </div>
  );
}
