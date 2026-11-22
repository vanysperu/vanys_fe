import { UserPlus } from 'lucide-react';

import { buttonIn, DIALOG, dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo usuario');
const INVITATION = dialogWith('Invitación lista');

export const usersLesson: TutorialLesson = {
  code: 'users',
  section: 'settings',
  title: 'Tu equipo: usuarios',
  summary: 'Da acceso a una persona con su rol y su tienda, y mándale su invitación.',
  minutes: 3,
  icon: UserPlus,
  requires: { buttons: ['users.create.button'], routes: ['/seguridad/usuarios'] },
  steps: () => [
    navigateStep({
      id: 'go-users',
      path: '/seguridad/usuarios',
      label: 'Usuarios',
      group: 'Configuración',
      body: 'Las personas de tu empresa que usan el sistema.',
    }),
    {
      id: 'new',
      title: 'Agrega a una persona',
      body: 'Presiona "Nuevo usuario".',
      target: { css: 'main button', text: 'Nuevo usuario' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Sus datos, su rol y su tienda',
      body: 'El rol define qué puede hacer: un Gestor cotiza y cobra en su tienda; un Administrador ve toda la empresa. En la práctica no se envía ningún correo.',
      hint: 'Ejemplo: Carla Ríos, carla@tuempresa.com, DNI 45678912, rol Gestor y tu tienda. Luego "Crear usuario".',
      target: FORM,
      pointer: '#name',
      done: { kind: 'toast', texts: ['Usuario creado'] },
      checkpoint: true,
    },
    {
      id: 'invitation',
      title: 'Su invitación',
      body: 'Con este enlace la persona crea su propia contraseña (sirve una vez y vence en 72 horas). Cópialo o mándalo por WhatsApp.',
      target: INVITATION,
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'close',
      title: 'Listo',
      body: 'Presiona "Listo".',
      target: buttonIn(DIALOG, 'Listo', true),
      done: { kind: 'disappear', target: INVITATION },
    },
  ],
};
