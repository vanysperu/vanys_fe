import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP, toOptionalNumber } from '@/lib/inputRestrictions';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { ProductCategoryFields } from '@/modules/products/components/ProductCategoryFields';
import { ProductCodesField } from '@/modules/products/components/ProductCodesField';
import { ProductColorsField } from '@/modules/products/components/ProductColorsField';
import { ProductImageField } from '@/modules/products/components/ProductImageField';
import { RequiresCustomizationField } from '@/modules/products/components/RequiresCustomizationField';
import { useCreateProduct, useUpdateProduct } from '@/modules/products/hooks/useProducts';
import { createProductSchema, EMPTY_PRODUCT_FORM, type CreateProductFormValues } from '@/modules/products/schemas/product.schema';
import type { Product } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface ProductFormDialogProps {
  // Con producto = editar (el diálogo nace abierto); sin producto = crear.
  product?: Product;
  onClose?: () => void;
  // Crear desde otro formulario (ej. Nueva cotización): la empresa ya se
  // eligió allá y no se vuelve a pedir.
  fixedCompanyId?: number;
  // Se llama con el producto recién creado (para seleccionarlo donde se pidió).
  onCreated?: (product: Product) => void;
  // Botón que abre el diálogo al crear. Por defecto, "Nuevo producto".
  trigger?: ReactNode;
  // Prefijo de los id de los campos: si este formulario se abre encima de otro
  // (Nueva cotización), los id no pueden repetirse en la página.
  idPrefix?: string;
}

// Los 4 precios por volumen: misma grilla en crear y editar.
const PRICE_FIELDS = [
  { name: 'price_unit', label: 'Por unidad (S/)' },
  { name: 'price_hundred', label: 'Por ciento (S/)' },
  { name: 'price_half_thousand', label: 'Medio millar (S/)' },
  { name: 'price_thousand', label: 'Por millar (S/)' },
] as const;

