# API Separation Experiment: State vs. Streams

## Overview

This experiment explores separating the monolithic `useReactive()` hook into two distinct, purpose-specific functions:

- **`useServerState(signal)`** - Subscribe to shared server-side state
- **`useReactiveStream(initial, streamFn, deps)`** - Create component-local reactive streams

## Motivation

The original `useReactive()` hook served two distinct purposes:

1. **State subscription**: Connecting to global/shared signals
2. **Stream creation**: Creating component-local reactive streams

While the overloaded API worked, it mixed two different concerns:
- **State management** (declarative, external)
- **Stream management** (imperative, internal)

Separating these concerns provides:
- ✅ Clearer API intent
- ✅ Better TypeScript inference
- ✅ Easier to understand and teach
- ✅ Single Responsibility Principle
- ✅ More explicit about data flow

## API Design

### `useServerState<T>(signal: Signal<T>): T`

Subscribe to a global or shared signal managed outside the component.

**Use cases:**
- Global application state (user session, theme, etc.)
- Shared data sources (server time, live metrics)
- Multiple components subscribing to the same data

**Example:**
```typescript
// signals/server-time.ts
export const serverTime = signal(Date.now());
setInterval(() => serverTime.set(Date.now()), 1000);

// components/Clock.tsx
import { useServerState } from 'reactive-rsc';
import { serverTime } from '../signals/server-time';

export default function Clock() {
  const time = useServerState(serverTime);
  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

### `useReactiveStream<T>(initial: T, streamFn: StreamFunction<T>, deps: any[]): T`

Create a component-local reactive stream with inline state management.

**Use cases:**
- Component-specific timers/intervals
- Async data fetching within a component
- Real-time data streams scoped to the component
- State that doesn't need to be shared

**Example:**
```typescript
import { useReactiveStream } from 'reactive-rsc';

export default function Timer() {
  const time = useReactiveStream(
    Date.now(),
    (stream) => {
      const id = setInterval(() => stream.next(Date.now()), 1000);
      return () => clearInterval(id);
    },
    []
  );

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

## Decision Guide

**Use `useServerState()` when:**
- State is managed globally (outside components)
- Multiple components need the same data
- You want centralized state management
- State updates come from external sources

**Use `useReactiveStream()` when:**
- State is component-local
- You're creating timers/intervals
- You're managing async data streams
- State doesn't need to be shared

## Comparison with Original API

### Before (Overloaded)
```typescript
// Mode 1: Signal subscription
const time1 = useReactive(globalSignal);

// Mode 2: Inline stream
const time2 = useReactive(Date.now(), (stream) => {
  // ...
}, []);
```

### After (Separated)
```typescript
// Explicit state subscription
const time1 = useServerState(globalSignal);

// Explicit stream creation
const time2 = useReactiveStream(Date.now(), (stream) => {
  // ...
}, []);
```

## Benefits

### 1. Clearer Intent
The function name immediately tells you what kind of operation you're performing:
- `useServerState` = "I'm subscribing to external state"
- `useReactiveStream` = "I'm creating a local reactive stream"

### 2. Better Type Safety
No more overloaded function signatures. Each function has a single, clear signature.

### 3. Easier to Learn
New users don't need to understand two different modes of the same function.

### 4. More Explicit Data Flow
It's immediately clear whether data comes from:
- External source (`useServerState`)
- Component itself (`useReactiveStream`)

### 5. Future Extensibility
Each function can evolve independently without affecting the other.

## Migration Path

The original `useReactive()` is kept for backward compatibility and now delegates to the new functions:

```typescript
export function useReactive<T>(
  initialValueOrSignal: T | Signal<T>,
  streamFn?: StreamFunction<T>,
  deps?: any[]
): T {
  if (isSignal(initialValueOrSignal)) {
    return useServerState(initialValueOrSignal);
  }
  return useReactiveStream(initialValueOrSignal as T, streamFn!, deps!);
}
```

Existing code continues to work, but we recommend migrating to the new APIs:

```diff
- const time = useReactive(serverTime);
+ const time = useServerState(serverTime);

- const time = useReactive(Date.now(), streamFn, []);
+ const time = useReactiveStream(Date.now(), streamFn, []);
```

## Examples

See the following files for working examples:

- `/examples/waku-app/src/components/demo-stream-clock.tsx` - Using `useReactiveStream`
- `/examples/waku-app/src/components/demo-server-state.tsx` - Using `useServerState`
- `/examples/waku-app/src/pages/comparison.tsx` - Side-by-side comparison

Run the example app and visit `/comparison` to see both APIs in action.

## Implementation Details

### Runtime Changes
No changes to the runtime were necessary. The separation is purely at the API level:

- `useServerState()` returns `signal.value`
- `useReactiveStream()` registers with the reactive runtime

### Type Definitions
```typescript
// Clear, single-purpose signatures
export function useServerState<T>(signal: Signal<T>): T;

export function useReactiveStream<T>(
  initialValue: T,
  streamFn: StreamFunction<T>,
  deps: any[]
): T;
```

## Open Questions

1. **Naming**: Are `useServerState` and `useReactiveStream` the best names?
   - Alternatives: `useSignal`, `useSharedState`, `useStream`, `useReactiveValue`

2. **Signal Creation**: Should we add a `createSignal()` helper that's more ergonomic?
   ```typescript
   export const serverTime = createSignal(Date.now(), (signal) => {
     setInterval(() => signal.set(Date.now()), 1000);
   });
   ```

3. **Computed Signals**: How do computed signals fit into this model?

4. **Async Streams**: Should we add a `useAsyncStream()` for promise-based data?

## Next Steps

1. Gather feedback on the API design
2. Test with real-world use cases
3. Consider renaming if better names emerge
4. Add more helper functions as patterns emerge
5. Update documentation and guides

## Conclusion

Separating state and streams into two functions provides a clearer, more maintainable API that better expresses developer intent. The original `useReactive()` remains for backward compatibility, but we recommend using the new APIs for new code.
