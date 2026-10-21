import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Store } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import {
  useBusinessUnits,
  useCreateBusinessUnit,
  useToggleBusinessUnitStatus,
  useUpdateBusinessUnit,
} from '@/modules/platform/hooks/useBusinessUnits';
import {
  createBusinessUnitSchema,
  type CreateBusinessUnitFormValues,
} from '@/modules/platform/schemas/businessUnit.schema';
import type { BusinessUnit } from '@/modules/platform/types/platform.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
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
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

// ISO: 1=lunes..7=domingo (mismo criterio que el backend, ver
// business_unit.validator.ts -> WORKING_DAYS_REGEX).
const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
] as const;

// "1,2,3,4,5" <-> [1,2,3,4,5] — el backend guarda el string, el formulario
// trabaja con el array (más fácil de togglear por checkbox).
const parseWorkingDays = (value: string | null | undefined): number[] =>
  value
    ? value
        .split(',')
        .map((day) => Number(day.trim()))
        .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    : [];

export function BusinessUnitsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editBusinessUnit, setEditBusinessUnit] = useState<BusinessUnit | null>(null);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  // Empresa (solo plataforma: un admin de empresa ya ve únicamente las suyas).
  const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
  const canCreate = usePermissionButton('platform.businessUnit.create.button');
  const canUpdate = usePermissionButton('platform.businessUnit.update.button');
  const canDisable = usePermissionButton('platform.businessUnit.disable.button');
  const { data: access } = useAccess();

  const { data, isLoading } = useBusinessUnits({
    page,
    limit: pageSize,
    orderBy,
    orderDir,
    businessCode: columnFilters.businessCode || undefined,
    address: columnFilters.address || undefined,
    status: columnFilters.status || undefined,
    companyId: companyFilter ? Number(companyFilter) : undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };
  // GET /company/list es exclusivo de is_system (CLAUDE.md sección 10) — un
  // admin de empresa solo tiene la suya, no necesita listarlas para elegir.
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: access?.isSystem });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleBusinessUnitStatus();

  // Un admin de empresa no lista empresas: para las tiendas de la suya se usa
  // el nombre que trae /access/me (mismo criterio que VariableGeneralPage).
  // Antes salía "Empresa #1" en vez del nombre.
  const companyName = (companyId: number) =>
    companies?.data.find((company) => company.id === companyId)?.business_name ??
    (companyId === access?.companyId ? access?.companyName : null) ??
    `Empresa #${companyId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiendas"
        description="Tiendas/sucursales (business units) de cada empresa"
        action={canCreate && <BusinessUnitFormDialog />}
      />

      <FiltersBar
        hasActiveFilters={Boolean(dateRange.dateFrom || dateRange.dateTo || companyFilter)}
        onClear={() => {
          setDateRange({});
          setCompanyFilter(undefined);
          setPage(1);
        }}
      >
        {access?.isSystem && (
          <FilterSelect
            aria-label="Empresa"
            allLabel="Todas las empresas"
            className="w-56"
            value={companyFilter}
            onChange={(value) => {
              setCompanyFilter(value);
              setPage(1);
            }}
            options={(companies?.data ?? []).map((company) => ({ value: String(company.id), label: company.business_name }))}
          />
        )}
        <DateRangeFilter
          placeholder="Fecha de registro"
          value={dateRange}
          onChange={(value) => {
            setDateRange(value);
            setPage(1);
          }}
        />
      </FiltersBar>

      <DataTable
        columns={[
          {
            header: 'Código',
            sortable: true,
            sortKey: 'business_code',
            filterable: true,
            filterKey: 'businessCode',
            cell: (businessUnit) => <span className="font-medium">{businessUnit.business_code}</span>,
          },
          { header: 'Empresa', cell: (businessUnit) => companyName(businessUnit.company_id) },
          {
            header: 'Dirección',
            filterable: true,
            filterKey: 'address',
            cell: (businessUnit) => businessUnit.address ?? '—',
          },
          {
            header: 'Horario',
            cell: (businessUnit) => {
              const days = parseWorkingDays(businessUnit.working_days);
              if (days.length === 0 || !businessUnit.opens_at || !businessUnit.closes_at) return '—';
              const label = WEEKDAYS.filter((day) => days.includes(day.value))
                .map((day) => day.label)
                .join('/');
              return (
                <span className="text-xs text-muted-foreground">
                  {label} · {businessUnit.opens_at}-{businessUnit.closes_at}
                </span>
              );
            },
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (businessUnit) =>
              businessUnit.is_deleted ? (
                <Badge variant="destructive">Deshabilitada</Badge>
              ) : (
                <Badge variant="success">Activa</Badge>
              ),
          },
          {
            header: '',
            align: 'right',
            cell: (businessUnit) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditBusinessUnit(businessUnit)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!businessUnit.is_deleted}
                    disabled={isToggling}
                    entityLabel="tienda"
                    onToggle={() =>
                      toggleStatus(businessUnit.id, {
                        onSuccess: () =>
                          toast.success(businessUnit.is_deleted ? 'Tienda habilitada' : 'Tienda deshabilitada'),
                        onError: () => toast.error('No se pudo actualizar la tienda'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(businessUnit) => businessUnit.id}
        isLoading={isLoading}
        emptyIcon={Store}
        emptyTitle="No se encontraron tiendas"
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

      {editBusinessUnit && (
        <BusinessUnitFormDialog businessUnit={editBusinessUnit} onClose={() => setEditBusinessUnit(null)} />
      )}
    </div>
  );
}

interface BusinessUnitFormDialogProps {
  businessUnit?: BusinessUnit;
  onClose?: () => void;
}

function BusinessUnitFormDialog({ businessUnit, onClose }: BusinessUnitFormDialogProps) {
  const isEditing = Boolean(businessUnit);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: access?.isSystem });
  const { mutate: create, isPending: isCreating, error: createError } = useCreateBusinessUnit();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateBusinessUnit();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBusinessUnitFormValues>({ resolver: zodResolver(createBusinessUnitSchema) });

  useEffect(() => {
    if (businessUnit) {
      reset({
        business_code: businessUnit.business_code,
        company_id: businessUnit.company_id,
        address: businessUnit.address ?? '',
        working_days: parseWorkingDays(businessUnit.working_days),
        opens_at: businessUnit.opens_at ?? '',
        closes_at: businessUnit.closes_at ?? '',
      });
    } else if (access && !access.isSystem && access.companyId) {
      // Un admin de empresa solo crea tiendas para SU empresa — no elige,
      // el backend igual lo forzaría (business_unit.controller.ts).
      reset({ company_id: access.companyId });
    }
  }, [businessUnit, access, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateBusinessUnitFormValues) => {
    // El backend guarda "1,2,3" (string), el formulario trabaja con el
    // array de checkboxes — se serializa acá, justo antes de enviar.
    const workingDays = values.working_days && values.working_days.length > 0 ? values.working_days.join(',') : undefined;
    const opensAt = values.opens_at || undefined;
    const closesAt = values.closes_at || undefined;

    if (isEditing && businessUnit) {
      // company_id no es editable (una tienda no cambia de empresa) — el
      // DTO de update lo excluye (grulla_be: business_unit.dto.ts).
      update(
        {
          id: businessUnit.id,
          dto: {
            business_code: values.business_code,
            address: values.address,
            working_days: workingDays,
            opens_at: opensAt,
            closes_at: closesAt,
          },
        },
        {
          onSuccess: () => {
            toast.success('Tienda actualizada correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(
      { ...values, working_days: workingDays, opens_at: opensAt, closes_at: closesAt },
      {
        onSuccess: () => {
          toast.success('Tienda creada correctamente');
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
            Nueva tienda
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tienda' : 'Nueva tienda'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business_code">Código de tienda</Label>
            <Input id="business_code" {...register('business_code')} />
            {errors.business_code && (
              <p className="text-sm text-destructive">{errors.business_code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-unit-address">Dirección</Label>
            <Input id="business-unit-address" placeholder="Av. Los Próceres 123, Lima" {...register('address')} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
            <p className="text-xs text-muted-foreground">
              Aparece en el PDF de cotizaciones de esta tienda — si se deja vacía, se usa la dirección de la
              empresa.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Días laborales</Label>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((day) => {
                const selected = watch('working_days') ?? [];
                return (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={selected.includes(day.value)}
                      onCheckedChange={(checked) =>
                        setValue(
                          'working_days',
                          checked ? [...selected, day.value] : selected.filter((value) => value !== day.value),
                        )
                      }
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opens_at">Hora de apertura</Label>
              <Input id="opens_at" type="time" {...register('opens_at')} />
              {errors.opens_at && <p className="text-sm text-destructive">{errors.opens_at.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="closes_at">Hora de cierre</Label>
              <Input id="closes_at" type="time" {...register('closes_at')} />
              {errors.closes_at && <p className="text-sm text-destructive">{errors.closes_at.message}</p>}
            </div>
          </div>

          {access?.isSystem && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                disabled={isEditing}
                value={watch('company_id') ? String(watch('company_id')) : undefined}
                onValueChange={(value) => setValue('company_id', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.data.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>
                      {company.business_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.company_id && (
                <p className="text-sm text-destructive">{errors.company_id.message}</p>
              )}
            </div>
          )}

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear tienda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
