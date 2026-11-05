import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { AdvertisementZoneDialog } from '@/modules/advertisements/components/AdvertisementZoneDialog';
import {
  useAdvertisementZones,
  useCreateAdvertisement,
  useUpdateAdvertisement,
  useUploadAdvertisementImage,
} from '@/modules/advertisements/hooks/useAdvertisements';
import { advertisementFormSchema, type AdvertisementFormValues } from '@/modules/advertisements/schemas/advertisement.schema';
import type { Advertisement } from '@/modules/advertisements/types/advertisement.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { ImageUploadField } from '@/presentation/components/shared/ImageUploadField';
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
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

interface AdvertisementFormDialogProps {
  // Sin `advertisement` crea uno nuevo (con su botón "Nuevo anuncio"); con él,
  // lo edita (la empresa no cambia).
  advertisement?: Advertisement;
  onClose?: () => void;
}

const valuesOf = (advertisement: Advertisement | undefined): AdvertisementFormValues =>
  advertisement
    ? {
        zone_id: advertisement.zone?.id,
        title: advertisement.title,
        link_url: advertisement.link_url ?? '',
        image_path: advertisement.image_path,
        position: advertisement.position,
      }
    : { title: '', link_url: '', image_path: '' };

export function AdvertisementFormDialog({ advertisement, onClose }: AdvertisementFormDialogProps) {
  const isEditing = Boolean(advertisement);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  // La zona es una fila de Variables Generales: crearla exige ese permiso.
  const canCreateZone = usePermissionButton('variable_general.create.button');
  const { mutate: create, isPending: isCreating } = useCreateAdvertisement();
  const { mutate: update, isPending: isUpdating } = useUpdateAdvertisement();
  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadAdvertisementImage();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<AdvertisementFormValues>({ resolver: zodResolver(advertisementFormSchema), defaultValues: valuesOf(advertisement) });

  // Empresa del anuncio: la suya; el Super Administrador la elige al crear.
  const companyId = advertisement?.company_id ?? (isSystem ? watch('company_id') : access?.companyId ?? undefined);
  const { data: zones } = useAdvertisementZones(companyId);
  const zoneOptions = (zones?.data ?? []).map((zone) => ({ value: String(zone.id), label: `${zone.name} (${zone.prefix_id})` }));
  const zoneId = watch('zone_id');

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    reset(valuesOf(advertisement));
    onClose?.();
  };

  const showError = (error: unknown) => toast.error((error as ApiClientError).message);

  const onSubmit = (values: AdvertisementFormValues) => {
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    const payload = {
      zone_id: values.zone_id ?? null,
      title: values.title,
      link_url: values.link_url || null,
      image_path: values.image_path,
    };

    if (advertisement) {
      // La posición solo se manda si se cambió: al pasar a otra zona, el
      // anuncio va al final de la nueva salvo que se elija otra posición.
      const position = values.position !== advertisement.position ? values.position : undefined;
      update(
        { id: advertisement.id, dto: { ...payload, position } },
        {
          onSuccess: () => {
            toast.success('Anuncio actualizado');
            handleOpenChange(false);
          },
          onError: showError,
        },
      );
      return;
    }

    create(
      { ...payload, company_id: isSystem ? companyId : undefined },
      {
        onSuccess: () => {
          toast.success('Anuncio creado: ya sale en la web');
          handleOpenChange(false);
        },
        onError: showError,
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nuevo anuncio
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar anuncio' : 'Nuevo anuncio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => {
                setValue('company_id', value, { shouldValidate: true });
                // La zona y la imagen son de la empresa elegida.
                setValue('zone_id', undefined);
                setValue('image_path', '');
              }}
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label>
              Zona <span className="font-normal text-muted-foreground">(lugar de la web)</span>
            </Label>
            <div className="flex items-center gap-1">
              <SearchableSelect
                className="flex-1"
                placeholder="Sin zona"
                value={zoneId ? String(zoneId) : undefined}
                onChange={(value) => setValue('zone_id', Number(value))}
                onClear={() => setValue('zone_id', undefined)}
                clearLabel="Sin zona"
                options={zoneOptions}
                emptyText="No hay zonas: créala con +"
              />
              {canCreateZone && (
                <AdvertisementZoneDialog companyId={companyId} onCreated={(id) => setValue('zone_id', id)} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              La web pide los anuncios de cada zona. Sin zona, solo salen cuando la web no filtra.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advertisement-title">Título</Label>
            <Input id="advertisement-title" placeholder="Promoción de lapiceros" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="advertisement-link">
              Enlace <span className="font-normal text-muted-foreground">(opcional, a dónde lleva el clic)</span>
            </Label>
            <Input id="advertisement-link" placeholder="https://…" {...register('link_url')} />
            {errors.link_url && <p className="text-xs text-destructive">{errors.link_url.message}</p>}
          </div>

          <ImageUploadField
            label="Imagen"
            noun="imagen"
            value={watch('image_path')}
            onChange={(path) => setValue('image_path', path ?? '', { shouldValidate: true })}
            upload={(file) => uploadImage({ file, companyId })}
            isUploading={isUploading}
            previewAlt="Imagen del anuncio"
            previewClassName="h-24 w-40"
            previewTestId="advertisement-image-preview"
            hint="tal como se verá en la web"
            error={errors.image_path?.message}
          />

          {advertisement && (
            <div className="space-y-2">
              <Label htmlFor="advertisement-position">Posición en su zona</Label>
              <Input
                id="advertisement-position"
                type="number"
                min={1}
                max={advertisement.zone_total}
                className="w-28"
                {...register('position', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">1 = primero. Los demás se corren solos.</p>
              {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isCreating || isUpdating || isUploading}>
              <Check className="size-4" />
              {isCreating || isUpdating ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear anuncio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
