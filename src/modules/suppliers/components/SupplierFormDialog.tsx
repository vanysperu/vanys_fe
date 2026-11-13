import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { documentNumberMaxLength, documentNumberOnlyDigits } from '@/lib/documentType';
import { digitsFilter, maxLengthFilter, withInputFilter } from '@/lib/inputRestrictions';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useCreateSupplier, useUpdateSupplier } from '@/modules/suppliers/hooks/useSuppliers';
import { supplierSchema, type SupplierFormValues } from '@/modules/suppliers/schemas/supplier.schema';
import type { Supplier } from '@/modules/suppliers/types/supplier.types';
import { useCatalog } from '@/modules/users/hooks/useCreateUser';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface SupplierFormDialogProps {
  // Con proveedor = editar (el diálogo nace abierto); sin proveedor = crear.
  supplier?: Supplier;
  onClose?: () => void;
  // Crear desde otro formulario (ej. códigos del producto): la empresa ya se
  // eligió allá y no se vuelve a pedir.
  fixedCompanyId?: number;
  onCreated?: (supplier: Supplier) => void;
  // Botón que abre el diálogo al crear. Por defecto, "Nuevo proveedor".
  trigger?: ReactNode;
  idPrefix?: string;
}

const EMPTY_FORM: SupplierFormValues = {
  name: '',
  trade_name: '',
  document_number: '',
  email: '',
  phone: '',
  address: '',
  is_carrier: false,
  mtc_registration: '',
};

// Formulario único de proveedor (Sprint 2, base común): lo usan la pantalla
// Proveedores y cualquier "+" que necesite crear uno sin salir del formulario.
export function SupplierFormDialog({ supplier, onClose, fixedCompanyId, onCreated, trigger, idPrefix = '' }: SupplierFormDialogProps) {
  const isEditing = Boolean(supplier);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { data: documentTypes } = useCatalog('document_type');
  const { mutate: create, isPending: isCreating, error: createError, reset: clearCreateError } = useCreateSupplier();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateSupplier();
  const fieldId = (name: string) => `${idPrefix}${name}`;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<SupplierFormValues>({ resolver: zodResolver(supplierSchema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!supplier) return;
    reset({
      name: supplier.name,
      trade_name: supplier.trade_name ?? '',
      document_type: supplier.document_type ?? undefined,
      document_number: supplier.document_number ?? '',
      email: supplier.email ?? '',
      phone: supplier.phone ?? '',
      address: supplier.address ?? '',
      is_carrier: supplier.is_carrier,
      mtc_registration: supplier.mtc_registration ?? '',
    });
  }, [supplier, reset]);

  const handleOpenChange = (next: boolean) => {
    if (next && !supplier) {
      reset(EMPTY_FORM);
      clearCreateError();
    }
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: SupplierFormValues) => {
    const dto = { ...values, document_type: values.document_type ?? null };

    if (isEditing && supplier) {
      const { company_id: _companyId, ...rest } = dto;
      update(
        { id: supplier.id, dto: rest },
        {
          onSuccess: () => {
            toast.success('Proveedor actualizado correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    const companyId = fixedCompanyId ?? (access?.isSystem ? dto.company_id : access?.companyId ?? undefined);
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    create(
      { ...dto, company_id: companyId },
      {
        onSuccess: (created) => {
          toast.success('Proveedor creado correctamente');
          onCreated?.(created);
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;
  const documentType = watch('document_type');
  const isCarrier = watch('is_carrier') ?? false;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="size-4" />
              Nuevo proveedor
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            // Si se abre encima de otro formulario, su submit no lo envía.
            event.stopPropagation();
            void handleSubmit(onSubmit)(event);
          }}
          className="space-y-4"
        >
          {!isEditing && fixedCompanyId === undefined && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={fieldId('supplier-name')}>Razón social o nombre</Label>
              <Input id={fieldId('supplier-name')} {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId('supplier-trade-name')}>Nombre comercial (opcional)</Label>
              <Input id={fieldId('supplier-trade-name')} {...register('trade_name')} />
              {errors.trade_name && <p className="text-sm text-destructive">{errors.trade_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de documento (opcional)</Label>
              <Select
                value={documentType ? String(documentType) : undefined}
                onValueChange={(value) => {
                  // Radix puede disparar onValueChange("") al montar: se ignora.
                  if (!value) return;
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
              {errors.document_type && <p className="text-sm text-destructive">{errors.document_type.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId('supplier-document-number')}>N° de documento</Label>
              <Input
                id={fieldId('supplier-document-number')}
                maxLength={documentNumberMaxLength(documentType)}
                {...withInputFilter(
                  register('document_number'),
                  documentNumberOnlyDigits(documentType)
                    ? digitsFilter(documentNumberMaxLength(documentType))
                    : maxLengthFilter(documentNumberMaxLength(documentType)),
                )}
              />
              {errors.document_number && <p className="text-sm text-destructive">{errors.document_number.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={fieldId('supplier-email')}>Email</Label>
              <Input id={fieldId('supplier-email')} type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor={fieldId('supplier-phone')}>Teléfono</Label>
              <Input id={fieldId('supplier-phone')} inputMode="tel" maxLength={20} {...register('phone')} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={fieldId('supplier-address')}>Dirección</Label>
            <Input id={fieldId('supplier-address')} {...register('address')} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          {/* Transportista: lo usará la guía de remisión (registro MTC). */}
          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={isCarrier}
                onCheckedChange={(checked) => setValue('is_carrier', checked === true)}
                aria-label="Es transportista"
              />
              Es transportista
            </label>
            {isCarrier && (
              <div className="space-y-1 sm:w-64">
                <Label htmlFor={fieldId('supplier-mtc')} className="text-xs">
                  Registro MTC (opcional)
                </Label>
                <Input id={fieldId('supplier-mtc')} {...register('mtc_registration')} />
                {errors.mtc_registration && <p className="text-sm text-destructive">{errors.mtc_registration.message}</p>}
              </div>
            )}
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
