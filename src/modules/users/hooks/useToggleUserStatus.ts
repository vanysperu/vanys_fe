import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleUserStatus } from '@/modules/users/api/users.api';
import { usersKeys } from '@/modules/users/hooks/users.keys';

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}
