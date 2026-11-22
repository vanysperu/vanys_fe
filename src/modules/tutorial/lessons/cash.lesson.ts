import { Wallet } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const IGV = dialogWith('¿Cómo se calculó el IGV');

export const cashLesson: TutorialLesson = {
  code: 'cash',
  title: 'Caja e IGV del mes',
  summary: 'Lee el resumen del mes, entiende el IGV, registra un gasto y descarga el Excel.',
  minutes: 4,
  icon: Wallet,
  requires: { buttons: ['cash_movement.create.button'], routes: ['/caja'] },
  steps: () => [
    navigateStep({
      id: 'go-cash',
      path: '/caja',
      label: 'Caja',
      group: 'Finanzas',
      body: 'Todo el dinero que entra y sale: cobros, compras, gastos y transferencias.',
    }),
    {
      id: 'summary',
      title: 'El resumen del mes',
      body: 'Ingresos, egresos, el resultado y el IGV estimado del mes. Con las flechas ves otros meses.',
      target: '[data-testid="cash-month-summary"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'igv',
      title: '¿De dónde sale el IGV?',
      body: 'Presiona "Ver cómo se calculó".',
      target: { css: 'button', text: 'Ver cómo se calculó' },
      done: { kind: 'appear', target: IGV },
    },
    {
      id: 'igv-info',
      title: 'IGV de ventas menos IGV de compras',
      body: 'El IGV de lo que cobraste menos el de tus compras con factura = lo que pagarías. Abajo está el detalle, cobro por cobro.',
      target: IGV,
      pointer: '[data-testid="igv-equation"]',
      done: { kind: 'ack' },
    },
    {
      id: 'close-igv',
      title: 'Cierra el detalle',
      body: 'Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      done: { kind: 'disappear', target: IGV },
    },
    {
      id: 'new-movement',
      title: 'Registra un gasto',
      body: 'Los gastos que no son de un pedido (luz, útiles, pasajes) se anotan aquí. Presiona "Nuevo movimiento".',
      target: { css: 'main button', text: 'Nuevo movimiento' },
      done: { kind: 'appear', target: '#cash-movement-amount' },
    },
    {
      id: 'movement-form',
      title: 'Llena el movimiento',
      body: 'Elige si es ingreso o egreso, la categoría, el monto, la fecha y una descripción.',
      hint: 'Ejemplo: Egreso, "Otro egreso", 30, "Útiles de oficina". Luego "Registrar movimiento".',
      target: { css: '#cash-movement-amount', closest: '[role="dialog"]' },
      pointer: null,
      done: { kind: 'toast', texts: ['Movimiento registrado correctamente'] },
      checkpoint: true,
    },
    {
      id: 'excel',
      title: 'Todo en Excel',
      body: 'Con "Exportar Excel" descargas lo que ves en la pantalla, con los mismos filtros.',
      target: { css: 'main button', text: 'Exportar Excel' },
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
