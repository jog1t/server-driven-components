# RivetKit Backend for reactive-rsc

Persistent, multi-server reactive state using [RivetKit](https://rivet.dev) actors.

## Overview

The RivetKit backend provides:

- **Persistent state** - Survives server restarts
- **Multi-server coordination** - Share state across servers
- **Automatic synchronization** - State changes broadcast to all clients
- **File System / Redis / Postgres** - Multiple storage options
- **Type-safe** - Full TypeScript support

## Installation

```bash
pnpm add reactive-rsc rivetkit
```

## Quick Start

### Option 1: Use Pre-Made Registry (Simplest)

```typescript
// src/reactive.ts
import { createReactiveBackend, reactiveRegistry } from 'reactive-rsc/rivet';

export const { signal, useReactive, useServerState } = createReactiveBackend({
  registry: reactiveRegistry
});

// Start the registry server
// src/server.ts
reactiveRegistry.start({ defaultServerPort: 3001 });
```

### Option 2: Add to Your Existing Registry

```typescript
// src/registry.ts
import { setup } from 'rivetkit';
import { reactiveStateActor } from 'reactive-rsc/rivet';
import { myActor } from './actors/my';

export const registry = setup({
  use: {
    reactiveState: reactiveStateActor, // ← Add this
    myActor, // Your custom actors
  }
});

// src/reactive.ts
import { createReactiveBackend } from 'reactive-rsc/rivet';
import { registry } from './registry';

export const { signal, useReactive, useServerState } = createReactiveBackend({
  registry,
  actorName: 'reactiveState' // optional, defaults to 'reactiveState'
});

// src/server.ts
import { registry } from './registry';
registry.start({ defaultServerPort: 3001 });
```

## Usage

### In Your Components

```tsx
// src/components/Counter.tsx
import { signal } from '../reactive'; // Your RivetKit-backed exports

const counter = signal(0); // Now persisted via RivetKit!

export function Counter() {
  return (
    <div>
      <p>Count: {counter.value}</p>
      <button onClick={() => counter.set(c => c + 1)}>+</button>
    </div>
  );
}
```

### With Server Components

```tsx
// src/components/ServerCounter.tsx
import { useReactive } from '../reactive';

export default function ServerCounter() {
  const count = useReactive(0, (stream) => {
    let n = 0;
    const id = setInterval(() => {
      n++;
      stream.next(n);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <div>Server count: {count}</div>;
}
```

## Benefits Over Memory Backend

| Feature | Memory Backend | RivetKit Backend |
|---------|---------------|------------------|
| Persistence | ❌ Lost on restart | ✅ Survives restarts |
| Multi-server | ❌ Single server only | ✅ Coordinated state |
| Scaling | ❌ Can't share state | ✅ Horizontal scaling |
| Storage | Memory only | File / Redis / Postgres |
| Production ready | Development only | ✅ Production ready |

## Advanced: Multiple Backends

You can create different backends for different purposes:

```typescript
// User state - persisted in RivetKit
export const { signal: userSignal } = createReactiveBackend({
  registry,
  actorName: 'userState'
});

// App state - persisted in RivetKit
export const { signal: appSignal } = createReactiveBackend({
  registry,
  actorName: 'appState'
});

// Temporary state - memory only
import { signal as tempSignal } from 'reactive-rsc';
```

## Deployment

### Development

```bash
# Start your app - RivetKit runs embedded
pnpm dev
```

### Production

RivetKit automatically persists to file system by default. For production, configure storage:

```typescript
registry.start({
  defaultServerPort: 3001,
  // Storage options configured via RivetKit
});
```

See [RivetKit deployment docs](https://rivet.dev/docs) for Redis, Postgres, and Rivet Engine configuration.

## How It Works

1. **Signals** are stored in the `reactiveState` actor
2. **State changes** trigger actor's `onStateChange` hook
3. **Changes broadcast** to all connected clients via WebSocket
4. **RSC re-renders** happen automatically via SSE streaming
5. **State persists** in RivetKit's configured storage

## API

### `createReactiveBackend(options)`

Create a RivetKit-backed reactive system.

**Options:**
- `registry: Registry` - Your RivetKit registry
- `actorName?: string` - Actor to use (default: 'reactiveState')

**Returns:**
```typescript
{
  signal,
  computed,
  useReactive,
  useServerState,
  useReactiveStream,
  backend // RivetBackend instance
}
```

### `reactiveStateActor`

The pre-built RivetKit actor for reactive state storage.

Add to your registry:
```typescript
import { reactiveStateActor } from 'reactive-rsc/rivet';
```

### `reactiveRegistry`

Pre-made registry with just the `reactiveState` actor.

Use if you don't have your own actors:
```typescript
import { reactiveRegistry } from 'reactive-rsc/rivet';
```

## Examples

See the [examples directory](../../../../examples) for complete working examples.

## License

MIT
