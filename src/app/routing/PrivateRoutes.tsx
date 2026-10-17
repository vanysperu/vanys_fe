import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Shell } from '@/app/layout/Shell';

// Cada página de módulo se carga en su propio chunk (code-splitting por
// ruta): reduce el bundle inicial y solo se descarga cuando el usuario
// realmente navega a esa sección (CLAUDE.md sección 8 - rendimiento).
const ChangePasswordPage = lazy(() =>
  import('@/modules/auth/pages/ChangePasswordPage').then((m) => ({ default: m.ChangePasswordPage })),
);
const DashboardPage = lazy(() =>
  import('@/modules/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersListPage = lazy(() =>
  import('@/modules/users/pages/UsersListPage').then((m) => ({ default: m.UsersListPage })),
);
const CompaniesPage = lazy(() =>
  import('@/modules/platform/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })),
);
const BusinessUnitsPage = lazy(() =>
  import('@/modules/platform/pages/BusinessUnitsPage').then((m) => ({ default: m.BusinessUnitsPage })),
);
const RolesPage = lazy(() => import('@/modules/roles/pages/RolesPage').then((m) => ({ default: m.RolesPage })));
const VariableGeneralPage = lazy(() =>
  import('@/modules/variableGeneral/pages/VariableGeneralPage').then((m) => ({ default: m.VariableGeneralPage })),
);
const ClientsPage = lazy(() => import('@/modules/clients/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const ProductsPage = lazy(() =>
  import('@/modules/products/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const QuotationsPage = lazy(() =>
  import('@/modules/quotations/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })),
);
const PurchaseOrdersPage = lazy(() =>
  import('@/modules/purchaseOrders/pages/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage })),
);
const DocumentSettingsPage = lazy(() =>
  import('@/modules/documentSettings/pages/DocumentSettingsPage').then((m) => ({ default: m.DocumentSettingsPage })),
);
const CashMovementsPage = lazy(() =>
  import('@/modules/cashMovements/pages/CashMovementsPage').then((m) => ({ default: m.CashMovementsPage })),
);
const PaymentsPage = lazy(() =>
  import('@/modules/payments/pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const EmployeeDebtsPage = lazy(() =>
  import('@/modules/employeeDebts/pages/EmployeeDebtsPage').then((m) => ({ default: m.EmployeeDebtsPage })),
);

function RouteFallback() {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

// Árbol completo para un usuario autenticado (hay token). Se monta desde
// app/App.tsx cuando useAuthStore tiene token.
//
// /change-password vive FUERA del Shell (sin sidebar, sin llamar a
// /access/me): el backend bloquea cualquier otro endpoint —incluido
// /access/me— mientras el usuario tenga una contraseña temporal pendiente
// (grulla_be: require-password-changed.ts), así que el guard de accesos no
// puede correr todavía en ese momento.
export default function PrivateRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/change-password" element={<ChangePasswordPage />} />

        <Route element={<Shell />}>
          <Route path="/" element={<DashboardPage />} />
          {/* Cada ruta debe ser exactamente el "route" registrado como resource
              tipo "view" en el backend (verificado en vivo vía GET /access/me). */}
          <Route path="/seguridad/usuarios" element={<UsersListPage />} />
          <Route path="/configuracion/apariencia-empresas" element={<CompaniesPage />} />
          <Route path="/configuracion/tiendas" element={<BusinessUnitsPage />} />
          <Route path="/seguridad/roles-accesos" element={<RolesPage />} />
          <Route path="/configuracion/variables-generales" element={<VariableGeneralPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/productos" element={<ProductsPage />} />
          <Route path="/productos/tecnicas" element={<ProductsPage />} />
          <Route path="/cotizaciones" element={<QuotationsPage />} />
          <Route path="/ordenes-compra" element={<PurchaseOrdersPage />} />
          <Route path="/configuracion/documentos" element={<DocumentSettingsPage />} />
          <Route path="/caja" element={<CashMovementsPage />} />
          <Route path="/pagos" element={<PaymentsPage />} />
          <Route path="/deudas-personal" element={<EmployeeDebtsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
