import { Receipt } from 'lucide-react';

import { inputValue } from '@/modules/tutorial/engine/dom';
import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const SEARCH = 'main input[placeholder="Buscar cliente..."]';

export const paymentsLesson: TutorialLesson = {
  code: 'payments',
  section: 'finance',
  title: 'Pagos recibidos',
  summary: 'Encuentra cualquier cobro: por cliente, fecha, método o cuenta, y descárgalos en Excel.',
  minutes: 2,
  icon: Receipt,
  requires: { routes: ['/pagos'] },
  prepare: 'accepted_quotation',
  steps: () => [
    navigateStep({
      id: 'go-payments',
      path: '/pagos',
      label: 'Pagos recibidos',
      group: 'Finanzas',
      body: 'Todos los cobros de todas las cotizaciones, en un solo lugar. Te preparamos uno.',
    }),
    {
      id: 'search',
      title: 'Busca un cliente',
      body: 'Escribe parte de su nombre.',
      hint: 'Ejemplo: "Andes".',
      target: SEARCH,
      done: { kind: 'check', test: () => inputValue(SEARCH).length >= 3 },
    },
    {
      id: 'table',
      title: 'Cada cobro con su detalle',
      body: 'Fecha, cotización, método y cuenta. Un administrador puede corregir o anular un pago, y queda registrado quién y por qué.',
      target: 'main table',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'excel',
      title: 'Todo en Excel',
      body: 'Con "Exportar Excel" descargas lo que ves, con los mismos filtros.',
      target: { css: 'main button', text: 'Exportar Excel' },
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
