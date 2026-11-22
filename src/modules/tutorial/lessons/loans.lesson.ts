import { Banknote } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const NEW_LOAN = dialogWith('Nuevo préstamo');
const LOAN_DETAIL = dialogWith('Préstamo a ');

export const loansLesson: TutorialLesson = {
  code: 'loans',
  section: 'finance',
  title: 'Préstamos',
  summary: 'Registra dinero prestado a una persona, con su interés, y sus cobros.',
  minutes: 3,
  icon: Banknote,
  requires: { buttons: ['loan.create.button', 'loan.payment.create.button'], routes: ['/prestamos'] },
  steps: () => [
    navigateStep({
      id: 'go-loans',
      path: '/prestamos',
      label: 'Préstamos',
      group: 'Finanzas',
      body: 'Lo que la empresa le prestó a alguien, con su interés y lo que ya cobró.',
    }),
    {
      id: 'new',
      title: 'Registra un préstamo',
      body: 'Presiona "Nuevo préstamo".',
      target: { css: 'main button', text: 'Nuevo préstamo' },
      done: { kind: 'appear', target: NEW_LOAN },
    },
    {
      id: 'form',
      title: '¿A quién, cuánto y a qué interés?',
      body: 'El sistema calcula cuánto te tienen que devolver. Elige la fecha y de qué cuenta salió el dinero.',
      hint: 'Ejemplo: Rosa Quispe, 500, interés 10 % y la fecha de hoy. Luego "Registrar préstamo".',
      target: NEW_LOAN,
      pointer: '#loan-borrower',
      done: { kind: 'toast', texts: ['Préstamo registrado'] },
      checkpoint: true,
    },
    {
      id: 'open',
      title: 'Abre el préstamo',
      body: 'Presiona el ojo del préstamo para ver sus cobros.',
      target: { css: 'main button[aria-label^="Ver el préstamo a"]' },
      done: { kind: 'appear', target: LOAN_DETAIL },
    },
    {
      id: 'collect',
      title: 'Registra un cobro',
      body: 'El monto ya viene con el saldo. Elige la fecha y en qué cuenta entró.',
      hint: 'Deja el monto, elige hoy y "Registrar cobro".',
      target: LOAN_DETAIL,
      pointer: '#loan-payment-amount',
      done: { kind: 'toast', texts: ['Cobro registrado'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Cobro registrado!',
      body: 'El capital vuelve a la caja y el interés cuenta como ingreso de la empresa.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
