import { Factory } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep, openQuotationStep, statusStep, tabStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FINISH = dialogWith('Finalizar COT-');

export const productionAndDeliveryLesson: TutorialLesson = {
  code: 'production-and-delivery',
  title: 'Diseño, producción y entrega',
  summary: 'Sube el diseño, avanza la cotización paso a paso hasta entregarla y ciérrala.',
  minutes: 5,
  icon: Factory,
  requires: { buttons: ['cotizacion.changeStatus.button'], routes: ['/cotizaciones'] },
  prepare: 'accepted_quotation',
  steps: ({ quotationId }) => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Te preparamos una cotización aceptada (con su adelanto): toca producirla.',
    }),
    openQuotationStep(quotationId, 'Está en la columna "Aceptada". Ábrela.'),
    tabStep('designs-tab', quotationId, 'Diseños', 'Aquí guardas los diseños (mockups) del pedido: solo los ve tu equipo.'),
    {
      id: 'upload',
      title: 'Sube el diseño',
      body: 'Presiona "Subir diseño" y elige una imagen o un PDF de tu equipo (un logo, una foto...).',
      target: { css: 'button', text: 'Subir diseño', within: DIALOG, closest: 'div.border-dashed' },
      pointer: buttonIn(DIALOG, 'Subir diseño'),
      done: { kind: 'toast', texts: ['Diseño subido'] },
      checkpoint: true,
      // Si no tiene una imagen a mano, puede seguir igual.
      skippable: true,
    },
    statusStep('design', 'Diseño en aprobación', 'Le enviaste el diseño al cliente y esperas su visto bueno.'),
    statusStep('production', 'En proceso', 'El cliente aprobó el diseño: empieza la producción.'),
    statusStep('ready', 'Lista para entregar', 'El pedido está terminado y listo para el cliente.'),
    statusStep('delivered', 'Entregada', 'El cliente ya recibió su pedido.'),
    {
      id: 'finish',
      title: 'Cierra la cotización',
      body: 'Presiona "Finalizada" cuando todo esté cobrado y entregado.',
      target: buttonIn(DIALOG, 'Finalizada', true),
      done: { kind: 'appear', target: FINISH },
    },
    {
      id: 'finish-form',
      title: '¿Emitiste factura?',
      body: 'Responde si se emitió factura y presiona "Finalizar". Si dices que sí, queda pendiente subirla en Facturas.',
      hint: 'Para practicar, responde "No".',
      target: FINISH,
      pointer: '[data-testid="invoice-question"]',
      done: { kind: 'toast', texts: ['Cotización finalizada'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Pedido cerrado!',
      body: 'En "Historial" queda cada paso con su fecha y quién lo hizo.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
