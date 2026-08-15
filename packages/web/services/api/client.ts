import type { ApiResponse } from '@stashco/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private static async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    const url = `${API_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // send session cookies cross-origin (required for better-auth)
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Request failed',
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  static async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  static async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
