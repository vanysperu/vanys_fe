// Constantes de autenticación compartidas entre global.setup.ts (que hace el
// login real) y cada spec (que solo necesita la ruta del storageState ya
// generado) — en un archivo aparte porque Playwright prohíbe que un spec
// importe directamente otro archivo de test (global.setup.ts cuenta como uno).
// Cuentas QA dedicadas, insertadas directamente en la BD de desarrollo
// (nunca tocan al Super Admin real ni a ninguna empresa real): un Super
// Administrador y un Administrador de una empresa "Acme Corp QA" propia,
// exclusivos para esta suite — recrear con `npm run db:seed-qa` (grulla_be)
// si se pierden (ej. tras un `db:reset-factory`).
export const SUPERADMIN = { email: 'qa.superadmin@grulla.test', password: 'Test1234' };
export const COMPANY_ADMIN = { email: 'admin.qa@acme.test', password: 'Test1234' };
// Gestor de la misma empresa QA — necesario para probar que el RBAC oculta
// (no solo deshabilita) los botones/vistas exclusivos de Administrador.
export const GESTOR = { email: 'gestor.qa@acme.test', password: 'Test1234' };

// Cuenta aparte, SOLO para el spec de login (nunca para storageState
// reusado por otros specs): el backend cierra TODAS las sesiones anteriores
// de un usuario en cada login exitoso (closeAllSessions, auth.controller.ts
// — una sola sesión activa a la vez, por diseño). Si el test de login
// volviera a loguearse con COMPANY_ADMIN/SUPERADMIN, invalidaría en el acto
// el token ya guardado en admin.json/superadmin.json y todos los specs que
// lo reutilizan empezarían a fallar a mitad de la corrida.
export const LOGIN_FLOW_USER = { email: 'login.qa@grulla.test', password: 'Test1234' };

export const SUPERADMIN_STATE = 'e2e/.auth/superadmin.json';
export const ADMIN_STATE = 'e2e/.auth/admin.json';
export const GESTOR_STATE = 'e2e/.auth/gestor.json';
