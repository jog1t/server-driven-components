# Reactive Server Components v0.2 - Design Notes

**Date:** 2026-01-04
**Goal:** Component-specific reactive signals with server-side state management

---

## 🎯 Requirements (from user)

### Desired API
```tsx
export async function ReactiveComponent() {
  // Server-side state (like useState but for server components)
  const [value, setValue] = await useSignal();

  // Server-side effects (like useEffect but runs on server)
  await useServerEffect(async () => {
    const interval = setInterval(() => {
      setValue(Date.now());
    }, 3000);

    return () => { clearInterval(interval); };
  }, []);

  return <p>Current server time is: {value}</p>;
}
```

### Key Features
1. **Component-specific updates** - Not global, each component manages its own state
2. **Server-side state** - State lives on server, not client
3. **Server-side lifecycle** - Effects that run on server (mount/unmount)
4. **Selective notifications** - Only notify clients subscribed to that component

---

## 🏗️ Architecture Challenges

### Challenge 1: Server Components Are Stateless
- Server components render once per request
- No built-in state or lifecycle
- We need to maintain state outside the component

**Solution:** Server-side state registry
```typescript
// In-memory store (production: Redis)
const componentStates = new Map<string, Map<string, any>>();
const componentEffects = new Map<string, CleanupFn[]>();
```

### Challenge 2: Component Identification
- Need unique ID per component instance
- Must persist across renders
- Client must know component ID to subscribe

**Solution:** Component ID generation + context passing
```typescript
// Generate unique ID based on component path + instance
const componentId = `${componentName}:${instanceId}`;
```

### Challenge 3: Triggering Client Updates
- Server state changes need to notify specific clients
- Client needs to refetch that specific component
- Avoid full page refetch

**Solution:** Component-specific SSE channels
```typescript
// SSE event format
{
  type: 'component-update',
  componentId: 'ReactiveComponent:instance-1',
  timestamp: '...'
}
```

### Challenge 4: Server Component Hooks Don't Exist
- React hooks only work in client components
- Server components are async functions, not React components
- Can't use real `useState` or `useEffect`

**Solution:** Async "hook-like" APIs that manage server-side state
```typescript
// Not real hooks, but async functions that look/feel similar
async function useServerSignal(componentId, key, initial) {
  // Get or create state
  const state = getServerState(componentId, key) ?? initial;

  // Return [value, setValue] tuple
  return [state, createSetState(componentId, key)];
}
```

---

## 🔧 Implementation Plan

### Phase 1: Server-Side State Management
```typescript
// lib/server-state.ts
class ServerStateManager {
  private states = new Map<string, Map<string, any>>();
  private effects = new Map<string, EffectCleanup[]>();
  private subscribers = new Map<string, Set<SSEClient>>();

  getState(componentId, key) { }
  setState(componentId, key, value) {
    // Update state
    // Notify subscribers
  }

  registerEffect(componentId, cleanup) { }
  cleanupComponent(componentId) { }

  subscribe(componentId, client) { }
  unsubscribe(componentId, client) { }
}
```

### Phase 2: Server "Hook" APIs
```typescript
// lib/server-hooks.ts
export async function useServerSignal<T>(
  componentId: string,
  key: string,
  initialValue: T
): Promise<[T, (value: T) => void]> {
  const state = stateManager.getState(componentId, key) ?? initialValue;

  const setState = (newValue: T) => {
    stateManager.setState(componentId, key, newValue);
  };

  return [state, setState];
}

export async function useServerEffect(
  componentId: string,
  effect: () => Promise<(() => void) | void>,
  deps: any[]
): Promise<void> {
  // Run effect and store cleanup
  const cleanup = await effect();
  if (cleanup) {
    stateManager.registerEffect(componentId, cleanup);
  }
}
```

### Phase 3: Component ID Context
```typescript
// Server components need to know their ID
// Option 1: Pass as prop (manual)
// Option 2: Use React context (limited in server components)
// Option 3: Generate from component metadata

// Pragmatic approach: Explicit prop
export async function ReactiveComponent({ _reactiveId }: { _reactiveId: string }) {
  const [value, setValue] = await useServerSignal(_reactiveId, 'value', 0);
  // ...
}
```

