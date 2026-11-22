import { ScrollText } from 'lucide-react';

import { buttonIn, DIALOG, navigateStep, openQuotationStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const GUIDE_FORM = '[data-testid="guide-form-dialog"]';

export const dispatchGuidesLesson: TutorialLesson = {
  code: 'dispatch-guides',
  section: 'operations',
  title: 'Guía de remisión de un pedido',
  summary: 'Arma la guía de un pedido listo para entregar, ya llena con el cliente y lo que falta despachar.',
  minutes: 4,
  icon: ScrollText,
  requires: { buttons: ['dispatch_guide.create.button'], routes: ['/logistica/guias', '/cotizaciones'] },
  prepare: 'ready_quotation',
  steps: ({ quotationId }) => [
    navigateStep({
      id: 'go-quotations',
      path: '/cotizaciones',
      label: 'Cotizaciones',
      group: 'Ventas',
      body: 'Te preparamos un pedido "Lista para entregar".',
    }),
    openQuotationStep(quotationId, 'Está en la columna "Lista para entregar". Ábrela.'),
    {
      id: 'build-guide',
      title: 'Arma la guía',
      body: 'Presiona el camión.',
      target: { css: 'button[aria-label="Armar guía de remisión"]', within: DIALOG },
      done: { kind: 'appear', target: GUIDE_FORM },
    },
    {
      id: 'guide-info',
      title: 'Ya viene llena',
      body: 'El cliente, su dirección, el almacén de partida y lo que falta despachar ya están. Revisa el motivo, el peso y elige vehículo y conductor si los tienes.',
      target: GUIDE_FORM,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'save',
      title: 'Guarda el borrador',
      body: 'Presiona "Guardar borrador".',
      target: GUIDE_FORM,
      pointer: buttonIn(GUIDE_FORM, 'Guardar borrador'),
      done: { kind: 'toast', texts: ['Borrador de guía'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Borrador listo!',
      body: 'Emítela en SUNAT con estos datos y luego regístrala en Logística → Guías de remisión con su número y su PDF.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
