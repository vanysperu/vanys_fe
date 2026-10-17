import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRole, getRoles, toggleRoleStatus, updateRole } from '@/modules/roles/api/roles.api';
import { rolesKeys } from '@/modules/roles/hooks/roles.keys';
import type { RoleListParams, UpdateRoleDto } from '@/modules/roles/types/role.types';

export function useRoles(params: RoleListParams) {
  return useQuery({
    queryKey: rolesKeys.list(params),
    queryFn: () => getRoles(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateRoleDto }) => updateRole(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
    },
  });
}

export function useToggleRoleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleRoleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.lists() });
    },
  });
}
