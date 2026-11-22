import { Workflow } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const ROWS = '[data-testid="workflow-stage-row"]';

export const productionWorkflowLesson: TutorialLesson = {
  code: 'production-workflow',
  section: 'settings',
  title: 'Tu flujo de producción',
  summary: 'Las columnas por las que pasa cada producto de un pedido: diseño, insumos, producción...',
  minutes: 3,
  icon: Workflow,
  requires: { buttons: ['production_workflow.update.button'], routes: ['/configuracion/flujo-produccion'] },
  steps: () => [
    navigateStep({
      id: 'go-workflow',
      path: '/configuracion/flujo-produccion',
      label: 'Flujo de producción',
      group: 'Configuración',
      body: 'Así avanza cada producto de un pedido dentro de tu taller.',
    }),
    {
      id: 'stages',
      title: 'Tus columnas',
      body: 'Cada fila es una columna del tablero de producción, con su orden, su tipo y su color.',
      target: ROWS,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'add',
      title: 'Agrega una columna',
      body: 'Presiona "Agregar columna".',
      target: { css: 'main button', text: 'Agregar columna' },
      done: {
        kind: 'check',
        // Aparece una fila nueva con el nombre vacío.
        test: () =>
          Array.from(document.querySelectorAll<HTMLInputElement>('input[placeholder="Nombre de la columna"]')).some(
            (input) => input.value.trim() === '',
          ),
      },
    },
    {
      id: 'name-and-save',
      title: 'Ponle nombre y guarda',
      body: 'Escribe el nombre de la columna nueva y presiona "Guardar".',
      hint: 'Ejemplo: "Control de calidad".',
      target: 'main',
      pointer: { css: 'main button', text: 'Guardar', exact: true },
      done: { kind: 'toast', texts: ['Flujo de producción guardado'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Flujo guardado!',
      body: 'Desde ahora los productos de cada pedido pasan por estas columnas en la pestaña de producción.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
