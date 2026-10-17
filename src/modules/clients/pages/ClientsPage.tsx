import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Search, Users2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { useClients, useCreateClient, useToggleClientStatus, useUpdateClient } from '@/modules/clients/hooks/useClients';
import { createClientSchema, type CreateClientFormValues } from '@/modules/clients/schemas/client.schema';
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
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
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
  const canCreate = usePermissionButton('cliente.create.button');
  const canUpdate = usePermissionButton('cliente.update.button');
  const canDisable = usePermissionButton('cliente.disable.button');

  const { data, isLoading } = useClients({
    page,
    limit: pageSize,
    searchTerm: search || undefined,
    orderBy,
    orderDir,
    phone: columnFilters.phone || undefined,
    documentNumber: columnFilters.documentNumber || undefined,
    status: columnFilters.status || undefined,
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
            {canCreate && <ClientFormDialog />}
          </div>
        }
      />

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            cell: (client) => <span className="font-medium">{client.name}</span>,
          },
          { header: 'Email', sortable: true, sortKey: 'email', cell: (client) => client.email ?? '—' },
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
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: access?.isSystem });
  const { mutate: create, isPending: isCreating, error: createError } = useCreateClient();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateClientFormValues>({ resolver: zodResolver(createClientSchema) });

  useEffect(() => {
    if (client) {
      reset({
        name: client.name,
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
    if (!companyId) return;

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
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {access?.isSystem && !isEditing && (
            <div className="space-y-2">
              <Label>Empresa</Label>
              <SearchableSelect
                placeholder="Selecciona una empresa"
                value={watch('company_id') ? String(watch('company_id')) : undefined}
                onChange={(value) => setValue('company_id', Number(value))}
                options={(companies?.data ?? []).map((company) => ({
                  value: String(company.id),
                  label: company.business_name,
                }))}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document_number">Documento</Label>
              <Input id="document_number" {...register('document_number')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" {...register('address')} />
            </div>
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
