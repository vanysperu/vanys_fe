import { BellRing } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo recordatorio');

export const remindersLesson: TutorialLesson = {
  code: 'reminders',
  section: 'settings',
  title: 'Recordatorios',
  summary: 'Prográmate avisos (o a tu equipo) para no olvidar una llamada, un cobro o una entrega.',
  minutes: 2,
  icon: BellRing,
  requires: { buttons: ['reminder.create.button'], routes: ['/recordatorios'] },
  steps: () => [
    navigateStep({ id: 'go-reminders', path: '/recordatorios', label: 'Recordatorios', body: 'Avisos con fecha y hora, para ti o para tu equipo.' }),
    {
      id: 'new',
      title: 'Programa un recordatorio',
      body: 'Presiona "Nuevo recordatorio".',
      target: { css: 'main button', text: 'Nuevo recordatorio' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: '¿Qué, cuándo y para quién?',
      body: 'La fecha y la hora ya vienen llenas; cámbialas si quieres. En "¿Para quién?" puedes sumar a otras personas.',
      hint: 'Ejemplo: "Llamar a Comercial Los Andes". Luego "Programar recordatorio".',
      target: FORM,
      pointer: '#reminder-title',
      done: { kind: 'toast', texts: ['Recordatorio programado'] },
      checkpoint: true,
    },
    {
      id: 'bell',
      title: 'Te avisa la campana',
      body: 'Cuando llegue la hora, aparece aquí y como aviso en la pantalla (y en tu teléfono si activaste las notificaciones).',
      target: 'main button[aria-label^="Recordatorios"]',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
