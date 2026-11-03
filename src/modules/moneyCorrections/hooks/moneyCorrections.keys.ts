import type { MoneyCorrectionSource, MoneyCorrectionsParams } from '@/modules/moneyCorrections/types/moneyCorrection.types';

// Keys del historial de correcciones. Cada pantalla pasa como `queryKey`
// `moneyCorrectionsKeys.history(source, id)` (o una key propia de su módulo);
// el hook le agrega la URL y la página. Después de corregir una fila se
// invalida `moneyCorrectionsKeys.history(source, id)` (o `all`).
export const moneyCorrectionsKeys = {
  all: ['moneyCorrections'] as const,
  histories: () => [...moneyCorrectionsKeys.all, 'history'] as const,
  history: (source: MoneyCorrectionSource, sourceId: number) =>
    [...moneyCorrectionsKeys.histories(), source, sourceId] as const,
  page: (queryKey: readonly unknown[], historyUrl: string, params: MoneyCorrectionsParams) =>
    [...queryKey, historyUrl, params] as const,
};
