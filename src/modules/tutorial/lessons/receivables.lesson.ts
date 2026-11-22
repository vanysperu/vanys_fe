import { HandCoins } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

export const receivablesLesson: TutorialLesson = {
  code: 'receivables',
  section: 'finance',
  title: 'Por cobrar',
  summary: 'Quién te debe y cuánto, y cómo cobrar el saldo desde la misma lista.',
  minutes: 3,
  icon: HandCoins,
  requires: { buttons: ['cotizacion.payment.create.button'], routes: ['/por-cobrar'] },
  prepare: 'accepted_quotation',
  steps: () => [
    navigateStep({
      id: 'go-receivables',
      path: '/por-cobrar',
      label: 'Por cobrar',
      group: 'Finanzas',
      body: 'Todas las cotizaciones aceptadas que todavía tienen saldo. Te preparamos una con la mitad pagada.',
    }),
    {
      id: 'total',
      title: 'Lo que te deben',
      body: 'El total por cobrar y cuántas cotizaciones tienen saldo.',
      target: '[data-testid="receivables-total"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'collect',
      title: 'Cobra desde aquí',
      body: 'Presiona el ícono de pago de la cotización.',
      target: { css: 'main button[aria-label="Registrar pago"]' },
      done: { kind: 'appear', target: dialogWith('Cotización #') },
    },
    {
      id: 'new-payment',
      title: 'Registra el pago',
      body: 'Presiona "Registrar pago".',
      target: buttonIn(DIALOG, 'Registrar pago'),
      done: { kind: 'appear', target: '#payment-amount' },
    },
    {
      id: 'payment-form',
      title: 'Llena el pago',
      body: 'Monto, método (si es transferencia, la cuenta y el número de operación) y guarda.',
      hint: 'Ejemplo: 100 en efectivo, y "Guardar pago".',
      target: { css: '#payment-amount', closest: 'form' },
      pointer: '#payment-amount',
      done: { kind: 'toast', texts: ['Pago registrado'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Pago registrado!',
      body: 'El saldo baja solo. Cuando se paga todo, la cotización sale de esta lista.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
