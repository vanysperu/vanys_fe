import { Warehouse } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo almacén');

export const warehousesLesson: TutorialLesson = {
  code: 'warehouses',
  section: 'operations',
  title: 'Tus almacenes',
  summary: 'Crea los almacenes de cada tienda, donde vive tu stock.',
  minutes: 2,
  icon: Warehouse,
  requires: { buttons: ['inventory.warehouses.create.button'], routes: ['/inventario/almacenes'] },
  steps: () => [
    navigateStep({
      id: 'go-warehouses',
      path: '/inventario/almacenes',
      label: 'Almacenes',
      group: 'Inventario',
      body: 'Cada tienda puede tener uno o varios almacenes.',
    }),
    {
      id: 'new',
      title: 'Crea un almacén',
      body: 'Presiona "Nuevo almacén".',
      target: { css: 'main button', text: 'Nuevo almacén' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Su tienda, código y nombre',
      body: 'Si controlas lotes o fechas de vencimiento, actívalo aquí.',
      hint: 'Ejemplo: tienda PRACTICA, código "TIENDA", nombre "Almacén de la tienda". Luego "Crear almacén".',
      target: FORM,
      pointer: '#warehouse-code',
      done: { kind: 'toast', texts: ['Almacén creado'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Almacén creado!',
      body: 'El primero de cada tienda queda como predeterminado. En "Productos" decides qué productos manejan stock.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
