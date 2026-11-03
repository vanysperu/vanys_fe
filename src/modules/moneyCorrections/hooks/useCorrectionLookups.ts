import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import type { CorrectionLookups } from '@/modules/moneyCorrections/utils/correctionChanges';

// Nombres legibles de los catálogos que la foto de una corrección guarda como
// código: categorías de Caja (cash_movement_type, también las de deudas
// manuales) y medios de pago. Mismas keys de React Query que el resto de
// pantallas, así normalmente ya están en cache.
export function useCorrectionLookups(): CorrectionLookups {
  const { data: categories } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });
  const { data: methods } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });

  return {
    categoryName: (code: string) => categories?.data.find((item) => item.prefix_id === code)?.name ?? code,
    methodName: (code: string) => methods?.data.find((item) => item.prefix_id === code)?.name ?? code,
  };
}
