import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Plus, Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { useCreateDocument, useDispatchTransfer, usePostDocument, useUpdateDocument, useWarehouses } from '@/modules/inventory/hooks/useInventory';
import {
  REASON_LABEL,
  REASONS_BY_TYPE,
  type DocType,
  type SaveDocumentDto,
  type StockDocument,
} from '@/modules/inventory/types/inventory.types';
import type { ProductColor } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const NO_COLOR = '__none__';

// Título del formulario nuevo (con el género de cada documento).
const NEW_TITLE: Record<DocType, string> = {
  entry: 'Nuevo ingreso',
  exit: 'Nueva salida',
  transfer: 'Nueva transferencia',
  adjustment: 'Nuevo ajuste',
};

const lineSchema = z.object({
  product_id: z.number({ error: 'Elige el producto' }).int().positive('Elige el producto'),
  color: z.string(),
  quantity: z.number({ error: 'Indica la cantidad' }).refine((value) => value !== 0, 'La cantidad no puede ser 0'),
  unit_cost: z.number().min(0, 'El costo no es válido').nullable(),
  lot_code: z.string().max(40).optional(),
  expiry_date: z.string().optional(),
});
const schema = z.object({
  warehouse_id: z.number({ error: 'Elige el almacén' }).int().positive('Elige el almacén'),
  target_warehouse_id: z.number().int().nullable(),
  reason_code: z.string().min(1, 'Elige el motivo'),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha'),
  notes: z.string().max(500).optional(),
  lines: z.array(lineSchema).min(1, 'Agrega al menos un producto').max(200),
});
type FormValues = z.infer<typeof schema>;

interface DocumentFormDialogProps {
  docType: DocType;
  // Editar un borrador.
  document?: StockDocument;
  companyId?: number;
  onClose: () => void;
  onSaved?: (document: StockDocument) => void;
}

