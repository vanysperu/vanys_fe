import { LayoutDashboard } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

// El panel principal: lo primero que ve cada persona al entrar.
export const dashboardLesson: TutorialLesson = {
  code: 'dashboard',
  section: 'start',
  title: 'Tu panel principal',
  summary: 'Lo que te deben, lo vencido y todas tus cotizaciones de un vistazo.',
  minutes: 2,
  icon: LayoutDashboard,
  requires: { buttons: ['cotizacion.changeStatus.button'] },
  steps: () => [
    navigateStep({ id: 'go-home', path: '/', label: 'Inicio', body: 'Es la primera pantalla al entrar: el resumen del día.' }),
    {
      id: 'receivable',
      title: 'Lo que te deben',
      body: 'El total por cobrar de tus cotizaciones y cuánto de eso ya está vencido.',
      target: '[data-testid="dashboard-receivable"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'board',
      title: 'Tus cotizaciones por estado',
      body: 'Cada columna es un estado. Toca una tarjeta para ver su detalle, o arrástrala para cambiarla de estado.',
      target: '[data-testid="quotations-board"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'done',
      title: '¡Así empieza tu día!',
      body: 'Si te encargan compras, aquí también aparece "Órdenes de compra a mi cargo".',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
