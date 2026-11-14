import { Plus } from 'lucide-react';

import { SupplierFormDialog } from '@/modules/suppliers/components/SupplierFormDialog';
import { useSuppliers } from '@/modules/suppliers/hooks/useSuppliers';
import { CURRENCY_LABEL, type InvoiceCurrency } from '@/modules/invoices/types/invoice.types';
import type { InvoiceDetailsValue } from '@/modules/invoices/utils/invoiceDetails';
import { DateField } from '@/presentation/components/shared/DateField';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { usePermission, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const SUPPLIER_OPTIONS_LIMIT = 100;
const NO_CURRENCY = 'none';

interface InvoiceDetailsFieldsProps {
  value: InvoiceDetailsValue;
  onChange: (value: InvoiceDetailsValue) => void;
  companyId?: number;
  // Nombre del proveedor elegido aunque no esté entre las 100 opciones cargadas.
  supplierLabel?: string | null;
  idPrefix?: string;
}

// Proveedor, serie-número, fecha de emisión, moneda y total de una factura de
// compra (Sprint 2, ítem 3). Quien no ve el módulo Proveedores no elige proveedor.
export function InvoiceDetailsFields({ value, onChange, companyId, supplierLabel, idPrefix = 'invoice-' }: InvoiceDetailsFieldsProps) {
  const canPickSupplier = usePermission('supplier');
  const canCreateSupplier = usePermissionButton('supplier.create.button');
  const { data: suppliers } = useSuppliers(
    { page: 1, limit: SUPPLIER_OPTIONS_LIMIT, status: 'active', orderBy: 'name', orderDir: 'asc', companyId },
    { enabled: canPickSupplier },
  );
  const options = (suppliers?.data ?? []).map((supplier) => ({ value: String(supplier.id), label: supplier.name }));
  const set = (patch: Partial<InvoiceDetailsValue>) => onChange({ ...value, ...patch });
  const fieldId = (name: string) => `${idPrefix}${name}`;

  return (
    <div className="grid gap-2 sm:grid-cols-2" data-testid="invoice-details">
      {canPickSupplier && (
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-xs">Proveedor (opcional)</Label>
          <div className="flex items-center gap-1">
            <SearchableSelect
              className="flex-1"
              placeholder="Elige el proveedor"
              value={value.supplierId ? String(value.supplierId) : undefined}
              selectedLabel={supplierLabel ?? undefined}
              onChange={(next) => set({ supplierId: Number(next) })}
              onClear={() => set({ supplierId: null })}
              clearLabel="Sin proveedor"
              options={options}
              emptyText="No hay proveedores con ese nombre"
            />
            {canCreateSupplier && (
              <SupplierFormDialog
                fixedCompanyId={companyId}
                idPrefix={fieldId('supplier-')}
                onCreated={(created) => set({ supplierId: created.id })}
                trigger={
                  <Button type="button" variant="ghost" size="icon" className="size-9 shrink-0" title="Nuevo proveedor" aria-label="Nuevo proveedor">
                    <Plus className="size-4" />
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor={fieldId('series')} className="text-xs">
          Serie y número
        </Label>
        <Input
          id={fieldId('series')}
          placeholder="F001-123"
          maxLength={30}
          value={value.seriesNumber}
          onChange={(event) => set({ seriesNumber: event.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Fecha de emisión</Label>
        <DateField id={fieldId('issue-date')} value={value.issueDate || undefined} onChange={(issueDate) => set({ issueDate })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Moneda</Label>
        <Select
          value={value.currency ?? NO_CURRENCY}
          onValueChange={(next) => {
            // Radix llama con "" al montar dentro de un formulario: no borra lo elegido.
            if (!next) return;
            set({ currency: next === NO_CURRENCY ? null : (next as InvoiceCurrency) });
          }}
        >
          <SelectTrigger id={fieldId('currency')}>
            <SelectValue placeholder="Moneda" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CURRENCY}>Sin indicar</SelectItem>
            <SelectItem value="PEN">{CURRENCY_LABEL.PEN}</SelectItem>
            <SelectItem value="USD">{CURRENCY_LABEL.USD}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={fieldId('total')} className="text-xs">
          Total de la factura
        </Label>
        <Input
          id={fieldId('total')}
          type="number"
          step="0.01"
          min="0"
          value={value.total}
          onChange={(event) => set({ total: event.target.value })}
        />
      </div>
    </div>
  );
}
