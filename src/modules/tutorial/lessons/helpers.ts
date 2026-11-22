import { comboboxText, findTarget, isVisible, normalizeText } from '@/modules/tutorial/engine/dom';
import type { TargetQuery, TutorialStep } from '@/modules/tutorial/types/tutorial.types';

// Piezas comunes de las lecciones. Se apoyan en lo que la pantalla ya tiene
// (enlaces del menú, títulos de ventanas, textos de botones, ids de campos)
// para no llenar el sistema de marcas solo para el tutorial.

export const SIDEBAR = '[data-slot="sidebar"]';
// Ventanas del sistema (nunca la tarjeta del tutorial).
export const DIALOG = '[role="dialog"]:not([data-tutorial-card])';

export const dialogWith = (text: string): TargetQuery => ({ css: DIALOG, text });

export const buttonIn = (within: string, text: string, exact = false): TargetQuery => ({
  css: 'button',
  within,
  text,
  exact,
});

export const quotationDialog = (quotationId: number | null): TargetQuery =>
  dialogWith(quotationId ? `Cotización #${quotationId}` : 'Cotización #');

// Ir a una pantalla con el menú: el enlace si se ve; si su grupo está cerrado,
// primero el grupo; en el celular, el botón que abre el menú.
export function navigateStep(options: {
  id: string;
  path: string;
  label: string;
  group?: string;
  body: string;
}): TutorialStep {
  return {
    id: options.id,
    title: `Abre "${options.label}"`,
    // Si el grupo está cerrado, lo iluminado es el grupo: el texto dice dónde buscar.
    body: options.group ? `${options.body} Está en el menú, dentro de "${options.group}".` : options.body,
    target: [
      // Primero el enlace con su nombre (para "/" no es el logo, que no tiene texto).
      { css: `${SIDEBAR} a[href="${options.path}"]`, text: options.label },
      { css: `${SIDEBAR} a[href="${options.path}"]` },
      ...(options.group ? [{ css: `${SIDEBAR} button[aria-expanded]`, text: options.group, exact: true }] : []),
      { css: 'button[aria-label="Abrir menú"]' },
    ],
    done: { kind: 'route', path: options.path },
  };
}

// Tarjeta de la cotización en el tablero.
export const quotationCard = (quotationId: number | null) =>
  quotationId ? `[data-testid="quotations-board"] [data-quotation-id="${quotationId}"]` : '[data-testid="quotations-board"] [data-quotation-id]';

// Abrir la cotización de práctica desde el tablero.
export function openQuotationStep(quotationId: number | null, body: string): TutorialStep {
  const code = quotationId ? `COT-${String(quotationId).padStart(4, '0')}` : 'la cotización';
  return {
    id: 'open-quotation',
    title: `Abre ${code}`,
    body,
    target: quotationCard(quotationId),
    done: { kind: 'appear', target: quotationDialog(quotationId) },
  };
}

// Pestaña dentro de la cotización abierta.
export function tabStep(id: string, quotationId: number | null, tab: string, body: string): TutorialStep {
  const dialog = quotationDialog(quotationId);
  return {
    id,
    title: `Entra a la pestaña "${tab}"`,
    body,
    target: { css: '[role="tab"]', text: tab, exact: true, within: DIALOG },
    done: {
      kind: 'check',
      test: () => {
        const container = findTarget(dialog);
        const tabElement = Array.from(container?.querySelectorAll('[role="tab"]') ?? []).find(
          (element) => normalizeText(element.textContent) === normalizeText(tab),
        );
        return tabElement?.getAttribute('aria-selected') === 'true';
      },
    },
  };
}

// Botón de avanzar estado dentro de la cotización (texto exacto: "Lista" no es "Lista para entregar").
export function statusStep(id: string, label: string, body: string): TutorialStep {
  return {
    id,
    title: `Marca "${label}"`,
    body,
    target: buttonIn(DIALOG, label, true),
    done: { kind: 'toast', texts: [`Cotización marcada como "${label}"`] },
    checkpoint: true,
  };
}

// Un selector/buscador ya tiene algo elegido (su botón no muestra el texto de ayuda).
export const comboboxChosen = (containerCss: string, placeholder: string) => () => {
  const text = comboboxText(containerCss);
  return text !== '' && !text.includes(normalizeText(placeholder));
};

export const visible = (css: string) => () => {
  const element = document.querySelector(css);
  return element !== null && isVisible(element);
};
