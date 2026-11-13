import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import type { ProductCode, ProductColor } from '@/modules/products/types/product.types';
import { SupplierFormDialog } from '@/modules/suppliers/components/SupplierFormDialog';
import { useSuppliers } from '@/modules/suppliers/hooks/useSuppliers';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { usePermission, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Mismo tope que el backend (product/services/shared/codes.ts).
const MAX_CODES = 50;
// Radix no admite un SelectItem con valor vacío.
const NO_COLOR = '__none__';
// Los selectores cargan hasta 100 filas (límite de la API).
const SUPPLIER_OPTIONS_LIMIT = 100;

interface ProductCodesFieldProps {
  value: ProductCode[];
  onChange: (codes: ProductCode[]) => void;
  // Colores del producto: un código se puede vincular con uno de ellos.
  colors: ProductColor[];
  // Empresa del producto: de ella salen los proveedores (opcional para no
  // romper a quien no la manda: sin empresa se usa la del usuario).
  companyId?: number;
}

// Selector del color de un código. Sin colores cargados no se muestra.
function CodeColorSelect({
  colors,
  value,
  onChange,
  label,
}: {
  colors: ProductColor[];
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  label: string;
}) {
  if (colors.length === 0) return null;

  return (
    <Select
      value={value ?? NO_COLOR}
      onValueChange={(next) => {
        // Radix puede disparar onValueChange("") al montar: se ignora.
        if (!next) return;
        onChange(next === NO_COLOR ? null : next);
      }}
    >
      <SelectTrigger className="h-8 w-36 shrink-0 text-xs" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_COLOR}>Sin color</SelectItem>
        {colors.map((color) => (
          <SelectItem key={color.name} value={color.name}>
            <span className="flex items-center gap-1.5">
              {color.hex && <span className="size-2.5 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden />}
              {color.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Proveedor de un código: id si viene del módulo Proveedores; si no, el texto.
const supplierKey = (entry: ProductCode) => (entry.supplier_id ? `id:${entry.supplier_id}` : `name:${(entry.supplier ?? '').toUpperCase()}`);

// Decisión D6 (Sprint 2): el mismo código puede ir con dos proveedores
// distintos, pero no dos veces con el mismo (ni con otras mayúsculas). Mismo
// criterio que el backend: product/services/shared/codes.ts.
const sameEntry = (a: ProductCode, b: ProductCode) =>
  a.code.toUpperCase() === b.code.toUpperCase() && supplierKey(a) === supplierKey(b);

// Códigos de proveedores (pedido explícito del usuario): un producto tiene UN
// solo SKU, pero cada proveedor puede identificarlo con su propio código. Cada
// código puede vincularse con un color del producto (ej. E1000-02 = Negro). El
// proveedor sale del módulo Proveedores (con "+" para crear uno sin salir).
export function ProductCodesField({ value, onChange, colors, companyId }: ProductCodesFieldProps) {
  const [code, setCode] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierText, setSupplierText] = useState('');
  const [color, setColor] = useState<string | null>(null);
  // Quien no ve el módulo Proveedores sigue escribiendo el nombre (el backend
  // lo busca o lo crea por nombre).
  const canPickSupplier = usePermission('supplier');
  const canCreateSupplier = usePermissionButton('supplier.create.button');
  const { data: suppliers } = useSuppliers(
    { page: 1, limit: SUPPLIER_OPTIONS_LIMIT, status: 'active', orderBy: 'name', orderDir: 'asc', companyId },
    { enabled: canPickSupplier },
  );
  const supplierOptions = (suppliers?.data ?? []).map((supplier) => ({ value: String(supplier.id), label: supplier.name }));
  const supplierName = (id: number | null) => (suppliers?.data ?? []).find((supplier) => supplier.id === id)?.name ?? null;

  // Si el color elegido se quitó de la lista, deja de contar.
  const selectedColor = colors.some((item) => item.name === color) ? color : null;
  const candidate: ProductCode = canPickSupplier
    ? { code: code.trim(), supplier_id: supplierId, supplier: supplierName(supplierId), color: selectedColor }
    : { code: code.trim(), supplier_id: null, supplier: supplierText.trim() || null, color: selectedColor };
  const isDuplicate = value.some((entry) => sameEntry(entry, candidate));
  const canAdd = Boolean(candidate.code) && !isDuplicate && value.length < MAX_CODES;

  const addCode = () => {
    if (!canAdd) return;
    onChange([...value, candidate]);
    setCode('');
    setColor(null);
  };

  const setCodeColor = (entry: ProductCode, nextColor: string | null) =>
    onChange(value.map((item) => (sameEntry(item, entry) ? { ...item, color: nextColor } : item)));

  // Enter agrega el código en vez de enviar el formulario.
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addCode();
  };

  return (
    <div className="space-y-2">
      <Label>
        Códigos de proveedores <span className="font-normal text-muted-foreground">(opcional, además del SKU)</span>
      </Label>

      {value.length > 0 && (
        <ul className="space-y-1" data-testid="product-codes">
          {value.map((entry) => (
            <li
              key={`${supplierKey(entry)}|${entry.code.toUpperCase()}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="font-mono">{entry.code}</span>
                {entry.supplier && <span className="text-muted-foreground"> · {entry.supplier}</span>}
              </span>
              <CodeColorSelect
                colors={colors}
                value={entry.color}
                onChange={(nextColor) => setCodeColor(entry, nextColor)}
                label={`Color del código ${entry.code}`}
              />
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onChange(value.filter((item) => !sameEntry(item, entry)))}
                aria-label={`Quitar código ${entry.code}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-40 font-mono"
          placeholder="Código"
          aria-label="Código nuevo"
          maxLength={60}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={onEnter}
        />
        {canPickSupplier ? (
          <div className="flex items-center gap-1">
            <SearchableSelect
              className="w-52"
              placeholder="Proveedor (opcional)"
              value={supplierId ? String(supplierId) : undefined}
              onChange={(next) => setSupplierId(Number(next))}
              onClear={() => setSupplierId(null)}
              clearLabel="Sin proveedor"
              options={supplierOptions}
              emptyText="No hay proveedores con ese nombre"
            />
            {canCreateSupplier && (
              <SupplierFormDialog
                fixedCompanyId={companyId}
                idPrefix="code-"
                onCreated={(created) => setSupplierId(created.id)}
                trigger={
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title="Nuevo proveedor" aria-label="Nuevo proveedor">
                    <Plus className="size-4" />
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <Input
            className="h-9 w-48"
            placeholder="Proveedor (opcional)"
            maxLength={150}
            value={supplierText}
            onChange={(event) => setSupplierText(event.target.value)}
            onKeyDown={onEnter}
          />
        )}
        <CodeColorSelect colors={colors} value={selectedColor} onChange={setColor} label="Color del código nuevo" />
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={addCode}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      {isDuplicate && candidate.code && <p className="text-xs text-destructive">Ese código ya está en la lista con ese proveedor.</p>}
    </div>
  );
}
