// Espejo de grulla_be/src/api/modules/production_workflow/types (Sprint 2, ítem 5).

// "linear" = solo a la columna vecina; "free" = a cualquier columna activa.
export type FlowMode = 'linear' | 'free';

// Tipo de columna: cada empresa nombra sus columnas como quiera, pero el
// sistema sabe cuáles son "por hacer", "en curso" o "terminado".
export type StageCategory = 'todo' | 'doing' | 'done';

export const STAGE_CATEGORY_LABEL: Record<StageCategory, string> = {
  todo: 'Por hacer',
  doing: 'En curso',
  done: 'Terminado',
};

export const FLOW_MODE_LABEL: Record<FlowMode, string> = {
  linear: 'Lineal',
  free: 'Libre',
};

export interface WorkflowStage {
  id: number;
  name: string;
  color: string;
  position: number;
  category: StageCategory;
  active: boolean;
}

export interface WorkflowStageWithCount extends WorkflowStage {
  itemCount: number;
}

export interface WorkflowRules {
  flowMode: FlowMode;
  allowBackward: boolean;
}

// GET /production-workflow/config
export interface WorkflowConfig extends WorkflowRules {
  companyId: number;
  stages: WorkflowStageWithCount[];
}

// GET /production-workflow/board: solo columnas activas, en orden.
export interface WorkflowBoard extends WorkflowRules {
  stages: WorkflowStage[];
}

export interface SaveWorkflowStageDto {
  id: number | null;
  name: string;
  color: string;
  category: StageCategory;
  active: boolean;
  moveItemsToStageId: number | null;
}

export interface SaveWorkflowConfigDto extends WorkflowRules {
  // Solo para el Super Administrador (la empresa elegida en la pantalla).
  company_id?: number;
  stages: SaveWorkflowStageDto[];
}
