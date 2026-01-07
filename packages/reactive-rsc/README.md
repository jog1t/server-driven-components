# reactive-rsc

Simple, type-safe reactivity for React Server Components with automatic SSE streaming.

## Features

- ✅ **Familiar**: React-like syntax (useState + useEffect pattern)
- ✅ **Simple**: One hook to learn, minimal boilerplate
- ✅ **Type-safe**: Full TypeScript support with inference
- ✅ **Efficient**: Automatic deduplication, shared streams
- ✅ **Flexible**: Inline state or shared signals
- ✅ **Server-first**: True server components, no client JS needed for the component logic

## Installation

```bash
pnpm add reactive-rsc
# or
npm install reactive-rsc
# or
yarn add reactive-rsc
```

## Quick Start

```tsx
import { useReactive } from 'reactive-rsc';

export default function Clock({ interval = 1000 }) {
  const time = useReactive(Date.now(), (stream) => {
    const id = setInterval(() => {
      stream.next(Date.now());
    }, interval);
    return () => clearInterval(id);
  }, [interval]);

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

That's it! Your server component is now reactive.

## API

### `useReactive(initialValue, streamFn, deps)`

Create reactive state that automatically streams updates to clients.

**Parameters:**
- `initialValue: T` - Initial value of the reactive state
- `streamFn: (stream: Stream<T>) => Cleanup` - Function that produces updates
  - Call `stream.next(value)` to emit new values
  - Return cleanup function to run when stream stops
- `deps: any[]` - Dependency array (like `useEffect`)
  - Used for automatic deduplication
  - Components with same deps share the same stream

**Returns:** `T` - Current value

**Example:**
```tsx
const count = useReactive(0, (stream) => {
  let n = 0;
  const id = setInterval(() => {
    n++;
    stream.next(n);
  }, 1000);
  return () => clearInterval(id);
}, []);
```

### `useReactive(signal)`

Subscribe to a shared signal.

**Parameters:**
- `signal: Signal<T>` - Shared signal to subscribe to

**Returns:** `T` - Current signal value

**Example:**
```tsx
import { serverTime } from './signals/server-time';

export default function Clock() {
  const time = useReactive(serverTime);
  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

## Signals

Signals are shared reactive primitives that multiple components can subscribe to.

### `signal(initialValue)`

Create a writable signal.

```tsx
import { signal } from 'reactive-rsc';

export const serverTime = signal(Date.now());

// Update the signal
setInterval(() => {
  serverTime.set(Date.now());
}, 1000);
```

### `computed(fn)`

Create a derived signal (computed from other signals).

```tsx
import { signal, computed } from 'reactive-rsc';

const firstName = signal('John');
const lastName = signal('Doe');

const fullName = computed(() => {
  return `${firstName.value} ${lastName.value}`;
});
```

## How It Works

1. **Server-side:**
   - `useReactive` registers a reactive stream with the runtime
   - Stream function produces updates on the server
   - Same deps = shared stream (automatic deduplication)

2. **Client-side:**
   - Reactive components wrapped in `<Reactive>` client component
   - SSE connection established to `/api/reactive`
   - Server renders component to RSC payload on each update
   - Client receives RSC chunks, parses with `createFromReadableStream`
   - React automatically patches the component tree

3. **Deduplication:**
   - Deps array serialized as scope key
   - Components with identical deps share the same stream
   - Stream starts when first subscriber connects
   - Stream stops when last subscriber disconnects

## Patterns

### Interval-based Updates

```tsx
const time = useReactive(Date.now(), (stream) => {
  const id = setInterval(() => stream.next(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
```

### Event-based Updates

```tsx
const data = useReactive(null, (stream) => {
  const handler = (event) => stream.next(event.data);
  eventEmitter.on('data', handler);
  return () => eventEmitter.off('data', handler);
}, []);
```

### External Source

```tsx
const price = useReactive(0, (stream) => {
  const ws = new WebSocket('wss://prices.example.com');
  ws.onmessage = (e) => stream.next(JSON.parse(e.data).price);
  return () => ws.close();
}, [symbol]);
```

### Shared Signal

```tsx
// signals/notifications.ts
export const notifications = signal<string[]>([]);

export function addNotification(msg: string) {
  notifications.update((prev) => [...prev, msg]);
}

// component.tsx
export default function Notifications() {
  const items = useReactive(notifications);
  return <ul>{items.map(n => <li>{n}</li>)}</ul>;
}
```

## Backends

### Memory Backend (Default)

The default implementation stores state in-memory. Simple and works out of the box, but:
- ❌ State lost on server restart
- ❌ Can't share state across servers
- ✅ Perfect for development and simple use cases

### RivetKit Backend (Optional)

For production apps that need persistence and multi-server coordination:

```bash
pnpm add rivetkit
```

```typescript
// src/reactive.ts
import { createReactiveBackend, reactiveRegistry } from 'reactive-rsc/rivet';

export const { signal, useReactive } = createReactiveBackend({
  registry: reactiveRegistry
});

// Start the registry
reactiveRegistry.start({ defaultServerPort: 3001 });
```

**Benefits:**
- ✅ State persists across restarts
- ✅ Multi-server coordination
- ✅ File System / Redis / Postgres storage
- ✅ Horizontal scaling

[Learn more about the RivetKit backend →](./src/rivet/README.md)

## License

MIT
