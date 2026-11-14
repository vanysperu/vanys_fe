import { GUIDE_STATUS_LABEL, type GuideStatus } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { Badge } from '@/presentation/components/shared/ui/badge';

const VARIANT: Record<GuideStatus, 'muted' | 'warning' | 'success' | 'destructive' | 'default'> = {
  draft: 'warning',
  sending: 'default',
  accepted: 'success',
  rejected: 'destructive',
  error: 'destructive',
  manual: 'success',
  voided: 'muted',
};

// Estado de una guía con su color (borrador, registrada, anulada...).
export function GuideStatusBadge({ status }: { status: GuideStatus }) {
  return <Badge variant={VARIANT[status]}>{GUIDE_STATUS_LABEL[status]}</Badge>;
}
