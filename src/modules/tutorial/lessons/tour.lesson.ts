import { Compass } from 'lucide-react';

import { SIDEBAR } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

// Lección 1: un paseo por la pantalla (solo mirar, sin guardar nada).
export const tourLesson: TutorialLesson = {
  code: 'tour',
  section: 'start',
  title: 'Conoce el sistema',
  summary: 'Dónde está cada cosa: el menú, el botón de cotizar, los avisos y tu perfil.',
  minutes: 2,
  icon: Compass,
  requires: {},
  steps: () => [
    {
      id: 'welcome',
      title: 'Bienvenido al modo enseñanza',
      body: 'Vas a aprender usando el sistema de verdad, en tu empresa de práctica: nada de lo que hagas aquí toca tus datos reales. Sigue la luz y la mano: solo se puede tocar lo que está iluminado.',
      done: { kind: 'ack', label: 'Empezar' },
    },
    {
      id: 'menu',
      title: 'Este es el menú',
      body: 'Aquí están todas las pantallas que tu rol puede usar, agrupadas en Ventas, Finanzas y Configuración. Toca un grupo para abrirlo.',
      target: SIDEBAR,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'quick-quotation',
      title: 'El botón naranja crea cotizaciones',
      body: 'Está en todas las pantallas: desde donde estés puedes armar una cotización nueva.',
      target: 'button[aria-label="Nueva cotización"]',
      done: { kind: 'ack' },
    },
    {
      id: 'reminders',
      title: 'Tus avisos',
      body: 'La campana te muestra los recordatorios pendientes: cobros por vencer, cotizaciones por seguir y lo que tu equipo te asigne.',
      target: 'main button[aria-label^="Recordatorios"]',
      done: { kind: 'ack' },
    },
    {
      id: 'profile',
      title: 'Tu perfil',
      body: 'Desde aquí activas las notificaciones al teléfono, entras a "Aprender" y sales del sistema.',
      target: 'button[aria-label="Abrir menú de perfil"]',
      done: { kind: 'ack' },
    },
    {
      // Pedido del usuario (26-nov): que quede claro cómo volver a la cuenta real.
      id: 'way-back',
      title: 'Así vuelves a tu cuenta',
      body: 'Cuando termines de practicar, presiona "Volver a mi cuenta" en esta franja naranja. Siempre está arriba, aunque estés en medio de una lección.',
      target: { css: '[data-testid="practice-mode-banner"] button', text: 'Volver a mi cuenta' },
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
