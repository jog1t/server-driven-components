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

## Adding Authentication and Custom Logic

Kawa provides a factory function to extend the reactive state actor with your own logic. Use this to add authentication, authorization, logging, or any custom behavior.

### Step 1: Create Your Custom Actor

Use `createReactiveStateActor()` to add hooks:

```typescript
// src/actors/secureReactiveState.ts
import { createReactiveStateActor } from 'kawa/rivetkit';

export const secureReactiveStateActor = createReactiveStateActor({
  // Validate authentication when client connects
  onConnect: (c) => {
    if (!c.context?.userId) {
      throw new Error('Authentication required');
    }
    console.log(`User ${c.context.userId} connected`);
  },

  // Hook into setSignal to add authorization
  setSignal: async (c, params, next) => {
    const userId = c.context?.userId;
    const role = c.context?.role;

    // Only admins can set signals in the "admin:" namespace
    if (params.key.startsWith('admin:') && role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Log the action
    console.log(`User ${userId} setting signal ${params.key}`);

    // Call the original action
    const result = await next(params);

    return result;
  },

  // Hook into getAllSignals to filter by user
  getAllSignals: async (c, params, next) => {
    const userId = c.context?.userId;
    const result = await next(params);

    // Filter to only return signals this user can access
    const filtered = Object.keys(result.signals).reduce((acc, key) => {
      if (key.startsWith(`user:${userId}:`)) {
        acc[key] = result.signals[key];
      }
      return acc;
    }, {} as Record<string, any>);

    return { signals: filtered };
  },
});
```

### Step 2: Set Up Registry with Context

Use RivetKit's `contextFn` to provide auth context:

```typescript
// src/registry.ts
import { setup } from 'rivetkit';
import { secureReactiveStateActor } from './actors/secureReactiveState';

export const registry = setup({
  use: {
    reactiveState: secureReactiveStateActor,
  },

  // Provide context for all actor calls
  contextFn: async (req) => {
    // Extract auth from request (JWT, session, etc.)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return { userId: null, role: null };
    }

    // Verify token and return user context
    const user = await verifyToken(token);

    return {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
    };
  },
});
```

### Step 3: Initialize Backend

```typescript
// src/server.ts
import { initReactiveBackend } from 'kawa/rivetkit';
import { registry } from './registry';

const backend = initReactiveBackend({ registry });

registry.start({ defaultServerPort: 3001 });
```

### Available Hooks

All hooks receive `(context, params, next)`:
- `context`: Actor context with your custom data from `contextFn`
- `params`: Action parameters
- `next`: Function to call the original action

```typescript
createReactiveStateActor({
  // Called when client connects
  onConnect: (context) => { ... },

  // Called before ANY action
  beforeAction: async (context, params, next) => {
    // Your logic before any action
    const result = await next(params);
    // Your logic after any action
    return result;
  },

  // Or hook into specific actions
  getSignal: async (c, params, next) => { ... },
  setSignal: async (c, params, next) => { ... },
  deleteSignal: async (c, params, next) => { ... },
  getAllSignals: async (c, params, next) => { ... },
  updateStream: async (c, params, next) => { ... },
  getStream: async (c, params, next) => { ... },
  deleteStream: async (c, params, next) => { ... },
  getAllStreams: async (c, params, next) => { ... },
  clear: async (c, params, next) => { ... },
});
```

### Example: Multi-Tenant Isolation

Create isolated actor instances per organization:

```typescript
// src/registry.ts
export const registry = setup({
  use: {
    reactiveState: createReactiveStateActor({
      onConnect: (c) => {
        if (!c.context?.organizationId) {
          throw new Error('Organization context required');
        }
      },

      // Filter all reads by organization
      getAllSignals: async (c, params, next) => {
        const orgId = c.context.organizationId;
        const result = await next(params);

        // Only return signals for this organization
        const filtered = Object.keys(result.signals)
          .filter(key => key.startsWith(`org:${orgId}:`))
          .reduce((acc, key) => {
            acc[key] = result.signals[key];
            return acc;
          }, {} as Record<string, any>);

        return { signals: filtered };
      },

      // Prefix all writes with organization
      setSignal: async (c, params, next) => {
        const orgId = c.context.organizationId;

        // Automatically namespace by organization
        const namespacedKey = `org:${orgId}:${params.key}`;

        return next({ ...params, key: namespacedKey });
      },
    }),
  },

  contextFn: async (req) => {
    const user = await getUserFromRequest(req);
    return {
      userId: user.id,
      organizationId: user.organizationId,
    };
  },
});
```

