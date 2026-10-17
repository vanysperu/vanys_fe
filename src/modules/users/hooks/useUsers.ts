import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getUsers } from '@/modules/users/api/users.api';
import { usersKeys } from '@/modules/users/hooks/users.keys';
import type { UsersListParams } from '@/modules/users/types/user.types';

export function useUsers(params: UsersListParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
  });
}
