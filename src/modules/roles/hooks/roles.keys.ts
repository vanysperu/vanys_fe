import type { RoleListParams } from '@/modules/roles/types/role.types';

export const rolesKeys = {
  all: ['roles'] as const,
  lists: () => [...rolesKeys.all, 'list'] as const,
  list: (params: RoleListParams) => [...rolesKeys.lists(), params] as const,
  resourceTree: (roleId: number) => [...rolesKeys.all, 'resource-tree', roleId] as const,
};
