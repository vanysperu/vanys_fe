import type { UsersListParams } from '@/modules/users/types/user.types';

export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (params: UsersListParams) => [...usersKeys.lists(), params] as const,
  detail: (id: string) => [...usersKeys.all, 'detail', id] as const,
};
