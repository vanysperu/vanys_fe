import { PackagePlus } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo ingreso');
// Detalle del documento confirmado ("Ingreso NI01-000001").
const DOCUMENT_DETAIL = dialogWith('Ingreso NI');

export const inventoryEntryLesson: TutorialLesson = {
  code: 'inventory-entry',
  section: 'operations',
  title: 'Entradas de stock y kardex',
  summary: 'Registra lo que entra al almacén y mira el stock y el kardex de cada producto.',
  minutes: 4,
  icon: PackagePlus,
  requires: {
    buttons: ['inventory.documents.create.button', 'inventory.documents.post.button'],
    routes: ['/inventario/documentos', '/inventario/stock', '/inventario/kardex'],
  },
  prepare: 'warehouse',
  steps: () => [
    navigateStep({
      id: 'go-documents',
      path: '/inventario/documentos',
      label: 'Movimientos',
      group: 'Inventario',
      body: 'Todo lo que entra, sale o se mueve entre almacenes queda como un documento.',
    }),
    {
      id: 'new-entry',
      title: 'Registra un ingreso',
      body: 'Presiona "Ingreso".',
      target: { css: 'main button', text: 'Ingreso', exact: true },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Qué entra y a qué almacén',
      body: 'Elige el almacén y el motivo, agrega el producto con su cantidad y su costo, y confírmalo.',
      hint: 'Ejemplo: "Almacén principal", motivo "Inventario inicial", "Polo de algodón", 25 a 9.50. Luego "Guardar y confirmar".',
      target: FORM,
      pointer: null,
      done: { kind: 'toast', texts: ['Documento confirmado', 'Borrador guardado'] },
      checkpoint: true,
    },
    {
      id: 'close-detail',
      title: 'Cierra el documento',
      body: 'Queda con su número y no se puede cambiar: para corregir se hace otro documento. Presiona la X.',
      target: buttonIn(DIALOG, 'Cerrar', true),
      // Si solo se guardó el borrador no hay detalle abierto: el paso pasa solo.
      done: { kind: 'disappear', target: DOCUMENT_DETAIL, waitForAppearMs: 2500 },
    },
    navigateStep({ id: 'go-stock', path: '/inventario/stock', label: 'Stock', group: 'Inventario', body: 'Cuánto tienes de cada producto.' }),
    {
      id: 'stock',
      title: 'Tu stock al día',
      body: 'Una columna por almacén y el total. Baja solo cuando entregas un pedido (si la tienda lo tiene activado).',
      target: 'main table',
      pointer: null,
      done: { kind: 'ack' },
    },
    navigateStep({ id: 'go-kardex', path: '/inventario/kardex', label: 'Kardex', group: 'Inventario', body: 'La historia de cada producto.' }),
    {
      id: 'kardex',
      title: 'El kardex',
      body: 'Elige un producto y ves cada entrada y salida, con su saldo. Ideal para cuadrar con un conteo físico.',
      target: 'main',
      pointer: null,
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
