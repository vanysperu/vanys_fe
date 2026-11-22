import { LockKeyhole } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const OPENING = '[data-testid="cash-opening-dialog"]';

export const cashClosingsLesson: TutorialLesson = {
  code: 'cash-closings',
  section: 'finance',
  title: 'Saldo inicial y cierres de caja',
  summary: 'Dile al sistema con cuánto empezó cada cuenta y aprende cómo se cierra un mes.',
  minutes: 3,
  icon: LockKeyhole,
  requires: { buttons: ['cash_closing.opening.button'], routes: ['/caja/cierres'] },
  steps: () => [
    navigateStep({
      id: 'go-closings',
      path: '/caja/cierres',
      label: 'Cierres de caja',
      group: 'Finanzas',
      body: 'Aquí se cuadra la caja de cada mes y se cierra para que nadie la cambie.',
    }),
    {
      id: 'opening',
      title: 'Configura el saldo inicial',
      body: 'Primero, cuánto dinero había en cada cuenta (efectivo y bancos) el día que empiezas a usar el sistema.',
      target: ['[data-testid="opening-cta"]', '[data-testid="opening-button"]'],
      done: { kind: 'appear', target: OPENING },
    },
    {
      id: 'opening-form',
      title: '¿Con cuánto empezó cada cuenta?',
      body: 'Escribe el saldo de cada una y guarda.',
      hint: 'Ejemplo: Efectivo 200 y el banco 1000. Luego "Guardar saldo inicial".',
      target: OPENING,
      pointer: '#opening-amount-0',
      done: { kind: 'toast', texts: ['Saldo inicial guardado'] },
      checkpoint: true,
    },
    {
      id: 'period',
      title: 'El cuadre del mes',
      body: 'Saldo inicial + entradas − salidas = saldo final de cada cuenta. Cuando un mes termina, lo revisas y lo cierras: ya nadie puede cambiar sus movimientos. El mes en curso todavía no se puede cerrar.',
      target: '[data-testid="cash-period-detail"]',
      pointer: null,
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
