import type { VariableGeneralListParams } from '@/modules/variableGeneral/types/variableGeneral.types';

export const variableGeneralKeys = {
  all: ['variable-general'] as const,
  lists: () => [...variableGeneralKeys.all, 'list'] as const,
  list: (params: VariableGeneralListParams) => [...variableGeneralKeys.lists(), params] as const,
};
