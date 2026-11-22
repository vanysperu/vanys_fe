import { acceptAndCollectLesson } from '@/modules/tutorial/lessons/acceptAndCollect.lesson';
import { cashLesson } from '@/modules/tutorial/lessons/cash.lesson';
import { catalogLesson } from '@/modules/tutorial/lessons/catalog.lesson';
import { clientsLesson } from '@/modules/tutorial/lessons/clients.lesson';
import { firstQuotationLesson } from '@/modules/tutorial/lessons/firstQuotation.lesson';
import { paymentAccountsLesson } from '@/modules/tutorial/lessons/paymentAccounts.lesson';
import { productionAndDeliveryLesson } from '@/modules/tutorial/lessons/productionAndDelivery.lesson';
import { purchasesLesson } from '@/modules/tutorial/lessons/purchases.lesson';
import { shareQuotationLesson } from '@/modules/tutorial/lessons/shareQuotation.lesson';
import { tourLesson } from '@/modules/tutorial/lessons/tour.lesson';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';
import { flattenViewRoutes, type MyAccess } from '@/presentation/hooks/shared/useAccess';

// Orden del curso: primero ubicarse, después el camino de un pedido (cotizar →
// enviar → cobrar → producir → comprar) y al final la gestión (clientes,
// catálogo, Caja, cuentas). Cada lección se puede hacer sola y repetir.
export const LESSONS: readonly TutorialLesson[] = [
  tourLesson,
  firstQuotationLesson,
  shareQuotationLesson,
  acceptAndCollectLesson,
  productionAndDeliveryLesson,
  purchasesLesson,
  clientsLesson,
  catalogLesson,
  cashLesson,
  paymentAccountsLesson,
];

export const findLesson = (code: string): TutorialLesson | undefined => LESSONS.find((lesson) => lesson.code === code);

// Lecciones que el rol puede hacer (según /access/me). Solo es para mostrar:
// el backend valida cada acción igual.
export function lessonsFor(access: MyAccess | undefined): TutorialLesson[] {
  if (!access) return [];
  const routes = new Set(flattenViewRoutes(access.views));
  const buttons = new Set(access.buttons);
  return LESSONS.filter(
    (lesson) =>
      (lesson.requires.buttons ?? []).every((code) => buttons.has(code)) &&
      (lesson.requires.routes ?? []).every((route) => routes.has(route)),
  );
}
