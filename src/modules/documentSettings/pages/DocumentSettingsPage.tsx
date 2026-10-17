import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, CreditCard, Plus, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { buildAssetUrl } from '@/lib/utils';
import { useMyDocumentSettings, useUpdateMyDocumentSettings, useUploadCompanyAsset } from '@/modules/documentSettings/hooks/useDocumentSettings';
import {
  createPaymentAccountSchema,
  updateDocumentSettingsSchema,
  type CreatePaymentAccountFormValues,
  type UpdateDocumentSettingsFormValues,
} from '@/modules/documentSettings/schemas/documentSettings.schema';
import { useCreateVariableGeneral, useDeleteVariableGeneral, useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import type { ApiClientError } from '@/config/api.types';

const PAYMENT_ACCOUNT_CATEGORY = 'payment_account';
const TYPE_LABEL: Record<string, string> = { bank: 'Cuenta bancaria', yape: 'Yape', plin: 'Plin' };

// Lo que aparece impreso en el PDF de cada cotización: logo/dirección de
// la empresa (arriba) y las cuentas para pagar (abajo, con QR opcional) —
// pedido explícito: "un lugar donde podamos configurar los documentos que
// genera cada empresa". Es por empresa: cada admin solo ve/edita la suya
// (el backend fuerza company_id desde el token, nunca desde acá).
export function DocumentSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documentos de la empresa" description="Lo que aparece en el PDF de tus cotizaciones" />
      <CompanyBrandingCard />
      <PaymentAccountsCard />
    </div>
  );
}

