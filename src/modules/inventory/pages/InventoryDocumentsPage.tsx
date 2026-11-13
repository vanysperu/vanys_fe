import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ClipboardList, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { formatDate } from '@/lib/dateUtils';
import { DocumentDetailDialog } from '@/modules/inventory/components/DocumentDetailDialog';
import { statusVariant } from '@/modules/inventory/components/documentStatus';
import { DocumentFormDialog } from '@/modules/inventory/components/DocumentFormDialog';
import { useStockDocuments } from '@/modules/inventory/hooks/useInventory';
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, REASON_LABEL, type DocStatus, type DocType } from '@/modules/inventory/types/inventory.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const NEW_BUTTONS: { type: DocType; label: string; icon: typeof ArrowDownToLine }[] = [
  { type: 'entry', label: 'Ingreso', icon: ArrowDownToLine },
  { type: 'exit', label: 'Salida', icon: ArrowUpFromLine },
  { type: 'transfer', label: 'Transferencia', icon: ArrowLeftRight },
  { type: 'adjustment', label: 'Ajuste', icon: SlidersHorizontal },
];

// Movimientos (plan §8.3): ingresos, salidas, transferencias y ajustes, con su
// número, estado y almacén. Al tocar uno se abre su detalle con las acciones.
export function InventoryDocumentsPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);
  const [page, setPage] = useState(1);
  const [docType, setDocType] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState<DocType | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const canCreate = usePermissionButton('inventory.documents.create.button');
  const { data, isLoading } = useStockDocuments({ page, limit: 20, docType: docType as DocType | undefined, status: status as DocStatus | undefined, companyId });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimientos"
        description="Ingresos, salidas, transferencias y ajustes de los almacenes"
        action={
          canCreate && ready ? (
            <div className="flex flex-wrap gap-2">
              {NEW_BUTTONS.map(({ type, label, icon: Icon }) => (
                <Button key={type} variant={type === 'entry' ? 'default' : 'outline'} size="sm" onClick={() => setCreating(type)}>
                  <Icon className="size-4" />
                  {label}
                </Button>
              ))}
            </div>
          ) : undefined
        }
      />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {ready && (
        <>
          <div className="flex flex-wrap gap-3">
            <FilterSelect value={docType} onChange={(value) => { setDocType(value); setPage(1); }} allLabel="Todos los tipos"
              options={Object.entries(DOC_TYPE_LABEL).map(([value, label]) => ({ value, label }))} />
            <FilterSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} allLabel="Todos los estados"
              options={Object.entries(DOC_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
          </div>
          <DataTable
            columns={[
              { header: 'Número', cell: (document) => <button type="button" className="font-mono text-xs text-primary hover:underline" onClick={() => setOpenId(document.id)}>{document.number}</button> },
              { header: 'Tipo', cell: (document) => DOC_TYPE_LABEL[document.doc_type] },
              { header: 'Motivo', hideOnMobile: true, cell: (document) => REASON_LABEL[document.reason_code] ?? document.reason_code },
              { header: 'Almacén', cell: (document) => (document.targetWarehouse ? `${document.warehouse.name} → ${document.targetWarehouse.name}` : document.warehouse.name) },
              { header: 'Fecha', hideOnMobile: true, cell: (document) => formatDate(document.document_date) },
              { header: 'Estado', cell: (document) => <Badge variant={statusVariant(document.status)}>{DOC_STATUS_LABEL[document.status]}</Badge> },
              { header: 'Registró', hideOnMobile: true, cell: (document) => document.createdBy ?? '—' },
            ]}
            rows={data?.data ?? []}
            rowKey={(document) => document.id}
            isLoading={isLoading}
            emptyIcon={ClipboardList}
            emptyTitle="Todavía no hay movimientos"
          />
          {data && <Pagination result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }} onPageChange={setPage} />}
        </>
      )}
      {creating && <DocumentFormDialog docType={creating} companyId={companyId} onClose={() => setCreating(null)} onSaved={(document) => setOpenId(document.id)} />}
      {openId && <DocumentDetailDialog documentId={openId} companyId={companyId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