### Example: Rate Limiting

```typescript
const rateLimiter = new Map<string, number[]>();

export const rateLimitedActor = createReactiveStateActor({
  setSignal: async (c, params, next) => {
    const userId = c.context?.userId || 'anonymous';
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxCalls = 100;

    // Get user's recent calls
    const calls = rateLimiter.get(userId) || [];
    const recentCalls = calls.filter(time => now - time < windowMs);

    if (recentCalls.length >= maxCalls) {
      throw new Error('Rate limit exceeded');
    }

    // Record this call
    recentCalls.push(now);
    rateLimiter.set(userId, recentCalls);

    return next(params);
  },
});
```

### Example: Audit Logging

```typescript
export const auditedActor = createReactiveStateActor({
  beforeAction: async (c, params, next) => {
    const userId = c.context?.userId;
    const actionName = 'action'; // In real use, you'd track which action
    const startTime = Date.now();

    try {
      const result = await next(params);

      // Log successful action
      console.log({
        timestamp: new Date().toISOString(),
        userId,
        action: actionName,
        params,
        success: true,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      // Log failed action
      console.error({
        timestamp: new Date().toISOString(),
        userId,
        action: actionName,
        params,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  },
});
```

### Using with Existing Actors

If you have existing RivetKit actors, just add the Kawa actor alongside them:

```typescript
import { setup } from 'rivetkit';
import { createReactiveStateActor } from 'kawa/rivetkit';
import { myCustomActor } from './actors/my';

export const registry = setup({
  use: {
    // Your existing actors
    myCustomActor,

    // Kawa's reactive state actor (with or without hooks)
    reactiveState: createReactiveStateActor({
      onConnect: (c) => {
        // Your auth logic
      },
    }),
  },

  contextFn: async (req) => {
    // Your context provider
  },
});
```

## API

### `initReactiveBackend(options)`

Initialize RivetKit backend for reactive signals.

**Options:**
- `registry: Registry` - Your RivetKit registry
- `actorName?: string` - Actor name (default: 'reactiveState')
- `actorId?: string` - Actor ID (default: 'global')
- `global?: boolean` - Set as global default backend (default: true)

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
```

### `createReactiveStateActor(hooks?)`

Create a reactive state actor with custom hooks for authentication, logging, etc.

**Parameters:**
- `hooks?: ReactiveStateActorHooks` - Optional hooks to customize actor behavior

**Available hooks:**
- `onConnect?(context): void | Promise<void>` - Called when client connects
- `beforeAction?(context, params, next): any` - Called before any action
- `getSignal?(context, params, next): any` - Hook for getSignal action
- `setSignal?(context, params, next): any` - Hook for setSignal action
- `deleteSignal?(context, params, next): any` - Hook for deleteSignal action
- `getAllSignals?(context, params, next): any` - Hook for getAllSignals action
- `getStream?(context, params, next): any` - Hook for getStream action
- `updateStream?(context, params, next): any` - Hook for updateStream action
- `deleteStream?(context, params, next): any` - Hook for deleteStream action
- `getAllStreams?(context, params, next): any` - Hook for getAllStreams action
- `clear?(context, params, next): any` - Hook for clear action

**Returns:** RivetKit actor

**Example:**
```typescript
import { createReactiveStateActor } from 'kawa/rivetkit';

const actor = createReactiveStateActor({
  onConnect: (c) => {
    if (!c.context?.userId) {
      throw new Error('Authentication required');
    }
  },

  setSignal: async (c, params, next) => {
    // Your custom logic
    console.log(`User ${c.context.userId} setting ${params.key}`);

    // Call original action
    return await next(params);
  },
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
