'use client';

import { useState } from 'react';
import { useUsers, useCreateUser, useDeleteUser } from '@/services/users/users.hook';

/**
 * Example component demonstrating React Query hooks usage
 * This shows how to fetch, create, and delete users
 */
export function UsersListExample() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Fetch users with pagination and search
  const { data, isLoading, error } = useUsers({ page, limit: 10, search });

  // Create user mutation
  const createUser = useCreateUser({
    onSuccess: (response) => {
      if (response.success) {
        console.log('User created successfully:', response.data);
      }
    },
  });

  // Delete user mutation
  const deleteUser = useDeleteUser({
    onSuccess: (response) => {
      if (response.success) {
        console.log('User deleted successfully');
      }
    },
  });

  const handleCreateUser = () => {
    createUser.mutate({
      name: 'New User',
      email: 'newuser@example.com',
    });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      deleteUser.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading users...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading users</div>;
  }

  if (!data?.success) {
    return <div className="p-4 text-red-500">{data?.error || 'Failed to load users'}</div>;
  }

  const { data: users, meta } = data.data;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users</h2>
        <button
          onClick={handleCreateUser}
          disabled={createUser.isPending}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {createUser.isPending ? 'Creating...' : 'Create User'}
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex justify-between items-center p-4 border rounded"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <button
              onClick={() => handleDeleteUser(user.id)}
              disabled={deleteUser.isPending}
              className="px-3 py-1 text-sm text-red-500 border border-red-500 rounded hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {meta.page} of {meta.totalPages}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= meta.totalPages}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
