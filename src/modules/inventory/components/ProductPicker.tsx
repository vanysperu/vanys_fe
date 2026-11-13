import { useState } from 'react';

import { useProducts } from '@/modules/products/hooks/useProducts';
import type { Product } from '@/modules/products/types/product.types';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { useDebouncedValue } from '@/presentation/hooks/shared/useDebouncedValue';

interface ProductPickerProps {
  value: number | undefined;
  onChange: (product: Product) => void;
  companyId?: number;
  className?: string;
  // Solo productos que manejan stock (documentos de inventario, kardex).
  onlyTracked?: boolean;
  placeholder?: string;
  // Nombre del producto ya elegido (ej. al editar un borrador), por si la
  // búsqueda actual no lo trae.
  initialLabel?: string;
}

// Selector de producto con búsqueda en el servidor (nombre, SKU o código),
// mismo patrón que Nueva cotización. Devuelve el producto completo (con sus
// colores) para que el formulario pida el color.
export function ProductPicker({
  value,
  onChange,
  companyId,
  className,
  onlyTracked = false,
  placeholder = 'Producto',
  initialLabel,
}: ProductPickerProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, isFetching } = useProducts({ page: 1, limit: 50, status: 'active', companyId, searchTerm: debounced || undefined });
  const products = (data?.data ?? []).filter((product) => !onlyTracked || product.tracks_stock);

  return (
    <SearchableSelect
      className={className}
      placeholder={placeholder}
      value={value ? String(value) : undefined}
      onChange={(next) => {
        const product = products.find((entry) => entry.id === Number(next));
        if (!product) return;
        setSelected(product);
        onChange(product);
      }}
      options={products.map((product) => ({ value: String(product.id), label: product.sku ? `${product.name} · ${product.sku}` : product.name }))}
      serverSearch
      onSearchChange={setSearch}
      isSearching={isFetching}
      selectedLabel={value ? (selected?.id === value ? selected.name : initialLabel) : undefined}
      emptyText={onlyTracked ? 'No hay productos que manejen stock con ese nombre' : 'No hay productos con ese nombre'}
    />
  );
}
