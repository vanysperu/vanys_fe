import { Users } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo cliente');

export const clientsLesson: TutorialLesson = {
  code: 'clients',
  section: 'sales',
  title: 'Tus clientes',
  summary: 'Registra un cliente con sus datos para cotizarle más rápido.',
  minutes: 2,
  icon: Users,
  requires: { buttons: ['cliente.create.button'], routes: ['/clientes'] },
  steps: () => [
    navigateStep({
      id: 'go-clients',
      path: '/clientes',
      label: 'Clientes',
      group: 'Ventas',
      body: 'Aquí está tu cartera de clientes.',
    }),
    {
      id: 'new',
      title: 'Agrega un cliente',
      body: 'Presiona "Nuevo cliente".',
      target: { css: 'main button', text: 'Nuevo cliente' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Llena sus datos',
      body: 'Solo el nombre es obligatorio. Con RUC o DNI, correo y teléfono, después le envías la cotización con un clic.',
      hint: 'Ejemplo: "Inversiones Sol", teléfono 987654321. Luego "Crear cliente".',
      target: FORM,
      pointer: '#name',
      done: { kind: 'toast', texts: ['Cliente creado correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Cliente guardado!',
      body: 'Lo encuentras con el buscador y ya aparece al armar una cotización.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
