import { FileText } from 'lucide-react';

import { navigateStep } from '@/modules/tutorial/lessons/helpers';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

const COMPANY_FORM = { css: '#legal_terms_caption', closest: 'form' };

export const companyDocumentsLesson: TutorialLesson = {
  code: 'company-documents',
  section: 'settings',
  title: 'Datos de tu empresa en la cotización',
  summary: 'Tu logo, nombre, dirección, teléfono y las condiciones que salen en cada PDF.',
  minutes: 2,
  icon: FileText,
  requires: { routes: ['/configuracion/documentos'] },
  steps: () => [
    navigateStep({
      id: 'go-documents',
      path: '/configuracion/documentos',
      label: 'Documentos de la empresa',
      group: 'Configuración',
      body: 'Todo lo que tu cliente ve en el PDF de la cotización sale de aquí.',
    }),
    {
      id: 'company-card',
      title: 'Los datos de tu empresa',
      body: 'Logo (PNG, JPG o WEBP), razón social, dirección y teléfono: van en la cabecera del PDF.',
      target: COMPANY_FORM,
      pointer: '#business_name',
      done: { kind: 'ack' },
    },
    {
      id: 'terms',
      title: 'Tus condiciones',
      body: 'Escribe una condición por línea: salen numeradas al final de cada cotización. Luego guarda.',
      hint: 'Ejemplo: "Precios válidos por 15 días". Luego "Guardar".',
      target: COMPANY_FORM,
      pointer: '#legal_terms_caption',
      done: { kind: 'toast', texts: ['Documentos actualizados'] },
      checkpoint: true,
    },
    {
      id: 'done',
      title: '¡Guardado!',
      body: 'Desde ahora tus cotizaciones salen con estos datos.',
      done: { kind: 'ack', label: 'Terminar' },
    },
  ],
};
