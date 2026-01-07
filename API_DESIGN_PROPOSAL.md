# Reactive Server Components - API Design Proposals

> **Context**: We have proven that streaming RSC payloads over SSE works brilliantly. Now we need to make the developer experience exceptional.

## Core Principles

1. **Co-location**: Keep reactive logic near the components that use it
2. **Type Safety**: Full TypeScript inference, no string paths
3. **Simplicity**: Minimize boilerplate and concepts
4. **Flexibility**: Support both simple and complex use cases
5. **Framework Agnostic**: Core concepts should work with any RSC framework

---

## Design 1: Reactive Server Component Directive

**Philosophy**: Treat reactivity as a component property, like "use client"

### API

```tsx
// components/clock.tsx
'use reactive'  // Directive marks component as reactive

export default function Clock({ interval = 1000 }) {
  // Special reactive hook - only works in 'use reactive' components
  const time = useReactiveState('time', () => {
    return Date.now()
  }, {
    // Optional: define update logic
    subscribe: ({ setState }) => {
      const id = setInterval(() => {
        setState(Date.now())
      }, interval)
      return () => clearInterval(id)
    }
  })

  return (
    <div>
      <div className="text-2xl">{new Date(time).toLocaleTimeString()}</div>
      <div className="text-xs">Rendered: {new Date().toISOString()}</div>
    </div>
  )
}

// Usage (automatic subscription, no wrapper needed)
<Clock interval={1000} />
```

### How It Works

1. **Build-time**: `'use reactive'` directive triggers bundler plugin
2. **Registration**: Component automatically registered with reactive runtime
3. **Streaming**: Framework handles SSE connection and RSC streaming
4. **Mounting**: Client receives component reference, subscribes automatically

### Pros
- ✅ Minimal boilerplate
- ✅ Co-located reactive logic
- ✅ Familiar pattern (like "use client")
- ✅ No manual registration

### Cons
- ❌ Requires bundler plugin
- ❌ Magic behavior (directive-based)
- ❌ Less explicit

---

## Design 2: Reactive Functions (Functional Approach)

**Philosophy**: Reactive components are just functions that return streams

### API

```tsx
// lib/reactive.ts - Core primitives
export function createReactive<TData, TProps>(
  name: string,
  fn: (props: TProps) => {
    data: () => TData
    subscribe?: (ctx: SubscribeContext<TData, TProps>) => Cleanup
  }
) {
  // Returns a tuple: [ServerComponent, subscription info]
  return [Component, { channel: name, ...metadata }]
}

// components/clock.tsx
import { createReactive } from '../lib/reactive'

export const [Clock, ClockStream] = createReactive(
  'clock',
  (props: { interval?: number }) => ({
    data: () => Date.now(),
    subscribe: ({ broadcast, props }) => {
      const id = setInterval(() => {
        broadcast(Date.now())
      }, props.interval || 1000)
      return () => clearInterval(id)
    }
  })
)

// Server component definition
function Clock({ interval, _data }: { interval?: number, _data?: number }) {
  const time = _data ?? Date.now()
  return <div>{new Date(time).toLocaleTimeString()}</div>
}

// Usage - automatic reactive subscription
import { Clock } from './components/clock'

<Clock interval={1000} />
```

### How It Works

1. **Creation**: `createReactive` returns component + metadata
2. **Runtime**: Framework detects reactive components by metadata
3. **Auto-subscribe**: Client automatically subscribes on mount
4. **Streaming**: Framework handles SSE + RSC streaming

### Pros
- ✅ Explicit (no magic)
- ✅ Co-located logic
- ✅ Type-safe
- ✅ Composable

### Cons
- ❌ Tuple syntax awkward
- ❌ Component split from reactive logic
- ❌ Requires framework detection

---

## Design 3: Reactive Hooks with Auto-Discovery

**Philosophy**: Use hooks, but make them auto-register and stream

### API

