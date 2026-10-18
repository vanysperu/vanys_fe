import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Search, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  useCreateVariableGeneral,
  useToggleVariableGeneralStatus,
  useUpdateVariableGeneral,
  useVariableGenerals,
} from '@/modules/variableGeneral/hooks/useVariableGeneral';
import {
  createVariableGeneralSchema,
  type CreateVariableGeneralFormValues,
} from '@/modules/variableGeneral/schemas/variableGeneral.schema';
import type { VariableGeneral } from '@/modules/variableGeneral/types/variableGeneral.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import type { ApiClientError } from '@/config/api.types';

const GLOBAL_SCOPE_VALUE = 'global';

export function VariableGeneralPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [toEdit, setToEdit] = useState<VariableGeneral | null>(null);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);

  const canCreate = usePermissionButton('variable_general.create.button');
  const canUpdate = usePermissionButton('variable_general.update.button');
  const canDisable = usePermissionButton('variable_general.disable.button');
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;

  const { data, isLoading } = useVariableGenerals({
    page,
    limit: pageSize,
    search: search || undefined,
    orderBy,
    orderDir,
    title: columnFilters.title || undefined,
    name: columnFilters.name || undefined,
    status: columnFilters.status || undefined,
    category: categoryFilter,
  });
  // Categorías existentes, para el filtro (son pocas filas: una sola consulta).
  const { data: allForCategories } = useVariableGenerals({ ignorePagination: true });
  const categoryOptions = Array.from(new Set((allForCategories?.data ?? []).map((row) => row.category)))
    .sort()
    .map((category) => ({ value: category, label: category }));
  // Un admin de empresa solo ve sus propias variables (+ las globales, ver
  // backend) — nunca necesita listar otras empresas, así que esta consulta
  // (exclusiva de is_system) no se dispara para él.
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleVariableGeneralStatus();

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const companyName = (companyId: number) =>
    companies?.data.find((company) => company.id === companyId)?.business_name ??
    (companyId === access?.companyId ? access?.companyName : null) ??
    `Empresa #${companyId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generales"
        description="Catálogos usados en formularios de todo el sistema (tipos de documento, género, etc.)"
        action={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-64 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {canCreate && <VariableGeneralFormDialog />}
          </div>
        }
      />

      <FiltersBar
        hasActiveFilters={Boolean(categoryFilter)}
        onClear={() => {
          setCategoryFilter(undefined);
          setPage(1);
        }}
      >
        <FilterSelect
          aria-label="Categoría"
          allLabel="Todas las categorías"
          className="w-56"
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value);
            setPage(1);
          }}
          options={categoryOptions}
        />
      </FiltersBar>

      <DataTable
        columns={[
          { header: 'Categoría', cell: (row) => <Badge variant="secondary">{row.category}</Badge> },
          {
            header: 'Título',
            sortable: true,
            sortKey: 'title',
            filterable: true,
            filterKey: 'title',
            cell: (row) => row.title,
          },
          { header: 'Código', cell: (row) => <span className="font-mono text-xs">{row.prefix_id}</span> },
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            header: 'Ámbito',
            cell: (row) =>
              row.company_id === null ? (
                <Badge variant="default">Global</Badge>
              ) : (
                <Badge variant="secondary">{companyName(row.company_id)}</Badge>
              ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (row) =>
              row.is_deleted ? <Badge variant="destructive">Inactiva</Badge> : <Badge variant="success">Activa</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setToEdit(row)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!row.is_deleted}
                    disabled={isToggling}
                    entityLabel="variable"
                    onToggle={() =>
                      toggleStatus(row.id, {
                        onSuccess: () =>
                          toast.success(row.is_deleted ? 'Variable habilitada' : 'Variable deshabilitada'),
                        onError: () => toast.error('No se pudo actualizar la variable'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={Settings}
        emptyTitle="No se encontraron variables generales"
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

      {toEdit && (
        <VariableGeneralFormDialog variable={toEdit} onClose={() => setToEdit(null)} />
      )}
    </div>
  );
}

interface VariableGeneralFormDialogProps {
  variable?: VariableGeneral;
  onClose?: () => void;
}

// Un solo diálogo cubre crear y editar: en modo edición viene precargado
// con la fila y abierto de entrada (controlado por el padre vía `variable`).
function VariableGeneralFormDialog({ variable, onClose }: VariableGeneralFormDialogProps) {
  const isEditing = Boolean(variable);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  // Trae TODAS las variables (sin paginar) solo para armar las opciones de
  // categoría del selector — las categorías válidas son las que ya existen
  // en la tabla, más lo que el usuario escriba libremente (allowCustomValue).
  const { data: allVariables } = useVariableGenerals({ ignorePagination: true });
  const categoryOptions = Array.from(new Set((allVariables?.data ?? []).map((item) => item.category))).map(
    (category) => ({ value: category, label: category }),
  );
  const { mutate: create, isPending: isCreating, error: createError } = useCreateVariableGeneral();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateVariableGeneral();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateVariableGeneralFormValues>({ resolver: zodResolver(createVariableGeneralSchema) });

  useEffect(() => {
    if (variable) {
      reset({
        category: variable.category,
        title: variable.title,
        prefix_id: variable.prefix_id,
        name: variable.name,
        description: variable.description ?? '',
        company_id: variable.company_id ?? undefined,
      });
    }
  }, [variable, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateVariableGeneralFormValues) => {
    if (isEditing && variable) {
      update(
        { id: variable.id, dto: values },
        {
          onSuccess: () => {
            toast.success('Variable actualizada correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(values, {
      onSuccess: () => {
        toast.success('Variable creada correctamente');
        reset();
        handleOpenChange(false);
      },
    });
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nueva variable
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar variable general' : 'Nueva variable general'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <SearchableSelect
                id="category"
                options={categoryOptions}
                value={watch('category')}
                onChange={(value) => setValue('category', value, { shouldValidate: true })}
                placeholder="Elige o escribe una categoría"
                emptyText="Escribe para crear una categoría nueva"
                allowCustomValue
              />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input id="title" placeholder="ej. Tipo de documento" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix_id">Código</Label>
              <Input id="prefix_id" placeholder="ej. 7" {...register('prefix_id')} />
              {errors.prefix_id && <p className="text-sm text-destructive">{errors.prefix_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="ej. Otro" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register('description')} />
          </div>

          {/* Un admin de empresa SIEMPRE crea para la suya (el backend ya lo
              fuerza, sin importar lo que se mande) — mostrarle este selector
              era confuso y además listaba "Global" + una lista de empresas
              vacía (no puede ver otras empresas), pedido explícito del
              usuario. Solo is_system elige ámbito. */}
          {isSystem && (
            <div className="space-y-2">
              <Label>Ámbito</Label>
              <Select
                value={watch('company_id') ? String(watch('company_id')) : GLOBAL_SCOPE_VALUE}
                onValueChange={(value) =>
                  setValue('company_id', value === GLOBAL_SCOPE_VALUE ? undefined : Number(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Global" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GLOBAL_SCOPE_VALUE}>Global (todas las empresas)</SelectItem>
                  {companies?.data.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Global la ven todas las empresas; si eliges una, solo esa empresa la ve.
              </p>
            </div>
          )}

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear variable'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
