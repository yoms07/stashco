/**
 * User service
 * Service layer for user-related API calls
 */

import { ApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  User,
  PaginatedUsers,
  CreateUserInput,
  UpdateUserInput,
  UsersListParams,
} from './users.types';
import type { ApiResponse } from '@stellar-ambassador/shared';

export class UserService {
  /**
   * Fetch paginated list of users
   */
  static async getUsers(
    params?: UsersListParams
  ): Promise<ApiResponse<PaginatedUsers>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const endpoint = query ? `${API_ENDPOINTS.users.list}?${query}` : API_ENDPOINTS.users.list;

    return ApiClient.get<PaginatedUsers>(endpoint);
  }

  /**
   * Fetch a single user by ID
   */
  static async getUserById(id: string): Promise<ApiResponse<User>> {
    return ApiClient.get<User>(API_ENDPOINTS.users.byId(id));
  }

  /**
   * Create a new user
   */
  static async createUser(data: CreateUserInput): Promise<ApiResponse<User>> {
    return ApiClient.post<User>(API_ENDPOINTS.users.create, data);
  }

  /**
   * Update an existing user
   */
  static async updateUser(
    id: string,
    data: UpdateUserInput
  ): Promise<ApiResponse<User>> {
    return ApiClient.put<User>(API_ENDPOINTS.users.update(id), data);
  }

  /**
   * Delete a user
   */
  static async deleteUser(id: string): Promise<ApiResponse<void>> {
    return ApiClient.delete<void>(API_ENDPOINTS.users.delete(id));
  }
}