```tsx
// components/clock.tsx
import { useReactiveStream } from '../lib/reactive'

export default function Clock({ interval = 1000 }) {
  // Hook automatically:
  // 1. Creates unique channel ID based on component + props
  // 2. Registers stream handler
  // 3. Returns current data
  const time = useReactiveStream({
    key: 'clock',
    scope: { interval }, // Used for channel scoping
    initialData: Date.now(),
    subscribe: ({ broadcast, scope }) => {
      const id = setInterval(() => {
        broadcast(Date.now())
      }, scope.interval)
      return () => clearInterval(id)
    }
  })

  return <div>{new Date(time).toLocaleTimeString()}</div>
}

// Usage - component handles its own reactivity
<Clock interval={1000} />
```

### Alternative: Even simpler syntax

```tsx
export default function Clock({ interval = 1000 }) {
  // Inline reactive source
  const time = useReactiveStream('clock', (stream) => {
    const id = setInterval(() => {
      stream.next(Date.now())
    }, interval)
    return () => clearInterval(id)
  })

  return <div>{new Date(time).toLocaleTimeString()}</div>
}
```

### How It Works

1. **Hook call**: `useReactiveStream` generates unique channel ID
2. **Registration**: Automatically registers with reactive runtime
3. **Deduplication**: Same component + scope = shared channel
4. **Auto-stream**: Framework detects reactive components, sets up SSE

### Pros
- ✅ Extremely simple DX
- ✅ Co-located logic
- ✅ Hook-based (familiar)
- ✅ Auto-cleanup

### Cons
- ❌ Needs runtime to detect reactive components
- ❌ Channel ID generation complex
- ❌ Scope serialization required

---

## Design 4: Component-Level Channels (Current, Improved)

**Philosophy**: Improve current channel system with better DX

### API

```tsx
// components/clock.reactive.tsx
// File naming convention: *.reactive.tsx = auto-registered

import { defineComponent } from '../lib/reactive'

// Define channel + component together
export default defineComponent({
  // Channel definition
  channel: {
    data: {} as { time: number },
    scope: {} as { interval?: number }
  },

  // Channel handler
  stream: ({ scope, broadcast }) => {
    const interval = scope.interval || 1000
    let time = Date.now()

    // Send initial
    broadcast({ time })

    // Update loop
    const id = setInterval(() => {
      time = Date.now()
      broadcast({ time })
    }, interval)

    return () => clearInterval(id)
  },

  // Server component
  component: ({ time, interval }: { time: number, interval?: number }) => {
    return (
      <div>
        <div>{new Date(time).toLocaleTimeString()}</div>
        <div className="text-xs">Updates every {interval}ms</div>
      </div>
    )
  }
})

// Usage - auto-subscribes, no wrapper needed
import Clock from './components/clock.reactive'

<Clock interval={1000} />
```

### How It Works

1. **File convention**: `*.reactive.tsx` files auto-discovered
2. **Build-time**: Bundler plugin generates registration code
3. **Runtime**: Component renders as RSC, streams on updates
4. **Client**: Auto-subscribes based on component metadata

### Pros
- ✅ Clear co-location
- ✅ Type-safe
- ✅ Explicit structure
- ✅ File convention makes intent clear

### Cons
- ❌ Requires bundler plugin
- ❌ File naming convention (magic)
- ❌ Nested object syntax verbose

---

## Design 5: Reactive Blocks (Code-Splitting Approach)

**Philosophy**: Treat reactive parts as separate streaming regions

### API

```tsx
// pages/dashboard.tsx
import { ReactiveBlock } from '../lib/reactive'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Reactive block - auto-streams on update */}
      <ReactiveBlock
        stream={async function* ({ props }) {
          // Generator function yields updates
          while (true) {
            await sleep(props.interval || 1000)
            yield { time: Date.now() }
          }
        }}
        render={({ time }: { time: number }) => (
          <div>{new Date(time).toLocaleTimeString()}</div>
        )}
        interval={1000}
      />

      {/* Another reactive block */}
      <ReactiveBlock
        stream={createCounterStream}
        render={CounterDisplay}
        increment={5}
      />
    </div>
  )
}

// Or extract to helper
const TimeBlock = ({ interval }: { interval: number }) => (
  <ReactiveBlock
    stream={createTimeStream}
    render={TimeDisplay}
    interval={interval}
  />
)
```

