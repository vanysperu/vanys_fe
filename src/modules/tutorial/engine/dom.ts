import type { TargetQuery, TargetSpec } from '@/modules/tutorial/types/tutorial.types';

// Búsqueda de elementos en la pantalla para el modo enseñanza. Solo lee el
// DOM: nunca lo modifica.

// Sin mayúsculas ni tildes, espacios colapsados: "Diseño en aprobación" == "diseno en aprobacion".
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isVisible(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

const toQuery = (spec: TargetSpec): TargetQuery => (typeof spec === 'string' ? { css: spec } : spec);

const matchesText = (element: HTMLElement, query: TargetQuery): boolean => {
  if (!query.text) return true;
  const visible = normalizeText(element.textContent);
  const wanted = normalizeText(query.text);
  return query.exact ? visible === wanted : visible.includes(wanted);
};

// Contenedores donde buscar: el último visible (la ventana de más arriba suele
// ser la última del DOM, porque Radix las monta al final del <body>).
const searchRoots = (query: TargetQuery): ParentNode[] => {
  if (!query.within) return [document];
  const containers = Array.from(document.querySelectorAll(query.within)).filter(isVisible);
  const top = containers.at(-1);
  return top ? [top] : [];
};

export function findTarget(spec: TargetSpec): HTMLElement | null {
  const query = toQuery(spec);
  const matches = searchRoots(query)
    .flatMap((root) => Array.from(root.querySelectorAll(query.css)))
    .filter(isVisible)
    .filter((element) => matchesText(element, query));
  const found = query.last ? matches.at(-1) : matches[0];
  if (!found) return null;
  if (!query.closest) return found;
  const container = found.closest(query.closest);
  return container instanceof HTMLElement && isVisible(container) ? container : null;
}

// Con una lista, la primera que exista en pantalla.
export function findFirstTarget(specs: TargetSpec | TargetSpec[] | null | undefined): HTMLElement | null {
  if (!specs) return null;
  const list = Array.isArray(specs) ? specs : [specs];
  for (const spec of list) {
    const element = findTarget(spec);
    if (element) return element;
  }
  return null;
}

// Avisos (sonner) visibles en este momento.
export function currentToasts(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-sonner-toast]')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement,
  );
}

// Listas desplegables abiertas (Select, buscadores, calendario): se montan
// fuera del formulario, así que se permiten aparte (solo pueden estar
// abiertas si se abrieron desde la zona permitida).
export function openPoppers(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper]')).filter(isVisible);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 6;

export function boxOf(element: HTMLElement, padding = PADDING): Box {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left - padding),
    y: Math.round(rect.top - padding),
    width: Math.round(rect.width + padding * 2),
    height: Math.round(rect.height + padding * 2),
  };
}

export const sameBoxes = (a: Box[], b: Box[]): boolean =>
  a.length === b.length &&
  a.every((box, index) => {
    const other = b[index];
    return other !== undefined && box.x === other.x && box.y === other.y && box.width === other.width && box.height === other.height;
  });

// Texto del botón de un buscador/selector (para saber si ya se eligió algo).
export function comboboxText(containerCss: string): string {
  const container = document.querySelector(containerCss);
  const trigger = container?.querySelector('button[role="combobox"]');
  return normalizeText(trigger?.textContent);
}

// Valor de un input.
export function inputValue(css: string): string {
  const input = document.querySelector(css);
  return input instanceof HTMLInputElement ? input.value.trim() : '';
}
