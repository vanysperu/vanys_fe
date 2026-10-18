import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Check, KeyRound, Pencil, Plus, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { DataTable } from '@/presentation/components/shared/DataTable';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { ACTIVE_STATUS_FILTER_OPTIONS } from '@/lib/constants';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/shared/ui/tooltip';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { RoleAccessDialog } from '@/modules/roles/components/RoleAccessDialog';
import { useCreateRole, useRoles, useToggleRoleStatus, useUpdateRole } from '@/modules/roles/hooks/useRoles';
import { createRoleSchema, type CreateRoleFormValues } from '@/modules/roles/schemas/role.schema';
import type { Role } from '@/modules/roles/types/role.types';
import type { ApiClientError } from '@/config/api.types';

// Un rol de plantilla (company_id NULL) es una sola fila compartida por
// todas las empresas (CLAUDE.md sección 10) — distinto de `is_system`
// (plataforma), que YA se excluye aparte en cada condición de abajo.
function isSharedTemplateRole(role: Role): boolean {
  return role.company_id == null;
}

export function RolesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [manageRole, setManageRole] = useState<Role | null>(null);
  const [editRole, setEditRole] = useState<Role | null>(null);
  // Ordenamiento elevado a la página (mismo criterio que Clientes/Productos).
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  // Filtros por columna, elevados también a la página (nombre/descripción/tipo).
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const canCreate = usePermissionButton('roles_access.role.create.button');
  const canUpdate = usePermissionButton('roles_access.role.update.button');
  const canDisable = usePermissionButton('roles_access.role.disable.button');
  const canAssign = usePermissionButton('roles_access.assign.button');
  const { data: access } = useAccess();

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const { data, isLoading } = useRoles({
    page,
    limit: pageSize,
    orderBy,
    orderDir,
    name: columnFilters.name || undefined,
    description: columnFilters.description || undefined,
    isSystem: columnFilters.isSystem || undefined,
    status: columnFilters.status || undefined,
  });
  const { mutate: toggleStatus } = useToggleRoleStatus();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y accesos"
        description="Administra los roles del sistema y qué módulos/vistas/botones tiene otorgados cada uno"
        action={canCreate && <RoleFormDialog />}
      />

      <DataTable
        columns={[
          {
            header: 'Nombre',
            sortable: true,
            sortKey: 'name',
            filterable: true,
            filterKey: 'name',
            cell: (role) => <span className="font-medium">{role.name}</span>,
          },
          {
            header: 'Descripción',
            filterable: true,
            filterKey: 'description',
            cell: (role) => <span className="text-muted-foreground">{role.description ?? '—'}</span>,
          },
          {
            header: 'Tipo',
            filterable: true,
            filterKey: 'isSystem',
            // Antes era texto libre: había que escribir "true"/"false".
            filterType: 'multiselect',
            filterOptions: [
              { value: 'true', label: 'Plataforma' },
              { value: 'false', label: 'Empresa' },
            ],
            cell: (role) =>
              role.is_system ? (
                <Badge variant="default">Plataforma</Badge>
              ) : (
                <Badge variant="secondary">Empresa</Badge>
              ),
          },
          {
            header: 'Estado',
            filterable: true,
            filterKey: 'status',
            filterType: 'multiselect',
            filterOptions: ACTIVE_STATUS_FILTER_OPTIONS,
            cell: (role) =>
              role.status ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (role) => (
              <div className="flex justify-end gap-1">
                {canAssign && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setManageRole(role)}>
                        <KeyRound className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gestionar accesos</TooltipContent>
                  </Tooltip>
                )}
                {/* Un rol de plantilla (Administrador/Especialista/Gestor:
                    company_id NULL, compartido por todas las empresas) no
                    es editable/deshabilitable por un admin de empresa — el
                    backend filtra por company_id y nunca matchea esa fila,
                    así que renombrarlo o deshabilitarlo ahí no hacía nada
                    pese a mostrar un toast de "éxito" (mismo criterio que
                    RoleAccessDialog: solo is_system edita un rol compartido). */}
                {canUpdate && !role.is_system && (!isSharedTemplateRole(role) || access?.isSystem) && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditRole(role)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && !role.is_system && (!isSharedTemplateRole(role) || access?.isSystem) && (
                  <ToggleStatusButton
                    active={role.status}
                    entityLabel="rol"
                    onToggle={() =>
                      toggleStatus(role.id, {
                        onSuccess: () => toast.success(role.status ? 'Rol deshabilitado' : 'Rol habilitado'),
                        onError: () => toast.error('No se pudo actualizar el rol'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.rows ?? []}
        rowKey={(role) => role.id}
        isLoading={isLoading}
        emptyIcon={ShieldCheck}
        emptyTitle="No se encontraron roles"
        sortBy={orderBy}
        sortDir={orderDir}
        onSortChange={handleSortChange}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
      />

      {data && (
        <Pagination
          result={{ page: data.page ?? 1, pageSize: data.limit ?? pageSize, totalCount: data.count }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      <RoleAccessDialog role={manageRole} onClose={() => setManageRole(null)} />

      {editRole && <RoleFormDialog role={editRole} onClose={() => setEditRole(null)} />}
    </div>
  );
}

interface RoleFormDialogProps {
  role?: Role;
  onClose?: () => void;
}

function RoleFormDialog({ role, onClose }: RoleFormDialogProps) {
  const isEditing = Boolean(role);
  const [open, setOpen] = useState(isEditing);
  const { mutate: create, isPending: isCreating, error: createError } = useCreateRole();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateRole();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleFormValues>({ resolver: zodResolver(createRoleSchema) });

  useEffect(() => {
    if (role) reset({ name: role.name, description: role.description ?? '' });
  }, [role, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateRoleFormValues) => {
    if (isEditing && role) {
      update(
        { id: role.id, dto: values },
        {
          onSuccess: () => {
            toast.success('Rol actualizado correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(values, {
      onSuccess: () => {
        toast.success('Rol creado correctamente');
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
            Nuevo rol
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar rol' : 'Nuevo rol'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register('description')} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear rol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
