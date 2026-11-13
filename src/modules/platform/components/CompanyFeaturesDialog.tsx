import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useCompanyFeatures, useSetCompanyFeatures } from '@/modules/platform/hooks/useCompanyFeatures';
import type { Company } from '@/modules/platform/types/platform.types';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

// Funcionalidades contratadas por una empresa (Sprint 2, company_feature).
// Solo el Super Administrador; cada interruptor se guarda al tocarlo.
export function CompanyFeaturesDialog({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const { data: features, isLoading } = useCompanyFeatures(company?.id);
  const { mutate: save, isPending } = useSetCompanyFeatures();

  const toggle = (code: string, label: string, enabled: boolean) => {
    if (!company) return;
    save(
      { companyId: company.id, features: { [code]: enabled } },
      {
        onSuccess: () => toast.success(enabled ? `${label}: habilitado` : `${label}: deshabilitado`),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={Boolean(company)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Funcionalidades</DialogTitle>
          <DialogDescription>{company?.business_name}</DialogDescription>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Lo que tiene contratado la empresa. Qué usuario lo usa lo siguen decidiendo sus roles. Apagar una
          funcionalidad no borra sus datos.
        </p>
        {isLoading && <Skeleton className="h-20 w-full" />}
        <ul className="space-y-2">
          {(features ?? []).map((feature) => (
            <li key={feature.code} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
              <ToggleSwitch
                checked={feature.enabled}
                disabled={isPending}
                label={feature.label}
                onCheckedChange={(checked) => toggle(feature.code, feature.label, checked)}
              />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
