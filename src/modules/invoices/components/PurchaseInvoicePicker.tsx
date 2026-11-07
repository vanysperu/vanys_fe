import { useState } from 'react';

import { formatDate } from '@/lib/dateUtils';
import { usePurchaseInvoiceCandidates } from '@/modules/invoices/hooks/useInvoices';
import type { PurchaseInvoiceCandidate } from '@/modules/invoices/types/invoice.types';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { useDebouncedValue } from '@/presentation/hooks/shared/useDebouncedValue';

interface PurchaseInvoicePickerProps {
  // Item de la orden de compra: el backend ofrece solo las facturas de su
  // misma empresa y tienda.
  itemId: number;
  value: number | null;
  // La factura que ya tiene la compra: no tiene sentido elegirla.
  excludeInvoiceId?: number;
  onChange: (invoiceId: number) => void;
}

const candidateLabel = (candidate: PurchaseInvoiceCandidate) =>
  `${formatDate(candidate.created_at.date)} · ${candidate.quotation_codes.join(', ')} · ${candidate.description}`;

// Elegir una factura de compra ya registrada para sumarle esta compra (pedido
// explícito del usuario: "en una factura pueden estar varios productos"). Lista
// las más recientes; buscando, encuentra las anteriores por producto o cotización.
export function PurchaseInvoicePicker({ itemId, value, excludeInvoiceId, onChange }: PurchaseInvoicePickerProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data: candidates, isFetching } = usePurchaseInvoiceCandidates(itemId, debouncedSearch);
  // La elegida puede no estar entre los resultados de una búsqueda posterior.
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const selectable = (candidates ?? []).filter((candidate) => candidate.id !== excludeInvoiceId);
  const options = selectable.map((candidate) => ({
    value: String(candidate.id),
    label: candidateLabel(candidate),
    hint: candidate.has_file ? 'Con archivo' : 'Falta archivo',
  }));

  return (
    <SearchableSelect
      placeholder="Elige o busca la factura"
      value={value ? String(value) : undefined}
      options={options}
      serverSearch
      onSearchChange={setSearch}
      isSearching={isFetching}
      selectedLabel={selectedLabel}
      emptyText="No hay facturas de compra en esta tienda"
      onChange={(selected) => {
        setSelectedLabel(options.find((option) => option.value === selected)?.label);
        onChange(Number(selected));
      }}
    />
  );
}
