// Espejo de CreateUserDto (grulla_be: users/dtos, validators/user.validator.ts).
export interface CreateUserDto {
  name: string;
  paternal_lastname: string;
  maternal_lastname?: string;
  email: string;
  document_type: number;
  document_number: string;
  date_of_birth: string; // DD/MM/YYYY
  phone_number?: string;
  address?: string;
  status: boolean;
  gender: number;
  // Solo la manda un Super Administrador (elige a qué empresa pertenece el
  // usuario nuevo); un admin de empresa nunca la manda, el backend la
  // fuerza a la suya sin importar lo que llegue acá.
  company_id?: number;
  // Obligatoria si quien crea NO es Super Administrador; opcional si sí lo
  // es (puede crear un admin de empresa sin tienda propia).
  business_unit_id?: number;
  roleIds: number[];
}

// Espejo de UpdateUserDto (grulla_be: users/controllers/user.controller.ts ->
// updateUserController). company_id/business_unit_id ahora SÍ son
// editables: antes el backend ni los aceptaba, impidiendo corregir una
// tienda/empresa mal asignada al crear (bug reportado por QA).
export type UpdateUserDto = Partial<CreateUserDto>;

// Enlace para crear o recuperar la contraseña (grulla_be: Sprint 2, ítem 4).
// Ya no hay contraseña temporal: el usuario elige la suya con este enlace.
export type PasswordLinkPurpose = 'invite' | 'reset';

export interface PasswordLinkResult {
  url: string;
  expiresAt: { date: string; time: string };
  // false = el correo no está configurado en el servidor: hay que mandar el
  // enlace a mano (copiar o WhatsApp).
  emailConfigured: boolean;
}

export interface CreateUserResult {
  id: number;
  invitation: PasswordLinkResult;
}

// Espejo de general_variable en modo select (GET /variable_general/list).
export interface CatalogOption {
  value: string;
  name: string;
}
