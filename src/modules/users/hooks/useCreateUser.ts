import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createUser, getCatalog, updateUser } from '@/modules/users/api/users.api';
import { usersKeys } from '@/modules/users/hooks/users.keys';
import type { UpdateUserDto } from '@/modules/users/types/createUser.types';

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateUserDto }) => updateUser(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

export function useCatalog(category: 'document_type' | 'gender') {
  return useQuery({
    queryKey: ['catalog', category],
    queryFn: () => getCatalog(category),
    staleTime: 10 * 60 * 1000,
  });
}
