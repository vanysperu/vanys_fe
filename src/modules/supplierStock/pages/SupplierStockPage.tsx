import { useState } from 'react';

import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { StockSearchTab } from '@/modules/supplierStock/components/StockSearchTab';
import { StockSourcesTab } from '@/modules/supplierStock/components/StockSourcesTab';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { useAccess, useCompanyFeature, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { PackageSearch } from 'lucide-react';

// "Stock de proveedores" (Sprint 2, ítem 6): el stock leído de los Excel de
// las importadoras (una columna por fuente y el total) y, para quien
// administra, las fuentes. El Super Administrador elige primero la empresa.
export function SupplierStockPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const hasFeature = useCompanyFeature('supplier_stock');
  const canManageSources = usePermissionButton('supplier_stock.sources.create.button');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);

  if (!isSystem && !hasFeature) {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock de proveedores" />
        <EmptyState icon={PackageSearch} title="Tu empresa no tiene habilitado el stock de proveedores" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Stock de proveedores" description="Lo que tiene cada importadora según su Excel, por separado y en total" />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {!ready && <p className="text-sm text-muted-foreground">Elige la empresa.</p>}
      {ready && (
        <Tabs defaultValue="stock" key={companyId ?? 'own'}>
          <TabsList>
            <TabsTrigger value="stock">Stock</TabsTrigger>
            {canManageSources && <TabsTrigger value="sources">Fuentes</TabsTrigger>}
          </TabsList>
          <TabsContent value="stock">
            <StockSearchTab companyId={companyId} />
          </TabsContent>
          {canManageSources && (
            <TabsContent value="sources">
              <StockSourcesTab companyId={companyId} />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
