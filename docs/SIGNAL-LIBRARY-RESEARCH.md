# Signal Library Research

**Date:** January 7, 2026
**Purpose:** Research existing signal libraries to potentially simplify our kawa implementation

## Current Implementation Analysis

Our current implementation (`packages/kawa/src/signal.ts`) provides:

- **Basic Signals**: Writable reactive values with `get`, `set`, `update`, and `subscribe` methods
- **Computed Signals**: Derived values (currently incomplete - just snapshots, not truly reactive)
- **Listener Pattern**: Set-based subscriber management with cleanup functions
- **Type Safety**: Full TypeScript support
- **Server-Side**: Designed for Node.js/React Server Components

### Current Implementation Size
- ~86 lines for signal.ts
- Custom subscription management
- No automatic dependency tracking for computed values

### Limitations
1. Computed signals don't auto-track dependencies (comment at line 68: "Full reactive graph would require dependency tracking")
2. Manual subscription management
3. No batching of updates
4. No lazy evaluation optimization
5. Reinventing well-solved problems

## Requirements for Replacement Library

Based on our use case, an ideal library should:

1. ✅ **Server-side compatible** - Must work in Node.js
2. ✅ **Framework-agnostic** - Not tied to specific UI framework
3. ✅ **TypeScript support** - Full type safety
4. ✅ **Small footprint** - Keep bundle size minimal
5. ✅ **Auto-tracking computed** - Automatic dependency tracking for derived values
6. ✅ **Subscription API** - Ability to listen to signal changes
7. ✅ **Cleanup mechanisms** - Proper disposal/unsubscribe patterns
8. ✅ **Production-ready** - Battle-tested and stable
9. ⚠️ **Simple API** - Easy migration from our current implementation

## Signal Libraries Comparison

### 1. **@preact/signals-core** ⭐ RECOMMENDED

**Repository:** https://github.com/preactjs/signals
**Size:** ~1.6kB minzipped
**Status:** Production-ready, widely adopted

#### Pros
- ✅ Framework-agnostic core package
- ✅ Automatic dependency tracking for computed values
- ✅ Works in Node.js/server environments
- ✅ Excellent TypeScript support
- ✅ Battle-tested (used by Preact, adoptable by React/others)
- ✅ Lazy evaluation by default
- ✅ Automatic optimization (skips unused signals)
- ✅ Built-in batching with `batch()`
- ✅ `effect()` for side effects
- ✅ `untracked()` for non-reactive reads
- ✅ Active maintenance and community

#### API Overview
```typescript
import { signal, computed, effect, batch } from '@preact/signals-core';

// Create signal
const count = signal(0);

// Create computed with auto-tracking
const double = computed(() => count.value * 2);

// Subscribe to changes
effect(() => {
  console.log('Count:', count.value);
});

// Update value
count.value = 1;

// Batch updates
batch(() => {
  count.value = 2;
  count.value = 3;
}); // Only triggers one effect
```

#### Migration Path
```typescript
// Current implementation
const mySignal = signal(0);
mySignal.value; // read
mySignal.set(1); // write
const cleanup = mySignal.subscribe(listener);

// Preact signals equivalent
const mySignal = signal(0);
mySignal.value; // read
mySignal.value = 1; // write
const cleanup = effect(() => listener(mySignal.value));
```

#### Considerations
- Slightly different API (`.value` property vs `.value` getter/`.set()` method)
- `effect()` is the primary subscription mechanism (more powerful than raw subscribe)
- Computed values work properly with auto-tracking (fixes our limitation)

---

### 2. **@maverick-js/signals**

**Repository:** https://github.com/maverick-js/signals
**Size:** ~1kB minzipped
**Status:** Production-ready

#### Pros
- ✅ Extremely lightweight (~1kB)
- ✅ Works in browsers and Node.js
- ✅ TypeScript support
- ✅ Lazy evaluation
- ✅ Batched updates (microtask scheduling)
- ✅ `computed()`, `effect()`, `signal()` primitives
- ✅ `root()` for scope management
- ✅ `peek()` / `untrack()` utilities

#### API Overview
```typescript
import { signal, computed, effect, root } from '@maverick-js/signals';

const count = signal(0);
const double = computed(() => count() * 2);

effect(() => {
  console.log('Count:', count());
});

count.set(1); // update
```

#### Considerations
- Function-based API: `count()` to read, `count.set()` to write
- Requires `root()` for proper cleanup in some contexts
- Smaller community than Preact Signals
- Less documentation/examples

---

### 3. **TC39 Signal Polyfill** (signal-polyfill)

**Repository:** https://github.com/proposal-signals/signal-polyfill
**Status:** Stage 1 TC39 Proposal - EXPERIMENTAL ⚠️

#### Pros
- ✅ Future JavaScript standard (potentially)
- ✅ Designed by collaboration of framework authors (Angular, Vue, Solid, Svelte, etc.)
- ✅ Full feature set: State, Computed, Watchers
- ✅ Glitch-free evaluation
- ✅ Advanced introspection APIs

