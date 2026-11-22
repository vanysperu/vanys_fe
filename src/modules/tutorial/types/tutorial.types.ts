import type { LucideIcon } from 'lucide-react';

// Modo enseñanza (21-nov): lecciones guiadas tipo videojuego. Cada paso
// ilumina una zona de la pantalla, bloquea el resto y espera a que la persona
// haga la acción real (abrir, llenar, guardar) antes de seguir.

// Cómo encontrar un elemento en la pantalla. Un texto CSS simple, o una
// consulta con filtros que CSS no tiene (texto visible, contenedor, "el más
// cercano hacia arriba").
export interface TargetQuery {
  css: string;
  // El elemento debe contener este texto (sin distinguir mayúsculas ni tildes).
  text?: string;
  // Con `exact`, el texto visible debe ser exactamente ese.
  exact?: boolean;
  // Buscar solo dentro de este contenedor (el último visible, que suele ser el de arriba).
  within?: string;
  // Subir desde el elemento encontrado hasta este contenedor (ej. el formulario completo).
  closest?: string;
  // Tomar la última coincidencia visible en vez de la primera.
  last?: boolean;
}

export type TargetSpec = string | TargetQuery;

// Cuándo termina un paso.
export type StepDone =
  // La persona tocó el elemento iluminado.
  | { kind: 'click' }
  // Paso informativo: botón "Entendido" (o el texto que se indique).
  | { kind: 'ack'; label?: string }
  // Llegó a esta pantalla.
  | { kind: 'route'; path: string }
  // Apareció este elemento (ej. se abrió una ventana).
  | { kind: 'appear'; target: TargetSpec }
  // Desapareció este elemento (ej. se cerró una ventana). Con `waitForAppearMs`,
  // primero espera a que aparezca (la ventana puede abrirse un instante después
  // del aviso); si no aparece en ese tiempo, el paso pasa igual.
  | { kind: 'disappear'; target: TargetSpec; waitForAppearMs?: number }
  // Salió un aviso de éxito con alguno de estos textos (solo avisos nuevos del paso).
  | { kind: 'toast'; texts: string[] }
  // Condición propia de la lección (se evalúa varias veces por segundo).
  | { kind: 'check'; test: () => boolean };

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  // Ejemplo de qué escribir o elegir.
  hint?: string;
  // Zona iluminada donde se puede tocar. Con una lista, vale la primera que exista.
  target?: TargetSpec | TargetSpec[];
  // Otras zonas donde también se puede tocar.
  allow?: TargetSpec[];
  // A dónde apunta la mano (por defecto, al target). null = sin mano.
  pointer?: TargetSpec | TargetSpec[] | null;
  done: StepDone;
  // Una vez pasado, la lección no vuelve antes de este paso (ya se guardó algo).
  checkpoint?: boolean;
  // Se puede saltar (ej. subir un diseño si no tiene una imagen a mano).
  skippable?: boolean;
}

// Datos que el backend preparó para la lección (ej. la cotización de práctica).
export interface LessonContext {
  quotationId: number | null;
}

// Datos que el backend prepara antes de la lección (espejo de LESSON_PREPARATIONS).
export type LessonPreparation =
  | 'pending_quotation'
  | 'accepted_quotation'
  | 'ready_quotation'
  | 'purchase_order'
  | 'pending_invoice_purchase'
  | 'employee_debt'
  | 'warehouse';

// Secciones de "Aprender" (para ordenar tantas lecciones).
export type LessonSection = 'start' | 'sales' | 'finance' | 'settings' | 'operations';

export interface TutorialLesson {
  code: string;
  section: LessonSection;
  title: string;
  summary: string;
  minutes: number;
  icon: LucideIcon;
  // Lo que el rol necesita (de /access/me): si le falta algo, la lección no se
  // le ofrece. Solo es para mostrar; el backend igual valida cada acción.
  requires: { buttons?: string[]; routes?: string[] };
  prepare?: LessonPreparation;
  steps: (context: LessonContext) => TutorialStep[];
}

// Lección en curso (se guarda en el navegador para retomarla al recargar).
export interface ActiveLesson {
  code: string;
  stepIndex: number;
  // Primer paso al que se puede volver (después del último checkpoint pasado).
  floor: number;
  context: LessonContext;
}

// ---- API (espejo del backend, módulo tutorial) ----

export interface PracticeSession {
  token: string;
  user: { fullName: string; email: string };
}

export type LessonProgressStatus = 'in_progress' | 'completed';

export interface LessonProgress {
  lesson_code: string;
  status: LessonProgressStatus;
  step_index: number;
  completed_at: { date: string; time: string } | null;
}

export interface SaveProgressDto {
  step_index: number;
  completed: boolean;
}

export interface PreparedLesson {
  quotation_id: number | null;
}

export interface TeamMemberProgress {
  user_id: number;
  full_name: string;
  email: string;
  role_name: string | null;
  completed_lessons: string[];
  last_activity: { date: string; time: string } | null;
}

export interface TeamProgressParams {
  page: number;
  limit: number;
}

export interface TeamProgressResult {
  data: TeamMemberProgress[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
