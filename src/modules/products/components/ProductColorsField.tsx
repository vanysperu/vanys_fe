import { useState } from 'react';
import { Plus, X } from 'lucide-react';

import type { ProductColor } from '@/modules/products/types/product.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';

// Mismo tope que el backend (product/services/shared/colors.ts).
const MAX_COLORS = 30;
const DEFAULT_SWATCH = '#000000';

interface ProductColorsFieldProps {
  value: ProductColor[];
  onChange: (colors: ProductColor[]) => void;
}

// Colores en los que viene el producto (pedido explícito del usuario): nombre
// + muestra de color opcional, en el orden en que se agregan.
export function ProductColorsField({ value, onChange }: ProductColorsFieldProps) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState(DEFAULT_SWATCH);
  const [useSwatch, setUseSwatch] = useState(true);

  const trimmed = name.trim();
  const isDuplicate = value.some((color) => color.name.toLowerCase() === trimmed.toLowerCase());
  const canAdd = Boolean(trimmed) && !isDuplicate && value.length < MAX_COLORS;

  const addColor = () => {
    if (!canAdd) return;
    onChange([...value, { name: trimmed, hex: useSwatch ? hex.toUpperCase() : null }]);
    setName('');
  };

  return (
    <div className="space-y-2">
      <Label>
        Colores <span className="font-normal text-muted-foreground">(opcional)</span>
      </Label>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" data-testid="product-colors">
          {value.map((color) => (
            <li key={color.name} className="flex items-center gap-1.5 rounded-full border bg-card py-0.5 pr-1 pl-2 text-xs">
              {color.hex && <span className="size-3 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden />}
              {color.name}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => onChange(value.filter((item) => item.name !== color.name))}
                aria-label={`Quitar color ${color.name}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 w-44"
          placeholder="Ej. Azul marino"
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            // Enter agrega el color en vez de enviar el formulario.
            event.preventDefault();
            addColor();
          }}
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={useSwatch} onChange={(event) => setUseSwatch(event.target.checked)} />
          Muestra
        </label>
        {useSwatch && (
          <input
            type="color"
            className="h-9 w-10 cursor-pointer rounded-md border bg-transparent p-1"
            value={hex}
            onChange={(event) => setHex(event.target.value)}
            aria-label="Elegir el color"
          />
        )}
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={addColor}>
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>
      {isDuplicate && trimmed && <p className="text-xs text-destructive">Ese color ya está en la lista.</p>}
    </div>
  );
}
