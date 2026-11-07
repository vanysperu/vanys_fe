import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_HINT, validateImageFile } from '@/lib/imageUpload';
import { buildAssetUrl } from '@/lib/utils';
import { useUpdatePaymentAccount, useUploadCompanyAsset } from '@/modules/documentSettings/hooks/useDocumentSettings';
import { createPaymentAccountSchema, type CreatePaymentAccountFormValues } from '@/modules/documentSettings/schemas/documentSettings.schema';
import { useCreateVariableGeneral } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import type { VariableGeneral } from '@/modules/variableGeneral/types/variableGeneral.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

const PAYMENT_ACCOUNT_CATEGORY = 'payment_account';
type AccountType = CreatePaymentAccountFormValues['prefix_id'];
const ACCOUNT_TYPES: readonly string[] = ['bank', 'yape', 'plin'] satisfies AccountType[];
const isAccountType = (value: string | undefined): value is AccountType => ACCOUNT_TYPES.includes(value ?? '');

interface PaymentAccountFormProps {
  // null = cuenta nueva; con una cuenta, se edita esa.
  account: VariableGeneral | null;
  // Solo para el Super Administrador (la empresa elegida).
  companyId?: number;
  onDone: () => void;
}

// Agregar o editar una cuenta de pago (pedido explícito del usuario: "no hay
// una opción de editar"). El QR se sube al elegir el archivo (para subirlo una
// sola vez y previsualizarlo), pero la cuenta NO cambia hasta presionar
// "Guardar". Editar una cuenta no toca su historial: pagos y movimientos la
// referencian por id.
export function PaymentAccountForm({ account, companyId, onDone }: PaymentAccountFormProps) {
  const [pendingQrPath, setPendingQrPath] = useState<string | undefined>(undefined);
  // Quitar el QR que ya tenía la cuenta (se aplica al guardar).
  const [removeQr, setRemoveQr] = useState(false);
  const { mutate: create, isPending: isCreating } = useCreateVariableGeneral();
  const { mutate: update, isPending: isUpdating } = useUpdatePaymentAccount();
  const { mutate: uploadAsset, isPending: isUploading } = useUploadCompanyAsset();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePaymentAccountFormValues>({
    resolver: zodResolver(createPaymentAccountSchema),
    defaultValues: {
      prefix_id: isAccountType(account?.prefix_id) ? account?.prefix_id : undefined,
      name: account?.name ?? '',
      ref1: account?.ref1 ?? '',
      show_in_quotation: account?.show_in_quotation ?? true,
    },
  });

  const fieldId = (name: string) => `account-${name}-${account?.id ?? 'new'}`;
  const qrPreview = removeQr ? null : (pendingQrPath ?? account?.ref2 ?? null);

  const onSubmit = (values: CreatePaymentAccountFormValues) => {
    const fields = { prefix_id: values.prefix_id, name: values.name, ref1: values.ref1, show_in_quotation: values.show_in_quotation };
    const callbacks = {
      onSuccess: () => {
        toast.success(account ? 'Cuenta actualizada' : 'Cuenta agregada');
        onDone();
      },
      onError: (error: unknown) => toast.error((error as ApiClientError).message),
    };
    if (account) {
      // ref2: undefined = el QR no cambia; null = se quita.
      update({ id: account.id, dto: { ...fields, ref2: removeQr ? null : pendingQrPath } }, callbacks);
      return;
    }
    create({ ...fields, category: PAYMENT_ACCOUNT_CATEGORY, title: 'Cuenta de pago', ref2: pendingQrPath, company_id: companyId }, callbacks);
  };

  const handleQrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const invalidReason = validateImageFile(file);
    if (invalidReason) {
      toast.error(invalidReason);
      event.target.value = '';
      return;
    }

    uploadAsset(
      { file, companyId },
      {
        onSuccess: ({ path }) => {
          setPendingQrPath(path);
          setRemoveQr(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const handleRemoveQr = () => {
    setPendingQrPath(undefined);
    setRemoveQr(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-lg border p-3" data-testid="payment-account-form">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={watch('prefix_id')} onValueChange={(value) => setValue('prefix_id', value as AccountType, { shouldValidate: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bank">Cuenta bancaria</SelectItem>
              <SelectItem value="yape">Yape</SelectItem>
              <SelectItem value="plin">Plin</SelectItem>
            </SelectContent>
          </Select>
          {errors.prefix_id && <p className="text-xs text-destructive">{errors.prefix_id.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={fieldId('name')}>Nombre</Label>
          <Input id={fieldId('name')} placeholder="BCP - Cuenta corriente" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={fieldId('ref1')}>Número de cuenta / teléfono</Label>
        <Input id={fieldId('ref1')} {...register('ref1')} />
        {errors.ref1 && <p className="text-xs text-destructive">{errors.ref1.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor={fieldId('qr')}>Imagen QR (opcional)</Label>
        {qrPreview && (
          <div className="flex items-center gap-2">
            <img src={buildAssetUrl(qrPreview) ?? undefined} alt="QR" className="size-16 rounded border object-contain" />
            <Button type="button" size="sm" variant="ghost" onClick={handleRemoveQr}>
              <Trash2 className="size-3.5 text-destructive" />
              Quitar QR
            </Button>
          </div>
        )}
        <Input id={fieldId('qr')} type="file" accept={IMAGE_INPUT_ACCEPT} disabled={isUploading} onChange={handleQrChange} />
        <p className="text-[11px] text-muted-foreground">{IMAGE_UPLOAD_HINT}</p>
        {isUploading && <p className="text-[11px] text-muted-foreground">Subiendo…</p>}
        {pendingQrPath && !isUploading && <p className="text-[11px] text-muted-foreground">QR cargado — se guarda junto con la cuenta.</p>}
        {removeQr && <p className="text-[11px] text-muted-foreground">El QR se quita al guardar.</p>}
      </div>
      <div className="flex items-start gap-2">
        <Checkbox
          id={fieldId('show-in-quotation')}
          className="mt-0.5"
          checked={watch('show_in_quotation')}
          onCheckedChange={(checked) => setValue('show_in_quotation', checked === true)}
        />
        <div>
          <Label htmlFor={fieldId('show-in-quotation')}>Mostrar en la cotización</Label>
          <p className="text-[11px] text-muted-foreground">Desmárcala si es una cuenta interna: no sale en el PDF, pero sigue disponible para registrar pagos y gastos.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          <X className="size-4" />
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isCreating || isUpdating || isUploading}>
          <Check className="size-4" />
          Guardar
        </Button>
      </div>
    </form>
  );
}
