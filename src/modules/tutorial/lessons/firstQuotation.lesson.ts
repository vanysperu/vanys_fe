import { FilePlus2 } from 'lucide-react';

import { comboboxChosen, dialogWith, navigateStep, visible } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const CLIENT = '[data-tour="quotation-client"]';
const PRODUCT = '[data-tour="quotation-item-0-product"]';
const TECHNIQUE = '[data-tour="quotation-item-0-technique"]';

export const firstQuotationLesson: TutorialLesson = {
  code: 'first-quotation',
  section: 'start',
  title: 'Tu primera cotización',
  summary: 'Arma una cotización con cliente, producto y técnica, y mira cómo se calcula el total.',
  minutes: 4,
  icon: FilePlus2,
  requires: { buttons: ['cotizacion.create.button'], routes: ['/cotizaciones'] },
  steps: () => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Todas tus cotizaciones viven aquí, ordenadas por estado: pendientes, aceptadas, en producción...',
    }),
    {
      id: 'new',
      title: 'Crea una cotización nueva',
      body: 'Presiona "Nueva cotización".',
      target: { css: 'main button', text: 'Nueva cotización' },
      done: { kind: 'appear', target: dialogWith('Nueva cotización') },
    },
    {
      id: 'client',
      title: 'Elige el cliente',
      body: 'Busca y elige a quién le vas a cotizar.',
      hint: 'Elige "Comercial Los Andes SAC".',
      target: CLIENT,
      done: { kind: 'check', test: comboboxChosen(CLIENT, 'Selecciona un cliente') },
    },
    {
      id: 'product',
      title: 'Elige el producto',
      body: 'Busca el producto por su nombre o su código.',
      hint: 'Elige "Polo de algodón".',
      target: PRODUCT,
      done: { kind: 'check', test: comboboxChosen(PRODUCT, 'Producto') },
    },
    {
      id: 'technique',
      title: 'Elige cómo se personaliza',
      body: 'Este producto lleva logo: elige la técnica. Su precio se suma al del producto.',
      hint: 'Elige "Bordado".',
      target: TECHNIQUE,
      done: {
        kind: 'check',
        // Un producto sin personalización no pide técnica: el paso se salta solo.
        test: () => visible('[data-testid="item-no-customization-0"]')() || comboboxChosen(TECHNIQUE, 'Selecciona una técnica')(),
      },
    },
    {
      id: 'quantity',
      title: '¿Cuántas unidades?',
      body: 'Escribe la cantidad. El precio por unidad cambia solo si compran por ciento o por millar.',
      hint: 'Escribe 50 y presiona "Listo".',
      target: '[data-tour="quotation-item-0-quantity"]',
      done: { kind: 'ack', label: 'Listo' },
    },
    {
      id: 'totals',
      title: 'Así se calcula el total',
      body: 'Subtotal + IGV (18 %) = total a pagar. Cuando el cliente acepte, el sistema te sugerirá cobrar la mitad de adelanto.',
      target: '[data-testid="quotation-totals"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'create',
      title: 'Guarda la cotización',
      body: 'Presiona "Crear cotización".',
      target: '[data-tour="quotation-submit"]',
      done: { kind: 'toast', texts: ['Cotización creada correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Tu cotización está lista!',
      body: 'Quedó en la columna "Pendiente". En la siguiente lección aprendes a enviársela a tu cliente.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
