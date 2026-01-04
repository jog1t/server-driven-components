# v0.2.1 - Using React's useId()

## TL;DR - Cleanest API Achieved

```tsx
// ✅ CLEANEST: Wrapper generates ID with useId(), injects to server component
<Reactive>
  <MyClock />
</Reactive>

export async function MyClock({ _reactiveId }: { _reactiveId?: string }) {
  const [time, setTime] = await useServerSignal(_reactiveId!, 'time', Date.now());
  await useServerEffect(_reactiveId!, async () => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

---

## Question: Why Not useId() Inside useServerSignal/useServerEffect?

**User's question**: Can `useServerSignal` and `useServerEffect` call `useId()` internally instead of requiring an ID parameter?

### Why This Won't Work

**React's Rules of Hooks**: Hooks can only be called from:
1. React function components (at top level)
2. Custom hooks (which are called from components)

**The Problem**:
- `useServerSignal` and `useServerEffect` are **async utility functions**, not React components
- They're called from within server components, but they're not hooks themselves
- React's `useId()` can't be called from regular functions

### What We Tried

```tsx
// ❌ This doesn't work - useId() can't be called in regular functions
export async function useServerSignal(key, initial) {
  const id = useId(); // Error: Hooks can only be called from components!
  // ...
}
```

---

## Alternative Approaches Considered

### Approach 1: Call useId() in Server Component ✅ (Works!)

```tsx
export async function MyClock() {
  const id = useId(); // ✅ This works! useId() works in server components
  const [time, setTime] = await useServerSignal(id, 'time', Date.now());
  // ...
}
```

**Pros:**
- Server component generates its own ID
- No prop injection needed

**Cons:**
- How does `<ReactiveWrapper>` know what ID to use for SSE?
- We'd need to pass the ID to the wrapper somehow:
  ```tsx
  const id = useId();
  return (
    <ReactiveWrapper componentId={id}>
      {/* ... but wrapper is parent, not child! */}
    </ReactiveWrapper>
  );
  ```
- Chicken-and-egg problem: wrapper needs to wrap component, but needs ID from component

### Approach 2: Use React Context ❌ (Doesn't Work)

```tsx
<ReactiveProvider>
  <MyClock />
</ReactiveProvider>

export async function MyClock() {
  const id = useReactiveId(); // Read from context
  const [time] = await useServerSignal(id, 'time', Date.now());
}
```

**Why it doesn't work:**
- Server components **cannot use React Context**
- Context only works in client components
- Server components render independently on the server

### Approach 3: Current Solution - `<Reactive>` Wrapper ✅ (Best We Can Do!)

```tsx
<Reactive>
  <MyClock />
</Reactive>

export async function MyClock({ _reactiveId }: { _reactiveId?: string }) {
  const [time] = await useServerSignal(_reactiveId!, 'time', Date.now());
}
```

**How it works:**
1. `<Reactive>` wrapper (client component) calls `useId()`
2. Wrapper clones server component and injects `_reactiveId` prop
3. Server component receives ID and uses it for hooks
4. Wrapper uses same ID for SSE connection

**Why this is optimal:**
- ✅ Single `useId()` call (in wrapper)
- ✅ ID automatically propagated to server component
- ✅ Same ID used for SSE connection and state management
- ✅ No manual ID duplication
- ✅ TypeScript-safe with proper typing

---

## Why We Need the ID Coordination

The fundamental constraint:

```
┌─────────────────┐
│ ReactiveWrapper │ ← Needs componentId for SSE connection
│  (client)       │
└────────┬────────┘
         │ wraps
         ▼
┌─────────────────┐
│ ServerComponent │ ← Needs componentId for useServerSignal/Effect
│  (server)       │
└─────────────────┘

They MUST use the SAME ID!
```

Since they must share the same ID, and the wrapper must wrap the component (not vice versa), the cleanest solution is:
1. Wrapper generates ID (using `useId()`)
2. Wrapper passes ID to component (via prop injection)

---

## Final API Comparison

### ❌ Impossible - hooks inside utility functions
```tsx
const [time] = await useServerSignal('time', Date.now()); // where to get ID?
```

### ⚠️ Possible but awkward - manual ID passing
```tsx
<ReactiveWrapper componentId="my-clock">
  <MyClock reactiveId="my-clock" /> // ID duplicated!
</ReactiveWrapper>
```

### ✅ Optimal - automatic ID injection
```tsx
<Reactive>
  <MyClock /> // ID auto-injected as _reactiveId prop
</Reactive>
```

### 🤔 Also works - server component calls useId()
```tsx
export async function MyClock() {
  const id = useId(); // Generate in component
  const [time] = await useServerSignal(id, 'time', Date.now());

  // But how to tell wrapper what ID to use? 🤷
  // Would need to wrap output manually:
  return <ReactiveWrapper componentId={id}>...</ReactiveWrapper>;
  // But then wrapper becomes child, not parent - doesn't work!
}
```

---

## Conclusion

The `<Reactive>` wrapper with `_reactiveId` prop injection is the **cleanest API** we can achieve given React's constraints:

- Server components can't call hooks inside utility functions
- Server components can't use Context
- Wrapper and component need to share the same ID
- Wrapper must wrap component (architectural constraint)

**This is as clean as it gets!** ✨
