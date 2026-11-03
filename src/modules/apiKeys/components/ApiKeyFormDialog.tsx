import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCreateApiKey, useUpdateApiKey } from '@/modules/apiKeys/hooks/useApiKeys';
import { apiKeyFormSchema, type ApiKeyFormValues } from '@/modules/apiKeys/schemas/apiKey.schema';
import type { ApiKey, CreatedApiKey } from '@/modules/apiKeys/types/apiKey.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
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
import type { ApiClientError } from '@/config/api.types';

interface ApiKeyFormDialogProps {
  // Sin `apiKey` crea una nueva (con su botón "Nueva API key"); con ella,
  // edita nombre y tienda (la empresa no cambia: otra empresa = otra key).
  apiKey?: ApiKey;
  onClose?: () => void;
  onCreated?: (created: CreatedApiKey) => void;
}

// Tienda de una key ya creada: solo las tiendas activas de SU empresa.
function EditStoreField({
  companyId,
  value,
  onChange,
}: {
  companyId: number;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100, companyId });
  const options = (businessUnits?.data ?? [])
    .filter((businessUnit) => businessUnit.company_id === companyId && !businessUnit.is_deleted)
    .map((businessUnit) => ({ value: String(businessUnit.id), label: businessUnit.business_code }));

  return (
    <div className="space-y-2">
      <Label>
        Tienda <span className="font-normal text-muted-foreground">(opcional)</span>
      </Label>
      <SearchableSelect
        placeholder="Sin tienda específica"
        value={value ? String(value) : undefined}
        onChange={(next) => onChange(Number(next))}
        onClear={() => onChange(undefined)}
        clearLabel="Sin tienda específica"
        options={options}
        emptyText="No se encontró esa tienda"
      />
    </div>
  );
}

export function ApiKeyFormDialog({ apiKey, onClose, onCreated }: ApiKeyFormDialogProps) {
  const isEditing = Boolean(apiKey);
  const [open, setOpen] = useState(isEditing);
  const { mutate: create, isPending: isCreating, error: createError } = useCreateApiKey();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateApiKey();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: apiKey
      ? { company_id: apiKey.company.id, business_unit_id: apiKey.business_unit?.id, name: apiKey.name }
      : undefined,
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    if (!isEditing) reset({ company_id: undefined, business_unit_id: undefined, name: '' });
    onClose?.();
  };

  const onSubmit = (values: ApiKeyFormValues) => {
    if (apiKey) {
      update(
        { id: apiKey.id, dto: { name: values.name, business_unit_id: values.business_unit_id ?? null } },
        {
          onSuccess: () => {
            toast.success('API key actualizada');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(
      { company_id: values.company_id, business_unit_id: values.business_unit_id ?? null, name: values.name },
      {
        onSuccess: (created) => {
          handleOpenChange(false);
          onCreated?.(created);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nueva API key
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar API key' : 'Nueva API key'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-name">Nombre</Label>
            <Input id="api-key-name" placeholder="Ej. Web principal" maxLength={100} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {apiKey ? (
            <>
              <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="text-sm font-medium">{apiKey.company.name}</p>
              </div>
              <EditStoreField
                companyId={apiKey.company.id}
                value={watch('business_unit_id')}
                onChange={(value) => setValue('business_unit_id', value)}
              />
            </>
          ) : (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(companyId) => setValue('company_id', companyId, { shouldValidate: true })}
              businessUnitId={watch('business_unit_id')}
              onBusinessUnitChange={(businessUnitId) => setValue('business_unit_id', businessUnitId)}
              companyError={errors.company_id?.message}
            />
          )}

          <p className="text-xs text-muted-foreground">
            Con tienda, los pedidos de la web caen en esa tienda; sin tienda, quedan a nivel empresa.
          </p>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear API key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
