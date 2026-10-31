import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Search, Users2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useCatalog } from '@/modules/users/hooks/useCreateUser';
import { useClients, useCreateClient, useToggleClientStatus, useUpdateClient } from '@/modules/clients/hooks/useClients';
import { createClientSchema, PHONE_MAX_DIGITS, type CreateClientFormValues } from '@/modules/clients/schemas/client.schema';
import { digitsFilter, maxLengthFilter, withInputFilter } from '@/lib/inputRestrictions';
import { documentNumberMaxLength, documentNumberOnlyDigits } from '@/lib/documentType';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import type { Client } from '@/modules/clients/types/client.types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

export function ClientsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState<Client | null>(null);
  // Ordenamiento elevado a la página (mismo criterio que Pagination): se
  // guarda acá y se pasa tal cual al hook de query, que dispara el refetch.
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  // Filtros por columna (teléfono, documento, estado) — se agregan al
  // buscador global existente, no lo reemplazan.
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const canCreate = usePermissionButton('cliente.create.button');
  const canUpdate = usePermissionButton('cliente.update.button');
  const canDisable = usePermissionButton('cliente.disable.button');

  const { data, isLoading } = useClients({
    page,
    limit: pageSize,
    searchTerm: search || undefined,
    orderBy,
    orderDir,
    name: columnFilters.name || undefined,
    email: columnFilters.email || undefined,
    phone: columnFilters.phone || undefined,
    documentNumber: columnFilters.documentNumber || undefined,
    status: columnFilters.status || undefined,
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
  const { mutate: toggleStatus, isPending: isToggling } = useToggleClientStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Datos de contacto e historial de cotizaciones"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-full pl-9 sm:w-64"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {canCreate && <ClientFormDialog />}
          </div>
        }
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
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (client) => <span className="font-medium">{client.name}</span>,
          },
          {
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            filterable: true,
            filterKey: 'email',
            cell: (client) => client.email ?? '—',
          },
          {
            header: 'Teléfono',
            sortable: true,
            sortKey: 'phone',
            filterable: true,
            filterKey: 'phone',
            cell: (client) => client.phone ?? '—',
          },
          {
            header: 'Documento',
            sortable: true,
            sortKey: 'document_number',
            filterable: true,
            filterKey: 'documentNumber',
            cell: (client) => client.document_number ?? '—',
          },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'is_deleted',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (client) =>
              client.is_deleted ? <Badge variant="destructive">Inactivo</Badge> : <Badge variant="success">Activo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (client) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditClient(client)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!client.is_deleted}
                    disabled={isToggling}
                    entityLabel="cliente"
                    onToggle={() =>
                      toggleStatus(client.id, {
                        onSuccess: () =>
                          toast.success(client.is_deleted ? 'Cliente habilitado' : 'Cliente deshabilitado'),
                        onError: () => toast.error('No se pudo actualizar el cliente'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(client) => client.id}
        isLoading={isLoading}
        emptyIcon={Users2}
        emptyTitle="No se encontraron clientes"
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

      {editClient && <ClientFormDialog client={editClient} onClose={() => setEditClient(null)} />}
    </div>
  );
}

interface ClientFormDialogProps {
  client?: Client;
  onClose?: () => void;
}

function ClientFormDialog({ client, onClose }: ClientFormDialogProps) {
  const isEditing = Boolean(client);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { data: documentTypes } = useCatalog('document_type');
  const { mutate: create, isPending: isCreating, error: createError } = useCreateClient();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateClientFormValues>({ resolver: zodResolver(createClientSchema) });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
        document_type: client.document_type ? Number(client.document_type) : undefined,
        document_number: client.document_number ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        address: client.address ?? '',
      });
    }
  }, [client, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateClientFormValues) => {
    const dto = { ...values, email: values.email || undefined };

    if (isEditing && client) {
      update(
        { id: client.id, dto },
        {
          onSuccess: () => {
            toast.success('Cliente actualizado correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    const companyId = access?.isSystem ? dto.company_id : access?.companyId;
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...dto, company_id: companyId },
      {
        onSuccess: () => {
          toast.success('Cliente creado correctamente');
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
            Nuevo cliente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              businessUnitId={watch('business_unit_id')}
              onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              {/* Solo dígitos y máximo 9 mientras se escribe; el mínimo de 6
                  se avisa con el mensaje de abajo. Antes este error no se
                  mostraba y el guardado se bloqueaba sin decir por qué. */}
              <Input
                id="phone"
                inputMode="numeric"
                maxLength={PHONE_MAX_DIGITS}
                {...withInputFilter(register('phone'), digitsFilter(PHONE_MAX_DIGITS))}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento (opcional)</Label>
              <Select
                value={watch('document_type') ? String(watch('document_type')) : undefined}
                onValueChange={(value) => {
                  setValue('document_type', Number(value), { shouldValidate: true });
                  // Cambiar de tipo puede dejar un número que ya no calza
                  // con el nuevo largo exacto (ej. de RUC a DNI) — se
                  // revalida de una.
                  if (watch('document_number')) setValue('document_number', watch('document_number'), { shouldValidate: true });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.document_type && <p className="text-sm text-destructive">{errors.document_type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">N° de documento</Label>
              {/* Mismas reglas EXACTAS por tipo que Usuarios (lib/documentType.ts)
                  — antes era un texto libre sin tope real, permitía letras y
                  más de 12 dígitos sin avisar (bug reportado por QA). */}
              <Input
                id="document_number"
                maxLength={documentNumberMaxLength(watch('document_type'))}
                {...withInputFilter(
                  register('document_number'),
                  documentNumberOnlyDigits(watch('document_type'))
                    ? digitsFilter(documentNumberMaxLength(watch('document_type')))
                    : maxLengthFilter(documentNumberMaxLength(watch('document_type'))),
                )}
              />
              {errors.document_number && <p className="text-sm text-destructive">{errors.document_number.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
