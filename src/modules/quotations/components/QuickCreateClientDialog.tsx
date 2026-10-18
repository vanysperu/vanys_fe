import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCreateClient } from '@/modules/clients/hooks/useClients';
import { createClientSchema, PHONE_MAX_DIGITS, type CreateClientFormValues } from '@/modules/clients/schemas/client.schema';
import { digitsFilter, withInputFilter } from '@/lib/inputRestrictions';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';

interface QuickCreateClientDialogProps {
  companyId?: number;
  onCreated: (id: number) => void;
}

// "+" al lado del select de Cliente dentro de Nueva cotización — pedido
// explícito: poder registrar un cliente nuevo sin salir del formulario, y
// que quede guardado de verdad (no es un dato suelto de la cotización).
export function QuickCreateClientDialog({ companyId, onCreated }: QuickCreateClientDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClientFormValues>({ resolver: zodResolver(createClientSchema) });

  const onSubmit = (values: CreateClientFormValues) => {
    if (!companyId) return;
    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (client) => {
          toast.success('Cliente creado');
          onCreated(client.id);
          reset();
          setOpen(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title="Nuevo cliente">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="quick-client-name">Nombre</Label>
            <Input id="quick-client-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-client-email">Email (opcional)</Label>
            <Input id="quick-client-email" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="quick-client-phone">Teléfono (opcional)</Label>
            {/* Solo dígitos y máximo 9 mientras se escribe; el mínimo de 6 se
                avisa con el mensaje de abajo. Antes este error no se mostraba
                y el guardado se bloqueaba sin decir por qué. */}
            <Input
              id="quick-client-phone"
              inputMode="numeric"
              maxLength={PHONE_MAX_DIGITS}
              {...withInputFilter(register('phone'), digitsFilter(PHONE_MAX_DIGITS))}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={isPending}>
              <Check className="size-4" />
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
