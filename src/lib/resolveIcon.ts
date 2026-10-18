import {
  Bell,
  Boxes,
  Building2,
  Contact,
  CreditCard,
  FileCog,
  FileText,
  Flag,
  HandCoins,
  HelpCircle,
  LayoutDashboard,
  Package,
  Palette,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// El backend guarda íconos con nombres de otra librería (eva-icons/Metronic,
// ej. "profile-circle", "shield-tick") que no coinciden 1:1 con lucide-react.
// Se mapean los que ya existen como módulo/vista (verificados en vivo vía
// GET /access/me). "profile-circle" (usuarios internos del sistema) y
// "profile-user" (clientes de una empresa) se separan a propósito: son
// conceptos distintos y usar el mismo ícono para ambos confundía el menú.
const ICON_MAP: Record<string, LucideIcon> = {
  'profile-circle': Users,
  users: Users,
  'profile-user': Contact,
  'shield-tick': ShieldCheck,
  'shield-check': ShieldCheck,
  'setting-2': Settings,
  settings: Settings,
  sliders: SlidersHorizontal,
  dashboard: LayoutDashboard,
  'layout-dashboard': LayoutDashboard,
  boxes: Boxes,
  'abstract-26': Boxes,
  'color-swatch': Palette,
  shop: Store,
  basket: ShoppingBasket,
  document: FileText,
  building: Building2,
  package: Package,
  box: Package,
  flag: Flag,
  'shopping-cart': ShoppingCart,
  'file-text': FileCog,
  wallet: Wallet,
  'credit-card': CreditCard,
  'hand-coins': HandCoins,
  receipt: Receipt,
  bell: Bell,
};

// Si un ícono no está mapeado, se usa uno de "falta configurar" (signo de
// interrogación) en vez de un círculo vacío — así un ícono faltante se nota
// de inmediato en vez de camuflarse como si fuera intencional.
export function resolveIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return HelpCircle;
  return ICON_MAP[iconName] ?? HelpCircle;
}
