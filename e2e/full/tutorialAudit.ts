import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { BrowserContext } from '@playwright/test';

// Auditoría de lo que VE una persona en cada paso de una lección (pedido del
// usuario, 26-nov: "no está bien posicionada y pide dar clic en cosas que no
// deja"). Las pruebas hacen clic directo en cada elemento; esto además revisa,
// en cada paso, lo que haría una persona mirando la luz:
//   - lo iluminado está en la pantalla (no cortado ni fuera de ella);
//   - el cuadro de la lección no lo tapa y no se sale de la pantalla;
//   - un clic en el centro de la luz llega de verdad a ese elemento (no a un
//     aviso, al botón flotante, al cuadro, a una franja fija...);
//   - la lección no retrocede sola ni se queda "sin saber dónde seguir".
// Cada problema queda en una lista (y con E2E_TUTORIAL_SHOTS, con su captura).

export interface TutorialAuditProblem {
  label: string;
  title: string;
  counter: string;
  detail: string;
  url: string;
}

const AUDIT_DIR = path.resolve(import.meta.dirname, '../../test-results/tutorial-audit');
const SHOTS = process.env.E2E_TUTORIAL_SHOTS === '1' || process.env.E2E_TUTORIAL_SHOTS === 'all';
const SHOT_EVERY_STEP = process.env.E2E_TUTORIAL_SHOTS === 'all';

const problems: TutorialAuditProblem[] = [];
let shotCount = 0;

export const tutorialAuditProblems = (label?: string): TutorialAuditProblem[] =>
  problems.filter((problem) => label === undefined || problem.label === label);

export const clearTutorialAuditProblems = (): void => {
  problems.length = 0;
};

interface AuditPayload {
  kind: 'problem' | 'step';
  title: string;
  counter: string;
  detail: string;
}

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

export async function installTutorialAudit(context: BrowserContext, label: string): Promise<void> {
  mkdirSync(AUDIT_DIR, { recursive: true });
  await context.exposeBinding('__tutorialAuditReport', async ({ page }, payload: AuditPayload) => {
    if (payload.kind === 'problem') {
      const problem = { label, title: payload.title, counter: payload.counter, detail: payload.detail, url: page.url() };
      problems.push(problem);
      appendFileSync(path.join(AUDIT_DIR, 'problems.jsonl'), `${JSON.stringify(problem)}\n`);
    }
    const wantShot = payload.kind === 'problem' ? SHOTS : SHOT_EVERY_STEP;
    if (!wantShot) return;
    shotCount += 1;
    const name = `${String(shotCount).padStart(4, '0')}-${label}-${payload.kind}-${slug(payload.title)}.png`;
    await page.screenshot({ path: path.join(AUDIT_DIR, name) }).catch(() => undefined);
  });
  await context.addInitScript(auditInPage);
}

