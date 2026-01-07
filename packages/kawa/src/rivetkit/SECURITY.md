# Security Guide for Kawa + RivetKit

This guide covers authentication, authorization, and security patterns for building secure reactive applications with Kawa and RivetKit.

## Table of Contents

- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Defining Auth Context](#defining-auth-context)
- [Creating Secure Actors](#creating-secure-actors)
- [Using Guards](#using-guards)
- [Passing Context from Components](#passing-context-from-components)
- [Multi-Tenant Isolation](#multi-tenant-isolation)
- [Streaming with Authentication](#streaming-with-authentication)
- [Best Practices](#best-practices)

## Quick Start

### 1. Define Your User Context

```typescript
// Extend the UserContext interface with your app's user type
declare module 'kawa/rivetkit' {
  interface UserContext {
    userId: string;
    role: 'admin' | 'user';
    permissions: string[];
  }
}
```

### 2. Initialize Backend with Auth

```typescript
import { initReactiveBackend } from 'kawa/rivetkit';
import { registry } from './registry';

const backend = initReactiveBackend({
  registry,

  // Function to get current user context
  getContext: async () => {
    // Extract user from JWT, session, etc.
    return {
      userId: 'user_123',
      role: 'admin',
      permissions: ['posts.edit']
    };
  }
});
```

### 3. Create Secure Actors

```typescript
import { actor } from 'rivetkit';
import { withGuards, requireAuth, requireRole } from 'kawa/rivetkit';

export const postsActor = actor({
  state: {
    posts: {} as Record<string, any>
  },

  actions: {
    // Only authenticated users can read
    getPosts: withGuards(requireAuth, (c) => {
      return { posts: c.state.posts };
    }),

    // Only admins can delete
    deletePost: withGuards(
      requireRole('admin'),
      (c, { postId }) => {
        delete c.state.posts[postId];
        return { success: true };
      }
    )
  }
});
```

### 4. Pass Context from Components

```typescript
import { useServerState } from 'kawa';
import { userSignal } from './signals';

function UserProfile({ userId }: { userId: string }) {
  const user = useServerState(userSignal, {
    context: { userId, role: 'user', permissions: [] }
  });

  return <div>{user.name}</div>;
}
```

## Core Concepts

### Authentication vs Authorization

- **Authentication** (authn): Verifying _who_ the user is
- **Authorization** (authz): Verifying _what_ the user can do

Kawa provides primitives for both:

```typescript
// Authentication: verify user is logged in
requireAuth

// Authorization: verify user has permission
requireRole('admin')
requirePermission('posts.edit')
```

### Guards

Guards are functions that validate actor calls. They:
- Run before the action executes
- Have access to user context and action parameters
- Throw errors to reject unauthorized calls
- Can be composed for complex logic

### User Context

User context flows from components → hooks → runtime → actors:

```
Component (pass context)
    ↓
useServerState({ context: {...} })
    ↓
ReactiveBackend.getContext()
    ↓
Actor action (c.user or c.auth)
```

## Defining Auth Context

### Basic User Type

```typescript
declare module 'kawa/rivetkit' {
  interface UserContext {
    userId: string;
    email: string;
    role: 'admin' | 'user';
  }
}
```

### Advanced User Type

```typescript
declare module 'kawa/rivetkit' {
  interface UserContext {
    // Identity
    userId: string;
    email: string;
    username: string;

    // Authorization
    role: 'admin' | 'moderator' | 'user';
    permissions: string[];

    // Multi-tenancy
    organizationId: string;
    teamIds: string[];

    // Metadata
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  }
}
```

## Creating Secure Actors

### Basic Secure Actor

```typescript
import { actor } from 'rivetkit';
import { withGuards, requireAuth, type AuthActorContext } from 'kawa/rivetkit';

export const notesActor = actor({
  state: {
    notes: {} as Record<string, { content: string; userId: string }>
  },

  actions: {
    createNote: withGuards(
      requireAuth,
      (c: AuthActorContext, { content }: { content: string }) => {
        const userId = c.user?.userId || c.auth?.userId;
        const noteId = `note_${Date.now()}`;

        c.state.notes[noteId] = { content, userId: userId! };

        return { noteId };
      }
    )
  }
});
```

### Actor with Multiple Guards

```typescript
import { requireAuth, requireRole, requirePermission, composeGuards } from 'kawa/rivetkit';

export const adminActor = actor({
  actions: {
    // Combine multiple guards
    deleteUser: withGuards(
      [requireAuth, requireRole('admin'), requirePermission('users.delete')],
      (c, { userId }) => {
        // Delete user logic
      }
    ),

    // Or use composeGuards for reusable combinations
    banUser: withGuards(
      composeGuards(requireAuth, requireRole('admin', 'moderator')),
      (c, { userId }) => {
        // Ban user logic
      }
    )
  }
});
```

### Actor with Resource Ownership

```typescript
export const profileActor = actor({
  state: {
    profiles: {} as Record<string, { userId: string; bio: string }>
  },

  actions: {
    updateProfile: withGuards(
      requireAuth,
      (c: AuthActorContext, { userId, bio }: { userId: string; bio: string }) => {
        const currentUserId = c.user?.userId || c.auth?.userId;
        const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

        // Users can only update their own profile (unless admin)
        if (userId !== currentUserId && !isAdmin) {
          throw new Error('Cannot edit another user\'s profile');
        }

        c.state.profiles[userId] = { userId, bio };
        return { success: true };
      }
    )
  }
});
```

## Using Guards

### Built-in Guards

```typescript
import {
  requireAuth,       // Must be authenticated
  requireUserId,     // Must be specific user
  requireRole,       // Must have role
  requirePermission, // Must have permission
  requireOwnership,  // Must own the resource
  rateLimit,        // Rate limiting
} from 'kawa/rivetkit';

// Usage examples
withGuards(requireAuth, action)
withGuards(requireRole('admin'), action)
withGuards(requirePermission('posts.edit'), action)
withGuards(requireOwnership('userId'), action)
withGuards(rateLimit({ maxCalls: 100, windowMs: 60000 }), action)
```

### Custom Guards

```typescript
import { createGuard, type AuthActorContext } from 'kawa/rivetkit';

// Guard: User must be verified
const requireVerifiedEmail = createGuard((ctx: AuthActorContext) => {
  if (!ctx.user?.emailVerified) {
    throw new Error('Email verification required');
  }
});

// Guard: User must belong to organization
const requireOrganization = (orgId: string) => createGuard((ctx: AuthActorContext) => {
  if (ctx.user?.organizationId !== orgId) {
    throw new Error('Access denied: wrong organization');
  }
});

// Guard: Custom business logic
const requirePremiumFeature = createGuard((ctx: AuthActorContext) => {
  if (!ctx.user?.subscription?.includes('premium')) {
    throw new Error('Premium subscription required');
  }
});

// Use in actors
export const premiumActor = actor({
  actions: {
    exportData: withGuards(
      [requireAuth, requireVerifiedEmail, requirePremiumFeature],
      (c) => {
        // Export data logic
      }
    )
  }
});
```

### Parameterized Guards

```typescript
// Guard that checks if user has one of the specified roles
const requireAnyRole = (...roles: string[]) => createGuard((ctx: AuthActorContext) => {
  const userRole = ctx.user?.role || ctx.auth?.role;
  if (!userRole || !roles.includes(userRole)) {
    throw new Error(`Requires one of: ${roles.join(', ')}`);
  }
});

// Guard that checks resource ownership with custom field
const requireOwnershipOf = (field: string) => createGuard(
  (ctx: AuthActorContext, params: any) => {
    const userId = ctx.user?.userId || ctx.auth?.userId;
    if (params[field] !== userId) {
      throw new Error(`Must own this resource`);
    }
  }
);

// Usage
withGuards(requireAnyRole('admin', 'moderator'), action)
withGuards(requireOwnershipOf('authorId'), action)
```

### Conditional Guards

```typescript
// Guard that only applies in certain conditions
const requireApprovalIfLarge = createGuard((ctx: AuthActorContext, params: any) => {
  const isLargeUpload = params.size > 10_000_000; // 10MB
  const hasApproval = ctx.user?.permissions?.includes('upload.large');

  if (isLargeUpload && !hasApproval) {
    throw new Error('Large uploads require approval');
  }
});
```

## Passing Context from Components

### Server Components

```typescript
import { useServerState, useReactiveStream } from 'kawa';

// Method 1: Via hook options
function UserDashboard({ userId }: { userId: string }) {
  const userData = useServerState(userSignal, {
    context: { userId, role: 'user', permissions: [] }
  });

  return <div>{userData.name}</div>;
}

// Method 2: Via backend initialization
const backend = initReactiveBackend({
  registry,
  getContext: async () => {
    // Get user from request context (framework-specific)
    const user = await getCurrentUser();
    return user;
  }
});
```

### Dynamic Context

```typescript
// Get user from request headers
import { parseAuthHeader } from 'kawa/rivetkit';

const backend = initReactiveBackend({
  registry,
  getContext: async () => {
    // In Next.js
    const { headers } = await import('next/headers');
    const authHeader = headers().get('Authorization');
    return parseAuthHeader(authHeader);

    // In other frameworks, adapt accordingly
  }
});
```

### Per-Request Context

```typescript
// For frameworks that support async context
import { AsyncLocalStorage } from 'async_hooks';

const userContext = new AsyncLocalStorage<UserContext>();

const backend = initReactiveBackend({
  registry,
  getContext: () => {
    return userContext.getStore();
  }
});

// In your request handler
app.use((req, res, next) => {
  const user = getUserFromToken(req.headers.authorization);
  userContext.run(user, () => next());
});
```

## Multi-Tenant Isolation

### Pattern 1: Isolated Actor Instances

```typescript
// Create separate actor instance per tenant
function getTenantBackend(tenantId: string) {
  return initReactiveBackend({
    registry,
    actorId: tenantId, // Separate actor per tenant
    global: false,

    getContext: async () => ({
      tenantId,
      // ... user context
    })
  });
}

// Use in components
function TenantDashboard({ tenantId }: { tenantId: string }) {
  const backend = getTenantBackend(tenantId);
  // Use backend-specific signals
}
```

### Pattern 2: Namespace-Based Isolation

```typescript
import { namespace } from 'kawa';

// Create namespace per tenant
const tenants = namespace('tenants');

const getTenantData = tenants.family((tenantId: string) => ({
  key: `${tenantId}:data`,
  default: {}
}));

// Access is still controlled by guards
const tenantActor = actor({
  actions: {
    getData: withGuards(
      createGuard((ctx, { tenantId }) => {
        if (ctx.user?.tenantId !== tenantId) {
          throw new Error('Access denied: different tenant');
        }
      }),
      (c, { tenantId }) => {
        return getTenantData.get(tenantId);
      }
    )
  }
});
```

### Pattern 3: Row-Level Security

```typescript
// Filter data based on user's tenant
const multiTenantActor = actor({
  state: {
    items: [] as Array<{ id: string; tenantId: string; data: any }>
  },

  actions: {
    getItems: withGuards(
      requireAuth,
      (c: AuthActorContext) => {
        const userTenantId = c.user?.tenantId || c.auth?.tenantId;

        // Only return items for user's tenant
        const items = c.state.items.filter(
          item => item.tenantId === userTenantId
        );

        return { items };
      }
    )
  }
});
```

## Streaming with Authentication

### SSE with Token Auth

```typescript
// Server: SSE endpoint with auth
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  // Verify token
  const user = await verifyToken(token);
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create authenticated stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Subscribe to user-specific updates
      const unsubscribe = reactiveRuntime.subscribeToSignal(
        userDataSignal,
        {
          send: (data) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            );
          }
        }
      );

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

### Client: Connect with Token

```typescript
// Client connects with auth token
const token = await getAuthToken();
const eventSource = new EventSource(`/api/reactive?token=${token}`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received update:', data);
};
```

### Secure Broadcast

```typescript
// Actor that only broadcasts to authorized users
export const chatActor = actor({
  state: {
    messages: [] as Array<{ channelId: string; content: string }>
  },

  onStateChange: (c, newState) => {
    // Custom broadcast logic - filter by channel access
    // In real app, check user permissions before broadcasting
    c.broadcast('messagesUpdated', {
      messages: newState.messages
    });
  },

  actions: {
    sendMessage: withGuards(
      requireAuth,
      (c, { channelId, content }) => {
        // Check if user has access to channel
        const hasAccess = checkChannelAccess(c.user, channelId);
        if (!hasAccess) {
          throw new Error('No access to this channel');
        }

        c.state.messages.push({ channelId, content });
        return { success: true };
      }
    )
  }
});
```

## Best Practices

### 1. Always Validate on the Server

```typescript
// ❌ BAD: Trust client context
function Component({ isAdmin }: { isAdmin: boolean }) {
  const data = useServerState(signal, {
    context: { isAdmin } // Client can lie!
  });
}

// ✅ GOOD: Verify on server
const backend = initReactiveBackend({
  registry,
  getContext: async () => {
    // Verify with server-side session/JWT
    const user = await getCurrentUser();
    return user;
  }
});
```

### 2. Use Type-Safe Context

```typescript
// ✅ Define strong types
declare module 'kawa/rivetkit' {
  interface UserContext {
    userId: string;
    role: 'admin' | 'user'; // Not just 'string'
    permissions: readonly string[]; // Readonly for safety
  }
}
```

### 3. Fail Closed, Not Open

```typescript
// ❌ BAD: Default to allowing access
const canAccess = user?.role === 'admin' || true;

// ✅ GOOD: Default to denying access
const canAccess = user?.role === 'admin' || false;

// ✅ BETTER: Use guards that throw on failure
withGuards(requireRole('admin'), action)
```

### 4. Audit Security-Sensitive Actions

```typescript
import { createAuditLog } from 'kawa/rivetkit';

const auditLog = createAuditLog();

export const secureActor = actor({
  actions: {
    deleteUser: withGuards(
      requireRole('admin'),
      (c: AuthActorContext, { userId }) => {
        // Log before action
        auditLog.log(c, 'deleteUser', { userId });

        // Perform action
        delete c.state.users[userId];

        return { success: true };
      }
    )
  }
});
```

### 5. Rate Limit Expensive Operations

```typescript
import { rateLimit } from 'kawa/rivetkit';

// Limit uploads per user
const uploadLimit = rateLimit({ maxCalls: 10, windowMs: 60000 });

export const uploadActor = actor({
  actions: {
    upload: withGuards(
      [requireAuth, uploadLimit],
      (c, { file }) => {
        // Upload logic
      }
    )
  }
});
```

### 6. Separate Public and Private Data

```typescript
// ✅ Don't leak private data in broadcasts
onStateChange: (c, newState) => {
  // Filter sensitive fields
  const publicData = {
    name: newState.user.name,
    avatar: newState.user.avatar,
    // Don't include: email, phone, etc.
  };

  c.broadcast('userUpdated', publicData);
}
```

### 7. Test Your Guards

```typescript
// Write tests for auth logic
describe('requireRole', () => {
  it('allows admin users', () => {
    const ctx = { user: { role: 'admin' } };
    expect(() => requireRole('admin')(ctx, {})).not.toThrow();
  });

  it('rejects non-admin users', () => {
    const ctx = { user: { role: 'user' } };
    expect(() => requireRole('admin')(ctx, {})).toThrow('Access denied');
  });
});
```

## Example: Complete Secure App

See [`examples/secure-app.example.ts`](./examples/secure-app.example.ts) for a comprehensive example demonstrating:

- Custom auth context
- Secure actors with guards
- Component-level context passing
- Multi-tenant isolation
- SSE streaming with auth
- Fine-grained permissions
- Audit logging

## Common Patterns

### Pattern: Admin or Owner

```typescript
const requireAdminOrOwner = createGuard((ctx, params: { userId: string }) => {
  const currentUserId = ctx.user?.userId;
  const isAdmin = ctx.user?.role === 'admin';
  const isOwner = params.userId === currentUserId;

  if (!isAdmin && !isOwner) {
    throw new Error('Must be admin or resource owner');
  }
});
```

### Pattern: Feature Flags

```typescript
const requireFeature = (featureName: string) => createGuard((ctx) => {
  if (!ctx.user?.features?.includes(featureName)) {
    throw new Error(`Feature '${featureName}' not enabled`);
  }
});

// Usage
withGuards(requireFeature('beta-editor'), action)
```

### Pattern: Time-Based Access

```typescript
const requireBusinessHours = createGuard((ctx) => {
  const hour = new Date().getHours();
  if (hour < 9 || hour > 17) {
    throw new Error('Only available during business hours (9-17)');
  }
});
```

## Security Checklist

- [ ] All actor actions have appropriate guards
- [ ] User context is verified server-side
- [ ] Sensitive operations are audit logged
- [ ] Rate limiting is applied to expensive operations
- [ ] Multi-tenant data is properly isolated
- [ ] SSE streams require authentication
- [ ] Private data is not leaked in broadcasts
- [ ] Guards are tested
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS is used in production

## Need Help?

- See [`examples/secure-app.example.ts`](./examples/secure-app.example.ts) for complete examples
- Check the main [RivetKit README](./README.md) for basic setup
- Review [auth.ts](./auth.ts) for all available guards and utilities