function CompanyBrandingCard() {
  const { data: settings, isLoading } = useMyDocumentSettings();
  const { mutate: update, isPending: isSaving } = useUpdateMyDocumentSettings();
  const { mutate: uploadAsset, isPending: isUploading } = useUploadCompanyAsset();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // El logo se sube al elegir el archivo (para poder subirlo una sola vez
  // y previsualizarlo), pero NO se guarda en la empresa hasta que se
  // presiona "Guardar" — antes se guardaba solo con seleccionar el
  // archivo, sin dar chance de arrepentirse (pedido explícito del
  // usuario). `undefined` = sin cambio pendiente, se usa settings.logo_url.
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateDocumentSettingsFormValues>({
    resolver: zodResolver(updateDocumentSettingsSchema),
    values: settings
      ? {
          business_name: settings.business_name,
          address: settings.address ?? '',
          phone: settings.phone ?? '',
          legal_terms_caption: settings.legal_terms_caption ?? '',
        }
      : undefined,
  });

  const onSubmit = (values: UpdateDocumentSettingsFormValues) => {
    update(
      { ...values, ...(pendingLogoUrl !== undefined ? { logo_url: pendingLogoUrl } : {}) },
      {
        onSuccess: () => {
          toast.success('Documentos actualizados');
          setPendingLogoUrl(undefined);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadAsset(file, {
      onSuccess: ({ path }) => {
        setPendingLogoUrl(path);
        toast.info('Logo cargado — presiona "Guardar" para aplicarlo');
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  if (isLoading) {
    return <Skeleton className="h-56 w-full" />;
  }

  const logoUrl = buildAssetUrl(pendingLogoUrl ?? settings?.logo_url);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <Building2 className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Datos de la empresa</h2>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="size-full object-contain" />
            ) : (
              <Building2 className="size-8 text-muted-foreground" />
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleLogoChange} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-3.5" /> {isUploading ? 'Subiendo…' : 'Cambiar logo'}
          </Button>
          {pendingLogoUrl !== undefined && <p className="text-[11px] text-muted-foreground">Sin guardar</p>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="business_name">Razón social</Label>
            <Input id="business_name" {...register('business_name')} />
            {errors.business_name && <p className="text-xs text-destructive">{errors.business_name.message}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Av. Los Próceres 123, Lima" {...register('address')} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="legal_terms_caption">Términos y condiciones</Label>
            {/* rows más grande + resize-y: el texto suele ser largo (una
                línea por cada punto numerado), necesita espacio cómodo
                para escribir/revisar sin scrollear a cada rato — pedido
                explícito del usuario ("apertura buena"). En el PDF cada
                línea se imprime como su propia tarjeta numerada. */}
            <Textarea
              id="legal_terms_caption"
              rows={10}
              className="resize-y"
              placeholder={'Un punto por línea, se numeran solos en el PDF, ej.:\n1. El pago del 50% de adelanto es obligatorio para iniciar producción.\n2. Los tiempos de entrega son referenciales.'}
              {...register('legal_terms_caption')}
            />
            {errors.legal_terms_caption && (
              <p className="text-xs text-destructive">{errors.legal_terms_caption.message}</p>
            )}
          </div>
          <div className="flex items-end sm:col-span-2 sm:justify-end">
            <Button type="submit" size="sm" disabled={isSaving}>
              <Check className="size-4" />
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentAccountsCard() {
  const [formOpen, setFormOpen] = useState(false);
  // El QR se sube al elegir el archivo (para poder subirlo una sola vez y
  // previsualizarlo) pero la cuenta NO se crea hasta presionar "Guardar" —
  // antes se creaba la cuenta apenas se elegía el archivo QR, sin dar
  // chance de completar el resto del formulario primero (pedido explícito
  // del usuario).
  const [pendingQrPath, setPendingQrPath] = useState<string | undefined>(undefined);
  const { data, isLoading } = useVariableGenerals({ category: PAYMENT_ACCOUNT_CATEGORY, ignorePagination: true });
  const { mutate: create, isPending: isCreating } = useCreateVariableGeneral();
  const { mutate: remove } = useDeleteVariableGeneral();
  const { mutate: uploadAsset, isPending: isUploading } = useUploadCompanyAsset();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePaymentAccountFormValues>({ resolver: zodResolver(createPaymentAccountSchema) });

  const accounts = data?.data ?? [];

  const onSubmit = (values: CreatePaymentAccountFormValues) => {
    create(
      {
        category: PAYMENT_ACCOUNT_CATEGORY,
        title: 'Cuenta de pago',
        prefix_id: values.prefix_id,
        name: values.name,
        ref1: values.ref1,
        ref2: pendingQrPath,
      },
      {
        onSuccess: () => {
          toast.success('Cuenta agregada');
          reset();
          setPendingQrPath(undefined);
          setFormOpen(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const handleQrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadAsset(file, {
      onSuccess: ({ path }) => setPendingQrPath(path),
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <CreditCard className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Cuentas de pago (bancos, Yape, Plin)</h2>
      </div>

      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <div className="space-y-2">
          {accounts.length === 0 && <p className="text-sm text-muted-foreground">Sin cuentas registradas.</p>}
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <div className="flex items-center gap-2.5">
                {account.ref2 && (
                  <img src={buildAssetUrl(account.ref2) ?? undefined} alt="QR" className="size-10 rounded border object-contain" />
                )}
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[account.prefix_id] ?? account.prefix_id} · {account.ref1}
                  </p>
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => remove(account.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        {!formOpen ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            Agregar cuenta
          </Button>
        ) : (
          <form
            onSubmit={handleSubmit((values) => onSubmit(values))}
            className="space-y-2 rounded-lg border p-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={watch('prefix_id')} onValueChange={(value) => setValue('prefix_id', value as 'bank' | 'yape' | 'plin')}>
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
                <Label htmlFor="account-name">Nombre</Label>
                <Input id="account-name" placeholder="BCP - Cuenta corriente" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-ref1">Número de cuenta / teléfono</Label>
              <Input id="account-ref1" {...register('ref1')} />
              {errors.ref1 && <p className="text-xs text-destructive">{errors.ref1.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="account-qr">Imagen QR (opcional)</Label>
              <Input
                id="account-qr"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploading}
                onChange={handleQrChange}
              />
              {isUploading && <p className="text-[11px] text-muted-foreground">Subiendo…</p>}
              {pendingQrPath && !isUploading && (
                <p className="text-[11px] text-muted-foreground">QR cargado — se guarda junto con la cuenta.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  setPendingQrPath(undefined);
                  reset();
                }}
              >
                <X className="size-4" />
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isCreating}>
                <Check className="size-4" />
                Guardar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