### Phase 4: Enhanced SSE Endpoint
```typescript
// pages/api/reactive-stream.ts
export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const componentId = url.searchParams.get('componentId');

  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to specific component updates
      const unsubscribe = stateManager.subscribe(componentId, {
        send: (data) => {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        }
      });

      return () => unsubscribe();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
};
```

### Phase 5: Client-Side Refetch
```typescript
// components/reactive-wrapper.tsx
export function ReactiveWrapper({ componentId, children }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Connect to component-specific SSE
    const es = new EventSource(`/api/reactive-stream?componentId=${componentId}`);

    es.onmessage = (event) => {
      const update = JSON.parse(event.data);

      // Trigger component refetch
      // Option 1: Use router.refresh() if available
      // Option 2: Fetch RSC payload manually
      // Option 3: Store data in state and re-render

      setData(update.state);
    };

    return () => es.close();
  }, [componentId]);

  return children;
}
```

---

## 🚧 Challenges & Trade-offs

### Challenge: True RSC Refetch
- Still can't easily trigger server component re-render
- Options:
  1. **State in wrapper** (current approach, not true server refetch)
  2. **Router refresh** (full page refetch, not selective)
  3. **Manual RSC fetch** (complex, need to understand React Flight format)
  4. **Streaming updates** (stream RSC payload over SSE)

### Challenge: Component Lifecycle
- Server components don't have mount/unmount
- Effects need to know when to start/stop
- Options:
  1. **Explicit initialization** (call `initReactiveComponent()`)
  2. **First render = mount** (auto-init on first access)
  3. **Client-driven** (client tells server when component mounted)

### Challenge: Multi-Instance Components
- Same component rendered multiple times
- Each needs unique ID
- Need instance tracking

**Solution:** Instance counter or client-generated IDs

---

## 🎯 Simplified v0.2 Approach

Given the complexity, let's start with a **pragmatic MVP**:

1. **Manual Component IDs** - Developer provides unique ID
2. **Server-side state storage** - In-memory Map (simple)
3. **Initialization API** - Explicit `initReactiveComponent()`
4. **Component-specific SSE** - Each component gets its own stream
5. **State display in wrapper** - Client wrapper shows server state (not true refetch yet)

### Developer Experience
```tsx
// 1. Define reactive component
export async function ServerClock({ reactiveId }: { reactiveId: string }) {
  const [time, setTime] = await useServerSignal(reactiveId, 'time', new Date().toISOString());

  await useServerEffect(reactiveId, async () => {
    const interval = setInterval(() => {
      setTime(new Date().toISOString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return <div>Server time: {time}</div>;
}

// 2. Initialize on server (e.g., in API route or startup)
initReactiveComponent('server-clock-1', async () => {
  // Component setup runs here
});

// 3. Wrap in client component
<ReactiveWrapper componentId="server-clock-1">
  <ServerClock reactiveId="server-clock-1" />
</ReactiveWrapper>
```

---

## 📋 Implementation Checklist

- [ ] Create `lib/server-state-manager.ts`
- [ ] Implement `useServerSignal` API
- [ ] Implement `useServerEffect` API
- [ ] Create `initReactiveComponent` initialization
- [ ] Update SSE endpoint for component-specific streams
- [ ] Update `ReactiveWrapper` for component subscriptions
- [ ] Create demo `ServerClock` component
- [ ] Test and document
- [ ] Update NOTES.md with findings

---

## 🤔 Open Questions

1. **How to handle component unmount?**
   - Client navigates away → cleanup server effects?
   - Need client → server notification?

2. **Memory management**
   - When to garbage collect component state?
   - Timeout-based? Connection-based?

3. **Better naming?**
   - `useServerSignal` vs `useServerState` vs `useReactiveState`?
   - `useServerEffect` vs `useServerLifecycle` vs `onServerMount`?

4. **Future: True RSC streaming?**
   - Can we stream RSC Flight payload over SSE?
   - Would require deep integration with React internals
