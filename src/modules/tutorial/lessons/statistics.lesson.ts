import { BarChart3 } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

export const statisticsLesson: TutorialLesson = {
  code: 'statistics',
  section: 'finance',
  title: 'Estadísticas',
  summary: 'Cuánto cobraste, cuánto cotizaste y ganaste, y qué se vende más.',
  minutes: 2,
  icon: BarChart3,
  requires: { routes: ['/estadisticas'] },
  steps: () => [
    navigateStep({ id: 'go-stats', path: '/estadisticas', label: 'Estadísticas', body: 'Cómo le va a tu negocio, en números.' }),
    {
      id: 'period',
      title: 'Elige el periodo',
      body: 'Últimos 30 días, este mes, este año o el rango que quieras. Siempre se compara con el periodo anterior.',
      target: '[data-testid="statistics-period"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'kpis',
      title: 'Lo importante, arriba',
      body: 'Cobrado, cotizado, ganado, tasa de cierre, gastos, margen y lo que te deben.',
      target: '[data-testid="kpi-collected"]',
      pointer: null,
      done: { kind: 'ack' },
    },
    {
      id: 'charts',
      title: 'Gráficos y tablas',
      body: 'Ingresos contra gastos, los clientes y productos que más compran, y más. Cada gráfico también se ve como tabla.',
      target: '[data-testid="chart-income-expenses"]',
      pointer: null,
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
