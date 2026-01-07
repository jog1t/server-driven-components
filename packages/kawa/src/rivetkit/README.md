# RivetKit Backend for Kawa

Persistent, multi-server reactive state using [RivetKit](https://rivet.dev) actors.

## Overview

The RivetKit backend provides:

- **Persistent state** - Survives server restarts
- **Multi-server coordination** - Share state across servers
- **Automatic synchronization** - State changes broadcast to all clients
- **File System / Redis / Postgres** - Multiple storage options
- **Multi-tenancy** - Per-namespace backends for data isolation
- **Type-safe** - Full TypeScript support

## Installation

```bash
pnpm add kawa rivetkit
```

## Quick Start

### Single Global Backend (Most Common)

```typescript
// src/server.ts
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivetkit';

// Initialize once at server startup
initReactiveBackend({ registry: reactiveRegistry });

// Start the RivetKit server
reactiveRegistry.start({ defaultServerPort: 3001 });
```

```typescript
// src/signals/counter.ts
import { namespace } from 'kawa';

const app = namespace("app");
export const counter = app.signal("counter", 0);
// Automatically persisted to RivetKit!
```

### With Your Existing Registry

If you already have RivetKit actors, just add `reactiveStateActor`:

```typescript
// src/registry.ts
import { setup } from 'rivetkit';
import { reactiveStateActor } from 'kawa/rivetkit';
import { myActor } from './actors/my';

export const registry = setup({
  use: {
    reactiveState: reactiveStateActor, // ← Add this
    myActor, // Your custom actors
  }
});
```

```typescript
// src/server.ts
import { initReactiveBackend } from 'kawa/rivetkit';
import { registry } from './registry';

initReactiveBackend({ registry });
registry.start({ defaultServerPort: 3001 });
```

### Multiple Backends (Multi-tenancy)

Different backends for different namespaces:

```typescript
// src/server.ts
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivetkit';

// Global default backend
initReactiveBackend({ registry: reactiveRegistry });

// Isolated backend for user data
const userBackend = initReactiveBackend({
  registry: reactiveRegistry,
  actorId: 'users',
  global: false
});

// Isolated backend for analytics
const analyticsBackend = initReactiveBackend({
  registry: reactiveRegistry,
  actorId: 'analytics',
  global: false
});

export { userBackend, analyticsBackend };
```

```typescript
// src/namespaces.ts
import { namespace } from 'kawa';
import { userBackend, analyticsBackend } from './server';

// Each namespace uses its own backend
export const users = namespace("users", { backend: userBackend });
export const analytics = namespace("analytics", { backend: analyticsBackend });
export const global = namespace("global"); // Uses global backend
```

## Usage

### Basic Signals

```tsx
import { namespace } from 'kawa';

const app = namespace("app");
export const theme = app.signal("theme", "dark");

// Update from anywhere
theme.set("light");
```

### Server Components

```tsx
import { useReactive } from 'kawa';
import { theme } from './signals';

export default function ThemeSwitcher() {
  const currentTheme = useReactive(theme);

  return (
    <button onClick={() => theme.set(currentTheme === 'dark' ? 'light' : 'dark')}>
      Current: {currentTheme}
    </button>
  );
}
```

### Signal Families (Dynamic Entities)

```typescript
import { namespace } from 'kawa';

const users = namespace("users");

export const userPosition = users.family((userId: string) => ({
  key: `${userId}:position`,
  default: { x: 0, y: 0 }
}));

// Each user gets their own persisted signal
const alicePos = userPosition("alice");
const bobPos = userPosition("bob");

alicePos.set({ x: 100, y: 200 });
```

## Benefits Over Memory Backend

| Feature | Memory Backend | RivetKit Backend |
|---------|---------------|------------------|
| Persistence | ❌ Lost on restart | ✅ Survives restarts |
| Multi-server | ❌ Single server only | ✅ Coordinated state |
| Scaling | ❌ Can't share state | ✅ Horizontal scaling |
| Storage | Memory only | File / Redis / Postgres |
| Production ready | Development only | ✅ Production ready |
| Serverless | ❌ Not supported | ✅ Vercel, Cloudflare Workers |

## Deployment

### Development

```bash
# Start your app - RivetKit runs embedded
pnpm dev
```

### Production

RivetKit automatically persists to file system by default. For production, configure storage:

```typescript
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivetkit';

initReactiveBackend({ registry: reactiveRegistry });

reactiveRegistry.start({
  defaultServerPort: 3001,
  // Storage options configured via RivetKit
  // See https://rivet.dev/docs for Redis, Postgres configuration
});
```

### Serverless (Vercel, Cloudflare Workers)

RivetKit supports serverless platforms through its proxy/engine architecture. See [RivetKit serverless docs](https://rivet.dev/docs/serverless) for details.

## How It Works

1. **Signals** are stored in RivetKit actors by namespace key
2. **State changes** trigger actor's `onStateChange` hook
3. **Changes broadcast** to all connected clients
4. **RSC re-renders** happen automatically via SSE streaming
5. **State persists** in RivetKit's configured storage

## Passing Context to RivetKit Actors

You can pass custom context (like user authentication data) from your components to RivetKit actors. This is useful for implementing security, multi-tenancy, or user-specific logic in your actors.

### Method 1: Global Context Provider

Define a function that provides context for all actor calls:

```typescript
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivetkit';

const backend = initReactiveBackend({
  registry: reactiveRegistry,

  // This function is called for every actor call
  getContext: async () => {
    // Extract user from your auth system (JWT, session, etc.)
    const user = await getCurrentUser();
    return {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
});
```

The context will be available in your actor actions via RivetKit's context parameter:

```typescript
import { actor } from 'rivetkit';

export const myActor = actor({
  state: { data: {} },

  actions: {
    getData: (c, params, context) => {
      // Access user context passed from components
      const userId = context?.user?.userId;

      // Implement your security logic
      if (!userId) {
        throw new Error('Authentication required');
      }

      // Return user-specific data
      return c.state.data[userId];
    },

    setData: (c, { value }, context) => {
      const userId = context?.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      c.state.data[userId] = value;
      return { success: true };
    }
  }
});
```

### Method 2: Per-Component Context

Pass context when using reactive hooks:

```typescript
import { useServerState } from 'kawa';
import { mySignal } from './signals';

function UserProfile({ userId }: { userId: string }) {
  const data = useServerState(mySignal, {
    context: {
      userId,
      role: 'user',
      organizationId: 'org_123'
    }
  });

  return <div>{data.name}</div>;
}
```

Or with reactive streams:

```typescript
import { useReactiveStream } from 'kawa';

function UserNotifications({ userId }: { userId: string }) {
  const notifications = useReactiveStream(
    [],
    (stream) => {
      // Fetch user-specific data
      fetchNotifications(userId).then(stream.next);
    },
    [userId],
    {
      context: { userId, role: 'user' }
    }
  );

  return <div>{notifications.length} notifications</div>;
}
```

### Method 3: Per-Tenant Backends

For multi-tenancy, create isolated backends per tenant:

```typescript
function getTenantBackend(tenantId: string) {
  return initReactiveBackend({
    registry: reactiveRegistry,
    actorId: tenantId, // Each tenant gets its own actor instance
    global: false,

    getContext: async () => {
      const user = await getCurrentUser();

      // Verify user belongs to this tenant
      if (user.tenantId !== tenantId) {
        throw new Error('Access denied');
      }

      return { userId: user.id, tenantId };
    }
  });
}
```

### Example: Custom Security in Actors

Here's how you might implement authentication and authorization in your own actors:

```typescript
import { actor } from 'rivetkit';

export const postsActor = actor({
  state: {
    posts: {} as Record<string, {
      id: string;
      content: string;
      authorId: string;
      organizationId: string;
    }>
  },

  actions: {
    // Anyone can read posts in their organization
    getPosts: (c, params, context) => {
      const orgId = context?.user?.organizationId;

      if (!orgId) {
        throw new Error('Authentication required');
      }

      // Filter to only show posts from user's organization
      const orgPosts = Object.values(c.state.posts).filter(
        post => post.organizationId === orgId
      );

      return { posts: orgPosts };
    },

    // Only authenticated users can create posts
    createPost: (c, { content }, context) => {
      const userId = context?.user?.userId;
      const orgId = context?.user?.organizationId;

      if (!userId || !orgId) {
        throw new Error('Authentication required');
      }

      const postId = `post_${Date.now()}`;
      c.state.posts[postId] = {
        id: postId,
        content,
        authorId: userId,
        organizationId: orgId,
      };

      return { postId };
    },

    // Only post author or admin can delete
    deletePost: (c, { postId }, context) => {
      const userId = context?.user?.userId;
      const role = context?.user?.role;
      const post = c.state.posts[postId];

      if (!post) {
        throw new Error('Post not found');
      }

      const isAuthor = post.authorId === userId;
      const isAdmin = role === 'admin';

      if (!isAuthor && !isAdmin) {
        throw new Error('Permission denied');
      }

      delete c.state.posts[postId];
      return { success: true };
    }
  }
});
```

### Context Flow

The context flows through the system like this:

```
Component
  ↓ (pass context via options)
useServerState/useReactiveStream
  ↓ (store in runtime)
ReactiveBackend.getContext()
  ↓ (call actor with context)
RivetKit Actor Action
  ↓ (access via context parameter)
Your Security Logic
```

**Note:** You can use either the global `getContext` function or pass context per-component. If both are provided, the component-level context takes precedence.

## API

### `initReactiveBackend(options)`

Initialize RivetKit backend for reactive signals.

**Options:**
- `registry: Registry` - Your RivetKit registry
- `actorName?: string` - Actor name (default: 'reactiveState')
- `actorId?: string` - Actor ID (default: 'global')
- `global?: boolean` - Set as global default backend (default: true)
- `getContext?: () => any | Promise<any>` - Function to get context for actor calls

**Returns:** `ReactiveBackend` instance

**Example:**
```typescript
// Global default
const backend = initReactiveBackend({ registry });

// Isolated backend
const userBackend = initReactiveBackend({
  registry,
  actorId: 'users',
  global: false
});

// With context provider
const backend = initReactiveBackend({
  registry,
  getContext: async () => {
    const user = await getCurrentUser();
    return { userId: user.id, role: user.role };
  }
});
```

### `reactiveStateActor`

The pre-built RivetKit actor for reactive state storage.

**State:**
- `signals: Record<string, any>` - Signal values by key
- `streams: Record<string, any>` - Stream metadata

**Actions:**
- `getSignal(key)` - Get signal value
- `setSignal(key, value)` - Set signal value
- `deleteSignal(key)` - Delete signal
- `registerStream(scope)` - Register reactive stream
- `unregisterStream(scope)` - Unregister stream

### `reactiveRegistry`

Pre-made registry with just the `reactiveState` actor.

Use if you don't have your own RivetKit actors:
```typescript
import { reactiveRegistry } from 'kawa/rivetkit';
```

## Examples

See the [examples directory](../../../../examples) for complete working examples.

## License

MIT
