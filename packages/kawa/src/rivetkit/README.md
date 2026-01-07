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