// Corre dentro del navegador (no puede usar nada de afuera de esta función).
function auditInPage() {
  if (window.top !== window) return;
  const PADDING = 6;
  const STABLE_MS = 700;
  const report = (payload: { kind: 'problem' | 'step'; title: string; counter: string; detail: string }) => {
    const binding = (window as unknown as { __tutorialAuditReport?: (value: unknown) => Promise<void> }).__tutorialAuditReport;
    void binding?.(payload);
  };

  interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
  }
  // Posición puesta por el motor (style), sin las animaciones de escala/rebote.
  const styleRect = (element: HTMLElement | null, height?: number): Rect | null => {
    if (!element) return null;
    return {
      left: parseFloat(element.style.left),
      top: parseFloat(element.style.top),
      width: element.style.width ? parseFloat(element.style.width) : element.offsetWidth,
      height: height ?? (element.style.height ? parseFloat(element.style.height) : element.offsetHeight),
    };
  };
  const overlaps = (a: Rect | null, b: Rect | null) =>
    a !== null && b !== null && a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
  const describe = (element: Element | null): string => {
    if (!element) return 'ningún elemento';
    const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const slot = element.getAttribute('data-slot');
    const testId = element.getAttribute('data-testid');
    const aria = element.getAttribute('aria-label');
    return `<${element.tagName.toLowerCase()}${slot ? ` data-slot=${slot}` : ''}${testId ? ` data-testid=${testId}` : ''}${aria ? ` aria-label="${aria}"` : ''}> "${text}"`;
  };

  let lastKey = '';
  let stableSince = 0;
  let reportedKey = '';
  let lastStepNumber: number | null = null;
  let lastTitle = '';
  // Problema visto en la revisión anterior (para descartar instantes de transición).
  let pending: { key: string; detail: string } | null = null;

  const currentKey = (title: string) => {
    const card = styleRect(document.querySelector<HTMLElement>('[data-tutorial-card]'));
    const ring = styleRect(document.querySelector<HTMLElement>('[data-testid="tutorial-ring"]'));
    return `${title}|${ring ? `${ring.left},${ring.top},${ring.width},${ring.height}` : '-'}|${card ? `${card.left},${card.top},${card.height}` : '-'}`;
  };

  const tick = () => {
    const title = document.querySelector('[data-testid="tutorial-step-title"]')?.textContent ?? '';
    const counter = document.querySelector('[data-testid="tutorial-step-counter"]')?.textContent ?? '';
    if (!title) {
      lastKey = '';
      lastStepNumber = null;
      pending = null;
      return;
    }
    const stepNumber = Number(/Paso (\d+)/.exec(counter)?.[1] ?? 0);
    if (lastStepNumber !== null && stepNumber < lastStepNumber) {
      report({ kind: 'problem', title, counter, detail: `la lección retrocedió sola: de "${lastTitle}" a "${title}"` });
    }
    lastStepNumber = stepNumber;
    lastTitle = title;

    const key = currentKey(title);
    const now = performance.now();
    if (key !== lastKey) {
      lastKey = key;
      stableSince = now;
      pending = null;
      return;
    }
    if (now - stableSince < STABLE_MS || reportedKey === key) return;
    const detail = inspect();
    // Se informa solo si el mismo problema sigue en la revisión siguiente (200 ms
    // después) sin que nada se haya movido: así no cuenta el instante en que la
    // pantalla cambia y la luz todavía no se reubicó.
    if (detail && pending?.key !== key) {
      pending = { key, detail };
      return;
    }
    reportedKey = key;
    pending = null;
    report(detail ? { kind: 'problem', title, counter, detail } : { kind: 'step', title, counter, detail: '' });
  };

  // Lo que vería una persona ahora mismo. Devuelve los problemas, o '' si no hay.
  const inspect = (): string => {
    const cardElement = document.querySelector<HTMLElement>('[data-tutorial-card]');
    const ringElement = document.querySelector<HTMLElement>('[data-testid="tutorial-ring"]');
    const card = styleRect(cardElement);
    const ring = styleRect(ringElement);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const found: string[] = [];
    if (card && (card.left < 0 || card.top < 0 || card.left + card.width > viewportWidth + 1 || card.top + card.height > viewportHeight + 1)) {
      found.push('el cuadro de la lección se sale de la pantalla');
    }
    if (cardElement?.textContent?.includes('No encuentro dónde seguir')) found.push('la lección no encuentra dónde seguir');
    if (ring) {
      const right = ring.left + ring.width;
      const bottom = ring.top + ring.height;
      const offscreen = bottom < 0 || ring.top > viewportHeight || right < 0 || ring.left > viewportWidth;
      const cut = !offscreen && (ring.top < -2 || bottom > viewportHeight + 2 || ring.left < -2 || right > viewportWidth + 2);
      if (offscreen && !cardElement?.textContent?.includes('Muéstrame dónde')) found.push('lo iluminado está fuera de la pantalla (sin botón para ir)');
      if (cut) found.push('lo iluminado se ve cortado por el borde de la pantalla');
      if (overlaps(card, ring)) found.push('el cuadro de la lección tapa lo iluminado');
      // Con una lista abierta (Select, buscador), el propio sistema bloquea el resto de
      // la ventana hasta elegir: ahí no se prueba el clic en el centro.
      const listOpen = Array.from(document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper]')).some(
        (element) => element.offsetWidth > 0 && element.offsetHeight > 0,
      );
      if (!offscreen && !listOpen) {
        const x = Math.min(Math.max(ring.left + ring.width / 2, 1), viewportWidth - 1);
        const y = Math.min(Math.max(ring.top + ring.height / 2, 1), viewportHeight - 1);
        const hit = document.elementFromPoint(x, y);
        // La luz es el elemento con su margen, recortado a la pantalla (igual que el motor).
        const lightOf = (rect: DOMRect): Rect => {
          const left = Math.max(2, rect.left - PADDING);
          const top = Math.max(2, rect.top - PADDING);
          const right = Math.min(viewportWidth - 2, rect.right + PADDING);
          const bottom = Math.min(viewportHeight - 2, rect.bottom + PADDING);
          return { left, top, width: right - left, height: bottom - top };
        };
        const isLit = (element: Element) => {
          const light = lightOf(element.getBoundingClientRect());
          return (
            Math.abs(light.left - ring.left) <= 3 &&
            Math.abs(light.top - ring.top) <= 3 &&
            Math.abs(light.width - ring.width) <= 4 &&
            Math.abs(light.height - ring.height) <= 4
          );
        };
        let node: Element | null = hit;
        let reachesTarget = false;
        while (node && node !== document.documentElement) {
          if (isLit(node)) {
            reachesTarget = true;
            break;
          }
          node = node.parentElement;
        }
        // Lo iluminado es un botón deshabilitado mientras guarda ("Creando..."):
        // es el instante después del clic, no algo que la persona deba tocar.
        const waitingOnSave = Array.from(document.querySelectorAll('button:disabled')).some(isLit);
        if (!reachesTarget && !waitingOnSave) {
          const where = cardElement?.contains(hit) ? 'el cuadro de la lección' : describe(hit);
          found.push(`un clic en el centro de la luz cae en ${where}`);
        }
      }
    }
    return found.join('; ');
  };

  window.setInterval(tick, 200);
}
