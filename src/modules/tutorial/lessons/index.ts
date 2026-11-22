import { acceptAndCollectLesson } from '@/modules/tutorial/lessons/acceptAndCollect.lesson';
import { advertisementsLesson } from '@/modules/tutorial/lessons/advertisements.lesson';
import { cashLesson } from '@/modules/tutorial/lessons/cash.lesson';
import { cashClosingsLesson } from '@/modules/tutorial/lessons/cashClosings.lesson';
import { catalogLesson } from '@/modules/tutorial/lessons/catalog.lesson';
import { clientsLesson } from '@/modules/tutorial/lessons/clients.lesson';
import { companyDocumentsLesson } from '@/modules/tutorial/lessons/companyDocuments.lesson';
import { dashboardLesson } from '@/modules/tutorial/lessons/dashboard.lesson';
import { dispatchGuidesLesson } from '@/modules/tutorial/lessons/dispatchGuides.lesson';
import { employeeDebtsLesson } from '@/modules/tutorial/lessons/employeeDebts.lesson';
import { firstQuotationLesson } from '@/modules/tutorial/lessons/firstQuotation.lesson';
import { fleetLesson } from '@/modules/tutorial/lessons/fleet.lesson';
import { generalVariablesLesson } from '@/modules/tutorial/lessons/generalVariables.lesson';
import { inventoryEntryLesson } from '@/modules/tutorial/lessons/inventoryEntry.lesson';
import { invoicesLesson } from '@/modules/tutorial/lessons/invoices.lesson';
import { loansLesson } from '@/modules/tutorial/lessons/loans.lesson';
import { notificationsLesson } from '@/modules/tutorial/lessons/notifications.lesson';
import { paymentAccountsLesson } from '@/modules/tutorial/lessons/paymentAccounts.lesson';
import { paymentsLesson } from '@/modules/tutorial/lessons/payments.lesson';
import { productionAndDeliveryLesson } from '@/modules/tutorial/lessons/productionAndDelivery.lesson';
import { productionWorkflowLesson } from '@/modules/tutorial/lessons/productionWorkflow.lesson';
import { purchaseOrdersLesson } from '@/modules/tutorial/lessons/purchaseOrders.lesson';
import { purchasesLesson } from '@/modules/tutorial/lessons/purchases.lesson';
import { receivablesLesson } from '@/modules/tutorial/lessons/receivables.lesson';
import { remindersLesson } from '@/modules/tutorial/lessons/reminders.lesson';
import { shareQuotationLesson } from '@/modules/tutorial/lessons/shareQuotation.lesson';
import { statisticsLesson } from '@/modules/tutorial/lessons/statistics.lesson';
import { storesLesson } from '@/modules/tutorial/lessons/stores.lesson';
import { supplierStockLesson } from '@/modules/tutorial/lessons/supplierStock.lesson';
import { suppliersLesson } from '@/modules/tutorial/lessons/suppliers.lesson';
import { tourLesson } from '@/modules/tutorial/lessons/tour.lesson';
import { usersLesson } from '@/modules/tutorial/lessons/users.lesson';
import { warehousesLesson } from '@/modules/tutorial/lessons/warehouses.lesson';
import type { LessonSection, TutorialLesson } from '@/modules/tutorial/types/tutorial.types';
import { flattenViewRoutes, type MyAccess } from '@/presentation/hooks/shared/useAccess';

// Secciones de "Aprender", en orden.
export const LESSON_SECTIONS: readonly { key: LessonSection; title: string; description: string }[] = [
  { key: 'start', title: 'Primeros pasos', description: 'Ubícate en el sistema y arma tu primera cotización.' },
  { key: 'sales', title: 'Ventas', description: 'El camino de un pedido: enviar, cobrar, producir, comprar.' },
  { key: 'finance', title: 'Finanzas', description: 'Caja, pagos, facturas, cobranzas y préstamos.' },
  { key: 'settings', title: 'Configuración', description: 'Tu equipo, tus tiendas y cómo trabaja tu empresa.' },
  { key: 'operations', title: 'Inventario y logística', description: 'Almacenes, stock y guías de remisión.' },
];

// El curso completo, en el orden en que se muestra (por sección). Cada lección
// se puede hacer sola y repetir; las de un módulo que la empresa no tiene
// contratado (inventario, guías, stock de proveedores) o que el rol no puede
// usar no se ofrecen (ver lessonsFor).
export const LESSONS: readonly TutorialLesson[] = [
  // Primeros pasos
  tourLesson,
  dashboardLesson,
  firstQuotationLesson,
  // Ventas: el camino de un pedido y lo que lo rodea
  shareQuotationLesson,
  acceptAndCollectLesson,
  productionAndDeliveryLesson,
  purchasesLesson,
  purchaseOrdersLesson,
  clientsLesson,
  catalogLesson,
  suppliersLesson,
  supplierStockLesson,
  advertisementsLesson,
  // Finanzas
  cashLesson,
  cashClosingsLesson,
  paymentsLesson,
  receivablesLesson,
  invoicesLesson,
  employeeDebtsLesson,
  loansLesson,
  statisticsLesson,
  // Configuración
  paymentAccountsLesson,
  companyDocumentsLesson,
  usersLesson,
  storesLesson,
  productionWorkflowLesson,
  generalVariablesLesson,
  remindersLesson,
  notificationsLesson,
  // Inventario y logística
  warehousesLesson,
  inventoryEntryLesson,
  fleetLesson,
  dispatchGuidesLesson,
];

export const findLesson = (code: string): TutorialLesson | undefined => LESSONS.find((lesson) => lesson.code === code);

// Lecciones que el rol puede hacer (según /access/me, que ya quita lo que la
// empresa no tiene contratado). Solo es para mostrar: el backend valida cada acción.
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