// Formulario único de producto (Sprint 2, ítem 9, pedido del usuario: "el
// modal de registrar producto desde la cotización tiene que ser igual al del
// módulo"). Lo usan la pantalla Productos y el "+" de Nueva cotización.
export function ProductFormDialog({ product, onClose, fixedCompanyId, onCreated, trigger, idPrefix = '' }: ProductFormDialogProps) {
  const isEditing = Boolean(product);
  const [open, setOpen] = useState(isEditing);
  const { data: access } = useAccess();
  const { mutate: create, isPending: isCreating, error: createError, reset: clearCreateError } = useCreateProduct();
  const { mutate: update, isPending: isUpdating, error: updateError } = useUpdateProduct();
  const fieldId = (name: string) => `${idPrefix}${name}`;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: EMPTY_PRODUCT_FORM,
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description ?? '',
        sku: product.sku ?? '',
        price_unit: product.price_unit != null ? Number(product.price_unit) : undefined,
        price_hundred: product.price_hundred != null ? Number(product.price_hundred) : undefined,
        price_half_thousand: product.price_half_thousand != null ? Number(product.price_half_thousand) : undefined,
        price_thousand: product.price_thousand != null ? Number(product.price_thousand) : undefined,
        requires_customization: product.requires_customization,
        min_order_quantity: product.min_order_quantity ?? undefined,
        category_id: product.category_id ?? undefined,
        subcategory_id: product.subcategory_id ?? undefined,
        colors: product.colors ?? [],
        codes: product.codes ?? [],
        image_path: product.image_path ?? null,
      });
    }
  }, [product, reset]);

  const handleOpenChange = (next: boolean) => {
    // "Nuevo producto" siempre parte de cero. Se limpia al ABRIR, cuando los
    // campos todavía no están montados: al cerrar, la animación los mantiene
    // vivos y el formulario volvía a leer de ellos lo último tipeado.
    if (next && !product) {
      reset(EMPTY_PRODUCT_FORM);
      clearCreateError();
    }
    setOpen(next);
    if (!next) onClose?.();
  };

  const onSubmit = (values: CreateProductFormValues) => {
    if (isEditing && product) {
      const { company_id: _companyId, ...rest } = values;
      // Al editar, lo que se vació se manda como null para limpiarlo.
      const dto = {
        ...rest,
        min_order_quantity: values.min_order_quantity ?? null,
        category_id: values.category_id ?? null,
        subcategory_id: values.subcategory_id ?? null,
        colors: values.colors ?? [],
        codes: values.codes ?? [],
        image_path: values.image_path ?? null,
      };
      update(
        { id: product.id, dto },
        {
          onSuccess: () => {
            toast.success('Producto actualizado correctamente');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    // La empresa ya elegida en el formulario de origen, o: un usuario de
    // empresa crea en la suya; el Super Administrador en la que eligió acá.
    const companyId = fixedCompanyId ?? (access?.isSystem ? values.company_id : access?.companyId);
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    create(
      { ...values, company_id: companyId },
      {
        onSuccess: (created) => {
          toast.success('Producto creado correctamente');
          onCreated?.(created);
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = (isEditing ? updateError : createError) as ApiClientError | null;
  const isPending = isEditing ? isUpdating : isCreating;
  // Empresa del producto: la del que se edita, la fija del formulario de
  // origen, la elegida (Super Administrador) o la del usuario.
  const formCompanyId =
    product?.company_id ?? fixedCompanyId ?? (access?.isSystem ? watch('company_id') : access?.companyId ?? undefined);
  const showImageField = product ? Boolean(product.images_enabled) : Boolean(access?.isSystem || access?.productImagesEnabled);
  const showCompanyFields = !isEditing && fixedCompanyId === undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button>
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent expandable>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
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
              companyError={errors.company_id?.message}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor={fieldId('name')}>Nombre</Label>
            <Input id={fieldId('name')} {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor={fieldId('sku')}>SKU</Label>
            <Input id={fieldId('sku')} {...register('sku')} />
          </div>

          {/* Un producto puede tener los 4 precios cargados a la vez — el
              modo (unidad/ciento/medio millar/millar) se elige POR ITEM al
              armar la cotización, no acá (pedido explícito del usuario: "es
              un producto que se registra con precios diferentes"). */}
          <div className="space-y-2">
            <Label>Precios de catálogo (carga los que apliquen)</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PRICE_FIELDS.map(({ name, label }) => (
                <div key={name} className="space-y-1">
                  <Label htmlFor={fieldId(name)} className="text-xs font-normal text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={fieldId(name)}
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register(name, { setValueAs: toOptionalNumber })}
                  />
                </div>
              ))}
            </div>
            {errors.price_unit && <p className="text-sm text-destructive">{errors.price_unit.message}</p>}
            <p className="text-xs text-muted-foreground">
              Cada precio es una tarifa por unidad para ese volumen de pedido (suele bajar mientras más
              grande la modalidad) — al cotizar, se elige la tarifa y la cantidad real se multiplica por
              ella.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor={fieldId('min_order_quantity')}>Pedido mínimo (opcional)</Label>
            {/* Sin min/step del navegador (mismo criterio que los precios): si
                no, frena el guardado con su propio aviso en inglés y no se ven
                los mensajes del formulario ("Debe ser al menos 1"). */}
            <Input
              id={fieldId('min_order_quantity')}
              type="number"
              step={DECIMAL_INPUT_STEP}
              inputMode="numeric"
              placeholder="Sin mínimo"
              className="sm:w-48"
              {...register('min_order_quantity', { setValueAs: toOptionalNumber })}
            />
            {errors.min_order_quantity && <p className="text-sm text-destructive">{errors.min_order_quantity.message}</p>}
            <p className="text-xs text-muted-foreground">
              La menor cantidad que se puede pedir. Es informativo: en la cotización se muestra como aviso, no la bloquea.
            </p>
          </div>

          <RequiresCustomizationField
            id={fieldId('requires_customization')}
            checked={watch('requires_customization') ?? false}
            onChange={(checked) => setValue('requires_customization', checked)}
          />

          <ProductCategoryFields
            companyId={formCompanyId}
            categoryId={watch('category_id')}
            subcategoryId={watch('subcategory_id')}
            onChange={({ categoryId, subcategoryId }) => {
              setValue('category_id', categoryId);
              setValue('subcategory_id', subcategoryId);
            }}
          />

          <ProductColorsField
            value={watch('colors') ?? []}
            onChange={(colors) => {
              setValue('colors', colors);
              // Un código no puede quedar apuntando a un color que se quitó.
              setValue(
                'codes',
                (watch('codes') ?? []).map((entry) =>
                  colors.some((color) => color.name === entry.color) ? entry : { ...entry, color: null },
                ),
              );
            }}
          />

          {/* Después de los colores: cada código se puede vincular con uno. */}
          <ProductCodesField
            value={watch('codes') ?? []}
            onChange={(codes) => setValue('codes', codes)}
            colors={watch('colors') ?? []}
            companyId={formCompanyId}
          />

          {/* Foto: solo empresas con fotos habilitadas (las habilita el Super
              Administrador). Al crear, el Super Administrador la ve siempre y
              el backend avisa si la empresa elegida no las tiene. */}
          {showImageField && (
            <ProductImageField
              value={watch('image_path')}
              companyId={formCompanyId}
              onChange={(path) => setValue('image_path', path)}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor={fieldId('description')}>Descripción</Label>
            <Input id={fieldId('description')} {...register('description')} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
