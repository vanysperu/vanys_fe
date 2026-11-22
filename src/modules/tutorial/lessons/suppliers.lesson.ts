import { Truck } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo proveedor');

export const suppliersLesson: TutorialLesson = {
  code: 'suppliers',
  section: 'sales',
  title: 'Tus proveedores',
  summary: 'Registra a quién le compras para asociarlo a tus facturas y a su stock.',
  minutes: 2,
  icon: Truck,
  requires: { buttons: ['supplier.create.button'], routes: ['/proveedores'] },
  steps: () => [
    navigateStep({ id: 'go-suppliers', path: '/proveedores', label: 'Proveedores', group: 'Ventas', body: 'A quiénes les compras.' }),
    {
      id: 'new',
      title: 'Agrega un proveedor',
      body: 'Presiona "Nuevo proveedor".',
      target: { css: 'main button', text: 'Nuevo proveedor' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Sus datos',
      body: 'Solo el nombre es obligatorio. Si también te transporta la mercadería, marca "Es transportista".',
      hint: 'Ejemplo: "Importadora Lima SAC". Luego "Crear proveedor".',
      target: FORM,
      pointer: '#supplier-name',
      done: { kind: 'toast', texts: ['Proveedor creado correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Proveedor guardado!',
      body: 'Lo eliges al registrar una factura de compra, y su stock lo puedes leer de su Excel.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
