/**
 * User React Query hooks
 * Custom hooks that wrap user service calls with React Query
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { UserService } from './users.service';
import { userKeys } from './users.queries';
import type {
  User,
  PaginatedUsers,
  CreateUserInput,
  UpdateUserInput,
  UsersListParams,
} from './users.types';
import type { ApiResponse } from '@stellar-ambassador/shared';

/**
 * Hook to fetch paginated users list
 */
export function useUsers(
  params?: UsersListParams,
  options?: Omit<
    UseQueryOptions<ApiResponse<PaginatedUsers>>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => UserService.getUsers(params),
    ...options,
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(
  id: string,
  options?: Omit<UseQueryOptions<ApiResponse<User>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => UserService.getUserById(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook to create a new user
 */
export function useCreateUser(
  options?: UseMutationOptions<
    ApiResponse<User>,
    Error,
    CreateUserInput
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserInput) => UserService.createUser(data),
    onSuccess: () => {
      // Invalidate users list to refetch after creation
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser(
  options?: UseMutationOptions<
    ApiResponse<User>,
    Error,
    { id: string; data: UpdateUserInput }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      UserService.updateUser(id, data),
    onSuccess: (_, variables) => {
      // Invalidate both the specific user and the users list
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hook to delete a user
 */
export function useDeleteUser(
  options?: UseMutationOptions<ApiResponse<void>, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => UserService.deleteUser(id),
    onSuccess: (_, id) => {
      // Remove the deleted user from cache and invalidate lists
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    ...options,
  });
}
