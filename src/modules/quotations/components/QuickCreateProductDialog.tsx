import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { RequiresCustomizationField } from '@/modules/products/components/RequiresCustomizationField';
import { useCreateProduct } from '@/modules/products/hooks/useProducts';
import { createProductSchema, type CreateProductFormValues } from '@/modules/products/schemas/product.schema';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';
import { toOptionalNumber, DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';

interface QuickCreateProductDialogProps {
  companyId?: number;
  onCreated: (id: number) => void;
}

// "+" al lado del select de Producto, dentro de cada item de la
// cotización — pedido explícito: crear el producto ahí mismo si todavía no
// existe en el catálogo, sin cortar el flujo de armar la cotización. Un
// producto se registra UNA vez con hasta 3 precios de catálogo a la vez
// (no un producto por modalidad) — mismo formulario que ProductsPage.
export function QuickCreateProductDialog({ companyId, onCreated }: QuickCreateProductDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateProduct();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { requires_customization: false },
  });

  const onSubmit = (values: CreateProductFormValues) => {
    if (!companyId) return;
    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (product) => {
          toast.success('Producto creado');
          onCreated(product.id);
          reset({ requires_customization: false });
          setOpen(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title="Nuevo producto">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="quick-product-name">Nombre</Label>
            <Input id="quick-product-name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Precios de catálogo (carga los que apliquen)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="quick-product-price-unit" className="text-[11px] font-normal text-muted-foreground">
                  Unidad
                </Label>
                <Input
                  id="quick-product-price-unit"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_unit', { setValueAs: toOptionalNumber })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quick-product-price-hundred" className="text-[11px] font-normal text-muted-foreground">
                  Ciento
                </Label>
                <Input
                  id="quick-product-price-hundred"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_hundred', { setValueAs: toOptionalNumber })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quick-product-price-half-thousand" className="text-[11px] font-normal text-muted-foreground">
                  Medio millar
                </Label>
                <Input
                  id="quick-product-price-half-thousand"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_half_thousand', { setValueAs: toOptionalNumber })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="quick-product-price-thousand" className="text-[11px] font-normal text-muted-foreground">
                  Millar
                </Label>
                <Input
                  id="quick-product-price-thousand"
                  type="number"
                  step={DECIMAL_INPUT_STEP}
                  {...register('price_thousand', { setValueAs: toOptionalNumber })}
                />
              </div>
            </div>
            {errors.price_unit && <p className="text-xs text-destructive">{errors.price_unit.message}</p>}
          </div>
          <RequiresCustomizationField
            id="quick-product-requires-customization"
            checked={watch('requires_customization') ?? false}
            onChange={(checked) => setValue('requires_customization', checked)}
          />
          <DialogFooter>
            <Button type="submit" size="sm" disabled={isPending}>
              <Check className="size-4" />
              Crear producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
