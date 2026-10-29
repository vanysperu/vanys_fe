import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Search, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { useRoles } from '@/modules/roles/hooks/useRoles';
import { useCatalog, useCreateUser, useUpdateUser } from '@/modules/users/hooks/useCreateUser';
import { useToggleUserStatus } from '@/modules/users/hooks/useToggleUserStatus';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { createUserSchema, type CreateUserFormValues } from '@/modules/users/schemas/createUser.schema';
import { updateUserSchema, type UpdateUserFormValues } from '@/modules/users/schemas/updateUser.schema';
import type { User } from '@/modules/users/types/user.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateField } from '@/presentation/components/shared/DateField';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
import { digitsFilter, lettersFilter, maxLengthFilter, withInputFilter } from '@/lib/inputRestrictions';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
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
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const { data: rolesForFilter } = useRoles({ page: 1, limit: 100 });
  // Códigos exactos registrados como resource tipo "button" en el backend
  // (grulla_be: seed-base-rbac.js -> "users.create.button"/"users.disable.button").
  const canCreate = usePermissionButton('users.create.button');
  const canUpdate = usePermissionButton('users.update.button');
  const canDisable = usePermissionButton('users.disable.button');

  const { data, isLoading } = useUsers({
    page,
    limit: pageSize,
    searchTerm: searchTerm || undefined,
    orderBy,
    orderDir,
    name: columnFilters.name || undefined,
    email: columnFilters.email || undefined,
    roleName: columnFilters.roleName || undefined,
    isActive: statusFilter === undefined ? undefined : statusFilter === 'active',
    roleId: roleFilter ? Number(roleFilter) : undefined,
    startDate: dateRange.dateFrom,
    endDate: dateRange.dateTo,
  });

  const hasActiveFilters = Boolean(statusFilter || roleFilter || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setStatusFilter(undefined);
    setRoleFilter(undefined);
    setDateRange({});
    setPage(1);
  };
  const { mutate: toggleStatus, isPending: isToggling } = useToggleUserStatus();

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
        title="Usuarios"
        description="Gestiona los usuarios del sistema"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="w-full pl-9 sm:w-64"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {canCreate && <CreateUserDialog />}
          </div>
        }
      />

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <FilterSelect
          aria-label="Estado"
          allLabel="Todos los estados"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'inactive', label: 'Inactivos' },
          ]}
        />
        <FilterSelect
          aria-label="Rol"
          allLabel="Todos los roles"
          value={roleFilter}
          onChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
          options={(rolesForFilter?.rows ?? []).map((role) => ({ value: String(role.id), label: role.name }))}
        />
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
            sortKey: 'fullName',
            filterable: true,
            filterKey: 'name',
            cell: (user) => <span className="font-medium">{user.fullName}</span>,
          },
          {
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            filterable: true,
            filterKey: 'email',
            cell: (user) => <span className="text-muted-foreground">{user.email}</span>,
          },
          {
            header: 'Rol',
            filterable: true,
            filterKey: 'roleName',
            cell: (user) => user.role_name ?? '—',
          },
          {
            header: 'Estado',
            cell: (user) =>
              user.status ? <Badge variant="success">Activo</Badge> : <Badge variant="destructive">Inactivo</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (user) => (
              <div className="flex justify-end gap-1">
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditUser(user)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={user.status}
                    disabled={isToggling}
                    entityLabel="usuario"
                    onToggle={() =>
                      toggleStatus(user.id, {
                        onSuccess: () =>
                          toast.success(user.status ? 'Usuario deshabilitado' : 'Usuario habilitado'),
                        onError: () => toast.error('No se pudo actualizar el usuario'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(user) => user.id}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="No se encontraron usuarios"
        emptyDescription="Prueba con otro término de búsqueda"
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

      {editUser && <EditUserDialog user={editUser} onClose={() => setEditUser(null)} />}
    </div>
  );
}

// Convierte "2026-09-19" (input type="date") a "19/09/2026", formato que
// espera el backend (grulla_be: createUserDtoValidator -> date_of_birth).
function toDDMMYYYY(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

// Mismos códigos/largos EXACTOS que ya valida el backend (user.validator.ts)
// y el schema de Zod (createUser.schema.ts -> DOCUMENT_RULES) — DNI/RUC son
// siempre numéricos (se filtran en vivo), CE/Pasaporte pueden traer letras
// (documentos de extranjería), así que solo se les tope el largo máximo.
const DOCUMENT_TYPE_DNI = 1;
const DOCUMENT_TYPE_PASSPORT = 2;
const DOCUMENT_TYPE_CE = 3;
const DOCUMENT_TYPE_RUC = 6;

function documentNumberFilter(documentType: number | undefined) {
  switch (documentType) {
    case DOCUMENT_TYPE_DNI:
      return digitsFilter(8);
    case DOCUMENT_TYPE_RUC:
      return digitsFilter(11);
    case DOCUMENT_TYPE_CE:
      return maxLengthFilter(12);
    case DOCUMENT_TYPE_PASSPORT:
      return maxLengthFilter(9);
    default:
      return maxLengthFilter(12);
  }
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: roles } = useRoles({ page: 1, limit: 100 });
  const { data: documentTypes } = useCatalog('document_type');
  const { data: genders } = useCatalog('gender');
  // Un is_system elige la empresa primero: la lista de tiendas del select
  // se filtra recién por esa empresa (grulla_be: business_unit.controller.ts
  // ahora acepta ?companyId= solo para callers is_system). Un admin de
  // empresa no elige nada acá: el endpoint ya lo scopea a la suya.
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const { mutate, isPending, error } = useCreateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormValues>({ resolver: zodResolver(createUserSchema(isSystem)) });

  const selectedCompanyId = watch('company_id');
  const { data: businessUnits } = useBusinessUnits({
    page: 1,
    limit: 100,
    companyId: isSystem ? selectedCompanyId : undefined,
  });

  const onSubmit = (values: CreateUserFormValues) => {
    mutate(
      {
        ...values,
        date_of_birth: toDDMMYYYY(values.date_of_birth),
        status: true,
        roleIds: [values.roleId],
      },
      {
        onSuccess: (result) => {
          toast.success('Usuario creado', {
            description: `Contraseña temporal: ${result.temporaryPassword} (se le pedirá cambiarla al iniciar sesión)`,
            duration: 15000,
          });
          reset();
          setOpen(false);
        },
      },
    );
  };

  const apiError = error as ApiClientError | null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </DialogTrigger>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" maxLength={255} {...withInputFilter(register('name'), lettersFilter(255))} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paternal_lastname">Apellido paterno</Label>
              <Input id="paternal_lastname" maxLength={255} {...withInputFilter(register('paternal_lastname'), lettersFilter(255))} />
              {errors.paternal_lastname && (
                <p className="text-sm text-destructive">{errors.paternal_lastname.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maternal_lastname">Apellido materno</Label>
              <Input id="maternal_lastname" maxLength={255} {...withInputFilter(register('maternal_lastname'), lettersFilter(255))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
              <DateField
                id="date_of_birth"
                value={watch('date_of_birth')}
                onChange={(value) => setValue('date_of_birth', value, { shouldValidate: true })}
                disabled={disableFuture}
              />
              {errors.date_of_birth && (
                <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select
                value={watch('document_type') ? String(watch('document_type')) : undefined}
                onValueChange={(value) => {
                  setValue('document_type', Number(value), { shouldValidate: true });
                  // Cambiar el tipo revalida el número ya escrito (ej. DNI
                  // exige 8 dígitos exactos, RUC 11 — pedido explícito del
                  // usuario: "los números de tipo de documento no son
                  // acordes al documento, debe ser exacto").
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
              {errors.document_type && (
                <p className="text-sm text-destructive">{errors.document_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="document_number">N° de documento</Label>
              <Input
                id="document_number"
                maxLength={12}
                {...withInputFilter(
                  register('document_number', {
                    onBlur: () => setValue('document_type', watch('document_type'), { shouldValidate: true }),
                  }),
                  documentNumberFilter(watch('document_type')),
                )}
              />
              {errors.document_number && (
                <p className="text-sm text-destructive">{errors.document_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Género</Label>
              <Select
                value={watch('gender') ? String(watch('gender')) : undefined}
                onValueChange={(value) => setValue('gender', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {genders?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number">Teléfono</Label>
              <Input id="phone_number" maxLength={9} {...withInputFilter(register('phone_number'), digitsFilter(9))} />
              {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
          </div>

          {/* Un Super Administrador elige la EMPRESA (obligatoria) y la
              tienda queda opcional (puede crear un admin de empresa sin
              tienda propia); un admin de empresa nunca elige empresa
              (siempre la suya, forzada server-side) pero SÍ debe elegir
              tienda (obligatoria) — pedido explícito del usuario. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSystem && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={watch('company_id') ? String(watch('company_id')) : undefined}
                  onValueChange={(value) => {
                    setValue('company_id', Number(value), { shouldValidate: true });
                    // Cambiar de empresa invalida la tienda elegida antes.
                    setValue('business_unit_id', undefined);
                  }}
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
            <div className="space-y-2">
              <Label>Tienda{isSystem && <span className="font-normal text-muted-foreground"> (opcional)</span>}</Label>
              {/* Antes el select quedaba vacío y "bloqueado" sin explicación
                  cuando la empresa no tenía tiendas registradas (bug
                  reportado por QA) — ahora se avisa explícitamente. */}
              {businessUnits && businessUnits.data.length === 0 && !(isSystem && !selectedCompanyId) ? (
                <p className="flex h-9 items-center text-sm text-muted-foreground">No hay tiendas disponibles.</p>
              ) : (
                <Select
                  disabled={isSystem && !selectedCompanyId}
                  value={watch('business_unit_id') ? String(watch('business_unit_id')) : undefined}
                  onValueChange={(value) => setValue('business_unit_id', Number(value), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits?.data.map((businessUnit) => (
                      <SelectItem key={businessUnit.id} value={String(businessUnit.id)}>
                        {businessUnit.business_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.business_unit_id && (
                <p className="text-sm text-destructive">{errors.business_unit_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={watch('roleId') ? String(watch('roleId')) : undefined}
              onValueChange={(value) => setValue('roleId', Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles?.rows.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-sm text-destructive">{errors.roleId.message}</p>}
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Creando...' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// El roleId se precarga buscando por nombre en la lista de roles, porque el
// listado de usuarios solo trae `role_name`, no el id.
function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: roles } = useRoles({ page: 1, limit: 100 });
  const { data: documentTypes } = useCatalog('document_type');
  const { data: genders } = useCatalog('gender');
  // Mismo criterio que CreateUserDialog: solo un Super Administrador elige
  // la empresa (y recién ahí se filtra la lista de tiendas por esa
  // empresa); un admin de empresa nunca la elige, el backend la mantiene
  // fija en la suya sin importar lo que mande el body.
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const { mutate, isPending, error } = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({ resolver: zodResolver(updateUserSchema) });

  const selectedCompanyId = watch('company_id');
  const { data: businessUnits } = useBusinessUnits({
    page: 1,
    limit: 100,
    companyId: isSystem ? selectedCompanyId : undefined,
  });

  useEffect(() => {
    const currentRoleId = roles?.rows.find((role) => role.name === user.role_name)?.id;
    reset({
      name: user.name,
      paternal_lastname: user.paternal_lastname,
      maternal_lastname: user.maternal_lastname ?? undefined,
      email: user.email,
      // document_type/gender viajan como string desde /user/list (columnas
      // varchar en BD, FK a general_variable.prefix_id) — z.number() los
      // rechazaba en silencio si se precargaban tal cual (el error de
      // document_type ni se mostraba en este diálogo), bloqueando el
      // submit sin ningún mensaje visible.
      document_type: user.document_type ? Number(user.document_type) : undefined,
      document_number: user.document_number ?? undefined,
      phone_number: user.phone_number ?? undefined,
      address: user.address ?? undefined,
      gender: user.gender ? Number(user.gender) : undefined,
      roleId: currentRoleId,
      // Antes no se precargaban (la pantalla ni los mostraba) — bug
      // reportado por QA: "no permite editar ni asignar Empresa/Tienda al
      // modificar un usuario".
      company_id: user.company_id ?? undefined,
      business_unit_id: user.business_unit_id ?? undefined,
    });
  }, [user, roles, reset]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) onClose();
  };

  const onSubmit = (values: UpdateUserFormValues) => {
    const { roleId, ...rest } = values;
    mutate(
      { id: user.id, dto: { ...rest, roleIds: roleId ? [roleId] : undefined } },
      {
        onSuccess: () => {
          toast.success('Usuario actualizado correctamente');
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = error as ApiClientError | null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input id="edit-name" maxLength={255} {...withInputFilter(register('name'), lettersFilter(255))} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-paternal_lastname">Apellido paterno</Label>
              <Input id="edit-paternal_lastname" maxLength={255} {...withInputFilter(register('paternal_lastname'), lettersFilter(255))} />
              {errors.paternal_lastname && (
                <p className="text-sm text-destructive">{errors.paternal_lastname.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-maternal_lastname">Apellido materno</Label>
            <Input id="edit-maternal_lastname" maxLength={255} {...withInputFilter(register('maternal_lastname'), lettersFilter(255))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select
                value={watch('document_type') ? String(watch('document_type')) : undefined}
                onValueChange={(value) => {
                  setValue('document_type', Number(value), { shouldValidate: true });
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
              {errors.document_type && (
                <p className="text-sm text-destructive">{errors.document_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-document_number">N° de documento</Label>
              <Input
                id="edit-document_number"
                maxLength={12}
                {...withInputFilter(register('document_number'), documentNumberFilter(watch('document_type')))}
              />
              {errors.document_number && (
                <p className="text-sm text-destructive">{errors.document_number.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Género</Label>
              <Select
                value={watch('gender') ? String(watch('gender')) : undefined}
                onValueChange={(value) => setValue('gender', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {genders?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone_number">Teléfono</Label>
              <Input id="edit-phone_number" maxLength={9} {...withInputFilter(register('phone_number'), digitsFilter(9))} />
              {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Dirección</Label>
            <Input id="edit-address" {...register('address')} />
          </div>

          {/* Mismo criterio que CreateUserDialog: un Super Administrador
              puede reasignar la empresa (y recién ahí elegir tienda); un
              admin de empresa nunca cambia la empresa (el backend la
              mantiene fija en la suya), pero sí puede corregir la tienda. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isSystem && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={watch('company_id') ? String(watch('company_id')) : undefined}
                  onValueChange={(value) => {
                    setValue('company_id', Number(value), { shouldValidate: true });
                    // Cambiar de empresa invalida la tienda elegida antes.
                    setValue('business_unit_id', undefined);
                  }}
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
                {errors.company_id && <p className="text-sm text-destructive">{errors.company_id.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Tienda{isSystem && <span className="font-normal text-muted-foreground"> (opcional)</span>}</Label>
              {businessUnits && businessUnits.data.length === 0 && !(isSystem && !selectedCompanyId) ? (
                <p className="flex h-9 items-center text-sm text-muted-foreground">No hay tiendas disponibles.</p>
              ) : (
                <Select
                  disabled={isSystem && !selectedCompanyId}
                  value={watch('business_unit_id') ? String(watch('business_unit_id')) : undefined}
                  onValueChange={(value) => setValue('business_unit_id', Number(value), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una tienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits?.data.map((businessUnit) => (
                      <SelectItem key={businessUnit.id} value={String(businessUnit.id)}>
                        {businessUnit.business_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.business_unit_id && (
                <p className="text-sm text-destructive">{errors.business_unit_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select
              value={watch('roleId') ? String(watch('roleId')) : undefined}
              onValueChange={(value) => setValue('roleId', Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles?.rows.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
