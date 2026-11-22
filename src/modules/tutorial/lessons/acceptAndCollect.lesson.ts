import { HandCoins } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep, openQuotationStep, tabStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const ADVANCE = dialogWith('¿El cliente pagó adelanto?');

export const acceptAndCollectLesson: TutorialLesson = {
  code: 'accept-and-collect',
  title: 'El cliente aceptó: adelanto y pagos',
  summary: 'Marca la cotización como aceptada, registra el adelanto y los pagos que vengan.',
  minutes: 4,
  icon: HandCoins,
  requires: { buttons: ['cotizacion.changeStatus.button', 'cotizacion.payment.create.button'], routes: ['/cotizaciones'] },
  prepare: 'pending_quotation',
  steps: ({ quotationId }) => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Te preparamos una cotización pendiente: el cliente acaba de decir que sí.',
    }),
    openQuotationStep(quotationId, 'Ábrela para registrar que la aceptó.'),
    {
      id: 'accept',
      title: 'Márcala como "Aceptada"',
      body: 'Presiona "Aceptada".',
      target: buttonIn(DIALOG, 'Aceptada', true),
      done: { kind: 'appear', target: ADVANCE },
    },
    {
      id: 'advance',
      title: 'Registra el adelanto',
      body: 'El sistema sugiere la mitad del total. Revisa el monto y cómo pagó, y confirma.',
      hint: 'Deja el monto sugerido, "Efectivo", y presiona "Sí, registrar adelanto".',
      target: ADVANCE,
      pointer: buttonIn(DIALOG, 'Sí, registrar adelanto'),
      done: { kind: 'toast', texts: ['Cotización aceptada y adelanto registrado', 'Cotización marcada como "Aceptada"'] },
      checkpoint: true,
    },
    tabStep('payments-tab', quotationId, 'Pagos', 'Aquí está todo lo que pagó el cliente por esta cotización.'),
    {
      id: 'new-payment',
      title: 'Registra otro pago',
      body: 'Cuando el cliente pague el saldo (o una parte), anótalo aquí.',
      target: buttonIn(DIALOG, 'Registrar pago'),
      done: { kind: 'appear', target: '#payment-amount' },
    },
    {
      id: 'payment-form',
      title: 'Llena el pago',
      body: 'Escribe el monto, elige el método (si es transferencia, la cuenta y el número de operación) y guarda.',
      hint: 'Ejemplo: 100 en efectivo, y "Guardar pago".',
      target: { css: '#payment-amount', closest: 'form' },
      pointer: '#payment-amount',
      done: { kind: 'toast', texts: ['Pago registrado'] },
      checkpoint: true,
    },
    {
      id: 'balance',
      title: 'Pagado y saldo pendiente',
      body: 'Siempre sabes cuánto pagó y cuánto falta. Los pagos también aparecen en Caja y en "Por cobrar".',
      target: { css: 'div.rounded-lg', text: 'Saldo pendiente', within: DIALOG, last: true },
      pointer: null,
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
