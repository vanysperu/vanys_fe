import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { documentNumberMaxLength, documentNumberOnlyDigits } from '@/lib/documentType';
import { digitsFilter, maxLengthFilter, withInputFilter } from '@/lib/inputRestrictions';
import { useCreateClient, useUpdateClient } from '@/modules/clients/hooks/useClients';
import { createClientSchema, PHONE_MAX_DIGITS, type CreateClientFormValues } from '@/modules/clients/schemas/client.schema';
import type { Client } from '@/modules/clients/types/client.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useCatalog } from '@/modules/users/hooks/useCreateUser';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface ClientFormDialogProps {
  // Con cliente = editar (el diálogo nace abierto); sin cliente = crear.
  client?: Client;
  onClose?: () => void;
  // Crear desde otro formulario (ej. Nueva cotización): la empresa y la tienda
  // ya se eligieron allá y no se vuelven a pedir.
  fixedCompanyId?: number;
  fixedBusinessUnitId?: number;
  // Se llama con el cliente recién creado (para seleccionarlo donde se pidió).
  onCreated?: (client: Client) => void;
  // Botón que abre el diálogo al crear. Por defecto, "Nuevo cliente".
  trigger?: ReactNode;
  // Prefijo de los id de los campos: si este formulario se abre encima de otro
  // (Nueva cotización), los id no pueden repetirse en la página.
  idPrefix?: string;
}

// Formulario único de cliente (Sprint 2, ítem 9, pedido del usuario: "el modal
// de registrar cliente desde la cotización tiene que ser igual al del módulo").
// Lo usan la pantalla Clientes y el "+" de Nueva cotización.
export function ClientFormDialog({
  client,
  onClose,
  fixedCompanyId,
  fixedBusinessUnitId,
  onCreated,
  trigger,
  idPrefix = '',
}: ClientFormDialogProps) {
  const isEditing = Boolean(client);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { data: documentTypes } = useCatalog('document_type');
  const { mutate: create, isPending: isCreating, error: createError, reset: clearCreateError } = useCreateClient();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateClient();
  const fieldId = (name: string) => `${idPrefix}${name}`;

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
    // Al abrir para crear se parte de cero (y sin el error de un intento anterior).
    if (next && !client) {
      reset();
      clearCreateError();
    }
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

    const companyId = fixedCompanyId ?? (access?.isSystem ? dto.company_id : access?.companyId);
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...dto, company_id: companyId, business_unit_id: fixedBusinessUnitId ?? dto.business_unit_id },
      {
        onSuccess: (created) => {
          toast.success('Cliente creado correctamente');
          onCreated?.(created);
          reset();
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;
  const showCompanyFields = !isEditing && fixedCompanyId === undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            // Abierto encima de Nueva cotización: sin esto, el submit también
            // enviaría el formulario de la cotización (React propaga el evento
            // por el árbol de componentes aunque el diálogo esté en un portal).
            event.stopPropagation();
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          {showCompanyFields && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              businessUnitId={watch('business_unit_id')}
              onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor={fieldId('name')}>Nombre</Label>
            <Input id={fieldId('name')} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={fieldId('email')}>Email</Label>
              <Input id={fieldId('email')} type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId('phone')}>Teléfono</Label>
              {/* Solo dígitos y máximo 9 mientras se escribe; el mínimo de 6
                  se avisa con el mensaje de abajo. Antes este error no se
                  mostraba y el guardado se bloqueaba sin decir por qué. */}
              <Input
                id={fieldId('phone')}
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
                  // Radix puede disparar onValueChange("") al montar: se ignora.
                  if (!value) return;
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
              <Label htmlFor={fieldId('document_number')}>N° de documento</Label>
              {/* Mismas reglas EXACTAS por tipo que Usuarios (lib/documentType.ts)
                  — antes era un texto libre sin tope real, permitía letras y
                  más de 12 dígitos sin avisar (bug reportado por QA). */}
              <Input
                id={fieldId('document_number')}
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
            <Label htmlFor={fieldId('address')}>Dirección</Label>
            <Input id={fieldId('address')} {...register('address')} />
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
