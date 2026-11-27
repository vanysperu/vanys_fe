import { Cog, Landmark, ShoppingBag, Truck, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Tone } from '@/lib/tones';

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
  // Color de la sección (ícono del menú y del título de cada pantalla).
  tone: Tone;
  moduleCodes: readonly string[];
}

export type MenuLayoutEntry = { kind: 'module'; moduleCode: string; tone: Tone } | { kind: 'group'; group: MenuGroupConfig };

export const MENU_LAYOUT: readonly MenuLayoutEntry[] = [
  { kind: 'module', moduleCode: 'inicio', tone: 'blue' },
  { kind: 'module', moduleCode: 'statistics', tone: 'purple' },
  {
    kind: 'group',
    group: {
      key: 'sales',
      label: 'Ventas',
      icon: ShoppingBag,
      tone: 'orange',
      moduleCodes: ['cotizacion', 'purchase_order', 'cliente', 'producto', 'supplier', 'supplier_stock', 'advertisement'],
    },
  },
  {
    kind: 'group',
    group: {
      key: 'finance',
      label: 'Finanzas',
      icon: Landmark,
      tone: 'green',
      moduleCodes: ['cash_movement', 'cash_closing', 'payment', 'invoice', 'receivable', 'employee_debt', 'loan'],
    },
  },
  // Sprint 2, ítem 2: un grupo propio con las vistas del módulo inventory.
  {
    kind: 'group',
    group: {
      key: 'inventory',
      label: 'Inventario',
      icon: Warehouse,
      tone: 'teal',
      moduleCodes: ['inventory'],
    },
  },
  // Sprint 2, ítem 1: guías de remisión, vehículos y conductores.
  {
    kind: 'group',
    group: {
      key: 'logistics',
      label: 'Logística',
      icon: Truck,
      tone: 'amber',
      moduleCodes: ['dispatch_guide'],
    },
  },
  { kind: 'module', moduleCode: 'reminder', tone: 'red' },
  // Modo enseñanza (21-nov): "Aprender", para todos los roles de empresa.
  { kind: 'module', moduleCode: 'tutorial', tone: 'pink' },
  {
    kind: 'group',
    group: {
      key: 'settings',
      label: 'Configuración',
      icon: Cog,
      tone: 'blue',
      moduleCodes: ['users', 'roles_access', 'platform', 'api_key', 'variable_general', 'document_settings', 'production_workflow'],
    },
  },
];

// Nodo ya resuelto contra los accesos del usuario.
// - 'view': una vista suelta de primer nivel (si tiene hijas en el menú, se
//   dibuja como antes: colapsable con sus sub-vistas).
// - 'group': un grupo con sus vistas ya aplanadas (una vista con hijas, ej.
//   "Productos" → "Técnicas de personalización", aporta ambas como
//   ítems hermanos: tres niveles de menú dentro de un grupo no se leen bien).
export type MenuNode =
  | { kind: 'view'; key: string; view: MyAccessViewItem; tone: Tone }
  | { kind: 'group'; key: string; label: string; icon: LucideIcon; tone: Tone; items: MyAccessViewItem[] };

const menuViewsOf = (module: MyAccessModuleItem | undefined): MyAccessViewItem[] =>
  (module?.views ?? []).filter((view) => view.show_in_menu);

const flattenMenuViews = (views: MyAccessViewItem[]): MyAccessViewItem[] =>
  views.flatMap((view) => [
    { ...view, children: [] },
    ...flattenMenuViews(view.children.filter((child) => child.show_in_menu)),
  ]);

const viewNodes = (views: MyAccessViewItem[], tone: Tone): MenuNode[] =>
  views.map((view) => ({ kind: 'view', key: `view-${view.id}`, view, tone }));

// Arma el menú a partir de los módulos otorgados (en el orden que ya manda el
// backend, por `position`).
export function buildMenu(modules: readonly MyAccessModuleItem[]): MenuNode[] {
  const byCode = new Map(modules.map((module) => [module.code, module]));
  const placedCodes = new Set(
    MENU_LAYOUT.flatMap((entry) => (entry.kind === 'module' ? [entry.moduleCode] : entry.group.moduleCodes)),
  );

  const configured = MENU_LAYOUT.flatMap((entry): MenuNode[] => {
    if (entry.kind === 'module') return viewNodes(menuViewsOf(byCode.get(entry.moduleCode)), entry.tone);

    const items = flattenMenuViews(entry.group.moduleCodes.flatMap((code) => menuViewsOf(byCode.get(code))));
    // Un grupo con un solo ítem para este rol no aporta orden, solo un clic
    // de más: el ítem va suelto.
    if (items.length <= 1) return viewNodes(items, entry.group.tone);

    const { key, label, icon, tone } = entry.group;
    return [{ kind: 'group', key, label, icon, tone, items }];
  });

  const unplaced = modules.filter((module) => !placedCodes.has(module.code)).flatMap(menuViewsOf);

  return [...configured, ...viewNodes(unplaced, DEFAULT_TONE)];
}

// Tono de las pantallas que no están en MENU_LAYOUT.
const DEFAULT_TONE: Tone = 'blue';

// Tono de un módulo según dónde está en el menú (suelto o dentro de un grupo).
const toneOfModule = (moduleCode: string): Tone => {
  for (const entry of MENU_LAYOUT) {
    if (entry.kind === 'module' && entry.moduleCode === moduleCode) return entry.tone;
    if (entry.kind === 'group' && entry.group.moduleCodes.includes(moduleCode)) return entry.group.tone;
  }
  return DEFAULT_TONE;
};

const findView = (views: MyAccessViewItem[], route: string): MyAccessViewItem | null => {
  for (const view of views) {
    if (view.route === route) return view;
    const child = findView(view.children, route);
    if (child) return child;
  }
  return null;
};

// Ícono y color de la pantalla de esta ruta (para el título de cada pantalla):
// el mismo ícono del menú y el color de su sección. null si la ruta no está en el menú.
export function routeAppearance(modules: readonly MyAccessModuleItem[], route: string): { icon: string | null; tone: Tone } | null {
  for (const module of modules) {
    const view = findView(module.views, route);
    if (view) return { icon: view.icon ?? module.icon, tone: toneOfModule(module.code) };
  }
  return null;
}
