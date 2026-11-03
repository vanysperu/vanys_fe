import type {
  CashClosingsListParams,
  CashPeriodAdjustmentsParams,
  CashPeriodEventsParams,
} from '@/modules/cashClosings/types/cashClosings.types';

export const cashClosingsKeys = {
  all: ['cash-closings'] as const,
  status: (companyId?: number) => [...cashClosingsKeys.all, 'status', companyId ?? null] as const,
  lists: () => [...cashClosingsKeys.all, 'list'] as const,
  list: (params: CashClosingsListParams) => [...cashClosingsKeys.lists(), params] as const,
  details: () => [...cashClosingsKeys.all, 'detail'] as const,
  detail: (period: string, companyId?: number) => [...cashClosingsKeys.details(), period, companyId ?? null] as const,
  adjustments: (params: CashPeriodAdjustmentsParams) => [...cashClosingsKeys.all, 'adjustments', params] as const,
  events: (params: CashPeriodEventsParams) => [...cashClosingsKeys.all, 'events', params] as const,
  balances: (companyId?: number) => [...cashClosingsKeys.all, 'balances', companyId ?? null] as const,
  // startPeriod: mes elegido en el selector (las pistas dependen de él); null = el guardado/sugerido.
  opening: (companyId?: number, startPeriod?: string) =>
    [...cashClosingsKeys.all, 'opening', companyId ?? null, startPeriod ?? null] as const,
};
