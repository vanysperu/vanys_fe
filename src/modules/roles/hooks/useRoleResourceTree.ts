import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getRoleResourceTree, setRoleResources } from '@/modules/roles/api/roles.api';
import { rolesKeys } from '@/modules/roles/hooks/roles.keys';
import type { SetRoleResourcesDto } from '@/modules/roles/types/role.types';

export function useRoleResourceTree(roleId: number, enabled: boolean) {
  return useQuery({
    queryKey: rolesKeys.resourceTree(roleId),
    queryFn: () => getRoleResourceTree(roleId),
    enabled,
  });
}

export function useSetRoleResources(roleId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetRoleResourcesDto) => setRoleResources(roleId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.resourceTree(roleId) });
    },
  });
}