#### API Overview
```typescript
import { Signal } from 'signal-polyfill';

const counter = new Signal.State(0);
const isEven = new Signal.Computed(() => (counter.get() & 1) == 0);

counter.set(counter.get() + 1);
console.log(isEven.get()); // false
```

#### Cons
- ❌ **Not production-ready** - Explicitly warns against production use
- ❌ API may change at any time (Stage 1 proposal)
- ❌ More verbose API (`new Signal.State()`, `.get()`, `.set()`)
- ❌ Watcher API is complex (designed for framework authors)
- ❌ Polyfill overhead

**Verdict:** Wait for Stage 3+ before considering

---

### 4. **@solidjs/signals**

**Repository:** https://github.com/solidjs/signals
**Status:** Pre-alpha - NOT PRODUCTION READY ⚠️

#### Pros
- ✅ Designed for rendering use cases
- ✅ Standalone implementation
- ✅ TypeScript support

#### Cons
- ❌ **Pre-alpha** - Breaking changes expected
- ❌ Not optimized for performance yet
- ❌ No documentation on server-side usage
- ❌ Experimental/unstable

**Verdict:** Not suitable for production use

---

## Recommendation

### Primary Recommendation: **@preact/signals-core** ⭐

**Rationale:**
1. **Production-ready**: Battle-tested in real applications
2. **Feature-complete**: Solves all our current limitations (auto-tracking computed, batching, lazy eval)
3. **Well-maintained**: Active development and strong community
4. **Great documentation**: Comprehensive guides and examples
5. **Right size**: ~1.6kB is minimal overhead for significant functionality
6. **Server-compatible**: Works in Node.js environments
7. **Future-proof**: Aligns with TC39 signals direction while being usable today

### Alternative: **@maverick-js/signals**

If bundle size is absolutely critical (saving ~0.6kB), Maverick Signals is a solid alternative:
- Slightly smaller footprint
- Similar features
- Less ecosystem adoption

## Migration Strategy

### Phase 1: Add Dependency
```bash
pnpm add @preact/signals-core
```

### Phase 2: Update Implementation

Replace `packages/kawa/src/signal.ts` internals:

```typescript
// Instead of custom implementation
import { signal as preactSignal, computed as preactComputed } from '@preact/signals-core';

export type { Signal } from '@preact/signals-core';

// Wrap to match our API if needed
export function signal<T>(initialValue: T) {
  return preactSignal(initialValue);
}

export function computed<T>(compute: () => T) {
  return preactComputed(compute);
}
```

### Phase 3: Update Runtime

The runtime can leverage `effect()` for subscriptions:

```typescript
import { effect } from '@preact/signals-core';

subscribeToSignal<T>(signal: Signal<T>, subscriber: Subscriber<T>) {
  const dispose = effect(() => {
    subscriber.send(signal.value);
  });
  return dispose;
}
```

### Phase 4: Benefits Gained

After migration:
- ✅ **Computed signals work correctly** (auto-tracking dependencies)
- ✅ **Better performance** (lazy evaluation, batching)
- ✅ **Less code to maintain** (remove ~86 lines of custom signal implementation)
- ✅ **More features** (effects, batching, untracked reads)
- ✅ **Better tested** (thousands of apps using Preact Signals)

## Code Size Comparison

| Approach | Size | Maintenance |
|----------|------|-------------|
| Current custom implementation | ~86 LOC | High (we maintain all features) |
| @preact/signals-core | ~1.6kB dep | Low (maintained by Preact team) |
| @maverick-js/signals | ~1kB dep | Low (maintained by Maverick team) |

**Trade-off:** Small dependency for significantly reduced maintenance burden and better features.

## Risks & Considerations

### Minimal Risks
1. **Dependency addition**: Adding 1.6kB dependency vs maintaining custom code
2. **API differences**: Minor adjustments needed (`.value` property vs methods)
3. **Breaking change for users**: Would need version bump (0.1.0 → 0.2.0)

### Mitigation
1. Keep current API as wrapper layer for backward compatibility
2. Extensive testing before releasing
3. Document migration guide for library users

## Conclusion

**Recommendation: Adopt @preact/signals-core**

The benefits far outweigh the costs:
- ✅ Fixes current limitations (computed auto-tracking)
- ✅ Reduces maintenance burden
- ✅ Adds performance optimizations
- ✅ Battle-tested and production-ready
- ✅ Minimal size impact (1.6kB)
- ✅ Better long-term sustainability

This allows the kawa library to focus on its unique value proposition (RSC streaming integration) rather than reinventing reactive primitives.

---

## Sources

- [TC39 Signals Proposal](https://github.com/tc39/proposal-signals)
- [Signal Polyfill](https://github.com/proposal-signals/signal-polyfill)
- [Preact Signals](https://github.com/preactjs/signals)
- [Maverick Signals](https://github.com/maverick-js/signals)
- [Solid Signals](https://github.com/solidjs/signals)
- [TC39 2025 JavaScript Innovation](https://medium.com/@codewithrajat/tc39-2025-unveiling-the-future-of-javascript-innovation-b69db4b39a77)
- [A TC39 Proposal for Signals](https://eisenbergeffect.medium.com/a-tc39-proposal-for-signals-f0bedd37a335)
