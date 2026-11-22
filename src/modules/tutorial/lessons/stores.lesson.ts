import { Store } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nueva tienda');

export const storesLesson: TutorialLesson = {
  code: 'stores',
  section: 'settings',
  title: 'Tus tiendas',
  summary: 'Agrega una tienda o sucursal con su dirección y su horario.',
  minutes: 2,
  icon: Store,
  requires: { buttons: ['platform.businessUnit.create.button'], routes: ['/configuracion/tiendas'] },
  steps: () => [
    navigateStep({
      id: 'go-stores',
      path: '/configuracion/tiendas',
      label: 'Tiendas',
      group: 'Configuración',
      body: 'Cada tienda tiene sus cotizaciones y su equipo; un Gestor solo ve la suya.',
    }),
    {
      id: 'new',
      title: 'Agrega una tienda',
      body: 'Presiona "Nueva tienda".',
      target: { css: 'main button', text: 'Nueva tienda' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Su código, dirección y horario',
      body: 'El código es corto (letras, números y guiones). La dirección y el horario salen para tus clientes.',
      hint: 'Ejemplo: "TIENDA-SUR", lunes a sábado de 08:00 a 18:30. Luego "Crear tienda".',
      target: FORM,
      pointer: '#business_code',
      done: { kind: 'toast', texts: ['Tienda creada correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Tienda creada!',
      body: 'Ahora puedes asignarle usuarios y sus cotizaciones quedan separadas.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
