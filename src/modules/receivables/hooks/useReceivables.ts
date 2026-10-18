import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getReceivables } from '@/modules/receivables/api/receivables.api';
import { receivablesKeys } from '@/modules/receivables/hooks/receivables.keys';
import type { ReceivableListParams } from '@/modules/receivables/types/receivable.types';

export function useReceivables(params: ReceivableListParams) {
  return useQuery({
    queryKey: receivablesKeys.list(params),
    queryFn: () => getReceivables(params),
    placeholderData: keepPreviousData,
  });
}
