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
  type CreateProductFormValues,
  type CreateTechniqueFormValues,
} from '@/modules/products/schemas/product.schema';
import { RequiresCustomizationField } from '@/modules/products/components/RequiresCustomizationField';
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
  const canCreate = usePermissionButton('producto.create.button');
  const canUpdate = usePermissionButton('producto.update.button');
  const canDisable = usePermissionButton('producto.disable.button');
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
          hasActiveFilters={Boolean(search || dateRange.dateFrom || dateRange.dateTo)}
          onClear={() => {
            setSearch('');
            setDateRange({});
            setPage(1);
          }}
        >
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o SKU..."
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
            cell: (product) => <span className="font-medium">{product.name}</span>,
          },
          {
            header: 'SKU',
            sortable: true,
            sortKey: 'sku',
            filterable: true,
            filterKey: 'sku',
            cell: (product) => product.sku ?? '—',
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
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditProduct(product)}>
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
    </div>
  );
}

function ProductFormDialog({ product, onClose }: { product?: Product; onClose?: () => void }) {
  const isEditing = Boolean(product);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { mutate: create, isPending: isCreating, error: createError } = useCreateProduct();
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
    defaultValues: { requires_customization: false },
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
      });
    }
  }, [product, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateProductFormValues) => {
    if (isEditing && product) {
      const { company_id: _companyId, ...dto } = values;
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
          reset({ requires_customization: false });
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

          <RequiresCustomizationField
            id="requires_customization"
            checked={watch('requires_customization') ?? false}
            onChange={(checked) => setValue('requires_customization', checked)}
          />

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
