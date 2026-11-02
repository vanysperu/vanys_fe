import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { MoneyCorrectionsParams, MoneyCorrectionsResult } from '@/modules/moneyCorrections/types/moneyCorrection.types';

// Historial de correcciones de una fila de dinero. Cada módulo expone el suyo
// (ej. `/payment/12/corrections`, `/cash-movement/5/corrections?source=...`):
// el que llama pasa la URL completa y esto solo agrega la paginación.
export async function getMoneyCorrections(url: string, params: MoneyCorrectionsParams): Promise<MoneyCorrectionsResult> {
  const response = await apiClient.get<ApiResponse<MoneyCorrectionsResult>>(url, { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
