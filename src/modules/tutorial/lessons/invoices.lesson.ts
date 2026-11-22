import { FileCheck2 } from 'lucide-react';

import { dialogWith, navigateStep, visible } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const INBOX = '[data-testid="pending-purchases"]';
const LINK_DIALOG = '[data-testid="link-invoice-dialog"]';

export const invoicesLesson: TutorialLesson = {
  code: 'invoices',
  section: 'finance',
  title: 'Facturas de compra',
  summary: 'Las compras cuya factura llega después: regístrala cuando llegue.',
  minutes: 3,
  icon: FileCheck2,
  requires: { buttons: ['invoice.link.button'], routes: ['/facturas'] },
  prepare: 'pending_invoice_purchase',
  steps: () => [
    navigateStep({
      id: 'go-invoices',
      path: '/facturas',
      label: 'Facturas',
      group: 'Finanzas',
      body: 'Las facturas de tus compras y de tus ventas. Te preparamos una compra con la factura pendiente.',
    }),
    {
      id: 'pending-tab',
      title: 'Compras sin factura',
      body: 'Aquí esperan las compras que dijeron "la factura llega después".',
      target: '[data-testid="pending-purchases-tab"]',
      done: { kind: 'check', test: visible(INBOX) },
    },
    {
      id: 'select',
      title: 'Elige las compras de esa factura',
      body: 'Marca la compra (si una factura cubre varias, márcalas todas).',
      target: { css: `${INBOX} button`, text: 'Seleccionar la página' },
      done: { kind: 'click' },
    },
    {
      id: 'register',
      title: 'Registra la factura',
      body: 'Presiona "Registrar factura".',
      target: { css: `${INBOX} button`, text: 'Registrar factura' },
      done: { kind: 'appear', target: LINK_DIALOG },
    },
    {
      id: 'form',
      title: 'Sus datos',
      body: 'Serie y número, fecha, total y, si quieres, la foto o el PDF. Todo es opcional: lo que tengas.',
      hint: 'Ejemplo: "F001-123" y el total. Luego "Guardar factura".',
      target: LINK_DIALOG,
      pointer: '#invoice-series',
      // Si la serie ya existe, el sistema pregunta antes de repetirla.
      allow: [dialogWith('¿Factura repetida?')],
      done: { kind: 'toast', texts: ['Factura vinculada'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Factura registrada!',
      body: 'Su IGV ya cuenta en el IGV del mes (Caja). En "Faltan subir" ves las facturas que todavía no tienen su archivo.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
