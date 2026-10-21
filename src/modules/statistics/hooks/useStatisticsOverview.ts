import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getStatisticsOverview } from '@/modules/statistics/api/statistics.api';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import type { StatisticsParams } from '@/modules/statistics/types/statistics.types';

// Son agregados: no cambian a cada segundo. Un minuto de caché evita volver a
// pedir todo el tablero al ir y volver entre pantallas.
const STATISTICS_STALE_TIME_MS = 60_000;

export function useStatisticsOverview(params: StatisticsParams) {
  return useQuery({
    queryKey: statisticsKeys.overview(params),
    queryFn: () => getStatisticsOverview(params),
    staleTime: STATISTICS_STALE_TIME_MS,
    // Al cambiar el periodo, el tablero anterior queda a la vista (atenuado)
    // hasta que llega el nuevo: sin parpadeo ni saltos de diseño.
    placeholderData: keepPreviousData,
  });
}
