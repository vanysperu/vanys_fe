import type { Product } from '@/modules/products/types/product.types';

// Colores que se pueden elegir en un item. Si el color guardado ya no está en
// el producto se muestra igual: el backend lo rechaza con un mensaje claro y
// el equipo elige otro, en vez de perderlo sin darse cuenta.
export function itemColorOptions(product: Product | undefined, currentColor: string | undefined) {
  const names = (product?.colors ?? []).map((color) => color.name);
  const all = currentColor && !names.includes(currentColor) ? [...names, currentColor] : names;
  return all.map((name) => ({ value: name, label: name }));
}

// Código que corresponde al color elegido. Un código sin color vinculado (uno
// solo para todos los colores) se conserva; si no, se usa el de ese color.
export function itemCodeForColor(
  product: Product | undefined,
  currentCode: string | undefined,
  color: string | undefined,
): string | undefined {
  const current = product?.codes?.find((entry) => entry.code === currentCode);
  if (current && !current.color) return current.code;
  return color ? product?.codes?.find((entry) => entry.color === color)?.code : undefined;
}
