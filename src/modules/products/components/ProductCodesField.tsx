import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import type { ProductCode } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';

// Mismo tope que el backend (product/services/shared/codes.ts).
const MAX_CODES = 50;

interface ProductCodesFieldProps {
  value: ProductCode[];
  onChange: (codes: ProductCode[]) => void;
}

// Un código no se repite aunque cambie el proveedor o las mayúsculas (mismo
// criterio que el backend: product/services/shared/codes.ts).
const sameCode = (a: ProductCode, b: ProductCode) => a.code.toUpperCase() === b.code.toUpperCase();

// Códigos de proveedores (pedido explícito del usuario): un producto tiene UN
// solo SKU, pero cada proveedor puede identificarlo con su propio código. Los
// códigos no se repiten: ni en este producto ni en otro de la empresa (eso
// último lo valida el backend al guardar y el formulario muestra su mensaje).
export function ProductCodesField({ value, onChange }: ProductCodesFieldProps) {
  const [code, setCode] = useState('');
  const [supplier, setSupplier] = useState('');

  const candidate: ProductCode = { code: code.trim(), supplier: supplier.trim() || null };
  const isDuplicate = value.some((entry) => sameCode(entry, candidate));
  const canAdd = Boolean(candidate.code) && !isDuplicate && value.length < MAX_CODES;

  const addCode = () => {
    if (!canAdd) return;
    onChange([...value, candidate]);
    setCode('');
  };

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
              <span className="min-w-0 truncate">
                <span className="font-mono">{entry.code}</span>
                {entry.supplier && <span className="text-muted-foreground"> · {entry.supplier}</span>}
              </span>
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
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={addCode}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      {isDuplicate && candidate.code && <p className="text-xs text-destructive">Ese código ya está en la lista.</p>}
    </div>
  );
}
