# Services Directory

This directory contains all API service layers organized by domain. Each service follows a consistent pattern for maintainability and type safety.

## Structure

```
services/
├── api/                        # Core API infrastructure
│   ├── client.ts              # Base API client with request methods
│   ├── endpoints.ts           # Centralized endpoint definitions
│   └── index.ts               # Barrel export
└── {domain}/                  # Domain-specific services (e.g., users, auth)
    ├── {domain}.types.ts      # TypeScript interfaces for the domain
    ├── {domain}.queries.ts    # React Query key factory
    ├── {domain}.service.ts    # Service functions that call the API
    ├── {domain}.hook.ts       # React Query hooks
    └── index.ts               # Barrel export
```

## Pattern Explanation

### 1. Types File (`{domain}.types.ts`)
Defines all TypeScript interfaces for the domain:
- Entity types (e.g., `User`)
- Input types (e.g., `CreateUserInput`, `UpdateUserInput`)
- Parameter types (e.g., `UsersListParams`)
- Response types (e.g., `PaginatedUsers`)

### 2. Queries File (`{domain}.queries.ts`)
Query key factory for React Query cache management:
```typescript
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: UsersListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};
```

Benefits:
- Type-safe query keys
- Centralized cache invalidation
- Hierarchical key structure for granular control

### 3. Service File (`{domain}.service.ts`)
Pure functions that make API calls:
```typescript
export class UserService {
  static async getUsers(params?: UsersListParams): Promise<ApiResponse<PaginatedUsers>> {
    // Build query string, make API call
  }
}
```

Benefits:
- Reusable across components
- Easy to test (no React dependencies)
- Can be used outside React Query if needed

### 4. Hook File (`{domain}.hook.ts`)
React Query hooks that wrap service functions:
```typescript
export function useUsers(params?: UsersListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => UserService.getUsers(params),
  });
}
```

Benefits:
- Automatic caching and background refetching
- Loading and error states
- Optimistic updates
- Cache invalidation on mutations

## Usage Example

### Fetching Data
```tsx
'use client';

import { useUsers } from '@/services/users';

export function UsersList() {
  const { data, isLoading, error } = useUsers({ page: 1, limit: 10 });

  if (isLoading) return <div>Loading...</div>;
  if (!data?.success) return <div>Error: {data?.error}</div>;

  return (
    <ul>
      {data.data.data.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Creating Data
```tsx
'use client';

import { useCreateUser } from '@/services/users';

export function CreateUserForm() {
  const createUser = useCreateUser({
    onSuccess: (response) => {
      if (response.success) {
        console.log('Created:', response.data);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUser.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button disabled={createUser.isPending}>
        {createUser.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Updating Data
```tsx
import { useUpdateUser } from '@/services/users';

export function EditUserForm({ userId }: { userId: string }) {
  const updateUser = useUpdateUser();

  const handleUpdate = () => {
    updateUser.mutate({
      id: userId,
      data: { name: 'Updated Name' },
    });
  };

  return <button onClick={handleUpdate}>Update</button>;
}
```

## Adding a New Service

1. Create a new directory: `services/{domain}/`
2. Add files:
   - `{domain}.types.ts` - Define interfaces
   - `{domain}.queries.ts` - Create query key factory
   - `{domain}.service.ts` - Implement API calls
   - `{domain}.hook.ts` - Create React Query hooks
   - `index.ts` - Export everything
3. Add endpoints to `services/api/endpoints.ts`

## Best Practices

1. **Separate concerns**: Keep service, queries, types, and hooks in separate files
2. **Use query key factories**: Enables powerful cache invalidation patterns
3. **Type everything**: Leverage TypeScript for safety
4. **Handle errors**: Always check `response.success` before accessing data
5. **Invalidate correctly**: Use query keys to invalidate related queries on mutations
6. **Reuse services**: Service functions can be used outside React Query if needed

## React Query Configuration

The QueryProvider is configured in `providers/query-provider.tsx`:
- Default staleTime: 1 minute (good for SSR)
- Retry: 1 attempt
- DevTools enabled in development

See [TanStack Query docs](https://tanstack.com/query/latest/docs/framework/react/overview) for more information.
