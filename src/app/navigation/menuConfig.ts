import { Cog, Landmark, ShoppingBag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { MyAccessModuleItem, MyAccessViewItem } from '@/presentation/hooks/shared/useAccess';

// Estructura del menú lateral (pedido explícito del usuario: "agrupa el menú
// en sub menú para tener más orden"). Es UNA sola estructura para todos los
// roles (CLAUDE.md sección 7 — Menú dinámico): acá solo se decide en qué
// grupo va cada módulo y en qué orden. Las vistas, rutas, nombres e íconos
// de cada ítem siguen viniendo del backend (GET /access/me), que también
// decide qué ítems recibe cada rol: un grupo sin ítems no se dibuja.
//
// Los códigos son los `code` de la tabla `modules` del backend. Un módulo
// nuevo que no figure acá igual aparece, suelto al final del menú.
export interface MenuGroupConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  moduleCodes: readonly string[];
}

export type MenuLayoutEntry = { kind: 'module'; moduleCode: string } | { kind: 'group'; group: MenuGroupConfig };

export const MENU_LAYOUT: readonly MenuLayoutEntry[] = [
  { kind: 'module', moduleCode: 'inicio' },
  { kind: 'module', moduleCode: 'statistics' },
  {
    kind: 'group',
    group: {
      key: 'sales',
      label: 'Ventas',
      icon: ShoppingBag,
      moduleCodes: ['cotizacion', 'purchase_order', 'cliente', 'producto'],
    },
  },
  {
    kind: 'group',
    group: {
      key: 'finance',
      label: 'Finanzas',
      icon: Landmark,
      moduleCodes: ['cash_movement', 'payment', 'receivable', 'employee_debt'],
    },
  },
  { kind: 'module', moduleCode: 'reminder' },
  {
    kind: 'group',
    group: {
      key: 'settings',
      label: 'Configuración',
      icon: Cog,
      moduleCodes: ['users', 'roles_access', 'platform', 'variable_general', 'document_settings'],
    },
  },
];

// Nodo ya resuelto contra los accesos del usuario.
// - 'view': una vista suelta de primer nivel (si tiene hijas en el menú, se
//   dibuja como antes: colapsable con sus sub-vistas).
// - 'group': un grupo con sus vistas ya aplanadas (una vista con hijas, ej.
//   "Lista de precios" → "Técnicas de personalización", aporta ambas como
//   ítems hermanos: tres niveles de menú dentro de un grupo no se leen bien).
export type MenuNode =
  | { kind: 'view'; key: string; view: MyAccessViewItem }
  | { kind: 'group'; key: string; label: string; icon: LucideIcon; items: MyAccessViewItem[] };

const menuViewsOf = (module: MyAccessModuleItem | undefined): MyAccessViewItem[] =>
  (module?.views ?? []).filter((view) => view.show_in_menu);

const flattenMenuViews = (views: MyAccessViewItem[]): MyAccessViewItem[] =>
  views.flatMap((view) => [
    { ...view, children: [] },
    ...flattenMenuViews(view.children.filter((child) => child.show_in_menu)),
  ]);

const viewNodes = (views: MyAccessViewItem[]): MenuNode[] =>
  views.map((view) => ({ kind: 'view', key: `view-${view.id}`, view }));

// Arma el menú a partir de los módulos otorgados (en el orden que ya manda el
// backend, por `position`).
export function buildMenu(modules: readonly MyAccessModuleItem[]): MenuNode[] {
  const byCode = new Map(modules.map((module) => [module.code, module]));
  const placedCodes = new Set(
    MENU_LAYOUT.flatMap((entry) => (entry.kind === 'module' ? [entry.moduleCode] : entry.group.moduleCodes)),
  );

  const configured = MENU_LAYOUT.flatMap((entry): MenuNode[] => {
    if (entry.kind === 'module') return viewNodes(menuViewsOf(byCode.get(entry.moduleCode)));

    const items = flattenMenuViews(entry.group.moduleCodes.flatMap((code) => menuViewsOf(byCode.get(code))));
    // Un grupo con un solo ítem para este rol no aporta orden, solo un clic
    // de más: el ítem va suelto.
    if (items.length <= 1) return viewNodes(items);

    const { key, label, icon } = entry.group;
    return [{ kind: 'group', key, label, icon, items }];
  });

  const unplaced = modules.filter((module) => !placedCodes.has(module.code)).flatMap(menuViewsOf);

  return [...configured, ...viewNodes(unplaced)];
}
