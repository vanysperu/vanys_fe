import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Building2, Check, Pencil, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  useCreateCompany,
  useCompanies,
  useThemes,
  useToggleCompanyStatus,
  useUpdateCompany,
} from '@/modules/platform/hooks/useCompanies';
import { createCompanySchema, type CreateCompanyFormValues } from '@/modules/platform/schemas/company.schema';
import type { Company } from '@/modules/platform/types/platform.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
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
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

export function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const canCreate = usePermissionButton('platform.company.create.button');
  const canUpdate = usePermissionButton('platform.company.update.button');
  const canDisable = usePermissionButton('platform.company.disable.button');

  const { data, isLoading } = useCompanies({
    page,
    limit: pageSize,
    orderBy,
    orderDir,
    ruc: columnFilters.ruc || undefined,
    businessName: columnFilters.businessName || undefined,
    email: columnFilters.email || undefined,
    status: columnFilters.status || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleCompanyStatus();

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
    <div className="space-y-6">
      <PageHeader
        title="Empresas"
        description="Empresas (tenants) registradas en la plataforma"
        action={canCreate && <CompanyFormDialog />}
      />

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

      <DataTable
        columns={[
          {
            header: 'RUC',
            sortable: true,
            sortKey: 'ruc',
            filterable: true,
            filterKey: 'ruc',
            cell: (company) => <span className="font-mono text-xs">{company.ruc}</span>,
          },
          {
            header: 'Razón social',
            sortable: true,
            sortKey: 'business_name',
            filterable: true,
            filterKey: 'businessName',
            cell: (company) => <span className="font-medium">{company.business_name}</span>,
          },
          {
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            filterable: true,
            filterKey: 'email',
            cell: (company) => <span className="text-muted-foreground">{company.email ?? '—'}</span>,
          },
          {
            header: 'Paleta',
            cell: (company) => (
              <Badge variant="secondary" className="capitalize">
                {company.theme_color}
              </Badge>
            ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (company) =>
              company.is_deleted ? (
                <Badge variant="destructive">Deshabilitada</Badge>
              ) : (
                <Badge variant="success">Activa</Badge>
              ),
          },
          {
            header: '',
            align: 'right',
            cell: (company) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditCompany(company)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!company.is_deleted}
                    disabled={isToggling}
                    entityLabel="empresa"
                    onToggle={() =>
                      toggleStatus(company.id, {
                        onSuccess: () =>
                          toast.success(company.is_deleted ? 'Empresa habilitada' : 'Empresa deshabilitada'),
                        onError: () => toast.error('No se pudo actualizar la empresa'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(company) => company.id}
        isLoading={isLoading}
        emptyIcon={Building2}
        emptyTitle="No se encontraron empresas"
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

      {editCompany && <CompanyFormDialog company={editCompany} onClose={() => setEditCompany(null)} />}
    </div>
  );
}

interface CompanyFormDialogProps {
  company?: Company;
  onClose?: () => void;
}

function CompanyFormDialog({ company, onClose }: CompanyFormDialogProps) {
  const isEditing = Boolean(company);
  const [open, setOpen] = useState(isEditing);
  const { data: themes } = useThemes();
  const { mutate: create, isPending: isCreating, error: createError } = useCreateCompany();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateCompany();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCompanyFormValues>({ resolver: zodResolver(createCompanySchema) });

  useEffect(() => {
    if (company) {
      reset({
        ruc: company.ruc,
        business_name: company.business_name,
        email: company.email ?? '',
        phone: company.phone ?? '',
        address: company.address ?? '',
        theme_color: company.theme_color,
      });
    }
  }, [company, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateCompanyFormValues) => {
    const dto = { ...values, email: values.email || undefined };

    if (isEditing && company) {
      update(
        { id: company.id, dto },
        {
          onSuccess: () => {
            toast.success('Empresa actualizada correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(dto, {
      onSuccess: () => {
        toast.success('Empresa creada correctamente');
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
            Nueva empresa
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ruc">RUC</Label>
            <Input id="ruc" {...register('ruc')} />
            {errors.ruc && <p className="text-sm text-destructive">{errors.ruc.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_name">Razón social</Label>
            <Input id="business_name" {...register('business_name')} />
            {errors.business_name && (
              <p className="text-sm text-destructive">{errors.business_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Paleta de marca</Label>
            <Select value={watch('theme_color')} onValueChange={(value) => setValue('theme_color', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Por defecto (azul)" />
              </SelectTrigger>
              <SelectContent>
                {themes?.map((theme) => (
                  <SelectItem key={theme.code} value={theme.code}>
                    {theme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear empresa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
