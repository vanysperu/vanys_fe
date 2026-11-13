import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FlaskConical, Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { useSuppliers } from '@/modules/suppliers/hooks/useSuppliers';
import { StockPreviewPanel } from '@/modules/supplierStock/components/StockPreviewPanel';
import {
  useCreateStockSource,
  usePreviewStockSource,
  useRefreshStockSource,
  useUpdateStockSource,
} from '@/modules/supplierStock/hooks/useSupplierStock';
import { REFRESH_OPTIONS, stockSourceSchema, type StockSourceFormValues } from '@/modules/supplierStock/schemas/stockSource.schema';
import type { SaveStockSourceDto, StockPreview, StockSource } from '@/modules/supplierStock/types/supplierStock.types';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';
import { cn } from '@/lib/utils';

const HEADERS_LIST_ID = 'stock-source-headers';

const defaultsFor = (source?: StockSource): StockSourceFormValues => ({
  supplier_id: source?.supplier_id ?? 0,
  name: source?.name ?? '',
  source_type: source?.source_type ?? 'url',
  url: '',
  hasSavedUrl: source?.hasUrl ?? false,
  sheet_name: source?.sheet_name ?? '',
  header_row: source?.header_row ?? 1,
  code_column: source?.column_map.code ?? '',
  quantity_column: source?.column_map.quantity ?? '',
  color_column: source?.column_map.color ?? '',
  description_column: source?.column_map.description ?? '',
  price_column: source?.column_map.price ?? '',
  refresh_minutes: source?.refresh_minutes ?? 360,
});

const columnMapOf = (values: StockSourceFormValues) => ({
  code: values.code_column,
  quantity: values.quantity_column,
  color: values.color_column || null,
  description: values.description_column || null,
  price: values.price_column || null,
});

interface StockSourceFormDialogProps {
  source?: StockSource;
  onClose?: () => void;
  // Empresa elegida por el Super Administrador en la pantalla.
  companyId?: number;
}

