import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useClients } from '@/modules/clients/hooks/useClients';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { useProducts } from '@/modules/products/hooks/useProducts';
import type { Product } from '@/modules/products/types/product.types';
import { useTechniques } from '@/modules/products/hooks/useTechniques';
import { QuickCreateClientDialog } from '@/modules/quotations/components/QuickCreateClientDialog';
import { QuickCreateProductDialog } from '@/modules/quotations/components/QuickCreateProductDialog';
import { QuickCreateTechniqueDialog } from '@/modules/quotations/components/QuickCreateTechniqueDialog';
import { useCreateQuotation } from '@/modules/quotations/hooks/useQuotations';
import { createQuotationSchema, type CreateQuotationFormValues } from '@/modules/quotations/schemas/quotation.schema';
import { QUOTATION_ITEM_PRICING_MODE_LABEL, type QuotationItemPricingMode } from '@/modules/quotations/types/quotation.types';
import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { useAccess } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';
import { toOptionalNumber } from '@/lib/inputRestrictions';

// Qué precios de catálogo tiene cargados el producto para el modo elegido
// — "custom" siempre está disponible (no depende del catálogo). MySQL/
// Sequelize devuelve las columnas DECIMAL como STRING en las respuestas de
// listado (GET /product/list), aunque el tipo declarado sea number — sin
// el Number(...) acá, "80.50" + 0 concatena texto en vez de sumar y
// itemTotal.toFixed(2) revienta más abajo porque itemTotal deja de ser un
// number (esto era exactamente el crash reportado al elegir un producto
// con precios de catálogo).
// Producto y técnica comparten la misma forma de precios: un precio POR
// UNIDAD para cada volumen (unidad / ciento / medio millar / millar).
interface TierPriced {
  price_unit: number | null;
  price_hundred: number | null;
  price_half_thousand: number | null;
  price_thousand: number | null;
}

const TIER_FIELD: Record<Exclude<QuotationItemPricingMode, 'custom'>, keyof TierPriced> = {
  unit: 'price_unit',
  hundred: 'price_hundred',
  half_thousand: 'price_half_thousand',
  thousand: 'price_thousand',
};

function resolveTierPrice(row: TierPriced | undefined, pricingMode: QuotationItemPricingMode): number | null {
  if (!row || pricingMode === 'custom') return null;
  const raw = row[TIER_FIELD[pricingMode]];
  return raw == null ? null : Number(raw);
}

// Modos que tienen precio cargado en el producto Y en la técnica elegida, más
// "personalizado" (siempre disponible) — igual que el backend, que rechaza
// un modo sin precio en cualquiera de los dos. Si todavía no se eligió
// técnica, se filtra solo por el producto.
function availablePricingModes(
  product: Product | undefined,
  technique: TierPriced | null | undefined,
): QuotationItemPricingMode[] {
  const catalogModes = (Object.keys(TIER_FIELD) as Exclude<QuotationItemPricingMode, 'custom'>[]).filter(
    (mode) => resolveTierPrice(product, mode) != null && (!technique || resolveTierPrice(technique, mode) != null),
  );
  return [...catalogModes, 'custom'];
}

