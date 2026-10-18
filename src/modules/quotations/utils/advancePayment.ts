import type { QuotationStatus } from '@/modules/quotations/types/quotation.types';

const roundMoney = (value: number) => Math.round(value * 100) / 100;

// Adelanto sugerido (pedido explícito del usuario): la mitad de la
// cotización, sin pasar nunca lo que falta cobrar.
export function suggestedAdvance(total: number, totalPaid: number): number {
  const balance = Math.max(total - totalPaid, 0);
  return roundMoney(Math.min(total / 2, balance));
}

// ¿Hay que preguntar por el adelanto? Solo al pasar de Pendiente a Aceptada
// (volver a "Aceptada" desde una etapa posterior no es una nueva aceptación),
// si queda saldo y si el usuario puede registrar pagos.
export function shouldAskForAdvance({
  currentStatus,
  nextStatus,
  balance,
  canRegisterPayment,
}: {
  currentStatus: QuotationStatus;
  nextStatus: QuotationStatus;
  balance: number;
  canRegisterPayment: boolean;
}): boolean {
  return currentStatus === 'pending' && nextStatus === 'accepted' && balance > 0 && canRegisterPayment;
}
