import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiClientError } from '@/config/api.types';
import { useCarriers, useCreateGuide, useDrivers, useGuide, useGuidePrefill, useUpdateGuide, useVehicles } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import {
  DISPATCH_EXCEEDS_PENDING_CODE,
  GUIDE_REASONS,
  IDENTITY_DOC_TYPES,
  RELATED_DOC_TYPES,
  type Guide,
  type GuidePrefill,
  type SaveGuideDto,
} from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { DateField } from '@/presentation/components/shared/DateField';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const optionalText = z.string().optional();
// Un borrador puede quedar incompleto: lo que SUNAT exige se revisa al registrar.
const guideFormSchema = z.object({
  company_id: z.number().int().positive().optional(),
  reason_code: z.string().min(1, 'Elige el motivo'),
  reason_note: optionalText,
  transfer_start_date: optionalText,
  transport_mode: z.enum(['private', 'public']),
  light_vehicle: z.boolean(),
  gross_weight_kg: optionalText,
  packages: optionalText,
  origin_address: optionalText,
  origin_ubigeo: z.string().regex(/^(\d{6})?$/, 'El ubigeo tiene 6 dígitos').optional(),
  origin_establishment_code: z.string().regex(/^(\d{4})?$/, '4 dígitos').optional(),
  destination_address: optionalText,
  destination_ubigeo: z.string().regex(/^(\d{6})?$/, 'El ubigeo tiene 6 dígitos').optional(),
  destination_establishment_code: z.string().regex(/^(\d{4})?$/, '4 dígitos').optional(),
  recipient_doc_type: optionalText,
  recipient_doc_number: optionalText,
  recipient_name: optionalText,
  carrier_supplier_id: z.number().int().positive().nullable(),
  vehicle_id: z.number().int().positive().nullable(),
  driver_id: z.number().int().positive().nullable(),
  notes: optionalText,
  lines: z
    .array(
      z.object({
        product_id: z.number().nullable(),
        quotation_item_id: z.number().nullable(),
        product_code: z.string().nullable(),
        color: z.string().nullable(),
        description: z.string().trim().min(1, 'Describe el bien'),
        quantity: z.number({ message: 'Cantidad' }).positive('Mayor a 0'),
        unit_code: z.string(),
        pending: z.number().nullable(),
      }),
    )
    .min(1, 'La guía lleva al menos un bien'),
  related_documents: z.array(
    z.object({
      doc_type: z.string().min(1),
      series_number: z.string().trim().regex(/^[A-Za-z0-9]{1,4}-\d{1,10}$/, 'Serie-número, ej. F001-123'),
    }),
  ),
});
type GuideFormValues = z.infer<typeof guideFormSchema>;

type Source = { quotationId?: number; transferId?: number };

interface GuideFormDialogProps {
  // Editar un borrador, o armar uno nuevo desde una cotización/transferencia (o de cero).
  guideId?: number;
  source?: Source;
  onClose: () => void;
  onSaved?: (guide: Guide) => void;
}

const text = (value: string | null | undefined) => value ?? '';
const numberText = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
const orNull = (value: string | undefined) => (value?.trim() ? value.trim() : null);

const valuesFrom = (data: Guide | GuidePrefill): GuideFormValues => ({
  reason_code: data.reason_code,
  reason_note: text(data.reason_note),
  transfer_start_date: text(data.transfer_start_date),
  transport_mode: data.transport_mode,
  light_vehicle: Boolean(data.light_vehicle),
  gross_weight_kg: numberText(data.gross_weight_kg),
  packages: numberText(data.packages),
  origin_address: text(data.origin_address),
  origin_ubigeo: text(data.origin_ubigeo),
  origin_establishment_code: text(data.origin_establishment_code),
  destination_address: text(data.destination_address),
  destination_ubigeo: text(data.destination_ubigeo),
  destination_establishment_code: text(data.destination_establishment_code),
  recipient_doc_type: text(data.recipient_doc_type),
  recipient_doc_number: text(data.recipient_doc_number),
  recipient_name: text(data.recipient_name),
  carrier_supplier_id: data.carrier_supplier_id ?? null,
  vehicle_id: 'vehicles' in data ? (data.vehicles[0]?.vehicle_id ?? null) : null,
  driver_id: 'drivers' in data ? (data.drivers[0]?.driver_id ?? null) : null,
  notes: text(data.notes),
  lines: data.lines.map((line) => ({
    product_id: line.product_id ?? null,
    quotation_item_id: line.quotation_item_id ?? null,
    product_code: line.product_code ?? null,
    color: line.color ?? null,
    description: line.description,
    quantity: Number(line.quantity),
    unit_code: line.unit_code ?? 'NIU',
    pending: 'pending' in line && typeof line.pending === 'number' ? line.pending : null,
  })),
  related_documents: 'related_documents' in data && data.related_documents ? data.related_documents.map((doc) => ({ doc_type: doc.doc_type, series_number: doc.series_number })) : [],
});

