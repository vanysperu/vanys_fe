import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  advertisementZoneSchema,
  suggestZoneCode,
  type AdvertisementZoneFormValues,
} from '@/modules/advertisements/schemas/advertisement.schema';
import { ADVERTISEMENT_ZONE_CATEGORY } from '@/modules/advertisements/types/advertisement.types';
import { useCreateVariableGeneral } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

interface AdvertisementZoneDialogProps {
  // Empresa dueña de la zona (la del anuncio). Sin empresa no se puede crear.
  companyId: number | undefined;
  onCreated: (zoneId: number) => void;
}

const EMPTY_ZONE: AdvertisementZoneFormValues = { name: '', code: '' };

// "+" junto al selector de zona: crea la zona sin salir del anuncio. Es una
// fila de Variables Generales (categoría advertisement_zone), así que también
// se puede editar o deshabilitar desde Configuración → Variables generales.
export function AdvertisementZoneDialog({ companyId, onCreated }: AdvertisementZoneDialogProps) {
  const [open, setOpen] = useState(false);
  // El código se sugiere a partir del nombre hasta que la persona lo cambie.
  const [codeTouched, setCodeTouched] = useState(false);
  const { mutate: createZone, isPending } = useCreateVariableGeneral();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AdvertisementZoneFormValues>({ resolver: zodResolver(advertisementZoneSchema), defaultValues: EMPTY_ZONE });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) return;
    reset(EMPTY_ZONE);
    setCodeTouched(false);
  };

  const onSubmit = (values: AdvertisementZoneFormValues) => {
    createZone(
      {
        category: ADVERTISEMENT_ZONE_CATEGORY,
        title: 'Zona de anuncios',
        prefix_id: values.code,
        name: values.name,
        company_id: companyId,
      },
      {
        onSuccess: (zone) => {
          toast.success(`Zona "${values.name}" creada`);
          onCreated(zone.id);
          handleOpenChange(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const nameField = register('name');
  const codeField = register('code');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0"
          disabled={!companyId}
          title={companyId ? 'Nueva zona' : 'Primero elige la empresa'}
          aria-label="Nueva zona"
        >
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva zona de anuncios</DialogTitle>
          <DialogDescription>Un lugar de la web donde salen anuncios, por ejemplo el banner de inicio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zone-name">Nombre</Label>
            <Input
              id="zone-name"
              placeholder="Banner de inicio"
              {...nameField}
              onChange={(event) => {
                void nameField.onChange(event);
                if (!codeTouched) setValue('code', suggestZoneCode(event.target.value), { shouldValidate: true });
              }}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-code">Código</Label>
            <Input
              id="zone-code"
              placeholder="inicio"
              className="font-mono"
              {...codeField}
              onChange={(event) => {
                setCodeTouched(true);
                void codeField.onChange(event);
              }}
            />
            <p className="text-xs text-muted-foreground">
              La web pide los anuncios de esta zona con este código (?zone=código). No se repite.
            </p>
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Creando…' : 'Crear zona'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
