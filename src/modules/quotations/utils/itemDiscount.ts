import { roundMoney } from '@/modules/quotations/utils/quotationAmounts';
import type { QuotationItemDiscountType } from '@/modules/quotations/types/quotation.types';

// Descuento por producto (pedido del usuario, 21-nov). Espejo EXACTO de
// grulla_be: quotation/services/shared/item_discount.ts — el backend vuelve a
// calcular y validar al guardar; acá solo se muestra en vivo.
//   - percent: "20%" sobre el precio unitario;
//   - final_price: "que quede en S/ X" por unidad.

export const QUOTATION_ITEM_DISCOUNT_LABEL: Record<QuotationItemDiscountType, string> = {
  percent: 'Descuento %',
  final_price: 'Precio final',
};

export interface DiscountResult {
  // Precio por unidad que se cobra (sin descuento = el de lista).
  unitPrice: number;
  // Mensaje si el descuento no es válido (el precio queda sin descuento).
  error: string | null;
}

export function applyItemDiscount(
  listUnitPrice: number,
  type: QuotationItemDiscountType | undefined,
  value: number | undefined,
): DiscountResult {
  if (!type) return { unitPrice: listUnitPrice, error: null };
  if (value == null || Number.isNaN(value) || value <= 0) return { unitPrice: listUnitPrice, error: 'Indica el descuento' };

  if (type === 'percent') {
    if (value >= 100) return { unitPrice: listUnitPrice, error: 'Debe ser menor a 100%' };
    const unitPrice = roundMoney(listUnitPrice * (1 - value / 100));
    if (unitPrice <= 0) return { unitPrice: listUnitPrice, error: 'Quedaría en S/ 0.00' };
    return { unitPrice, error: null };
  }

  const finalPrice = roundMoney(value);
  if (finalPrice >= listUnitPrice) {
    return { unitPrice: listUnitPrice, error: `Debe ser menor que S/ ${listUnitPrice.toFixed(2)}` };
  }
  return { unitPrice: finalPrice, error: null };
}

// "−20%" o "−S/ 5.00 c/u" para mostrar el descuento de un producto guardado.
export function describeItemDiscount(item: {
  discount_type?: QuotationItemDiscountType | null;
  discount_value?: number | string | null;
  list_unit_price?: number | string | null;
  unit_price: number | string;
}): string | null {
  if (!item.discount_type || item.list_unit_price == null) return null;
  if (item.discount_type === 'percent') return `−${Number(item.discount_value)}%`;
  return `−S/ ${(Number(item.list_unit_price) - Number(item.unit_price)).toFixed(2)} c/u`;
}
