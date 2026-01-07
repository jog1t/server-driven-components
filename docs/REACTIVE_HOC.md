# reactive() HOC - Higher-Order Component for Reactive Server Components

**Date**: 2026-01-07
**Status**: Implemented ✅

## Overview

The `reactive()` HOC (Higher-Order Component) is a simple wrapper that automatically adds the `<Reactive>` client boundary to server components. This eliminates the need to manually wrap components at usage sites.

## Why Use It?

**Before** (manual wrapper):
```tsx
import DemoClock from './components/demo-clock'
import { Reactive } from './components/reactive'

<Reactive>
  <DemoClock interval={1000} />
</Reactive>
```

**After** (with reactive() HOC):
```tsx
import DemoClock from './components/demo-clock'

<DemoClock interval={1000} />  // No wrapper needed!
```

## Usage

### 1. Wrap Your Component Definition

```tsx
// components/clock.tsx
import { useReactive, reactive } from '../lib/reactive'

function Clock({ interval = 1000 }) {
  const time = useReactive(
    Date.now(),
    (stream) => {
      const id = setInterval(() => stream.next(Date.now()), interval)
      return () => clearInterval(id)
    },
    [interval]
  )

  return <div>{new Date(time).toLocaleTimeString()}</div>
}

// Wrap with reactive() HOC
export default reactive(Clock)
```

### 2. Use Without Wrapper

```tsx
// pages/index.tsx
import Clock from './components/clock'

export default function Page() {
  return (
    <div>
      {/* No <Reactive> wrapper needed! */}
      <Clock interval={1000} />
    </div>
  )
}
```

## How It Works

The `reactive()` HOC is a simple wrapper function that:

1. Takes your server component as input
2. Returns a new component that wraps it with `<Reactive>`
3. Preserves the component name for debugging

**Implementation** (simplified):

```tsx
export function reactive<P>(Component: ComponentType<P>): ComponentType<P> {
  const ReactiveWrapper = (props: P) => {
    return (
      <Reactive>
        <Component {...props} />
      </Reactive>
    )
  }

  ReactiveWrapper.displayName = `Reactive(${Component.name})`
  return ReactiveWrapper
}
```

## Benefits

1. **Cleaner Usage Sites** - No need to remember to add `<Reactive>` wrapper
2. **Less Boilerplate** - Wrap once at definition, use everywhere
3. **Type-Safe** - Full TypeScript support
4. **Zero Build Complexity** - No bundler plugins needed
5. **Explicit** - Clear what's reactive at the component definition

## Comparison: Alternative Approaches

| Approach | Usage Boilerplate | Definition Boilerplate | Build Complexity |
|----------|------------------|----------------------|------------------|
| **Manual wrapper** | 3 lines per usage | None | None |
| **reactive() HOC** | 1 line per usage | 1 line at definition | None |
| **'use reactive' directive** | 1 line per usage | 1 line at definition | High (Vite plugin) |

**Winner**: `reactive()` HOC provides the best balance of simplicity and explicitness.

## Examples

### Basic Reactive Component

```tsx
import { useReactive, reactive } from '../lib/reactive'

function Counter({ increment = 1, interval = 1000 }) {
  const count = useReactive(
    0,
    (stream) => {
      let current = 0
      const id = setInterval(() => {
        current += increment
        stream.next(current)
      }, interval)
      return () => clearInterval(id)
    },
    [increment, interval]
  )

  return <div>Count: {count}</div>
}

export default reactive(Counter)
```

### Shared Signal Component

```tsx
import { useReactive, reactive } from '../lib/reactive'
import { serverTime } from '../lib/signals/server-time'

function ServerClock({ label = 'Server Time' }) {
  const time = useReactive(serverTime)

  return (
    <div>
      <h4>{label}</h4>
      <div>{new Date(time).toLocaleTimeString()}</div>
    </div>
  )
}

export default reactive(ServerClock)
```

### Multiple Instances

```tsx
import Clock from './components/clock'

// All instances work without wrappers!
<Clock interval={1000} />
<Clock interval={2000} />
<Clock interval={5000} />
```

## Implementation Details

### Location

- **File**: `kawa/src/lib/reactive/define-reactive.tsx`
- **Export**: `kawa/src/lib/reactive/index.ts`

### Type Signature

```tsx
export function reactive<P extends Record<string, any>>(
  Component: ComponentType<P & { _reactiveData?: any }>
): ComponentType<P>
```

**Parameters**:
- `Component`: The server component to wrap
- `P`: Props type (automatically inferred)

**Returns**:
- A new component that wraps the original with `<Reactive>`

### Special Props

The HOC preserves the special `_reactiveData` prop used internally by the streaming system:

```tsx
ComponentType<P & { _reactiveData?: any }>
```

This prop is injected by the `/api/reactive` SSE endpoint when rendering updates.

## Migration Guide

If you have existing code with manual `<Reactive>` wrappers:

### Before:
```tsx
// components/clock.tsx
export default function Clock({ interval }) {
  const time = useReactive(...)
  return <div>{time}</div>
}

// pages/index.tsx
import Clock from './components/clock'
import { Reactive } from './components/reactive'

<Reactive>
  <Clock interval={1000} />
</Reactive>
```

### After:
```tsx
// components/clock.tsx
import { reactive } from '../lib/reactive'

function Clock({ interval }) {
  const time = useReactive(...)
  return <div>{time}</div>
}

export default reactive(Clock)

// pages/index.tsx
import Clock from './components/clock'

<Clock interval={1000} />
```

**Steps**:
1. Add `reactive` import to component file
2. Change `export default function` to `function`
3. Add `export default reactive(Component)` at end
4. Remove `<Reactive>` wrappers from usage sites

## Future Enhancements

Possible future improvements:

1. **TypeScript Plugin** - Better type inference for wrapped components
2. **Dev Tools** - React DevTools integration showing reactive boundaries
3. **Performance Monitoring** - Track reactive component render times
4. **Conditional Wrapping** - Only wrap in production, not in dev

## Related Documentation

- [REACTIVE_API.md](kawa/REACTIVE_API.md) - useReactive hook API
- [API_DESIGN_PROPOSAL.md](API_DESIGN_PROPOSAL.md) - Original design explorations
- [RESEARCH-use-reactive-directive.md](RESEARCH-use-reactive-directive.md) - Why we didn't use directives

## Conclusion

The `reactive()` HOC provides a clean, simple way to eliminate boilerplate when using reactive server components. It requires zero build configuration, is fully type-safe, and maintains the explicitness that makes code easy to understand.

**Usage pattern**: Wrap once at definition, use everywhere without wrappers.

---

**Status**: ✅ Implemented and tested
**Version**: v0.6
