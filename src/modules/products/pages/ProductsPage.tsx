import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Package, Pencil, Plus, Search, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { useCreateProduct, useProducts, useToggleProductStatus, useUpdateProduct } from '@/modules/products/hooks/useProducts';
import {
  useCreateTechnique,
  useTechniques,
  useToggleTechniqueStatus,
  useUpdateTechnique,
} from '@/modules/products/hooks/useTechniques';
import {
  createProductSchema,
  createTechniqueSchema,
  EMPTY_PRODUCT_FORM,
  type CreateProductFormValues,
  type CreateTechniqueFormValues,
} from '@/modules/products/schemas/product.schema';
import { RequiresCustomizationField } from '@/modules/products/components/RequiresCustomizationField';
import { PRODUCT_CATEGORY, ProductCategoryFields } from '@/modules/products/components/ProductCategoryFields';
import { ProductColorsField } from '@/modules/products/components/ProductColorsField';
import { ProductCodesField } from '@/modules/products/components/ProductCodesField';
import { ProductImageField } from '@/modules/products/components/ProductImageField';
import { ProductDetailDialog } from '@/modules/products/components/ProductDetailDialog';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { buildAssetUrl } from '@/lib/utils';
import type { CustomizationTechnique, Product } from '@/modules/products/types/product.types';
import { toOptionalNumber, DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

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

function ProductFormDialog({ product, onClose }: { product?: Product; onClose?: () => void }) {
  const isEditing = Boolean(product);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { mutate: create, isPending: isCreating, error: createError, reset: clearCreateError } = useCreateProduct();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: EMPTY_PRODUCT_FORM,
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        sku: product.sku ?? '',
        price_unit: product.price_unit != null ? Number(product.price_unit) : undefined,
        price_hundred: product.price_hundred != null ? Number(product.price_hundred) : undefined,
        price_half_thousand: product.price_half_thousand != null ? Number(product.price_half_thousand) : undefined,
        price_thousand: product.price_thousand != null ? Number(product.price_thousand) : undefined,
        requires_customization: product.requires_customization,
        min_order_quantity: product.min_order_quantity ?? undefined,
        category_id: product.category_id ?? undefined,
        subcategory_id: product.subcategory_id ?? undefined,
        colors: product.colors ?? [],
        codes: product.codes ?? [],
        image_path: product.image_path ?? null,
      });
    }
  }, [product, reset]);

  const handleOpenChange = (next: boolean) => {
    // "Nuevo producto" siempre parte de cero. Se limpia al ABRIR, cuando los
    // campos todavía no están montados: al cerrar, la animación los mantiene
    // vivos y el formulario volvía a leer de ellos lo último tipeado.
    if (next && !product) {
      reset(EMPTY_PRODUCT_FORM);
      clearCreateError();
    }
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateProductFormValues) => {
    if (isEditing && product) {
      const { company_id: _companyId, ...rest } = values;
      // Al editar, lo que se vació se manda como null para limpiarlo.
      const dto = {
        ...rest,
        min_order_quantity: values.min_order_quantity ?? null,
        category_id: values.category_id ?? null,
        subcategory_id: values.subcategory_id ?? null,
        colors: values.colors ?? [],
        codes: values.codes ?? [],
        image_path: values.image_path ?? null,
      };
      update(
        { id: product.id, dto },
        {
          onSuccess: () => {
            toast.success('Producto actualizado correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    // Un usuario de empresa crea en la suya; el Super Administrador en la
    // que eligió en el formulario.
    const companyId = access?.isSystem ? values.company_id : access?.companyId;
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...values, company_id: companyId },
      {
        onSuccess: () => {
          toast.success('Producto creado correctamente');
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;
  // Empresa del producto: la del que se edita, la elegida (Super
  // Administrador) o la del usuario.
  const formCompanyId = product?.company_id ?? (access?.isSystem ? watch('company_id') : access?.companyId ?? undefined);
  const showImageField = product ? Boolean(product.images_enabled) : Boolean(access?.isSystem || access?.productImagesEnabled);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} />
          </div>

          {/* Un producto puede tener los 4 precios cargados a la vez — el
              modo (unidad/ciento/medio millar/millar) se elige POR ITEM al
              armar la cotización, no acá (pedido explícito del usuario: "es
              un producto que se registra con precios diferentes"). */}
          <div className="space-y-2">
            <Label>Precios de catálogo (carga los que apliquen)</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="price_unit" className="text-xs font-normal text-muted-foreground">
                  Por unidad (S/)
                </Label>
                <Input id="price_unit" type="number" step={DECIMAL_INPUT_STEP} {...register('price_unit', { setValueAs: toOptionalNumber })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price_hundred" className="text-xs font-normal text-muted-foreground">
                  Por ciento (S/)
                </Label>
                <Input
                  id="price_hundred"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_hundred', { setValueAs: toOptionalNumber })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price_half_thousand" className="text-xs font-normal text-muted-foreground">
                  Medio millar (S/)
                </Label>
                <Input
                  id="price_half_thousand"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_half_thousand', { setValueAs: toOptionalNumber })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="price_thousand" className="text-xs font-normal text-muted-foreground">
                  Por millar (S/)
                </Label>
                <Input
                  id="price_thousand"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_thousand', { setValueAs: toOptionalNumber })}
                />
              </div>
            </div>
            {errors.price_unit && <p className="text-sm text-destructive">{errors.price_unit.message}</p>}
            <p className="text-xs text-muted-foreground">
              Cada precio es una tarifa por unidad para ese volumen de pedido (suele bajar mientras más
              grande la modalidad) — al cotizar, se elige la tarifa y la cantidad real se multiplica por
              ella.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="min_order_quantity">Pedido mínimo (opcional)</Label>
            {/* Sin min/step del navegador (mismo criterio que los precios): si
                no, frena el guardado con su propio aviso en inglés y no se ven
                los mensajes del formulario ("Debe ser al menos 1"). */}
            <Input
              id="min_order_quantity"
              type="number"
              step={DECIMAL_INPUT_STEP}
              inputMode="numeric"
              placeholder="Sin mínimo"
              className="sm:w-48"
              {...register('min_order_quantity', { setValueAs: toOptionalNumber })}
            />
            {errors.min_order_quantity && <p className="text-sm text-destructive">{errors.min_order_quantity.message}</p>}
            <p className="text-xs text-muted-foreground">
              La menor cantidad que se puede pedir. Es informativo: en la cotización se muestra como aviso, no la bloquea.
            </p>
          </div>

          <RequiresCustomizationField
            id="requires_customization"
            checked={watch('requires_customization') ?? false}
            onChange={(checked) => setValue('requires_customization', checked)}
          />

          <ProductCategoryFields
            companyId={formCompanyId}
            categoryId={watch('category_id')}
            subcategoryId={watch('subcategory_id')}
            onChange={({ categoryId, subcategoryId }) => {
              setValue('category_id', categoryId);
              setValue('subcategory_id', subcategoryId);
            }}
          />

          <ProductColorsField
            value={watch('colors') ?? []}
            onChange={(colors) => {
              setValue('colors', colors);
              // Un código no puede quedar apuntando a un color que se quitó.
              setValue(
                'codes',
                (watch('codes') ?? []).map((entry) =>
                  colors.some((color) => color.name === entry.color) ? entry : { ...entry, color: null },
                ),
              );
            }}
          />

          {/* Después de los colores: cada código se puede vincular con uno. */}
          <ProductCodesField
            value={watch('codes') ?? []}
            onChange={(codes) => setValue('codes', codes)}
            colors={watch('colors') ?? []}
          />

          {/* Foto: solo empresas con fotos habilitadas (las habilita el Super
              Administrador). Al crear, el Super Administrador la ve siempre y
              el backend avisa si la empresa elegida no las tiene. */}
          {showImageField && (
            <ProductImageField
              value={watch('image_path')}
              companyId={formCompanyId}
              onChange={(path) => setValue('image_path', path)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register('description')} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function TechniqueFormDialog({
  technique,
  onClose,
}: {
  technique?: CustomizationTechnique;
  onClose?: () => void;
}) {
  const isEditing = Boolean(technique);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { mutate: create, isPending: isCreating, error: createError } = useCreateTechnique();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateTechnique();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateTechniqueFormValues>({
    resolver: zodResolver(createTechniqueSchema),
  });

  useEffect(() => {
    if (technique) {
      reset({
        name: technique.name,
        description: technique.description ?? '',
        price_unit: technique.price_unit != null ? Number(technique.price_unit) : undefined,
        price_hundred: technique.price_hundred != null ? Number(technique.price_hundred) : undefined,
        price_half_thousand: technique.price_half_thousand != null ? Number(technique.price_half_thousand) : undefined,
        price_thousand: technique.price_thousand != null ? Number(technique.price_thousand) : undefined,
      });
    }
  }, [technique, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateTechniqueFormValues) => {
    if (isEditing && technique) {
      const { company_id: _companyId, ...dto } = values;
      update(
        { id: technique.id, dto },
        {
          onSuccess: () => {
            toast.success('Técnica actualizada correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    // Igual que productos: un usuario de empresa crea en la suya; el Super
    // Administrador en la que eligió en el formulario.
    const companyId = access?.isSystem ? values.company_id : access?.companyId;
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...values, company_id: companyId },
      {
        onSuccess: () => {
          toast.success('Técnica creada correctamente');
          reset();
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nueva técnica
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar técnica' : 'Nueva técnica de personalización'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="tech-name">Nombre</Label>
            <Input id="tech-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* Igual que ProductFormDialog: un precio POR UNIDAD según el
              volumen pedido. El item cobra (producto + técnica) en el mismo
              modo × cantidad (pedido explícito del usuario). */}
          <div className="space-y-2">
              <Label>Precio por unidad según volumen (carga el/los que apliquen)</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="tech_price_unit" className="text-xs font-normal text-muted-foreground">
                    Por unidad (S/)
                  </Label>
                  <Input id="tech_price_unit" type="number" step={DECIMAL_INPUT_STEP} {...register('price_unit', { setValueAs: toOptionalNumber })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech_price_hundred" className="text-xs font-normal text-muted-foreground">
                    Por ciento (S/)
                  </Label>
                  <Input
                    id="tech_price_hundred"
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register('price_hundred', { setValueAs: toOptionalNumber })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech_price_half_thousand" className="text-xs font-normal text-muted-foreground">
                    Medio millar (S/)
                  </Label>
                  <Input
                    id="tech_price_half_thousand"
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register('price_half_thousand', { setValueAs: toOptionalNumber })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tech_price_thousand" className="text-xs font-normal text-muted-foreground">
                    Por millar (S/)
                  </Label>
                  <Input
                    id="tech_price_thousand"
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register('price_thousand', { setValueAs: toOptionalNumber })}
                  />
                </div>
              </div>
              {errors.price_unit && <p className="text-sm text-destructive">{errors.price_unit.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tech-description">Descripción</Label>
            <Input id="tech-description" {...register('description')} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear técnica'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
