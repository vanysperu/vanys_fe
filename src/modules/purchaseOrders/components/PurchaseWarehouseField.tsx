import { Warehouse } from 'lucide-react';

import { useWarehouseChoice, type WarehouseChoice } from '@/modules/purchaseOrders/hooks/useWarehouseChoice';
import type { PurchaseWarehouseOption } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { DateField } from '@/presentation/components/shared/DateField';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

const NO_WAREHOUSE = 'none';

interface PurchaseWarehouseFieldProps {
  itemId: number;
  value: WarehouseChoice | undefined;
  onChange: (value: WarehouseChoice) => void;
  error?: string;
}

const optionLabel = (warehouse: PurchaseWarehouseOption) =>
  `${warehouse.name}${warehouse.business_unit_name ? ` · ${warehouse.business_unit_name}` : ''}`;

/**
 * "Ingresar al almacén" al registrar una compra (Sprint 2, plan §8.4). Solo se
 * muestra si el backend lo ofrece (empresa con inventario y producto que maneja
 * stock); en un almacén con lotes pide el lote (opcional) y, para un
 * perecible, el vencimiento.
 */
export function PurchaseWarehouseField({ itemId, value, onChange, error }: PurchaseWarehouseFieldProps) {
  const { options, choice, warehouse } = useWarehouseChoice(itemId, value);
  if (!options?.available) return null;
  const set = (patch: Partial<WarehouseChoice>) => onChange({ ...choice, ...patch });

  return (
    <div className="space-y-1" data-testid="purchase-warehouse">
      <Label htmlFor={`purchase-warehouse-${itemId}`} className="flex items-center gap-1 text-xs">
        <Warehouse className="size-3.5" />
        Ingresar al almacén
      </Label>
      <Select
        value={choice.warehouseId ? String(choice.warehouseId) : NO_WAREHOUSE}
        onValueChange={(next) => {
          // Radix llama con "" al montar dentro de un formulario: no cambia lo elegido.
          if (!next) return;
          set({ warehouseId: next === NO_WAREHOUSE ? null : Number(next) });
        }}
      >
        <SelectTrigger id={`purchase-warehouse-${itemId}`} aria-label="Ingresar al almacén">
          <SelectValue placeholder="Elige el almacén">{warehouse ? optionLabel(warehouse) : 'No ingresar al almacén'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_WAREHOUSE}>No ingresar al almacén</SelectItem>
          {options.warehouses.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {optionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {warehouse?.track_lots && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor={`purchase-lot-${itemId}`} className="text-xs">
              Lote (opcional)
            </Label>
            <Input
              id={`purchase-lot-${itemId}`}
              maxLength={60}
              placeholder="Se genera si lo dejas vacío"
              value={choice.lotCode}
              onChange={(event) => set({ lotCode: event.target.value })}
            />
          </div>
          {warehouse.requires_expiry && (
            <div className="space-y-1">
              <Label className="text-xs">Vencimiento</Label>
              <DateField id={`purchase-expiry-${itemId}`} value={choice.expiryDate || undefined} onChange={(expiryDate) => set({ expiryDate })} />
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {warehouse && !error && (
        <p className="text-xs text-muted-foreground">Entra al stock con el costo de esta compra (monto ÷ cantidad).</p>
      )}
    </div>
  );
}