### With async iterators (most elegant):

```tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <ReactiveBlock interval={1000}>
        {async function* Clock({ interval }) {
          while (true) {
            await sleep(interval)
            const time = Date.now()

            // Yield JSX directly!
            yield <div>{new Date(time).toLocaleTimeString()}</div>
          }
        }}
      </ReactiveBlock>
    </div>
  )
}
```

### How It Works

1. **ReactiveBlock**: Component that sets up streaming boundary
2. **Generator**: Async generator yields data or JSX
3. **Streaming**: Each `yield` triggers RSC render + stream to client
4. **Client**: Receives updates, patches component tree

### Pros
- ✅ Very explicit streaming boundaries
- ✅ Co-located
- ✅ Generator syntax elegant for streams
- ✅ No global registration needed

### Cons
- ❌ Wrapping component required
- ❌ Generator syntax may be unfamiliar
- ❌ Need to handle generator lifecycle

---

## Design 6: Event-Driven Components (Most Flexible)

**Philosophy**: Components subscribe to events, not channels

### API

```tsx
// lib/events.ts - Event emitter system
import { createEventBus } from '../lib/reactive'

// Define typed events
export const events = createEventBus<{
  'time:update': { timestamp: number }
  'counter:increment': { value: number }
  'user:online': { userId: string }
}>()

// components/clock.tsx
import { useEvent } from '../lib/reactive'
import { events } from '../lib/events'

export default function Clock() {
  const time = useEvent(
    events.on('time:update'),
    { timestamp: Date.now() }
  )

  return <div>{new Date(time.timestamp).toLocaleTimeString()}</div>
}

// Start event emitters somewhere (server-side)
// server/timers.ts
import { events } from '../lib/events'

export function startTimers() {
  setInterval(() => {
    events.emit('time:update', { timestamp: Date.now() })
  }, 1000)
}
```

### Usage with scoped events:

```tsx
// Scope events by adding parameters
const time = useEvent(
  events.on('time:update').where({ interval: 1000 }),
  { timestamp: Date.now() }
)
```

### How It Works

1. **Event bus**: Central typed event system
2. **useEvent hook**: Subscribes component to events
3. **Auto-streaming**: Component marked as reactive, streams on events
4. **Filtering**: Events can be filtered by scope/params

### Pros
- ✅ Very flexible
- ✅ Familiar event pattern
- ✅ Decoupled (events separate from components)
- ✅ Easy to add new event sources

### Cons
- ❌ Events defined separately
- ❌ Less co-located
- ❌ Need global event bus

---

## Design 7: Signal-Based (Modern Reactive Primitive)

**Philosophy**: Use signals as the reactive primitive (like SolidJS/Preact)

### API

```tsx
// signals/time.ts
import { signal, computed } from '../lib/reactive'

// Create reactive signals on server
export const currentTime = signal(Date.now())

// Start updating
setInterval(() => {
  currentTime.value = Date.now()
}, 1000)

// Computed signals
export const formattedTime = computed(() => {
  return new Date(currentTime.value).toLocaleTimeString()
})

// components/clock.tsx
import { useSignal } from '../lib/reactive'
import { currentTime, formattedTime } from '../signals/time'

export default function Clock() {
  // Subscribe to signal
  const time = useSignal(formattedTime)

  return <div>{time}</div>
}

// Or inline signal creation
export default function Counter() {
  const count = useSignal(() => {
    const sig = signal(0)
    setInterval(() => sig.value++, 1000)
    return sig
  })

  return <div>Count: {count}</div>
}
```

### How It Works

1. **Signals**: Reactive primitives (like observables)
2. **useSignal**: Hook subscribes component to signal updates
3. **Auto-stream**: When signal changes, component re-renders and streams
4. **Graph**: Signal dependencies tracked automatically

