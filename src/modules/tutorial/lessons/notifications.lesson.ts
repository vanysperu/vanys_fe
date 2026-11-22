import { Smartphone } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const PUSH = dialogWith('Notificaciones en este teléfono');
const PROFILE = 'button[aria-label="Abrir menú de perfil"]';

export const notificationsLesson: TutorialLesson = {
  code: 'notifications',
  section: 'settings',
  title: 'Avisos en tu teléfono',
  summary: 'Recibe en el celular los pedidos nuevos y tus recordatorios.',
  minutes: 1,
  icon: Smartphone,
  requires: {},
  steps: () => [
    {
      id: 'profile',
      title: 'Abre tu perfil',
      body: 'Toca tu nombre, abajo en el menú.',
      // En el celular el menú está escondido: primero el botón que lo abre.
      target: [PROFILE, 'button[aria-label="Abrir menú"]'],
      done: { kind: 'appear', target: { css: '[data-radix-popper-content-wrapper] button', text: 'Notificaciones' } },
    },
    {
      id: 'open',
      title: 'Notificaciones',
      body: 'Presiona "Notificaciones".',
      target: { css: '[data-radix-popper-content-wrapper] button', text: 'Notificaciones' },
      done: { kind: 'appear', target: PUSH },
    },
    {
      id: 'info',
      title: 'Actívalas en tu celular',
      body: 'Abre el sistema en tu teléfono, entra aquí y presiona "Activar notificaciones". En iPhone, primero agrega la app a tu pantalla de inicio.',
      target: PUSH,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'close',
      title: 'Cierra esta ventana',
      body: 'Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      done: { kind: 'disappear', target: PUSH },
    },
  ],
};
