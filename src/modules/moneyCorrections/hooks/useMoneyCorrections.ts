import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getMoneyCorrections } from '@/modules/moneyCorrections/api/moneyCorrections.api';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import type { MoneyCorrectionsParams } from '@/modules/moneyCorrections/types/moneyCorrection.types';

interface UseMoneyCorrectionsOptions {
  historyUrl: string;
  queryKey: readonly unknown[];
  params: MoneyCorrectionsParams;
  enabled?: boolean;
}

// Historial paginado de correcciones; solo se pide con el diálogo abierto.
// Sin reintentos: un 403 (rol sin permiso de ver el historial) no se arregla
// reintentando, y el diálogo muestra el error de una vez.
export function useMoneyCorrections({ historyUrl, queryKey, params, enabled = true }: UseMoneyCorrectionsOptions) {
  return useQuery({
    queryKey: moneyCorrectionsKeys.page(queryKey, historyUrl, params),
    queryFn: () => getMoneyCorrections(historyUrl, params),
    placeholderData: keepPreviousData,
    retry: false,
    enabled,
  });
}