interface ItemPriceBreakdown {
  productPrice: number;
  techniquePrice: number;
  unitPrice: number;
  total: number;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

// Precio en vivo del item, MISMO cálculo que el backend al crear (grulla_be:
// quotation.service.ts -> resolveUnitPrice): (precio del producto + precio de
// la técnica, los dos en el mismo modo) × cantidad, con el precio unitario
// redondeado a 2 decimales antes de multiplicar. Ejemplo del usuario: jabón
// ciento S/0.90 + serigrafía ciento S/0.95 = S/1.85 × 10 = S/18.50.
// Devuelve null mientras falte algún dato (NaN incluido: un input numérico
// vacío entrega NaN, no undefined).
// Técnica que cuenta para el precio: solo si el producto se personaliza.
// null = el producto no lleva técnica; undefined = falta elegirla.
function effectiveTechnique(product: Product | undefined, technique: TierPriced | undefined): TierPriced | null | undefined {
  if (product && !product.requires_customization) return null;
  return technique;
}

function computeItemPrice(
  product: Product | undefined,
  technique: TierPriced | null | undefined,
  quantity: number | undefined,
  pricingMode: QuotationItemPricingMode | undefined,
  customPrice: number | undefined,
  customTechniquePrice: number | undefined,
): ItemPriceBreakdown | null {
  const mode = pricingMode ?? 'unit';
  const productPrice = mode === 'custom' ? customPrice : resolveTierPrice(product, mode);
  // Producto sin personalización: el precio es solo el del producto.
  const techniquePrice =
    technique === null
      ? 0
      : mode === 'custom'
      ? customTechniquePrice != null && !Number.isNaN(customTechniquePrice)
        ? customTechniquePrice
        : technique?.price_unit != null
          ? Number(technique.price_unit)
          : null
      : resolveTierPrice(technique, mode);

  if (productPrice == null || Number.isNaN(productPrice)) return null;
  if (techniquePrice == null || Number.isNaN(techniquePrice)) return null;
  if (!quantity || Number.isNaN(quantity)) return null;

  const unitPrice = roundMoney(productPrice + techniquePrice);
  return { productPrice, techniquePrice, unitPrice, total: roundMoney(unitPrice * quantity) };
}

interface CreateQuotationDialogProps {
  // Trigger opcional (CLAUDE.md sección 12: prop opcional con default que
  // preserva el comportamiento anterior) — permite reusar el mismo diálogo
  // detrás de un disparador distinto (ej. el botón flotante global en
  // Shell.tsx) sin duplicar todo el formulario en otro componente.
  trigger?: ReactNode;
}

export function CreateQuotationDialog({ trigger }: CreateQuotationDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: access?.isSystem });
  // Nunca ofrecer clientes/productos/técnicas deshabilitados en una
  // cotización nueva — sin este filtro, useX() devolvía TODO por defecto
  // (el catálogo de productos sí necesita ver inactivos para reactivarlos,
  // pero cotizar contra uno ya no tiene sentido).
  const { data: clients } = useClients({ page: 1, limit: 100, status: 'active' });
  // Solo quien administra tiendas (módulo "platform", ej. Administrador)
  // puede listar business units — un Gestor tiene su tienda fija server-side
  // y nunca la elige acá, así que pedirla igual solo generaba un 403 de fondo
  // cada vez que se abría este diálogo (es global: botón flotante siempre visible).
  const canPickBusinessUnit = !access?.isSystem && Boolean(access?.modules.includes('platform'));
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canPickBusinessUnit });
  const { data: products } = useProducts({ page: 1, limit: 100, status: 'active' });
  const { data: techniques } = useTechniques({ page: 1, limit: 100, status: 'active' });
  const { mutate: create, isPending, error } = useCreateQuotation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateQuotationFormValues>({
    resolver: zodResolver(createQuotationSchema),
    defaultValues: { items: [{ product_id: undefined, technique_id: undefined, pricing_mode: 'unit', quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const includesIgv = watch('includes_igv');

  const resolvedCompanyId = (access?.isSystem ? watch('company_id') : access?.companyId) ?? undefined;

  const subtotal = watchedItems.reduce((sum, item) => {
    const product = products?.data.find((row) => row.id === item.product_id);
    const technique = effectiveTechnique(product, techniques?.data.find((row) => row.id === item.technique_id));
    return (
      sum +
      (computeItemPrice(product, technique, item.quantity, item.pricing_mode, item.custom_price, item.custom_technique_price)
        ?.total ?? 0)
    );
  }, 0);
  // Viene de "Variables Generales" (categoría "tax_config"), ya no es un
  // 18% hardcodeado — el backend recalcula con el mismo valor real al
  // guardar (ver access.service.ts -> getIgvRate).
  const igvRate = access?.igvRate ?? 0.18;
  const igvAmount = includesIgv ? subtotal * igvRate : 0;
  const grandTotal = subtotal + igvAmount;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset({ items: [{ product_id: undefined, technique_id: undefined, pricing_mode: 'unit', quantity: 1 }] });
  };

  const requiresCustomization = (productId: number | undefined) =>
    Boolean(products?.data.find((row) => row.id === productId)?.requires_customization);

  const onSubmit = (values: CreateQuotationFormValues) => {
    const companyId = access?.isSystem ? values.company_id : access?.companyId;
    if (!companyId) return;

    // La técnica es obligatoria solo en productos que se personalizan.
    const missingTechnique = values.items.findIndex(
      (item) => requiresCustomization(item.product_id) && !item.technique_id,
    );
    if (missingTechnique >= 0) {
      setError(`items.${missingTechnique}.technique_id`, { message: 'Selecciona una técnica de personalización' });
      return;
    }

    create(
      {
        company_id: companyId,
        client_id: values.client_id,
        business_unit_id: values.business_unit_id,
        notes: values.notes,
        billing_name: values.billing_enabled ? values.billing_name : undefined,
        billing_document_number: values.billing_enabled ? values.billing_document_number : undefined,
        production_days: values.production_days,
        items: values.items.map((item) => ({
          product_id: item.product_id,
          technique_id: requiresCustomization(item.product_id) ? item.technique_id : null,
          pricing_mode: item.pricing_mode,
          quantity: item.quantity,
          custom_price: item.pricing_mode === 'custom' ? item.custom_price : undefined,
          custom_technique_price: item.pricing_mode === 'custom' ? item.custom_technique_price : undefined,
        })),
        includes_delivery: values.includes_delivery,
        includes_design: values.includes_design,
        includes_igv: values.includes_igv,
      },
      {
        onSuccess: () => {
          toast.success('Cotización creada correctamente');
          handleOpenChange(false);
        },
      },
    );
  };

  const apiError = error as ApiClientError | null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Nueva cotización
          </Button>
        )}
      </DialogTrigger>
      <DialogContent expandable defaultExpanded className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva cotización</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex items-center gap-1">
                <SearchableSelect
                  className="flex-1"
                  placeholder="Selecciona un cliente"
                  value={watch('client_id') ? String(watch('client_id')) : undefined}
                  onChange={(value) => setValue('client_id', Number(value), { shouldValidate: true })}
                  options={(clients?.data ?? []).map((client) => ({ value: String(client.id), label: client.name }))}
                />
                <QuickCreateClientDialog
                  companyId={resolvedCompanyId}
                  // shouldValidate: true — sin esto, el error "Selecciona un
                  // cliente" (si ya se había mostrado) se quedaba pegado en
                  // pantalla aunque el cliente recién creado sí quedara
                  // guardado en el formulario (bug reportado por el usuario:
                  // "creé un usuario desde la cotización y siempre salió el
                  // mensaje de debe seleccionar un cliente").
                  onCreated={(id) => setValue('client_id', id, { shouldValidate: true })}
                />
              </div>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            {access?.isSystem ? (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <SearchableSelect
                  placeholder="Selecciona una empresa"
                  value={watch('company_id') ? String(watch('company_id')) : undefined}
                  onChange={(value) => setValue('company_id', Number(value))}
                  options={(companies?.data ?? []).map((company) => ({
                    value: String(company.id),
                    label: company.business_name,
                  }))}
                />
              </div>
            ) : (
              // La empresa nunca se elige (siempre es la propia, forzada
              // server-side) — solo la tienda, y solo si hay más de una.
              businessUnits && businessUnits.data.length > 1 && (
                <div className="space-y-2">
                  <Label>Tienda</Label>
                  <Select
                    value={watch('business_unit_id') ? String(watch('business_unit_id')) : undefined}
                    onValueChange={(value) => setValue('business_unit_id', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una tienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.data.map((businessUnit) => (
                        <SelectItem key={businessUnit.id} value={String(businessUnit.id)}>
                          {businessUnit.business_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
          </div>

          {/* El cliente vinculado (arriba) nunca cambia — esto solo pisa
              el nombre/documento que se IMPRIME en el PDF, para cuando el
              cliente pide que la cotización salga a nombre de otra
              persona o empresa (ej. su propio cliente final) pero quiere
              que siga quedando registrada a su nombre en el sistema
              (pedido explícito del usuario). */}
          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch('billing_enabled') ?? false}
                onCheckedChange={(checked) => setValue('billing_enabled', checked === true)}
              />
              Emitir a nombre de otra persona o empresa
            </label>
            {watch('billing_enabled') && (
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="billing_name" className="text-xs">
                    Nombre a facturar
                  </Label>
                  <Input id="billing_name" {...register('billing_name')} />
                  {errors.billing_name && <p className="text-xs text-destructive">{errors.billing_name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="billing_document_number" className="text-xs">
                    DNI / RUC
                  </Label>
                  <Input id="billing_document_number" {...register('billing_document_number')} />
                  {errors.billing_document_number && (
                    <p className="text-xs text-destructive">{errors.billing_document_number.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    product_id: undefined as unknown as number,
                    technique_id: undefined,
                    pricing_mode: 'unit',
                    quantity: 1,
                  })
                }
              >
                <Plus className="size-4" />
                Agregar item
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              {fields.map((field, index) => {
                const item = watchedItems[index];
                const product = products?.data.find((row) => row.id === item?.product_id);
                const usesTechnique = !product || product.requires_customization;
                const technique = effectiveTechnique(
                  product,
                  techniques?.data.find((row) => row.id === item?.technique_id),
                );
                const pricingMode = item?.pricing_mode ?? 'unit';
                const price = computeItemPrice(
                  product,
                  technique,
                  item?.quantity,
                  pricingMode,
                  item?.custom_price,
                  item?.custom_technique_price,
                );
                const modes = availablePricingModes(product, technique);

                return (
                  <div key={field.id} className="space-y-2 rounded-md border border-transparent p-1 [&:not(:last-child)]:border-b-muted">
                  <div className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-12 min-w-0 space-y-1 sm:col-span-5">
                      <Label className="text-xs">Producto</Label>
                      <div className="flex items-center gap-1">
                        <SearchableSelect
                          className="flex-1"
                          placeholder="Producto"
                          value={item?.product_id ? String(item.product_id) : undefined}
                          onChange={(value) => {
                            setValue(`items.${index}.product_id`, Number(value), { shouldValidate: true });
                            // El modo elegido de un producto anterior puede no
                            // existir en el nuevo (ej. tenía "por millar" y el
                            // nuevo no) — vuelve a "por unidad" si eso pasa, o
                            // se queda como "personalizado" si ya estaba así.
                            const newProduct = products?.data.find((row) => row.id === Number(value));
                            // Un producto sin personalización no lleva técnica:
                            // se descarta la que hubiera quedado elegida.
                            if (newProduct && !newProduct.requires_customization) {
                              setValue(`items.${index}.technique_id`, undefined);
                            }
                            const newTechnique = effectiveTechnique(
                              newProduct,
                              techniques?.data.find((row) => row.id === item?.technique_id),
                            );
                            const newModes = availablePricingModes(newProduct, newTechnique);
                            if (!newModes.includes(pricingMode)) {
                              setValue(`items.${index}.pricing_mode`, newModes[0] ?? 'custom');
                            }
                          }}
                          options={(products?.data ?? []).map((row) => ({ value: String(row.id), label: row.name }))}
                        />
                        <QuickCreateProductDialog
                          companyId={resolvedCompanyId}
                          onCreated={(id) => setValue(`items.${index}.product_id`, id, { shouldValidate: true })}
                        />
                      </div>
                    </div>

                    <div className="col-span-12 min-w-0 space-y-1 sm:col-span-4">
                      <Label className="text-xs">Técnica</Label>
                      {!usesTechnique && (
                        <p className="flex h-9 items-center text-xs text-muted-foreground" data-testid={`item-no-customization-${index}`}>
                          Sin personalización
                        </p>
                      )}
                      <div className={usesTechnique ? 'flex items-center gap-1' : 'hidden'}>
                        {/* SearchableSelect (no el <Select> nativo de Radix):
                            el nativo tiene un bug real confirmado — cuando la
                            técnica recién se crea con el "+" de al lado, su
                            <SelectItem> nunca se montó antes de que el value
                            cambiara, y <SelectValue> se queda mostrando el
                            placeholder para siempre aunque el valor y el
                            resaltado en el dropdown sean correctos (bug de
                            caché interno de Radix). SearchableSelect resuelve
                            su label buscando en `options` en cada render, sin
                            depender de qué se montó antes — mismo patrón que
                            ya usa Producto, que por eso nunca tuvo el bug. */}
                        <SearchableSelect
                          className="flex-1"
                          placeholder="Selecciona una técnica"
                          value={item?.technique_id ? String(item.technique_id) : undefined}
                          onChange={(value) => {
                            setValue(`items.${index}.technique_id`, Number(value), { shouldValidate: true });
                            // Igual que al cambiar de producto: si la técnica
                            // nueva no tiene precio para el modo elegido, se
                            // pasa al primer modo que ambos tengan.
                            const newTechnique = techniques?.data.find((row) => row.id === Number(value));
                            const newModes = availablePricingModes(product, newTechnique);
                            if (!newModes.includes(pricingMode)) {
                              setValue(`items.${index}.pricing_mode`, newModes[0] ?? 'custom');
                            }
                          }}
                          options={(techniques?.data ?? []).map((row) => ({ value: String(row.id), label: row.name }))}
                        />
                        <QuickCreateTechniqueDialog
                          companyId={resolvedCompanyId}
                          onCreated={(id) => setValue(`items.${index}.technique_id`, id, { shouldValidate: true })}
                        />
                      </div>
                      {errors.items?.[index] && 'technique_id' in errors.items[index]! && (
                        <p className="text-[11px] text-destructive">
                          {(errors.items[index] as { technique_id?: { message?: string } }).technique_id?.message}
                        </p>
                      )}
                    </div>

                    <div className="col-span-10 text-sm font-semibold text-primary sm:col-span-2">S/ {(price?.total ?? 0).toFixed(2)}</div>

                    <div className="col-span-2 flex justify-end sm:col-span-1 sm:block">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-full space-y-1 sm:w-48">
                      <Label className="text-xs">Modo de precio</Label>
                      <Select
                        value={pricingMode}
                        onValueChange={(value) => setValue(`items.${index}.pricing_mode`, value as QuotationItemPricingMode)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {modes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              {QUOTATION_ITEM_PRICING_MODE_LABEL[mode]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {errors.items?.[index] && 'quantity' in errors.items[index]! && (
                        <p className="text-[11px] text-destructive">{(errors.items[index] as any).quantity?.message}</p>
                      )}
                    </div>
                    {pricingMode === 'custom' && (
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Precio producto (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.custom_price`, { setValueAs: toOptionalNumber })}
                        />
                        {errors.items?.[index] && 'custom_price' in errors.items[index]! && (
                          <p className="text-[11px] text-destructive">
                            {(errors.items[index] as any).custom_price?.message}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Personalizado también lleva un precio propio de la
                        técnica (pedido explícito del usuario: "cuando se le
                        da personalizado debe darte para colocar el precio
                        del producto y de la técnica"). */}
                    {pricingMode === 'custom' && usesTechnique && technique && (
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Precio técnica (S/)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={technique.price_unit != null ? Number(technique.price_unit).toFixed(2) : '0.00'}
                          {...register(`items.${index}.custom_technique_price`, { setValueAs: toOptionalNumber })}
                        />
                        {errors.items?.[index] && 'custom_technique_price' in errors.items[index]! && (
                          <p className="text-[11px] text-destructive">
                            {(errors.items[index] as any).custom_technique_price?.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Desglose visible: de dónde sale el total del item. */}
                  {price && (
                    <p className="text-xs text-muted-foreground" data-testid={`item-price-breakdown-${index}`}>
                      {technique === null
                        ? `Producto S/ ${price.productPrice.toFixed(2)} c/u`
                        : `Producto S/ ${price.productPrice.toFixed(2)} + técnica S/ ${price.techniquePrice.toFixed(2)} = S/ ${price.unitPrice.toFixed(2)} c/u`}{' '}
                      × {item?.quantity} = S/ {price.total.toFixed(2)}
                    </p>
                  )}
                  </div>
                );
              })}
            </div>
            {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch('includes_delivery') ?? false}
                onCheckedChange={(checked) => setValue('includes_delivery', checked === true)}
              />
              Incluye delivery
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch('includes_design') ?? false}
                onCheckedChange={(checked) => setValue('includes_design', checked === true)}
              />
              Incluye diseño
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={watch('includes_igv') ?? false}
                onCheckedChange={(checked) => setValue('includes_igv', checked === true)}
              />
              Incluye IGV ({(igvRate * 100).toFixed(0)}%)
            </label>
          </div>

          <div className="space-y-1 rounded-lg bg-muted/50 px-4 py-2.5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>S/ {subtotal.toFixed(2)}</span>
            </div>
            {includesIgv && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>IGV ({(igvRate * 100).toFixed(0)}%)</span>
                <span>S/ {igvAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold">S/ {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="production_days">Días hábiles de producción (opcional)</Label>
            <Input
              id="production_days"
              type="number"
              min={1}
              max={365}
              className="max-w-40"
              {...register('production_days', { setValueAs: toOptionalNumber })}
            />
            {errors.production_days && (
              <p className="text-sm text-destructive">{errors.production_days.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
            <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Creando...' : 'Crear cotización'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
