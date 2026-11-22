import { Send } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep, openQuotationStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const PREVIEW = dialogWith('Vista previa —');
const SHARE = dialogWith('Compartir COT-');

export const shareQuotationLesson: TutorialLesson = {
  code: 'share-quotation',
  title: 'Envíala a tu cliente',
  summary: 'Mira el PDF y compártelo por enlace, WhatsApp o correo.',
  minutes: 3,
  icon: Send,
  requires: { buttons: ['cotizacion.share.whatsapp.button'], routes: ['/cotizaciones'] },
  prepare: 'pending_quotation',
  steps: ({ quotationId }) => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Te preparamos una cotización pendiente para practicar.',
    }),
    openQuotationStep(quotationId, 'Toca la tarjeta para ver todo el detalle.'),
    {
      id: 'preview',
      title: 'Mira el PDF',
      body: 'Presiona el ojo: así lo verá tu cliente.',
      target: { css: 'button[title="Vista previa del PDF"]', within: DIALOG },
      done: { kind: 'appear', target: 'iframe[title="Vista previa del PDF"]' },
    },
    {
      id: 'preview-info',
      title: 'Este es el PDF de la cotización',
      body: 'Lleva tu logo, los productos, los totales y tus cuentas para pagar (con su CCI). Con "Descargar" lo guardas.',
      target: PREVIEW,
      pointer: buttonIn(DIALOG, 'Descargar'),
      done: { kind: 'ack' },
    },
    {
      id: 'close-preview',
      title: 'Cierra la vista previa',
      body: 'Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      done: { kind: 'disappear', target: PREVIEW },
    },
    {
      id: 'share',
      title: 'Compártela',
      body: 'Presiona el botón de compartir.',
      target: { css: 'button[aria-label="Compartir con el cliente"]', within: DIALOG },
      done: { kind: 'appear', target: SHARE },
    },
    {
      id: 'share-info',
      title: 'Enlace, WhatsApp o correo',
      body: 'Copia el enlace o envíalo por WhatsApp o correo. El enlace abre el PDF de la cotización y lo puedes apagar cuando quieras con el interruptor.',
      target: SHARE,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'close-share',
      title: 'Cierra esta ventana',
      body: 'Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      done: { kind: 'disappear', target: SHARE },
    },
  ],
};
