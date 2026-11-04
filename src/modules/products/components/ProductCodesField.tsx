import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import type { ProductCode, ProductColor } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

// Mismo tope que el backend (product/services/shared/codes.ts).
const MAX_CODES = 50;
// Radix no admite un SelectItem con valor vacío.
const NO_COLOR = '__none__';

interface ProductCodesFieldProps {
  value: ProductCode[];
  onChange: (codes: ProductCode[]) => void;
  // Colores del producto: un código se puede vincular con uno de ellos.
  colors: ProductColor[];
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
    <Select value={value ?? NO_COLOR} onValueChange={(next) => onChange(next === NO_COLOR ? null : next)}>
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

// Un código no se repite aunque cambie el proveedor o las mayúsculas (mismo
// criterio que el backend: product/services/shared/codes.ts).
const sameCode = (a: ProductCode, b: ProductCode) => a.code.toUpperCase() === b.code.toUpperCase();

// Códigos de proveedores (pedido explícito del usuario): un producto tiene UN
// solo SKU, pero cada proveedor puede identificarlo con su propio código. Los
// códigos no se repiten: ni en este producto ni en otro de la empresa (eso
// último lo valida el backend al guardar y el formulario muestra su mensaje).
// Cada código puede vincularse con un color del producto (ej. E1000-02 = Negro).
export function ProductCodesField({ value, onChange, colors }: ProductCodesFieldProps) {
  const [code, setCode] = useState('');
  const [supplier, setSupplier] = useState('');
  const [color, setColor] = useState<string | null>(null);

  // Si el color elegido se quitó de la lista, deja de contar.
  const selectedColor = colors.some((item) => item.name === color) ? color : null;
  const candidate: ProductCode = { code: code.trim(), supplier: supplier.trim() || null, color: selectedColor };
  const isDuplicate = value.some((entry) => sameCode(entry, candidate));
  const canAdd = Boolean(candidate.code) && !isDuplicate && value.length < MAX_CODES;

  const addCode = () => {
    if (!canAdd) return;
    onChange([...value, candidate]);
    setCode('');
    setColor(null);
  };

  const setCodeColor = (entry: ProductCode, nextColor: string | null) =>
    onChange(value.map((item) => (sameCode(item, entry) ? { ...item, color: nextColor } : item)));

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
              key={entry.code.toUpperCase()}
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
                onClick={() => onChange(value.filter((item) => !sameCode(item, entry)))}
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
          maxLength={60}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={onEnter}
        />
        <Input
          className="h-9 w-48"
          placeholder="Proveedor (opcional)"
          maxLength={150}
          value={supplier}
          onChange={(event) => setSupplier(event.target.value)}
          onKeyDown={onEnter}
        />
        <CodeColorSelect colors={colors} value={selectedColor} onChange={setColor} label="Color del código nuevo" />
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={addCode}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      {isDuplicate && candidate.code && <p className="text-xs text-destructive">Ese código ya está en la lista.</p>}
    </div>
  );
}
