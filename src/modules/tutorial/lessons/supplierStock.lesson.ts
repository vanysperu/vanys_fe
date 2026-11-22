import { PackageSearch } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nueva fuente de stock');

export const supplierStockLesson: TutorialLesson = {
  code: 'supplier-stock',
  section: 'sales',
  title: 'Stock de proveedores',
  summary: 'Lee el stock de tus proveedores desde su Excel y míralo al cotizar.',
  minutes: 3,
  icon: PackageSearch,
  requires: { buttons: ['supplier_stock.sources.create.button'], routes: ['/stock-proveedores'] },
  steps: () => [
    navigateStep({
      id: 'go-stock',
      path: '/stock-proveedores',
      label: 'Stock de proveedores',
      group: 'Ventas',
      body: 'Cuánto tiene cada proveedor de cada producto, leído de su Excel.',
    }),
    {
      id: 'sources-tab',
      title: 'Entra a "Fuentes"',
      body: 'Una fuente es el Excel (o el enlace) de un proveedor.',
      target: { css: '[role="tab"]', text: 'Fuentes', exact: true },
      done: { kind: 'check', test: () => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() === 'Fuentes' },
    },
    {
      id: 'new',
      title: 'Agrega una fuente',
      body: 'Presiona "Nueva fuente".',
      target: { css: 'main button', text: 'Nueva fuente' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'De qué proveedor y qué columnas',
      body: 'Elige el proveedor, ponle un nombre y escribe el título de la columna del Excel donde está el código y el de la cantidad. El archivo lo puedes subir después.',
      hint: 'Ejemplo: "Importadora Andina SAC", "Stock general", "Archivo que se sube", columnas "codigo" y "stock". Luego "Crear fuente".',
      target: FORM,
      pointer: null,
      done: { kind: 'toast', texts: ['Fuente creada'] },
      checkpoint: true,
      skippable: true,
    },
    {
      id: 'done',
      title: '¡Fuente creada!',
      body: 'Cuando subas su Excel, el stock aparece aquí y debajo de cada producto al armar una cotización.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
