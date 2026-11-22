import { Megaphone } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const FORM = dialogWith('Nuevo anuncio');

export const advertisementsLesson: TutorialLesson = {
  code: 'advertisements',
  section: 'sales',
  title: 'Anuncios de tu web',
  summary: 'Sube las imágenes que tu página web muestra en cada zona.',
  minutes: 2,
  icon: Megaphone,
  requires: { buttons: ['advertisement.create.button'], routes: ['/anuncios'] },
  steps: () => [
    navigateStep({
      id: 'go-ads',
      path: '/anuncios',
      label: 'Anuncios',
      group: 'Ventas',
      body: 'Las imágenes que salen en tu página web (banners, promociones).',
    }),
    {
      id: 'new',
      title: 'Crea un anuncio',
      body: 'Presiona "Nuevo anuncio".',
      target: { css: 'main button', text: 'Nuevo anuncio' },
      done: { kind: 'appear', target: FORM },
    },
    {
      id: 'form',
      title: 'Título e imagen',
      body: 'Ponle un título, sube la imagen (PNG, JPG o WEBP de hasta 3 MB) y, si quieres, el enlace al que lleva.',
      hint: 'Ejemplo: "Promo de verano" y cualquier imagen. Luego "Crear anuncio".',
      target: FORM,
      pointer: '#advertisement-title',
      done: { kind: 'toast', texts: ['Anuncio creado'] },
      checkpoint: true,
      // Sin una imagen a mano se puede seguir.
      skippable: true,
    },
    {
      id: 'done',
      title: '¡Listo!',
      body: 'Tu web pide los anuncios de cada zona y los muestra en el orden que les pongas aquí.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