// Registrar un ingreso, una salida, una transferencia o un ajuste (plan §8.3).
// Se guarda como borrador o se confirma (transferencia: se despacha) de una vez.
export function DocumentFormDialog({ docType, document, companyId, onClose, onSaved }: DocumentFormDialogProps) {
  const [colorsByProduct, setColorsByProduct] = useState<Record<number, ProductColor[]>>({});
  const { data: warehouses } = useWarehouses({ page: 1, limit: 100, onlyActive: true, companyId });
  const { mutateAsync: create, isPending: isCreating } = useCreateDocument();
  const { mutateAsync: update, isPending: isUpdating } = useUpdateDocument();
  const { mutateAsync: post, isPending: isPosting } = usePostDocument();
  const { mutateAsync: dispatch, isPending: isDispatching } = useDispatchTransfer();
  const canPost = usePermissionButton(docType === 'transfer' ? 'inventory.transfers.dispatch.button' : 'inventory.documents.post.button');

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      warehouse_id: document?.warehouse.id ?? 0,
      target_warehouse_id: document?.targetWarehouse?.id ?? null,
      reason_code: document?.reason_code ?? (REASONS_BY_TYPE[docType].length === 1 ? REASONS_BY_TYPE[docType][0] : ''),
      document_date: document?.document_date ?? todayLocalDateString(),
      notes: document?.notes ?? '',
      lines: document?.lines.map((line) => ({
        product_id: line.product_id,
        color: line.color,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        lot_code: line.lotCode ?? '',
        expiry_date: line.expiry_date ?? '',
      })) ?? [{ product_id: 0, color: '', quantity: 1, unit_cost: null, lot_code: '', expiry_date: '' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = useWatch({ control, name: 'lines' }) ?? [];
  const warehouseId = useWatch({ control, name: 'warehouse_id' });
  const targetId = useWatch({ control, name: 'target_warehouse_id' });
  const warehouse = (warehouses?.data ?? []).find((entry) => entry.id === warehouseId);
  const isIncoming = docType === 'entry' || docType === 'adjustment';
  const asksLots = isIncoming && Boolean(warehouse?.track_lots);

  const submit = (confirm: boolean) =>
    handleSubmit(async (values) => {
      const dto: SaveDocumentDto = {
        ...(companyId ? { company_id: companyId } : {}),
        doc_type: docType,
        warehouse_id: values.warehouse_id,
        target_warehouse_id: docType === 'transfer' ? values.target_warehouse_id : null,
        reason_code: values.reason_code,
        document_date: values.document_date,
        notes: values.notes || null,
        lines: values.lines.map((line) => ({
          product_id: line.product_id,
          color: line.color || null,
          quantity: line.quantity,
          unit_cost: isIncoming ? line.unit_cost : null,
          lot_code: asksLots ? line.lot_code || null : null,
          expiry_date: asksLots ? line.expiry_date || null : null,
        })),
      };
      try {
        const saved = document ? await update({ id: document.id, dto }) : await create(dto);
        const final = confirm ? await (docType === 'transfer' ? dispatch(saved.id) : post(saved.id)) : saved;
        toast.success(confirm ? (docType === 'transfer' ? 'Transferencia despachada' : 'Documento confirmado') : 'Borrador guardado');
        onSaved?.(final);
        onClose();
      } catch (error: unknown) {
        // Si se guardó pero no se pudo confirmar (ej. sin stock), queda el borrador.
        toast.error((error as ApiClientError).message);
      }
    });

  const busy = isCreating || isUpdating || isPosting || isDispatching;
  const warehouseOptions = (warehouses?.data ?? []).map((entry) => (
    <SelectItem key={entry.id} value={String(entry.id)}>
      {entry.name}
      {entry.businessUnitName ? ` · ${entry.businessUnitName}` : ''}
    </SelectItem>
  ));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent expandable className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{document ? `Editar ${document.number}` : NEW_TITLE[docType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>{docType === 'transfer' ? 'Almacén de origen' : 'Almacén'}</Label>
              <Select
                value={warehouseId ? String(warehouseId) : undefined}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue('warehouse_id', Number(value), { shouldValidate: true });
                }}
              >
                <SelectTrigger aria-label="Almacén">
                  <SelectValue placeholder="Elige el almacén" />
                </SelectTrigger>
                <SelectContent>{warehouseOptions}</SelectContent>
              </Select>
              {errors.warehouse_id && <p className="text-xs text-destructive">{errors.warehouse_id.message}</p>}
            </div>
            {docType === 'transfer' ? (
              <div className="space-y-1 sm:col-span-2">
                <Label>Almacén de destino</Label>
                <Select
                  value={targetId ? String(targetId) : undefined}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue('target_warehouse_id', Number(value), { shouldValidate: true });
                  }}
                >
                  <SelectTrigger aria-label="Almacén de destino">
                    <SelectValue placeholder="Elige el destino" />
                  </SelectTrigger>
                  <SelectContent>{warehouseOptions}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>Motivo</Label>
                <Select
                  defaultValue={document?.reason_code}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue('reason_code', value, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger aria-label="Motivo">
                    <SelectValue placeholder="Elige el motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS_BY_TYPE[docType].map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {REASON_LABEL[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reason_code && <p className="text-xs text-destructive">{errors.reason_code.message}</p>}
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="document-date">Fecha</Label>
              <Input id="document-date" type="date" {...register('document_date')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Productos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ product_id: 0, color: '', quantity: 1, unit_cost: null, lot_code: '', expiry_date: '' })}
              >
                <Plus className="size-4" />
                Agregar producto
              </Button>
            </div>
            {docType === 'adjustment' && (
              <p className="text-xs text-muted-foreground">Cantidad positiva si sobra; negativa si falta.</p>
            )}
            <ul className="space-y-2">
              {fields.map((field, index) => {
                const line = lines[index];
                const colors = line?.product_id ? colorsByProduct[line.product_id] ?? [] : [];
                return (
                  <li key={field.id} className="space-y-2 rounded-lg border p-2.5" data-testid="document-line">
                    <div className="flex flex-wrap items-start gap-2">
                      <ProductPicker
                        className="min-w-56 flex-1"
                        onlyTracked
                        companyId={companyId}
                        value={line?.product_id || undefined}
                        initialLabel={document?.lines[index]?.productName}
                        onChange={(product) => {
                          setColorsByProduct((current) => ({ ...current, [product.id]: product.colors ?? [] }));
                          setValue(`lines.${index}.product_id`, product.id, { shouldValidate: true });
                          setValue(`lines.${index}.color`, product.colors?.[0]?.name ?? '');
                        }}
                      />
                      {colors.length > 0 && (
                        <Select
                          value={line?.color || NO_COLOR}
                          onValueChange={(value) => {
                            if (!value) return;
                            setValue(`lines.${index}.color`, value === NO_COLOR ? '' : value);
                          }}
                        >
                          <SelectTrigger className="w-36" aria-label={`Color de la fila ${index + 1}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {colors.map((color) => (
                              <SelectItem key={color.name} value={color.name}>
                                {color.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Input
                        type="number"
                        step="any"
                        className="w-28"
                        aria-label={`Cantidad de la fila ${index + 1}`}
                        {...register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      />
                      {isIncoming && (
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          className="w-28"
                          placeholder="Costo c/u"
                          aria-label={`Costo de la fila ${index + 1}`}
                          {...register(`lines.${index}.unit_cost`, { setValueAs: (value: string) => (value === '' ? null : Number(value)) })}
                        />
                      )}
                      <Button type="button" variant="ghost" size="icon" className="size-9" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Quitar la fila ${index + 1}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                    {asksLots && (
                      <div className="flex flex-wrap gap-2">
                        <Input className="w-40" placeholder="Lote (o se genera)" aria-label={`Lote de la fila ${index + 1}`} {...register(`lines.${index}.lot_code`)} />
                        {warehouse?.track_expiry && (
                          <Input type="date" className="w-44" aria-label={`Vencimiento de la fila ${index + 1}`} {...register(`lines.${index}.expiry_date`)} />
                        )}
                      </div>
                    )}
                    {errors.lines?.[index] && (
                      <p className="text-xs text-destructive">
                        {errors.lines[index]?.product_id?.message ?? errors.lines[index]?.quantity?.message ?? errors.lines[index]?.unit_cost?.message}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {errors.lines?.message && <p className="text-xs text-destructive">{errors.lines.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="document-notes">Notas (opcional)</Label>
            <Input id="document-notes" maxLength={500} {...register('notes')} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(false)()}>
              <Check className="size-4" />
              Guardar borrador
            </Button>
            {canPost && (
              <Button type="button" disabled={busy} onClick={() => void submit(true)()}>
                <Send className="size-4" />
                {docType === 'transfer' ? 'Guardar y despachar' : 'Guardar y confirmar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