### Pros
- ✅ Modern reactive primitive
- ✅ Composable (computed, derived)
- ✅ Fine-grained reactivity
- ✅ Simple mental model

### Cons
- ❌ New concept (signals)
- ❌ Global signal state
- ❌ Requires reactive runtime

---

## Comparison Matrix

| Design | Co-location | Type Safety | Simplicity | Explicitness | Flexibility |
|--------|-------------|-------------|------------|--------------|-------------|
| 1. Directive | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| 2. Functions | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 3. Auto-Hooks | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 4. Improved Channels | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 5. Reactive Blocks | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 6. Event-Driven | ⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 7. Signals | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## Recommended Approach: Hybrid Design 3 + 7

**Combine the best parts with React-like syntax:**

```tsx
// lib/reactive.ts - Core
export { signal, computed } from './signals'
export { useReactive } from './hooks'

// components/clock.tsx
import { useReactive } from '../lib/reactive'

export default function Clock({ interval = 1000 }) {
  // Familiar React-like syntax: initial value, stream function, deps
  const time = useReactive(Date.now(), (stream) => {
    const id = setInterval(() => {
      stream.next(Date.now())
    }, interval)
    return () => clearInterval(id)
  }, [interval])  // deps array becomes scope for deduplication

  return <div>{new Date(time).toLocaleTimeString()}</div>
}

// Alternative: Use shared signals
import { currentTime } from '../signals/time'

export default function Clock() {
  const time = useReactive(currentTime)
  return <div>{new Date(time).toLocaleTimeString()}</div>
}
```

### API Signature

```tsx
// Inline reactive state with stream
function useReactive<T>(
  initialValue: T,
  stream: (stream: Stream<T>) => Cleanup,
  deps: any[]
): T

// Subscribe to existing signal
function useReactive<T>(signal: Signal<T>): T
```

### Why This Approach?

1. **Familiar**: Mirrors `useState` + `useEffect` patterns
2. **Simple**: Clean syntax, minimal ceremony
3. **Type-safe**: Full TypeScript support
4. **Co-located**: Logic with component by default
5. **Composable**: Signals can be shared and composed
6. **No magic**: Explicit about what's reactive
7. **Auto-deduplication**: Deps array serialized as scope - same deps = shared stream

---

## Implementation Path

### Phase 1: Core Reactive Runtime
- [ ] Signal primitive implementation
- [ ] `useReactive` hook
- [ ] Component registration system
- [ ] SSE streaming handler

### Phase 2: Auto-Discovery
- [ ] Detect reactive components at build time
- [ ] Generate subscription client code
- [ ] Handle scope serialization

### Phase 3: Developer Experience
- [ ] TypeScript types and inference
- [ ] Dev tools for debugging streams
- [ ] Error handling and recovery
- [ ] Performance monitoring

### Phase 4: Advanced Features
- [ ] Computed signals
- [ ] Signal effects
- [ ] Batched updates
- [ ] Selective streaming (only send diffs)

---

## Open Questions

1. **Scope serialization**: How to serialize scope props for channel deduplication?
2. **Component identity**: How to uniquely identify reactive components?
3. **Cleanup**: When to cleanup server-side streams?
4. **Scaling**: How to handle thousands of concurrent streams?
5. **State persistence**: Should reactive state persist across server restarts?
6. **Multi-server**: How to handle multiple server instances? (Redis backend?)

---

## Next Steps

1. **Choose design direction** (recommend Hybrid 3+7)
2. **Build minimal prototype** (~200 lines)
3. **Test with real use cases**
4. **Iterate based on DX feedback**
5. **Document patterns and best practices**

---

## Conclusion

The streaming RSC architecture is proven. Now we need an API that makes it feel **effortless** to build reactive server components.

**My recommendation**: Start with **Design 3 (Auto-Hooks)** + **Design 7 (Signals)** hybrid. It provides the best balance of simplicity, flexibility, and type safety.

Key insight: **Reactive state should feel like regular state, but with automatic streaming.** The best APIs hide complexity while remaining explicit about behavior.