const EMPTY_VALUES: GuideFormValues = {
  reason_code: '01',
  reason_note: '',
  transfer_start_date: '',
  transport_mode: 'private',
  light_vehicle: false,
  gross_weight_kg: '',
  packages: '',
  origin_address: '',
  origin_ubigeo: '',
  origin_establishment_code: '',
  destination_address: '',
  destination_ubigeo: '',
  destination_establishment_code: '',
  recipient_doc_type: '6',
  recipient_doc_number: '',
  recipient_name: '',
  carrier_supplier_id: null,
  vehicle_id: null,
  driver_id: null,
  notes: '',
  lines: [{ product_id: null, quotation_item_id: null, product_code: null, color: null, description: '', quantity: 1, unit_code: 'NIU', pending: null }],
  related_documents: [],
};

/**
 * Formulario de la guía de remisión (Sprint 2, ítem 1, modo manual). Carga lo
 * que corresponde (el borrador, o la precarga de la cotización/transferencia)
 * y recién ahí monta el formulario, así los valores iniciales llegan completos.
 */
export function GuideFormDialog({ guideId, source, onClose, onSaved }: GuideFormDialogProps) {
  const guide = useGuide(guideId ?? null);
  const prefill = useGuidePrefill(!guideId && source && (source.quotationId || source.transferId) ? source : null);
  const loading = (guideId !== undefined && guide.isLoading) || prefill.isLoading;
  const failed = guide.error ?? prefill.error;
  const initial = guide.data ? valuesFrom(guide.data) : prefill.data ? valuesFrom(prefill.data) : EMPTY_VALUES;
  const title = guideId ? `Borrador de guía #${guideId}` : prefill.data ? `Nueva guía · ${prefill.data.source.label}` : 'Nueva guía de remisión';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" data-testid="guide-form-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Arma la guía y guárdala como borrador. Después la emites en SUNAT (SEE-SOL o App Emprender) y registras aquí su número y PDF.
          </DialogDescription>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {failed && <p className="text-sm text-destructive">{(failed as unknown as ApiClientError).message}</p>}
        {!loading && !failed && (
          <GuideForm
            initial={initial}
            guideId={guideId}
            source={source}
            prefill={prefill.data ?? null}
            companyId={guide.data?.company_id ?? prefill.data?.company_id}
            originWarehouseName={guide.data?.origin_warehouse_name ?? null}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface GuideFormProps {
  initial: GuideFormValues;
  guideId?: number;
  source?: Source;
  prefill: GuidePrefill | null;
  companyId?: number;
  originWarehouseName: string | null;
  onClose: () => void;
  onSaved?: (guide: Guide) => void;
}

function GuideForm({ initial, guideId, source, prefill, companyId, originWarehouseName, onClose, onSaved }: GuideFormProps) {
  const { data: access } = useAccess();
  const fromScratch = !guideId && !prefill;
  const [carrierSearch, setCarrierSearch] = useState('');
  const { mutate: createGuide, isPending: isCreating } = useCreateGuide();
  const { mutate: updateGuide, isPending: isUpdating } = useUpdateGuide();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<GuideFormValues>({ resolver: zodResolver(guideFormSchema), defaultValues: initial });
  const lines = useFieldArray({ control, name: 'lines' });
  const related = useFieldArray({ control, name: 'related_documents' });
  const transportMode = watch('transport_mode');
  const lightVehicle = watch('light_vehicle');
  const effectiveCompanyId = companyId ?? watch('company_id');

  const catalogParams = { page: 1, limit: 100, status: 'active', companyId: effectiveCompanyId };
  const vehicles = useVehicles(catalogParams, { enabled: transportMode === 'private' });
  const drivers = useDrivers(catalogParams, { enabled: transportMode === 'private' });
  const carriers = useCarriers(carrierSearch, effectiveCompanyId, { enabled: transportMode === 'public' });

  const toDto = (values: GuideFormValues): SaveGuideDto => ({
    company_id: fromScratch ? (values.company_id ?? null) : undefined,
    quotation_id: guideId ? undefined : (source?.quotationId ?? null),
    stock_document_id: guideId ? undefined : (source?.transferId ?? null),
    reason_code: values.reason_code,
    reason_note: orNull(values.reason_note),
    transfer_start_date: orNull(values.transfer_start_date),
    transport_mode: values.transport_mode,
    light_vehicle: values.transport_mode === 'private' && values.light_vehicle,
    gross_weight_kg: values.gross_weight_kg?.trim() ? Number(values.gross_weight_kg) : null,
    packages: values.packages?.trim() ? Number(values.packages) : null,
    origin_warehouse_id: guideId ? undefined : (prefill?.origin_warehouse_id ?? null),
    origin_address: orNull(values.origin_address),
    origin_ubigeo: orNull(values.origin_ubigeo),
    origin_establishment_code: orNull(values.origin_establishment_code),
    destination_warehouse_id: guideId ? undefined : (prefill?.destination_warehouse_id ?? null),
    destination_address: orNull(values.destination_address),
    destination_ubigeo: orNull(values.destination_ubigeo),
    destination_establishment_code: orNull(values.destination_establishment_code),
    client_id: guideId ? undefined : (prefill?.client_id ?? null),
    recipient_doc_type: orNull(values.recipient_doc_type),
    recipient_doc_number: orNull(values.recipient_doc_number),
    recipient_name: orNull(values.recipient_name),
    carrier_supplier_id: values.transport_mode === 'public' ? values.carrier_supplier_id : null,
    vehicle_ids: values.vehicle_id ? [values.vehicle_id] : [],
    driver_ids: values.driver_id ? [values.driver_id] : [],
    notes: orNull(values.notes),
    lines: values.lines.map((line) => ({
      product_id: line.product_id,
      quotation_item_id: line.quotation_item_id,
      product_code: line.product_code,
      color: line.color,
      description: line.description,
      quantity: line.quantity,
      unit_code: line.unit_code,
    })),
    related_documents: values.related_documents,
  });

  const onError = (error: unknown) => {
    const apiError = error as ApiClientError;
    toast.error(apiError.code === DISPATCH_EXCEEDS_PENDING_CODE ? 'La guía lleva más de lo que falta despachar de la cotización.' : apiError.message);
  };

  const submit = (values: GuideFormValues) => {
    if (fromScratch && access?.isSystem && !values.company_id) {
      toast.error('Elige la empresa');
      return;
    }
    const onSuccess = (saved: Guide) => {
      // Quien abrió el formulario puede dar su propio aviso (ej. desde la cotización).
      if (onSaved) onSaved(saved);
      else toast.success('Borrador de guía guardado');
      onClose();
    };
    const dto = toDto(values);
    if (guideId) {
      updateGuide({ id: guideId, dto }, { onSuccess, onError });
      return;
    }
    createGuide(dto, { onSuccess, onError });
  };

  // Etiqueta de texto debajo de un campo con su error de validación, si hay.
  const fieldError = (message: string | undefined) => (message ? <p className="text-xs text-destructive">{message}</p> : null);
  const isSaving = isCreating || isUpdating;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.stopPropagation();
        void handleSubmit(submit)(event);
      }}
      className="space-y-5"
    >
      {prefill && prefill.warnings.length > 0 && (
        <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs" data-testid="guide-warnings">
          {prefill.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <AlertTriangle className="size-3.5 shrink-0 text-warning" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      {fromScratch && access?.isSystem && (
        <CompanyStoreFields companyId={watch('company_id')} onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })} />
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        <h3 className="text-sm font-semibold sm:col-span-2">Traslado</h3>
        <div className="space-y-1 sm:col-span-2">
          <Label>Motivo</Label>
          <Select
            value={watch('reason_code')}
            disabled={prefill?.source.kind === 'transfer'}
            onValueChange={(value) => {
              if (!value) return;
              setValue('reason_code', value, { shouldValidate: true });
            }}
          >
            <SelectTrigger id="guide-reason" aria-label="Motivo del traslado">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GUIDE_REASONS).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {code} · {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {watch('reason_code') === '13' && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="guide-reason-note">Descripción del motivo</Label>
            <Input id="guide-reason-note" maxLength={255} {...register('reason_note')} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Inicio del traslado</Label>
          <DateField id="guide-start-date" value={watch('transfer_start_date') || undefined} onChange={(value) => setValue('transfer_start_date', value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="guide-weight">Peso bruto (kg)</Label>
            <Input id="guide-weight" type="number" step="0.001" min="0" {...register('gross_weight_kg')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="guide-packages">Bultos</Label>
            <Input id="guide-packages" type="number" min="1" {...register('packages')} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-[10rem_1fr_2fr]">
        <h3 className="text-sm font-semibold sm:col-span-3">Destinatario</h3>
        <div className="space-y-1">
          <Label>Documento</Label>
          <Select
            value={watch('recipient_doc_type') || undefined}
            onValueChange={(value) => {
              if (!value) return;
              setValue('recipient_doc_type', value);
            }}
          >
            <SelectTrigger id="guide-recipient-doc-type" aria-label="Tipo de documento del destinatario">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(IDENTITY_DOC_TYPES).map(([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="guide-recipient-doc">Número</Label>
          <Input id="guide-recipient-doc" maxLength={15} {...register('recipient_doc_number')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="guide-recipient-name">Nombre o razón social</Label>
          <Input id="guide-recipient-name" maxLength={200} {...register('recipient_name')} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Punto de partida{prefill?.origin_warehouse_id || originWarehouseName ? ' (almacén)' : ''}</h3>
          <Input aria-label="Dirección de partida" id="guide-origin-address" placeholder="Dirección" maxLength={255} {...register('origin_address')} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input aria-label="Ubigeo de partida" id="guide-origin-ubigeo" placeholder="Ubigeo (6 dígitos)" maxLength={6} {...register('origin_ubigeo')} />
              {fieldError(errors.origin_ubigeo?.message)}
            </div>
            <Input aria-label="Establecimiento de partida" placeholder="Cód. establecimiento" maxLength={4} {...register('origin_establishment_code')} />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Punto de llegada</h3>
          <Input aria-label="Dirección de llegada" id="guide-destination-address" placeholder="Dirección" maxLength={255} {...register('destination_address')} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Input aria-label="Ubigeo de llegada" id="guide-destination-ubigeo" placeholder="Ubigeo (6 dígitos)" maxLength={6} {...register('destination_ubigeo')} />
              {fieldError(errors.destination_ubigeo?.message)}
            </div>
            <Input aria-label="Establecimiento de llegada" placeholder="Cód. establecimiento" maxLength={4} {...register('destination_establishment_code')} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Transporte</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Modalidad de transporte">
          {(['private', 'public'] as const).map((mode) => (
            <Button key={mode} type="button" size="sm" variant={transportMode === mode ? 'default' : 'outline'} role="radio" aria-checked={transportMode === mode} onClick={() => setValue('transport_mode', mode)}>
              {mode === 'private' ? 'Privado (vehículo propio)' : 'Público (transportista)'}
            </Button>
          ))}
        </div>
        {transportMode === 'private' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={lightVehicle} onCheckedChange={(checked) => setValue('light_vehicle', checked === true)} />
              Vehículo liviano (M1 o L: auto, moto) — no se declaran placa ni conductor
            </label>
            {!lightVehicle && (
              <div className="grid gap-2 sm:grid-cols-2">
                <SearchableSelect
                  id="guide-vehicle"
                  placeholder="Vehículo (placa)"
                  value={watch('vehicle_id') ? String(watch('vehicle_id')) : undefined}
                  options={(vehicles.data?.data ?? []).map((vehicle) => ({ value: String(vehicle.id), label: vehicle.plate, hint: vehicle.description ?? undefined }))}
                  onChange={(value) => setValue('vehicle_id', Number(value))}
                  onClear={() => setValue('vehicle_id', null)}
                  clearLabel="Sin vehículo"
                  emptyText="No hay vehículos (se crean en Logística → Vehículos)"
                />
                <SearchableSelect
                  id="guide-driver"
                  placeholder="Conductor"
                  value={watch('driver_id') ? String(watch('driver_id')) : undefined}
                  options={(drivers.data?.data ?? []).map((driver) => ({ value: String(driver.id), label: `${driver.first_names} ${driver.last_names}`, hint: driver.license_number }))}
                  onChange={(value) => setValue('driver_id', Number(value))}
                  onClear={() => setValue('driver_id', null)}
                  clearLabel="Sin conductor"
                  emptyText="No hay conductores (se crean en Logística → Conductores)"
                />
              </div>
            )}
          </div>
        )}
        {transportMode === 'public' && (
          <SearchableSelect
            id="guide-carrier"
            placeholder="Transportista"
            value={watch('carrier_supplier_id') ? String(watch('carrier_supplier_id')) : undefined}
            options={(carriers.data?.data ?? []).map((carrier) => ({ value: String(carrier.id), label: carrier.name, hint: carrier.document_number ?? undefined }))}
            serverSearch
            onSearchChange={setCarrierSearch}
            isSearching={carriers.isFetching}
            onChange={(value) => setValue('carrier_supplier_id', Number(value))}
            onClear={() => setValue('carrier_supplier_id', null)}
            clearLabel="Sin transportista"
            emptyText="No hay transportistas (marca al proveedor como transportista en Proveedores)"
          />
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Bienes</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => lines.append({ product_id: null, quotation_item_id: null, product_code: null, color: null, description: '', quantity: 1, unit_code: 'NIU', pending: null })}
          >
            <Plus className="size-4" />
            Agregar bien
          </Button>
        </div>
        {errors.lines?.message && <p className="text-xs text-destructive">{errors.lines.message}</p>}
        <ul className="space-y-2" data-testid="guide-lines">
          {lines.fields.map((field, index) => (
            <li key={field.id} className="grid grid-cols-[1fr_6rem_5rem_auto] items-start gap-2 rounded-md border p-2">
              <div>
                <Input aria-label={`Descripción del bien ${index + 1}`} {...register(`lines.${index}.description`)} />
                {field.pending !== null && <p className="mt-1 text-[11px] text-muted-foreground">Falta despachar: {field.pending}</p>}
                {fieldError(errors.lines?.[index]?.description?.message)}
              </div>
              <div>
                <Input aria-label={`Cantidad del bien ${index + 1}`} type="number" step="0.001" min="0" {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                {fieldError(errors.lines?.[index]?.quantity?.message)}
              </div>
              <Input aria-label={`Unidad del bien ${index + 1}`} maxLength={5} {...register(`lines.${index}.unit_code`)} />
              <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Quitar bien ${index + 1}`} onClick={() => lines.remove(index)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">Unidad: NIU = unidad, KGM = kilogramo, MTR = metro, BX = caja.</p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Documentos relacionados (opcional)</h3>
          <Button type="button" size="sm" variant="ghost" onClick={() => related.append({ doc_type: '01', series_number: '' })}>
            <Plus className="size-4" />
            Agregar
          </Button>
        </div>
        {related.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[12rem_1fr_auto] items-start gap-2">
            <Select
              value={watch(`related_documents.${index}.doc_type`)}
              onValueChange={(value) => {
                if (!value) return;
                setValue(`related_documents.${index}.doc_type`, value);
              }}
            >
              <SelectTrigger aria-label={`Tipo del documento ${index + 1}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RELATED_DOC_TYPES).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Input aria-label={`Serie y número del documento ${index + 1}`} placeholder="F001-123" {...register(`related_documents.${index}.series_number`)} />
              {fieldError(errors.related_documents?.[index]?.series_number?.message)}
            </div>
            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Quitar documento ${index + 1}`} onClick={() => related.remove(index)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </section>

      <div className="space-y-1">
        <Label htmlFor="guide-notes">Notas internas (opcional)</Label>
        <Textarea id="guide-notes" rows={2} maxLength={500} {...register('notes')} />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Guardando…' : 'Guardar borrador'}
        </Button>
      </DialogFooter>
    </form>
  );
}
