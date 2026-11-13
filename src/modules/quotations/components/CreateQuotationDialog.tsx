import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { MinOrderNotice } from '@/modules/quotations/components/MinOrderNotice';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useClients } from '@/modules/clients/hooks/useClients';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useProducts } from '@/modules/products/hooks/useProducts';
import type { CustomizationTechnique, Product } from '@/modules/products/types/product.types';
import { useTechniques } from '@/modules/products/hooks/useTechniques';
import { ClientFormDialog } from '@/modules/clients/components/ClientFormDialog';
import { ProductStockLine } from '@/modules/supplierStock/components/ProductStockLine';
import { useProductStockLookup } from '@/modules/supplierStock/hooks/useSupplierStock';
import { ProductFormDialog } from '@/modules/products/components/ProductFormDialog';
import { TechniqueFormDialog } from '@/modules/products/components/TechniqueFormDialog';
import { useCompleteQuotation, useCreateQuotation } from '@/modules/quotations/hooks/useQuotations';
import { createQuotationSchema, type CreateQuotationFormValues } from '@/modules/quotations/schemas/quotation.schema';
import {
  QUOTATION_ITEM_PRICING_MODE_LABEL,
  type QuotationDetail,
  type QuotationItemPricingMode,
} from '@/modules/quotations/types/quotation.types';
import {
  allocateIgvByLine,
  computeQuotationIgv,
  roundMoney,
  type LineIgvAmounts,
} from '@/modules/quotations/utils/quotationAmounts';
import { itemCodeForColor, itemColorOptions } from '@/modules/quotations/utils/itemVariant';
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
import { useDebouncedValue } from '@/presentation/hooks/shared/useDebouncedValue';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { cn } from '@/lib/utils';
import type { ApiClientError } from '@/config/api.types';
import { toOptionalNumber, DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';

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

// Montos de un ítem: subtotal, IGV y lo que se cobra por ese ítem. El IGV del
// ítem es su parte del IGV de toda la cotización (allocateIgvByLine), el
// mismo reparto que usan el detalle y el PDF: los ítems suman exactamente el
// "Total a pagar". Antes cada ítem redondeaba su propio IGV y en ~9% de las
// cotizaciones no coincidía con el PDF.
function ItemAmounts({
  amounts,
  igvRate,
  includesIgv,
  index,
}: {
  amounts: LineIgvAmounts;
  igvRate: number;
  includesIgv: boolean;
  index: number;
}) {
  const { subtotal, igv, total } = amounts;

  // En el celular: Subtotal e IGV en una fila y el total del ítem debajo, a lo
  // ancho (con montos de 5 cifras, tres columnas de ~100 px se apretaban).
  return (
    <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs sm:grid-cols-3">
      <div className="min-w-0">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-mono-nums text-sm" data-testid={`item-subtotal-${index}`}>
          S/ {subtotal.toFixed(2)}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-muted-foreground">IGV ({(igvRate * 100).toFixed(0)}%)</dt>
        <dd
          className={cn('font-mono-nums text-sm', !includesIgv && 'text-muted-foreground')}
          data-testid={`item-igv-${index}`}
        >
          {includesIgv ? `S/ ${igv.toFixed(2)}` : 'No incluido'}
        </dd>
      </div>
      <div className="col-span-2 flex min-w-0 items-baseline justify-between border-t pt-1.5 sm:col-span-1 sm:block sm:border-t-0 sm:pt-0 sm:text-right">
        <dt className="font-medium">Total del ítem</dt>
        <dd className="font-mono-nums text-base font-semibold text-primary" data-testid={`item-total-${index}`}>
          S/ {total.toFixed(2)}
        </dd>
      </div>
    </dl>
  );
}

interface CreateQuotationDialogProps {
  // Trigger opcional (CLAUDE.md sección 12: prop opcional con default que
  // preserva el comportamiento anterior) — permite reusar el mismo diálogo
  // detrás de un disparador distinto (ej. el botón flotante global en
  // Shell.tsx) sin duplicar todo el formulario en otro componente.
  trigger?: ReactNode;
  // Modo "completar" (opcional, sin él el diálogo crea como siempre): la
  // cotización llegó desde la web en "Pendiente de cotizar" y el equipo
  // completa técnica, modo de precio y productos faltantes con este MISMO
  // formulario (mismo cálculo de precios). Cliente, empresa y tienda quedan
  // fijos; al guardar se reemplazan sus items (PUT /quotation/:id/items).
  completeQuotation?: QuotationDetail;
}

const EMPTY_ITEM = { product_id: undefined, technique_id: undefined, pricing_mode: 'unit', quantity: 1 } as const;

// Al completar, los productos/técnicas que ya tiene la cotización se suman a
// las opciones aunque no estén entre los que trae el selector (carga hasta
// 100 activos): si no, el item mostraba el id en vez del nombre y no ofrecía
// las tarifas del producto.
// Texto secundario de un producto en el buscador: el código que coincidió con
// lo escrito o, si no, su SKU (así se ve por qué apareció).
// Código de proveedor del producto que coincide con lo buscado (si hay).
function matchedProductCode(product: Product | undefined, search: string) {
  const term = search.trim().toLowerCase();
  return term ? product?.codes?.find((code) => code.code.toLowerCase().includes(term)) : undefined;
}

function productHint(product: Product, search: string): string | undefined {
  const matchedCode = matchedProductCode(product, search);
  if (matchedCode) return `Código ${matchedCode.code}`;
  return product.sku ? `SKU ${product.sku}` : undefined;
}

function mergeById<T extends { id: number }>(rows: T[], extra: T[]): T[] {
  const known = new Set(rows.map((row) => row.id));
  return [...rows, ...extra.filter((row) => !known.has(row.id))];
}

// description/created_at no vienen en el detalle y el formulario no los usa.
function quotationProducts(quotation: QuotationDetail | undefined): Product[] {
  return (quotation?.items ?? []).flatMap((item) =>
    item.product ? [{ ...item.product, description: null, created_at: '' }] : [],
  );
}

function quotationTechniques(quotation: QuotationDetail | undefined): CustomizationTechnique[] {
  return (quotation?.items ?? []).flatMap((item) =>
    item.technique ? [{ ...item.technique, description: null, created_at: '' }] : [],
  );
}

// Precio pactado de un item que ya existe: se conserva mientras no cambien
// producto, técnica ni modo (misma regla que keepsAgreedPrice en el backend).
// Un precio "personalizado" va siempre por su propio campo.
function agreedUnitPrice(
  quotation: QuotationDetail | undefined,
  item: CreateQuotationFormValues['items'][number] | undefined,
): number | null {
  const stored = quotation?.items.find((row) => row.id === item?.item_id);
  if (!stored || !item || item.pricing_mode === 'custom') return null;
  const isSameLine =
    stored.product_id === item.product_id &&
    (stored.technique_id ?? undefined) === (item.technique_id ?? undefined) &&
    stored.pricing_mode === item.pricing_mode;
  return isSameLine ? Number(stored.unit_price) : null;
}

// Valores iniciales del formulario a partir de la cotización a completar.
// Un item "personalizado" guarda solo el precio final por unidad: se carga
// todo como precio del producto (la técnica en 0) para no cambiar el monto.
function toCompleteFormValues(quotation: QuotationDetail): CreateQuotationFormValues {
  return {
    company_id: quotation.company_id,
    client_id: quotation.client_id,
    business_unit_id: quotation.business_unit_id ?? undefined,
    notes: quotation.notes ?? undefined,
    includes_delivery: quotation.includes_delivery,
    includes_design: quotation.includes_design,
    includes_igv: quotation.includes_igv,
    billing_enabled: Boolean(quotation.billing_name),
    billing_name: quotation.billing_name ?? undefined,
    billing_document_number: quotation.billing_document_number ?? undefined,
    production_days: quotation.production_days ?? undefined,
    items:
      quotation.items.length > 0
        ? quotation.items.map((item) => ({
            item_id: item.id,
            product_id: item.product_id,
            technique_id: item.technique_id ?? undefined,
            product_code: item.product_code ?? undefined,
            color: item.color ?? undefined,
            quantity: item.quantity,
            pricing_mode: item.pricing_mode,
            custom_price: item.pricing_mode === 'custom' ? Number(item.unit_price) : undefined,
            custom_technique_price: item.pricing_mode === 'custom' && item.technique_id ? 0 : undefined,
          }))
        : // Pedido sin ningún producto existente (todos los SKU faltaban).
          [{ ...EMPTY_ITEM, product_id: undefined as unknown as number }],
  };
}

// "+" al lado de Cliente, Producto y Técnica: abre el mismo formulario del
// módulo correspondiente, sin salir de la cotización.
const quickAddTrigger = (title: string) => (
  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title={title} aria-label={title}>
    <Plus className="size-4" />
  </Button>
);

export function CreateQuotationDialog({ trigger, completeQuotation }: CreateQuotationDialogProps = {}) {
  const isCompleting = Boolean(completeQuotation);
  // Un pedido de la web se "completa"; cualquier otra cotización se edita. Es
  // el mismo formulario y el mismo guardado.
  const isEditing = isCompleting && completeQuotation?.status !== 'quote_requested';
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  // Solo quien administra tiendas (módulo "platform", ej. Administrador)
  // puede listar business units — un Gestor tiene su tienda fija server-side
  // y nunca la elige acá, así que pedirla igual solo generaba un 403 de fondo
  // cada vez que se abría este diálogo (es global: botón flotante siempre visible).
  const canPickBusinessUnit = !isSystem && Boolean(access?.modules.includes('platform'));
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canPickBusinessUnit });
  // Tienda: si el usuario tiene tienda propia y no puede ver las demás, el
  // backend fuerza esa tienda aunque se elija otra (resolveBusinessUnitFilter).
  // Antes salía un selector vacío que se ignoraba; ahora se muestra fija. Si
  // sí puede elegir, arranca preseleccionada su propia tienda.
  const canViewAllStores =
    Boolean(access?.isSystem) || Boolean(access?.buttons.includes('roles_access.viewAllBusinessUnits.button'));
  const fixedStoreName = access?.businessUnitId && !canViewAllStores ? access.businessUnitName : null;
  const defaultStoreId = access?.businessUnitId ?? undefined;
  const { mutate: create, isPending: isCreating, error: createError } = useCreateQuotation();
  const {
    mutate: complete,
    isPending: isCompletingRequest,
    error: completeError,
  } = useCompleteQuotation(completeQuotation?.id ?? 0);
  const isPending = isCreating || isCompletingRequest;
  const error = isCompleting ? completeError : createError;
  // Los "+" de creación rápida aparecen solo si el rol puede crear eso. Antes
  // un Gestor veía el "+" de producto y al guardar recibía "no tiene
  // permisos": el Gestor no administra el catálogo (CLAUDE.md sección 11.1),
  // salvo que el Super Administrador se lo otorgue en Roles y accesos.
  const canQuickCreateClientPermission = usePermissionButton('cliente.create.button');
  const canQuickCreateProductPermission = usePermissionButton('producto.create.button');
  const canQuickCreateTechniquePermission = usePermissionButton('producto.technique.create.button');

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateQuotationFormValues>({
    resolver: zodResolver(createQuotationSchema),
    // IGV activo por defecto (pedido explícito del usuario); se puede quitar.
    defaultValues: { includes_igv: true, items: [{ product_id: undefined, technique_id: undefined, pricing_mode: 'unit', quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const includesIgv = watch('includes_igv');

  const resolvedCompanyId = (isSystem ? watch('company_id') : access?.companyId) ?? undefined;
  // Stock de proveedores (Sprint 2, ítem 6): una sola consulta para todos los
  // productos del formulario. El Super Administrador consulta la empresa
  // elegida (si no la tiene habilitada, responde 403 y no se muestra nada).
  const hasSupplierStock = Boolean(access?.features?.includes('supplier_stock')) || (isSystem && Boolean(resolvedCompanyId));
  const stockProductIds = [...new Set((watchedItems ?? []).map((row) => Number(row?.product_id)).filter((id) => id > 0))];
  const { data: supplierStock } = useProductStockLookup(stockProductIds, {
    enabled: hasSupplierStock && open,
    companyId: isSystem ? resolvedCompanyId : undefined,
  });

  // Super Administrador: primero la empresa, y recién ahí sus clientes,
  // productos, técnicas y tiendas — nunca los de todas las empresas
  // mezclados (pedido explícito del usuario). Un usuario de empresa siempre
  // ve los suyos (el backend lo fuerza). Nunca se ofrecen inactivos: cotizar
  // contra uno deshabilitado no tiene sentido.
  const listCompanyId = isSystem ? resolvedCompanyId : undefined;
  const listsEnabled = !isSystem || Boolean(resolvedCompanyId);
  const { data: clients } = useClients(
    { page: 1, limit: 100, status: 'active', companyId: listCompanyId },
    { enabled: listsEnabled },
  );
  // Buscador de productos en el SERVIDOR (pedido explícito del usuario: buscar
  // también por código o SKU). Antes se cargaban los primeros 100 y se
  // filtraba solo por nombre: un producto fuera de esos 100 no aparecía.
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch.trim(), 300);
  const { data: products, isFetching: isSearchingProducts } = useProducts(
    { page: 1, limit: 100, status: 'active', companyId: listCompanyId, searchTerm: debouncedProductSearch || undefined },
    { enabled: listsEnabled },
  );
  // Todo producto que ya trajo alguna búsqueda queda guardado: uno ya elegido
  // (o recién creado con "+") sigue disponible para calcular su precio aunque
  // la búsqueda actual ya no lo traiga. Es solo una caché de lectura.
  const seenProducts = useRef(new Map<number, Product>());
  const { data: techniques } = useTechniques(
    { page: 1, limit: 100, status: 'active', companyId: listCompanyId },
    { enabled: listsEnabled },
  );
  // keepPreviousData: al cambiar de empresa, que no asome ni un instante lo
  // de la empresa anterior.
  const ofSelectedCompany = <T extends { company_id: number }>(rows: T[] | undefined): T[] =>
    (rows ?? []).filter((row) => !isSystem || row.company_id === resolvedCompanyId);
  const companyClients = ofSelectedCompany(clients?.data);
  const productResults = ofSelectedCompany(products?.data);
  for (const row of productResults) seenProducts.current.set(row.id, row);
  const companyProducts = mergeById(
    mergeById(productResults, quotationProducts(completeQuotation)),
    ofSelectedCompany([...seenProducts.current.values()]),
  );
  const productOptions = productResults.map((row) => ({
    value: String(row.id),
    label: row.name,
    hint: productHint(row, debouncedProductSearch),
  }));
  const companyTechniques = mergeById(ofSelectedCompany(techniques?.data), quotationTechniques(completeQuotation));

  // Los "+" de creación rápida: solo si el rol puede crear eso y, para el
  // Super Administrador, una vez elegida la empresa (se crea en esa).
  const canQuickCreateClient = canQuickCreateClientPermission && listsEnabled;
  const canQuickCreateProduct = canQuickCreateProductPermission && listsEnabled;
  const canQuickCreateTechnique = canQuickCreateTechniquePermission && listsEnabled;

  const handleCompanyChange = (companyId: number) => {
    const current = getValues();
    // Todo lo elegido antes (cliente, tienda, productos, técnicas) era de
    // otra empresa: se descarta, se conservan cantidades/modos/notas.
    reset({
      ...current,
      company_id: companyId,
      client_id: undefined,
      business_unit_id: undefined,
      items: current.items.map((item) => ({
        ...item,
        product_id: undefined,
        technique_id: undefined,
        product_code: undefined,
        color: undefined,
      })),
    });
  };

  // Precio de cada ítem (null mientras le falte algún dato).
  const itemPrices = watchedItems.map((item) => {
    const product = companyProducts.find((row) => row.id === item.product_id);
    const technique = effectiveTechnique(product, companyTechniques.find((row) => row.id === item.technique_id));
    const agreedPrice = agreedUnitPrice(completeQuotation, item);
    if (agreedPrice != null && item.quantity) {
      return { productPrice: agreedPrice, techniquePrice: 0, unitPrice: agreedPrice, total: roundMoney(agreedPrice * item.quantity) };
    }
    return computeItemPrice(product, technique, item.quantity, item.pricing_mode, item.custom_price, item.custom_technique_price);
  });
  const subtotal = roundMoney(itemPrices.reduce((sum, price) => sum + (price?.total ?? 0), 0));
  // Viene de "Variables Generales" (categoría "tax_config"), ya no es un
  // 18% hardcodeado — el backend recalcula con el mismo valor real al
  // guardar (ver access.service.ts -> getIgvRate).
  const igvRate = access?.igvRate ?? 0.18;
  // Mismo cálculo que el backend al guardar (IGV redondeado una vez sobre el
  // subtotal): antes este resumen redondeaba distinto y en ~5% de las
  // cotizaciones el "Total a pagar" difería en un céntimo del PDF.
  const igvAmount = computeQuotationIgv(subtotal, Boolean(includesIgv), igvRate);
  const grandTotal = roundMoney(subtotal + igvAmount);
  const itemAmounts = allocateIgvByLine(
    itemPrices.map((price) => ({ subtotal: price?.total ?? 0 })),
    igvAmount,
  ).map(({ amounts }) => amounts);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Al abrir en modo "completar", el formulario arranca con lo que ya
    // tiene la cotización (lo que eligió el cliente en la web).
    if (next && completeQuotation) reset(toCompleteFormValues(completeQuotation));
    if (!next) reset({ includes_igv: true, items: [{ product_id: undefined, technique_id: undefined, pricing_mode: 'unit', quantity: 1 }] });
  };

  const requiresCustomization = (productId: number | undefined) =>
    Boolean(companyProducts.find((row) => row.id === productId)?.requires_customization);

  const onSubmit = (values: CreateQuotationFormValues) => {
    const companyId = isSystem ? values.company_id : access?.companyId;
    if (!companyId) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }

    // La técnica es obligatoria solo en productos que se personalizan.
    const missingTechnique = values.items.findIndex(
      (item) => requiresCustomization(item.product_id) && !item.technique_id,
    );
    if (missingTechnique >= 0) {
      setError(`items.${missingTechnique}.technique_id`, { message: 'Selecciona una técnica de personalización' });
      return;
    }

    const items = values.items.map((item) => ({
      id: item.item_id ?? null,
      product_id: item.product_id,
      technique_id: requiresCustomization(item.product_id) ? item.technique_id : null,
      product_code: item.product_code ?? null,
      color: item.color ?? null,
      pricing_mode: item.pricing_mode,
      quantity: item.quantity,
      custom_price: item.pricing_mode === 'custom' ? item.custom_price : undefined,
      custom_technique_price: item.pricing_mode === 'custom' ? item.custom_technique_price : undefined,
    }));
    const details = {
      notes: values.notes,
      // Al completar, desmarcar "otra persona" debe borrar lo que hubiera
      // (null); al crear, simplemente no se manda.
      billing_name: values.billing_enabled ? values.billing_name : isCompleting ? null : undefined,
      billing_document_number: values.billing_enabled ? values.billing_document_number : isCompleting ? null : undefined,
      production_days: values.production_days,
      includes_delivery: values.includes_delivery,
      includes_design: values.includes_design,
      includes_igv: values.includes_igv,
    };

    if (isCompleting) {
      complete(
        { ...details, items },
        {
          onSuccess: () => {
            toast.success(isEditing ? 'Cotización actualizada' : 'Cotización completada. Ya puedes pasarla a Pendiente.');
            handleOpenChange(false);
          },
        },
      );
      return;
    }

    create(
      {
        ...details,
        company_id: companyId,
        client_id: values.client_id,
        business_unit_id: values.business_unit_id ?? defaultStoreId,
        items,
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
          <DialogTitle>
            {completeQuotation
              ? `${isEditing ? 'Editar' : 'Completar'} cotización #${completeQuotation.id}`
              : 'Nueva cotización'}
          </DialogTitle>
        </DialogHeader>

        {/* noValidate: las reglas las valida el esquema (mensajes en español
            debajo de cada campo). Sin esto, el min={1} de Cantidad frenaba el
            envío con el aviso del navegador en inglés. */}
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Completar: el cliente (y su empresa/tienda) ya vienen del pedido
              de la web y no se cambian acá. */}
          {completeQuotation && (
            <div className="space-y-1 rounded-lg border bg-muted/40 px-3 py-2" data-testid="complete-quotation-client">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{completeQuotation.client?.name}</p>
            </div>
          )}

          {/* Super Administrador: primero Empresa y Tienda, y recién ahí sus
              clientes/productos/técnicas (ver listCompanyId). */}
          {!isCompleting && (
          <CompanyStoreFields
            companyId={watch('company_id')}
            onCompanyChange={handleCompanyChange}
            businessUnitId={watch('business_unit_id')}
            onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
            companyError={errors.company_id?.message}
          />
          )}

          {!isCompleting && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex items-center gap-1">
                <SearchableSelect
                  className="flex-1"
                  placeholder={listsEnabled ? 'Selecciona un cliente' : 'Primero elige la empresa'}
                  disabled={!listsEnabled}
                  value={watch('client_id') ? String(watch('client_id')) : undefined}
                  onChange={(value) => setValue('client_id', Number(value), { shouldValidate: true })}
                  options={companyClients.map((client) => ({ value: String(client.id), label: client.name }))}
                />
                {canQuickCreateClient && (
                  // Mismo formulario que la pantalla Clientes (Sprint 2, ítem 9),
                  // con la empresa y la tienda ya elegidas en la cotización.
                  <ClientFormDialog
                    fixedCompanyId={resolvedCompanyId}
                    fixedBusinessUnitId={watch('business_unit_id') ?? defaultStoreId}
                    idPrefix="quick-client-"
                    trigger={quickAddTrigger('Nuevo cliente')}
                    // shouldValidate: true — sin esto, el error "Selecciona un
                    // cliente" (si ya se había mostrado) se quedaba pegado en
                    // pantalla aunque el cliente recién creado sí quedara
                    // guardado en el formulario (bug reportado por el usuario:
                    // "creé un usuario desde la cotización y siempre salió el
                    // mensaje de debe seleccionar un cliente").
                    onCreated={(client) => setValue('client_id', client.id, { shouldValidate: true })}
                  />
                )}
              </div>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            {isSystem ? null : fixedStoreName ? (
              <div className="space-y-2">
                <Label>Tienda</Label>
                <p
                  className="flex h-9 items-center rounded-md border bg-muted/60 px-3 text-sm"
                  data-testid="quotation-fixed-store"
                >
                  {fixedStoreName}
                </p>
              </div>
            ) : (
              // La empresa nunca se elige (siempre es la propia, forzada
              // server-side) — solo la tienda, y solo si hay más de una.
              businessUnits && businessUnits.data.length > 1 && (
                <div className="space-y-2">
                  <Label>Tienda</Label>
                  <Select
                    value={
                      watch('business_unit_id')
                        ? String(watch('business_unit_id'))
                        : defaultStoreId
                          ? String(defaultStoreId)
                          : undefined
                    }
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
          )}

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

            <div className="space-y-3">
              {fields.map((field, index) => {
                const item = watchedItems[index];
                const product = companyProducts.find((row) => row.id === item?.product_id);
                const usesTechnique = !product || product.requires_customization;
                const technique = effectiveTechnique(
                  product,
                  companyTechniques.find((row) => row.id === item?.technique_id),
                );
                const pricingMode = item?.pricing_mode ?? 'unit';
                const price = itemPrices[index] ?? null;
                const amounts = itemAmounts[index];
                const modes = availablePricingModes(product, technique);
                const colorOptions = itemColorOptions(product, item?.color);
                const agreedPrice = agreedUnitPrice(completeQuotation, item);

                return (
                  <div key={field.id} className="space-y-2 rounded-lg border bg-card p-3">
                  {/* Encabezado del ítem: número y botón de quitar (en el
                      celular ya no ocupa una fila propia). */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Ítem {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={fields.length === 1}
                      onClick={() => remove(index)}
                      aria-label={`Quitar ítem ${index + 1}`}
                      title="Quitar ítem"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-12 items-start gap-2">
                    <div className="col-span-12 min-w-0 space-y-1 sm:col-span-6">
                      <Label className="text-xs">Producto</Label>
                      <div className="flex items-center gap-1">
                        <SearchableSelect
                          className="flex-1"
                          placeholder="Producto"
                          value={item?.product_id ? String(item.product_id) : undefined}
                          onChange={(value) => {
                            setValue(`items.${index}.product_id`, Number(value), { shouldValidate: true });
                            // El color y el código eran del producto anterior.
                            setValue(`items.${index}.color`, undefined);
                            setValue(`items.${index}.product_code`, undefined);
                            // El modo elegido de un producto anterior puede no
                            // existir en el nuevo (ej. tenía "por millar" y el
                            // nuevo no) — vuelve a "por unidad" si eso pasa, o
                            // se queda como "personalizado" si ya estaba así.
                            const newProduct = companyProducts.find((row) => row.id === Number(value));
                            // Un producto sin personalización no lleva técnica:
                            // se descarta la que hubiera quedado elegida.
                            if (newProduct && !newProduct.requires_customization) {
                              setValue(`items.${index}.technique_id`, undefined);
                            }
                            // Buscado por un código de proveedor: cada código es de un
                            // color, así que ese código y su color quedan elegidos.
                            const searchedCode = matchedProductCode(newProduct, debouncedProductSearch);
                            if (searchedCode) {
                              setValue(`items.${index}.color`, searchedCode.color ?? undefined);
                              setValue(`items.${index}.product_code`, searchedCode.code);
                            }
                            const newTechnique = effectiveTechnique(
                              newProduct,
                              companyTechniques.find((row) => row.id === item?.technique_id),
                            );
                            const newModes = availablePricingModes(newProduct, newTechnique);
                            if (!newModes.includes(pricingMode)) {
                              setValue(`items.${index}.pricing_mode`, newModes[0] ?? 'custom');
                            }
                          }}
                          options={productOptions}
                          serverSearch
                          onSearchChange={setProductSearch}
                          isSearching={isSearchingProducts}
                          selectedLabel={companyProducts.find((row) => row.id === item?.product_id)?.name}
                          emptyText="No hay productos con ese nombre, SKU o código"
                        />
                        {canQuickCreateProduct && (
                          // Mismo formulario que la pantalla Productos (ítem 9).
                          <ProductFormDialog
                            fixedCompanyId={resolvedCompanyId}
                            idPrefix="quick-product-"
                            trigger={quickAddTrigger('Nuevo producto')}
                            onCreated={(product) => {
                              setValue(`items.${index}.product_id`, product.id, { shouldValidate: true });
                              setValue(`items.${index}.color`, undefined);
                              setValue(`items.${index}.product_code`, undefined);
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="col-span-12 min-w-0 space-y-1 sm:col-span-6">
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
                            const newTechnique = companyTechniques.find((row) => row.id === Number(value));
                            const newModes = availablePricingModes(product, newTechnique);
                            if (!newModes.includes(pricingMode)) {
                              setValue(`items.${index}.pricing_mode`, newModes[0] ?? 'custom');
                            }
                          }}
                          options={companyTechniques.map((row) => ({ value: String(row.id), label: row.name }))}
                        />
                        {canQuickCreateTechnique && (
                          // Mismo formulario que la pestaña Técnicas de Productos (ítem 9).
                          <TechniqueFormDialog
                            fixedCompanyId={resolvedCompanyId}
                            idPrefix="quick-"
                            trigger={quickAddTrigger('Nueva técnica')}
                            onCreated={(technique) => setValue(`items.${index}.technique_id`, technique.id, { shouldValidate: true })}
                          />
                        )}
                      </div>
                      {errors.items?.[index] && 'technique_id' in errors.items[index]! && (
                        <p className="text-[11px] text-destructive">
                          {(errors.items[index] as { technique_id?: { message?: string } }).technique_id?.message}
                        </p>
                      )}
                    </div>

                  </div>

                  <div className="flex flex-wrap items-start gap-2">
                    {colorOptions.length > 0 && (
                      <div className="w-full space-y-1 sm:w-48">
                        <Label className="text-xs">Color</Label>
                        <SearchableSelect
                          placeholder="Sin color"
                          value={item?.color}
                          onChange={(value) => {
                            setValue(`items.${index}.color`, value);
                            setValue(`items.${index}.product_code`, itemCodeForColor(product, item?.product_code, value));
                          }}
                          onClear={() => {
                            setValue(`items.${index}.color`, undefined);
                            setValue(`items.${index}.product_code`, itemCodeForColor(product, item?.product_code, undefined));
                          }}
                          clearLabel="Sin color"
                          options={colorOptions}
                          emptyText="No se encontró ese color"
                        />
                      </div>
                    )}
                    <div className="w-full space-y-1 sm:w-48">
                      <Label className="text-xs">Modo de precio</Label>
                      {/* Sin producto elegido no hay precios: antes el campo
                          quedaba en blanco (el modo por defecto no estaba
                          entre las opciones). Ahora pide elegir el producto. */}
                      <Select
                        value={pricingMode}
                        disabled={!product}
                        onValueChange={(value) => {
                          const nextMode = value as QuotationItemPricingMode;
                          setValue(`items.${index}.pricing_mode`, nextMode);
                          if (nextMode !== 'custom') return;
                          // Al pasar a "Personalizado", los precios arrancan con
                          // los del catálogo (del modo que estaba elegido) para
                          // editarlos, en vez de quedar vacíos.
                          const fromMode = pricingMode === 'custom' ? 'unit' : pricingMode;
                          const hasCustomPrice = item?.custom_price != null && !Number.isNaN(item.custom_price);
                          const productPrice = resolveTierPrice(product, fromMode) ?? resolveTierPrice(product, 'unit');
                          if (!hasCustomPrice && productPrice != null) {
                            setValue(`items.${index}.custom_price`, productPrice);
                          }
                          if (!technique) return;
                          const hasTechniquePrice =
                            item?.custom_technique_price != null && !Number.isNaN(item.custom_technique_price);
                          const techniquePrice = resolveTierPrice(technique, fromMode) ?? resolveTierPrice(technique, 'unit');
                          if (!hasTechniquePrice && techniquePrice != null) {
                            setValue(`items.${index}.custom_technique_price`, techniquePrice);
                          }
                        }}
                      >
                        <SelectTrigger>
                          {/* Etiqueta explícita: Radix dejaba el campo en blanco
                              mientras el modo no estaba entre las opciones, y al
                              aparecer la opción (ej. tras crear el producto con
                              el "+") seguía mostrando el texto de ayuda. */}
                          <SelectValue>
                            {product ? QUOTATION_ITEM_PRICING_MODE_LABEL[pricingMode] : 'Elige un producto'}
                          </SelectValue>
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
                      <MinOrderNotice quantity={item?.quantity} minOrderQuantity={product?.min_order_quantity} />
                      {errors.items?.[index] && 'quantity' in errors.items[index]! && (
                        <p className="text-[11px] text-destructive">{(errors.items[index] as any).quantity?.message}</p>
                      )}
                    </div>
                    {pricingMode === 'custom' && (
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Precio producto (S/)</Label>
                        <Input
                          type="number"
                          step={DECIMAL_INPUT_STEP}
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
                          step={DECIMAL_INPUT_STEP}
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
                  {/* La nota con el desglose (de dónde sale el monto) queda
                      igual; debajo, los montos del ítem bien a la vista
                      (pedido explícito del usuario: "no se ve claro cuánto
                      hay que pagar ni su IGV por fila"). */}
                  {price && amounts ? (
                    <div className="space-y-2 border-t border-dashed pt-2">
                      <p className="text-xs text-muted-foreground" data-testid={`item-price-breakdown-${index}`}>
                        {agreedPrice != null
                          ? `Precio pactado S/ ${agreedPrice.toFixed(2)} c/u`
                          : technique === null
                          ? `Producto S/ ${price.productPrice.toFixed(2)} c/u`
                          : `Producto S/ ${price.productPrice.toFixed(2)} + técnica S/ ${price.techniquePrice.toFixed(2)} = S/ ${price.unitPrice.toFixed(2)} c/u`}{' '}
                        × {item?.quantity} = S/ {price.total.toFixed(2)}
                      </p>
                      <ItemAmounts amounts={amounts} igvRate={igvRate} includesIgv={Boolean(includesIgv)} index={index} />
                      <ProductStockLine
                        stock={supplierStock?.find((entry) => entry.productId === Number(item?.product_id))}
                        quantity={Number(item?.quantity) || 0}
                        color={item?.color}
                      />
                    </div>
                  ) : (
                    <p className="border-t border-dashed pt-2 text-xs text-muted-foreground">
                      Elige el producto{usesTechnique ? ', la técnica' : ''} y la cantidad para ver el monto de este ítem.
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

          {/* Resumen: lo que el cliente paga por toda la cotización. El IGV
              se muestra siempre, aunque no se incluya, para que quede claro. */}
          <dl className="space-y-1.5 rounded-lg border bg-muted/40 px-4 py-3 text-sm" data-testid="quotation-totals">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Subtotal{fields.length > 1 ? ` (${fields.length} ítems)` : ''}</dt>
              <dd className="font-mono-nums">S/ {subtotal.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">IGV ({(igvRate * 100).toFixed(0)}%)</dt>
              <dd className={cn('font-mono-nums', !includesIgv && 'text-muted-foreground')}>
                {includesIgv ? `S/ ${igvAmount.toFixed(2)}` : 'No incluido'}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t pt-2">
              <dt className="font-semibold">Total a pagar</dt>
              <dd className="font-mono-nums text-xl font-semibold text-primary">S/ {grandTotal.toFixed(2)}</dd>
            </div>
          </dl>

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
              {isCompleting
                ? isPending
                  ? 'Guardando...'
                  : 'Guardar cotización'
                : isPending
                  ? 'Creando...'
                  : 'Crear cotización'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
