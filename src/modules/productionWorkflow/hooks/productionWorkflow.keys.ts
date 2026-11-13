// companyId en la key: el Super Administrador alterna entre empresas y cada
// una tiene su propio flujo (nunca reutilizar el de otra).
export const productionWorkflowKeys = {
  all: ['productionWorkflow'] as const,
  config: (companyId: number | undefined) => [...productionWorkflowKeys.all, 'config', companyId ?? 'own'] as const,
  board: (companyId: number | undefined) => [...productionWorkflowKeys.all, 'board', companyId ?? 'own'] as const,
};