// Alta y edición de una fuente de stock (Sprint 2, ítem 6). "Probar" lee el
// archivo y muestra cómo se interpretan las columnas antes de guardar.
export function StockSourceFormDialog({ source, onClose, companyId }: StockSourceFormDialogProps) {
  const isEditing = Boolean(source);
  const [open, setOpen] = useState(isEditing);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StockPreview | null>(null);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { mutate: create, isPending: isCreating } = useCreateStockSource();
  const { mutate: update, isPending: isUpdating } = useUpdateStockSource();
  const { mutate: refresh } = useRefreshStockSource();
  const { mutate: runPreview, isPending: isPreviewing } = usePreviewStockSource();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    trigger,
    watch,
    formState: { errors },
  } = useForm<StockSourceFormValues>({ resolver: zodResolver(stockSourceSchema), defaultValues: defaultsFor(source) });
  const sourceType = watch('source_type');
  const formCompanyId = source?.company_id ?? companyId ?? (isSystem ? watch('company_id') : undefined);
  const { data: suppliers } = useSuppliers({ page: 1, limit: 100, status: 'active', orderBy: 'name', orderDir: 'asc', companyId: formCompanyId });

  const handleOpenChange = (next: boolean) => {
    if (next && !source) {
      reset(defaultsFor());
      setFile(null);
      setPreview(null);
    }
    setOpen(next);
    if (!next) onClose?.();
  };

  const onPreview = async () => {
    if (!(await trigger(['header_row', 'url']))) return;
    const values = getValues();
    const hasMapping = Boolean(values.code_column && values.quantity_column);
    runPreview(
      {
        file: sourceType === 'upload' ? file : null,
        url: sourceType === 'url' ? values.url || null : null,
        sourceId: sourceType === 'url' && !values.url ? source?.id ?? null : null,
        sheet_name: values.sheet_name || null,
        header_row: values.header_row,
        column_map: hasMapping ? columnMapOf(values) : null,
      },
      {
        onSuccess: setPreview,
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const onSubmit = (values: StockSourceFormValues) => {
    const dto: SaveStockSourceDto = {
      supplier_id: values.supplier_id,
      name: values.name,
      source_type: values.source_type,
      url: values.source_type === 'url' ? values.url || null : null,
      sheet_name: values.sheet_name || null,
      header_row: values.header_row,
      column_map: columnMapOf(values),
      refresh_minutes: values.refresh_minutes,
    };
    const onError = (error: unknown) => toast.error((error as ApiClientError).message);

    if (isEditing && source) {
      update(
        { id: source.id, dto },
        {
          onSuccess: () => {
            toast.success('Fuente actualizada');
            handleOpenChange(false);
          },
          onError,
        },
      );
      return;
    }
    create(
      { ...dto, ...(isSystem ? { company_id: companyId ?? values.company_id } : {}) },
      {
        onSuccess: (created) => {
          toast.success('Fuente creada');
          handleOpenChange(false);
          // Con el archivo ya elegido (o el enlace), se lee de una vez.
          if (created.source_type === 'upload' && !file) return;
          refresh(
            { id: created.id, file: created.source_type === 'upload' ? file : null },
            {
              onSuccess: (updated) => toast.success(`Stock leído: ${updated.itemCount} filas`),
              onError,
            },
          );
        },
        onError,
      },
    );
  };

  const isPending = isCreating || isUpdating;
  const supplierOptions = (suppliers?.data ?? []).map((supplier) => ({ value: String(supplier.id), label: supplier.name }));
  const columnField = (name: 'code_column' | 'quantity_column' | 'color_column' | 'description_column' | 'price_column', label: string) => (
    <div className="space-y-1">
      <Label htmlFor={`stock-${name}`} className="text-xs">
        {label}
      </Label>
      <Input id={`stock-${name}`} list={HEADERS_LIST_ID} placeholder="Encabezado o letra" {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isEditing && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nueva fuente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent expandable className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar fuente de stock' : 'Nueva fuente de stock'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isEditing && isSystem && companyId === undefined && (
            <CompanyStoreFields
              companyId={watch('company_id')}
              onCompanyChange={(value) => setValue('company_id', value, { shouldValidate: true })}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Proveedor</Label>
              <SearchableSelect
                placeholder="Elige el proveedor"
                value={watch('supplier_id') ? String(watch('supplier_id')) : undefined}
                onChange={(value) => setValue('supplier_id', Number(value), { shouldValidate: true })}
                options={supplierOptions}
                emptyText="No hay proveedores con ese nombre"
              />
              {errors.supplier_id && <p className="text-xs text-destructive">{errors.supplier_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="stock-name">Nombre de la fuente</Label>
              <Input id="stock-name" placeholder="Ej. Stock general" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div role="radiogroup" aria-label="De dónde sale el Excel" className="grid grid-cols-2 gap-2">
            {(['url', 'upload'] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={sourceType === type}
                onClick={() => setValue('source_type', type, { shouldValidate: true })}
                className={cn(
                  'rounded-lg border p-2.5 text-left text-sm transition-colors',
                  sourceType === type ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <span className="block font-medium">{type === 'url' ? 'Enlace' : 'Archivo que se sube'}</span>
                <span className="block text-xs text-muted-foreground">
                  {type === 'url' ? 'Se actualiza solo cada cierto tiempo' : 'Se actualiza subiendo el Excel a mano'}
                </span>
              </button>
            ))}
          </div>

          {sourceType === 'url' ? (
            <div className="space-y-1">
              <Label htmlFor="stock-url">Enlace del Excel</Label>
              <Input
                id="stock-url"
                placeholder={
                  source?.hasUrl ? `Enlace guardado (${source.urlHost ?? 'oculto'}): déjalo vacío para conservarlo` : 'https://...'
                }
                {...register('url')}
              />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden />
                Se guarda cifrado. Sirven enlaces de Google Drive, Google Sheets, Dropbox y OneDrive.
              </p>
              {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="stock-file">Archivo (.xlsx, .xls o .csv)</Label>
              <Input
                id="stock-file"
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Para probar las columnas y, al crear, para leer el stock de una vez.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="stock-sheet" className="text-xs">
                Hoja (opcional)
              </Label>
              <Input id="stock-sheet" placeholder="La primera" {...register('sheet_name')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stock-header-row" className="text-xs">
                Fila del encabezado
              </Label>
              <Input id="stock-header-row" type="number" min={1} max={50} {...register('header_row', { valueAsNumber: true })} />
              {errors.header_row && <p className="text-xs text-destructive">{errors.header_row.message}</p>}
            </div>
            {sourceType === 'url' && (
              <div className="space-y-1">
                <Label className="text-xs">Actualizar</Label>
                <Select
                  value={String(watch('refresh_minutes'))}
                  onValueChange={(value) => {
                    if (!value) return;
                    setValue('refresh_minutes', Number(value));
                  }}
                >
                  <SelectTrigger aria-label="Cada cuánto se actualiza">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRESH_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <fieldset className="space-y-2 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Qué columna es cada dato</legend>
            <datalist id={HEADERS_LIST_ID}>
              {(preview?.headers ?? []).filter(Boolean).map((header) => (
                <option key={header} value={header} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {columnField('code_column', 'Código *')}
              {columnField('quantity_column', 'Stock *')}
              {columnField('color_column', 'Color')}
              {columnField('description_column', 'Descripción')}
              {columnField('price_column', 'Precio')}
            </div>
          </fieldset>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPreviewing || (sourceType === 'upload' && !file)}
              onClick={() => void onPreview()}
            >
              <FlaskConical className="size-4" />
              {isPreviewing ? 'Leyendo…' : 'Probar'}
            </Button>
            <span className="text-xs text-muted-foreground">Lee el archivo y muestra cómo queda, sin guardar.</span>
          </div>
          {preview && (
            <StockPreviewPanel
              preview={preview}
              onPickSheet={(sheet) => {
                setValue('sheet_name', sheet);
                void onPreview();
              }}
            />
          )}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear fuente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
