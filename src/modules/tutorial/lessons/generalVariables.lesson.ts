import { SlidersHorizontal } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nueva variable general');

export const generalVariablesLesson: TutorialLesson = {
  code: 'general-variables',
  section: 'settings',
  title: 'Listas de tu empresa',
  summary: 'Agrega categorías de productos y otras listas que usa tu empresa.',
  minutes: 2,
  icon: SlidersHorizontal,
  requires: { buttons: ['variable_general.create.button'], routes: ['/configuracion/variables-generales'] },
  steps: () => [
    navigateStep({
      id: 'go-variables',
      path: '/configuracion/variables-generales',
      label: 'Generales',
      group: 'Configuración',
      body: 'Las listas que usa tu empresa: categorías de productos, tipos de gasto y otras.',
    }),
    {
      id: 'new',
      title: 'Agrega un valor',
      body: 'Presiona "Nueva variable".',
      target: { css: 'main button', text: 'Nueva variable' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'A qué lista y qué valor',
      body: 'La categoría es la lista; el nombre es lo que ves al elegirlo; el código, uno corto sin espacios.',
      hint: 'Ejemplo: categoría "product_category", título "Categoría", código "tazas", nombre "Tazas". Luego "Crear variable".',
      target: FORM,
      pointer: '#category',
      done: { kind: 'toast', texts: ['Variable creada correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Agregado!',
      body: 'La categoría "Tazas" ya se puede elegir al crear un producto.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
