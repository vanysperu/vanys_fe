import { Package } from 'lucide-react';

import { dialogWith, navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const PRODUCT_FORM = dialogWith('Nuevo producto');
const TECHNIQUE_FORM = dialogWith('Nueva técnica');

export const catalogLesson: TutorialLesson = {
  code: 'catalog',
  title: 'Productos y técnicas',
  summary: 'Agrega un producto con sus precios y una técnica de personalización.',
  minutes: 4,
  icon: Package,
  requires: { buttons: ['producto.create.button', 'producto.technique.create.button'], routes: ['/productos'] },
  steps: () => [
    navigateStep({
      id: 'go-products',
      path: '/productos',
      label: 'Productos',
      group: 'Ventas',
      body: 'Tu catálogo: lo que vendes y a qué precio.',
    }),
    {
      id: 'new-product',
      title: 'Agrega un producto',
      body: 'Presiona "Nuevo producto".',
      target: { css: 'main button', text: 'Nuevo producto' },
      done: { kind: 'appear', target: PRODUCT_FORM },
    },
    {
      id: 'product-form',
      title: 'Nombre y precios',
      body: 'Pon el nombre y al menos un precio (por unidad, por ciento o por millar). Marca "Requiere personalización" si lleva logo.',
      hint: 'Ejemplo: "Gorra drill", precio por unidad 15. Luego "Crear producto".',
      target: PRODUCT_FORM,
      pointer: '#name',
      done: { kind: 'toast', texts: ['Producto creado correctamente'] },
      checkpoint: true,
    },
    {
      id: 'techniques-tab',
      title: 'Ahora las técnicas',
      body: 'Las técnicas (bordado, sublimación...) tienen su propio precio, que se suma al del producto.',
      target: { css: '[role="tab"]', text: 'Técnicas de personalización' },
      done: { kind: 'route', path: '/productos/tecnicas' },
    },
    {
      id: 'new-technique',
      title: 'Agrega una técnica',
      body: 'Presiona "Nueva técnica".',
      target: { css: 'main button', text: 'Nueva técnica' },
      done: { kind: 'appear', target: TECHNIQUE_FORM },
    },
    {
      id: 'technique-form',
      title: 'Nombre y precio',
      body: 'Pon el nombre y su precio por unidad (y por volumen si tienes).',
      hint: 'Ejemplo: "Estampado DTF", 5 por unidad. Luego "Crear técnica".',
      target: TECHNIQUE_FORM,
      pointer: '#tech-name',
      done: { kind: 'toast', texts: ['Técnica creada correctamente'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Catálogo al día!',
      body: 'Los productos y técnicas nuevos ya aparecen al armar una cotización.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
