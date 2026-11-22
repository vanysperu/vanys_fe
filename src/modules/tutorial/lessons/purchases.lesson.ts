import { ShoppingCart } from 'lucide-react';

import { buttonIn, DIALOG, navigateStep, openQuotationStep, tabStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

export const purchasesLesson: TutorialLesson = {
  code: 'purchases',
  section: 'sales',
  title: 'Compras del pedido',
  summary: 'Crea la orden de compra de un pedido y registra lo que compraste.',
  minutes: 4,
  icon: ShoppingCart,
  requires: { buttons: ['purchase_order.create.button'], routes: ['/cotizaciones'] },
  prepare: 'accepted_quotation',
  steps: ({ quotationId }) => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Te preparamos una cotización aceptada: hay que comprar los polos.',
    }),
    openQuotationStep(quotationId, 'Está en la columna "Aceptada". Ábrela.'),
    tabStep('purchases-tab', quotationId, 'Compras', 'Aquí se ve qué hay que comprar para este pedido y qué ya se compró.'),
    {
      id: 'new-order',
      title: 'Crea la orden de compra',
      body: 'Presiona "Crear orden de compra".',
      target: buttonIn(DIALOG, 'Crear orden de compra'),
      done: { kind: 'appear', target: '#po-notes' },
    },
    {
      id: 'order-form',
      title: 'Arma la orden',
      body: 'Marca el producto a comprar, elige a quién se le encarga y presiona "Crear orden".',
      hint: 'Encárgatela a ti.',
      target: { css: '#po-notes', closest: 'form' },
      done: { kind: 'toast', texts: ['Orden de compra creada'] },
      checkpoint: true,
    },
    {
      id: 'register-purchase',
      title: 'Registra la compra',
      body: 'Cuando compres, anótalo aquí: así se descuenta de la ganancia del pedido.',
      target: { css: 'button[title="Registrar compra"]', within: DIALOG },
      done: { kind: 'appear', target: '#purchase-amount' },
    },
    {
      id: 'purchase-form',
      title: '¿Cuánto pagaste?',
      body: 'Escribe el monto, di si la compra tiene factura y guarda.',
      hint: 'Ejemplo: 300 y "No lleva factura".',
      target: { css: '#purchase-amount', closest: 'form' },
      pointer: '#purchase-amount',
      done: { kind: 'toast', texts: ['Compra registrada', 'Compras sin factura'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Compra registrada!',
      body: 'La ves en "Ver compras", en Órdenes de compra y en Caja. Si llega factura después, la subes en Facturas.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
