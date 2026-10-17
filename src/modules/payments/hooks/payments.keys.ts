import type { PaymentListParams } from '@/modules/payments/types/payment.types';

export const paymentsKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentsKeys.all, 'list'] as const,
  list: (params: PaymentListParams) => [...paymentsKeys.lists(), params] as const,
};
