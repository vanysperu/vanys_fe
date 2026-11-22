import { UserRoundCheck } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const PAY = dialogWith('Marcar deuda como pagada');

export const employeeDebtsLesson: TutorialLesson = {
  code: 'employee-debts',
  section: 'finance',
  title: 'Deudas a personal',
  summary: 'Cuando alguien paga una compra con su plata, la empresa se lo debe: devuélveselo aquí.',
  minutes: 3,
  icon: UserRoundCheck,
  requires: { buttons: ['employee_debt.pay.button'], routes: ['/deudas-personal'] },
  prepare: 'employee_debt',
  steps: () => [
    navigateStep({
      id: 'go-debts',
      path: '/deudas-personal',
      label: 'Deudas a personal',
      group: 'Finanzas',
      body: 'Te preparamos una compra que pagaste "con tu plata": ahora la empresa te la debe.',
    }),
    {
      id: 'list',
      title: 'Lo que la empresa debe',
      body: 'Agrupado por trabajador: qué pagó, cuándo y cuánto falta devolverle.',
      target: 'main table',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'pay',
      title: 'Devuélveselo',
      body: 'Presiona "Marcar como pagado".',
      target: { css: 'main button', text: 'Marcar como pagado' },
      done: { kind: 'appear', target: PAY },
    },
    {
      id: 'pay-form',
      title: '¿Cuánto y de qué cuenta?',
      body: 'Puedes devolver todo o una parte. Elige de qué cuenta sale el dinero.',
      hint: 'Deja el monto completo, "Efectivo", y confirma.',
      target: PAY,
      pointer: '#debt-amount',
      done: { kind: 'toast', texts: ['Deuda saldada correctamente', 'Abono registrado correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Deuda saldada!',
      body: 'La salida de dinero queda en Caja, a nombre de esa persona.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
