import { ClipboardList } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const PDF = dialogWith('Orden de compra OC-');

export const purchaseOrdersLesson: TutorialLesson = {
  code: 'purchase-orders',
  section: 'sales',
  title: 'Órdenes de compra',
  summary: 'Revisa qué hay que comprar, imprime la orden con fotos y registra la compra.',
  minutes: 4,
  icon: ClipboardList,
  requires: { buttons: ['purchase_order.pdf.button', 'purchase_order.item.registerPurchase.button'], routes: ['/ordenes-compra'] },
  prepare: 'purchase_order',
  steps: () => [
    navigateStep({
      id: 'go-orders',
      path: '/ordenes-compra',
      label: 'Órdenes de compra',
      group: 'Ventas',
      body: 'Aquí están todas las compras encargadas, de todos los pedidos. Te preparamos una.',
    }),
    {
      id: 'pdf',
      title: 'Imprime la orden',
      body: 'Presiona el ícono del documento: el PDF lleva foto, código y cantidad de cada producto.',
      target: { css: 'main button[aria-label^="PDF de la orden OC-"]' },
      // La ventana, no el PDF ya cargado: con el servidor lento la luz se quedaba
      // atrás de la ventana abierta mientras el PDF cargaba (26-nov).
      done: { kind: 'appear', target: PDF },
    },
    {
      id: 'pdf-info',
      title: 'Para quien sale a comprar',
      body: 'Descárgalo o mándalo por WhatsApp a quien compra: así no se equivoca de producto.',
      target: PDF,
      pointer: buttonIn(DIALOG, 'Descargar'),
      done: { kind: 'ack' },
    },
    {
      id: 'close-pdf',
      title: 'Cierra el PDF',
      body: 'Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      done: { kind: 'disappear', target: PDF },
    },
    {
      id: 'register',
      title: 'Registra lo que compraste',
      body: 'Presiona el carrito del producto.',
      target: { css: 'main button[title="Registrar compra"]' },
      done: { kind: 'appear', target: '#purchase-amount' },
    },
    {
      id: 'purchase-form',
      title: '¿Cuánto pagaste?',
      body: 'Escribe el monto, di con qué plata se pagó y si tiene factura, y guarda.',
      hint: 'Ejemplo: 300, "Plata de la empresa" y "No lleva factura".',
      target: { css: '#purchase-amount', closest: 'form' },
      pointer: '#purchase-amount',
      done: { kind: 'toast', texts: ['Compra registrada', 'Compra adicional registrada'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Compra registrada!',
      body: 'Cuando todo lo de una orden está comprado, la orden queda "Finalizada". El gasto aparece en Caja y en la ganancia del pedido.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
