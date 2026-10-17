import { useQuery } from '@tanstack/react-query';

import { getMyAccess } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/modules/auth/hooks/useAuthStore';

// Espejo de MyAccessResponse (grulla_be: access.interface.ts).
export interface MyAccessViewItem {
  id: number;
  module_id: number;
  parent_id: number | null;
  code: string;
  name: string;
  route: string | null;
  icon: string | null;
  show_in_menu: boolean;
  position: number;
  children: MyAccessViewItem[];
}

export interface MyAccessModuleItem {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  position: number;
  views: MyAccessViewItem[];
}

export interface MyAccess {
  modules: string[];
  views: MyAccessModuleItem[];
  buttons: string[];
  themeColor: string;
  isSystem: boolean;
  // Empresa del usuario (null para is_system). Le permite al front saber
  // "mi propia empresa" sin llamar GET /company/list, exclusivo de is_system.
  companyId: number | null;
  // Nombre(s) de rol del usuario autenticado (join backend con `role`).
  roleName: string | null;
  // Nombre de la tienda (business_unit) asignada al usuario, si tiene una.
  businessUnitName: string | null;
  // Nombre de la empresa del usuario, usado como fallback cuando no tiene
  // tienda asignada.
  companyName: string | null;
  // Fracción de IGV configurada para la empresa (0.18 = 18%, ver "Variables
  // Generales" -> categoría "tax_config"/código "igv_rate"). Solo para
  // previsualizar el total antes de guardar — el backend siempre recalcula
  // con el valor real al crear/actualizar la cotización.
  igvRate: number;
}

// "Tienda o empresa": la etiqueta a mostrar en el bloque de usuario del
// sidebar. Se centraliza acá (en vez de repetir el fallback en cada
// componente) para que cualquier otra pantalla que lo necesite lo reutilice.
export function getStoreOrCompanyLabel(access: MyAccess | undefined): string | null {
  if (!access) return null;
  return access.businessUnitName ?? access.companyName ?? null;
}

const accessKeys = {
  all: ['auth', 'my-access'] as const,
};

export function useAccess() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: accessKeys.all,
    queryFn: getMyAccess,
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(token),
  });
}

export function usePermission(moduleCode: string): boolean {
  const { data } = useAccess();
  return Boolean(data?.modules.includes(moduleCode));
}

export function usePermissionButton(buttonCode: string): boolean {
  const { data } = useAccess();
  return Boolean(data?.buttons.includes(buttonCode));
}

export function flattenViewRoutes(modules: MyAccessModuleItem[]): string[] {
  const routes: string[] = [];

  const walk = (items: MyAccessViewItem[]) => {
    for (const item of items) {
      if (item.route) routes.push(item.route);
      if (item.children.length > 0) walk(item.children);
    }
  };

  modules.forEach((module) => walk(module.views));
  return routes;
}
