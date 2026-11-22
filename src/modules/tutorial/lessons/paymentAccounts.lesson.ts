import { Landmark } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = '[data-testid="payment-account-form"]';

export const paymentAccountsLesson: TutorialLesson = {
  code: 'payment-accounts',
  section: 'settings',
  title: 'Tus cuentas para cobrar',
  summary: 'Agrega una cuenta bancaria con su CCI (o Yape/Plin) para que salga en tus cotizaciones.',
  minutes: 2,
  icon: Landmark,
  requires: { routes: ['/configuracion/documentos'] },
  steps: () => [
    navigateStep({
      id: 'go-documents',
      path: '/configuracion/documentos',
      label: 'Documentos de la empresa',
      group: 'Configuración',
      body: 'Aquí configuras lo que sale en tus cotizaciones: logo, textos y cuentas para pagar.',
    }),
    {
      id: 'add',
      title: 'Agrega una cuenta',
      body: 'Presiona "Agregar cuenta".',
      target: { css: 'button', text: 'Agregar cuenta' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Número y CCI',
      body: 'En Perú cada cuenta bancaria tiene dos números: el del banco y el CCI (20 dígitos, para transferencias de otros bancos). Pon los dos.',
      hint: 'Tipo "Cuenta bancaria", nombre "BCP Soles", número y CCI. Luego "Guardar".',
      target: FORM,
      pointer: null,
      done: { kind: 'toast', texts: ['Cuenta agregada'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Cuenta lista!',
      body: 'Sale en el PDF de cada cotización, con su CCI, para que tu cliente sepa dónde pagarte.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
