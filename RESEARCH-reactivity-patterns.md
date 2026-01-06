# Research: Server-Side Reactivity Patterns Across Frameworks

**Date:** 2026-01-04
**Goal:** Find simpler API patterns for reactive server components by studying other frameworks

---

## Frameworks Analyzed

1. **Phoenix LiveView** (Elixir) - Server-driven UI with WebSockets
2. **Laravel Livewire** (PHP) - Server components with reactivity
3. **SolidJS** - Fine-grained client reactivity with signals
4. **Qwik** - Resumable framework with server functions
5. **Svelte 5 Runes** - Universal reactivity
6. **Hotwire/Turbo** (Rails) - HTML-over-the-wire

---

## Pattern 1: Module-Level State (SolidJS, Svelte)

### SolidJS Approach
```javascript
import { createSignal, createEffect } from "solid-js";

const [count, setCount] = createSignal(0);

createEffect(() => {
  console.log(count());
});
```

**Key Insights:**
- ✅ **No ID management** - Signals are global/module-scoped
- ✅ **Simple API** - Just `createSignal()` and `createEffect()`
- ✅ **Auto-coordination** - Effects automatically track signal dependencies
- ❌ **Client-side only** - Doesn't address server-component identity

**Sources:** [SolidJS createSignal](https://docs.solidjs.com/reference/basic-reactivity/create-signal), [SolidJS createEffect](https://docs.solidjs.com/reference/basic-reactivity/create-effect)

### Svelte 5 Runes Approach
```javascript
let count = $state(0);

$effect(() => {
  console.log(count);
});
```

**Key Insights:**
- ✅ **Compiler magic** - `$state` and `$effect` are compile-time runes
- ✅ **Looks like regular variables** - `count` is just a number
- ✅ **Universal reactivity** - Works in `.svelte.js` files too
- ⚠️ **$effect doesn't run on server** - Explicitly client-only
- ❌ **Requires compiler** - Can't be done with runtime-only code

**Sources:** [Svelte $state](https://svelte.dev/docs/svelte/$state), [Svelte $effect](https://svelte.dev/docs/svelte/$effect), [Introducing runes](https://svelte.dev/blog/runes)

---

## Pattern 2: Component-Level State (Phoenix LiveView, Livewire)

### Phoenix LiveView Approach
```elixir
defmodule MyAppWeb.ClockLive do
  use Phoenix.LiveView

  def mount(_params, _session, socket) do
    if connected?(socket) do
      :timer.send_interval(1000, self(), :tick)
    end

    {:ok, assign(socket, time: DateTime.utc_now())}
  end

  def handle_info(:tick, socket) do
    {:noreply, assign(socket, time: DateTime.utc_now())}
  end

  def render(assigns) do
    ~H"""
    <div>Time: <%= @time %></div>
    """
  end
end
```

**Key Insights:**
- ✅ **Socket is the identity** - No manual ID management
- ✅ **Lifecycle hooks** - `mount/3`, `handle_info/3` for effects
- ✅ **Automatic re-render** - Assigning to socket triggers update
- ✅ **True server-driven** - State lives on server, pushes to client
- ❌ **Different paradigm** - Not React-like hooks

**Sources:** [Phoenix LiveView Docs](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html), [Phoenix Framework](https://phoenixframework.org/)

### Laravel Livewire Approach
```php
use Livewire\Component;
use Livewire\Attributes\Reactive;

class Counter extends Component
{
    public $count = 0;

    #[Reactive]
    public $parentValue;

    public function increment()
    {
        $this->count++;
    }

    public function render()
    {
        return view('livewire.counter');
    }
}
```

**Key Insights:**
- ✅ **Component instance is the identity** - Framework manages it
- ✅ **Declarative reactivity** - `#[Reactive]` attribute for props
- ✅ **Public properties are state** - Simple mental model
- ✅ **Method calls trigger updates** - Calling `increment()` re-renders
- ❌ **PHP-specific** - Doesn't translate directly to JavaScript

**Sources:** [Livewire Reactive](https://livewire.laravel.com/docs/4.x/attribute-reactive), [Livewire Components](https://livewire.laravel.com/docs/3.x/components)

---

## Pattern 3: Explicit Server Functions (Qwik)

### Qwik Approach
```javascript
import { component$, useSignal, useTask$ } from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';

export default component$(() => {
  const count = useSignal(0);

  const increment = server$(async function() {
    // Runs on server
    return count.value + 1;
  });

  useTask$(async () => {
    // Runs on both server and client
    console.log(count.value);
  });

  return (
    <button onClick$={() => count.value++}>
      {count.value}
    </button>
  );
});
```

**Key Insights:**
- ✅ **`server$()` marks server functions** - Explicit server boundary
- ✅ **Resumability** - Serializes state between server/client
- ✅ **Signals + QRLs** - Fine-grained reactivity with lazy loading
- ✅ **`useTask$` for effects** - Runs on both server and client
- ⚠️ **Dollar signs everywhere** - Optimizer needs markers
- ❌ **Complex mental model** - Resumability is hard to understand

**Sources:** [Qwik State](https://qwik.dev/docs/core/state/), [Qwik server$](https://qwik.dev/docs/server$/), [Qwik Resumable](https://qwik.dev/docs/concepts/resumable/)

---

## Pattern 4: HTML-Over-The-Wire (Hotwire/Turbo)

### Hotwire/Turbo Approach
```ruby
# app/views/clocks/show.html.erb
<%= turbo_stream_from "clock" %>

<div id="time">
  <%= Time.current %>
</div>

# app/jobs/clock_broadcast_job.rb
class ClockBroadcastJob < ApplicationJob
  def perform
    Turbo::StreamsChannel.broadcast_replace_to(
      "clock",
      target: "time",
      partial: "clocks/time"
    )
  end
end
```

**Key Insights:**
- ✅ **No JavaScript needed** - Pure HTML replacement
- ✅ **Stream-based** - `turbo_stream_from` subscribes to channel
- ✅ **Declarative** - HTML targets define what updates
- ✅ **Simple mental model** - Server sends HTML snippets
- ❌ **Not component-based** - Works with DOM IDs, not components
- ❌ **Rails-specific** - Tied to Action Cable

**Sources:** [Hotwire Turbo Rails](https://github.com/hotwired/turbo-rails), [Hotwire Guide](https://blog.cloud66.com/the-ultimate-guide-to-implementing-hotwired-and-turbo-in-a-rails-application), [Hotrails Tutorial](https://www.hotrails.dev/turbo-rails)

---

## Key Patterns Identified

### 1. **Framework-Managed Identity**
- **Phoenix, Livewire:** Framework assigns component instance identity
- **Hotwire:** Uses channel names + DOM IDs
- **Qwik:** QRL system manages component references

**Our Challenge:** React Server Components don't have instance identity by default

### 2. **Implicit Context/Scope**
- **SolidJS:** Reactive context automatically tracks dependencies
- **Svelte:** Compiler injects tracking code
- **Phoenix:** Socket assigns are automatically reactive

**Our Challenge:** Can't use React Context in server components

### 3. **Lifecycle Hooks as Effect Mechanism**
- **Phoenix:** `mount/3`, `handle_info/3`, `handle_event/3`
- **Livewire:** Component lifecycle methods
- **Qwik:** `useTask$` runs on mount

**Our Opportunity:** We could use component-level effects instead of hooks

---

## Potential Solutions for Our Use Case

### Option A: Component-as-Identity (Phoenix-inspired)

```tsx
import { ReactiveServerComponent } from 'reactive-rsc';

export default class ClockComponent extends ReactiveServerComponent {
  state = {
    time: Date.now()
  };

  onMount() {
    this.interval = setInterval(() => {
      this.setState({ time: Date.now() });
    }, 1000);
  }

  onUnmount() {
    clearInterval(this.interval);
  }

  render() {
    return <div>{new Date(this.state.time).toLocaleTimeString()}</div>;
  }
}
```

**Pros:**
- ✅ Component instance IS the identity
- ✅ No ID management needed
- ✅ Familiar class component pattern
- ✅ `this.setState()` triggers updates

**Cons:**
- ❌ React is moving away from classes
- ❌ Can't use React hooks
- ❌ Less "modern React" feel

### Option B: Decorator Pattern (Livewire-inspired)

```tsx
import { reactive } from 'reactive-rsc';

@reactive
export function Clock() {
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

**Pros:**
- ✅ Clean syntax - just add `@reactive`
- ✅ Looks like regular React
- ✅ Framework manages ID behind the scenes

**Cons:**
- ❌ Decorators still experimental in JavaScript
- ❌ TypeScript decorators different from TC39 proposal
- ❌ Build tooling complexity

### Option C: Factory Function Pattern (SolidJS-inspired)

```tsx
import { createReactiveComponent } from 'reactive-rsc';

export const Clock = createReactiveComponent(() => {
  const [time, setTime] = useSignal(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>{new Date(time).toLocaleTimeString()}</div>;
});
```

**Pros:**
- ✅ Factory manages component identity
- ✅ Can inject ID into closure scope
- ✅ Modern functional approach

**Cons:**
- ❌ Different from standard React component definition
- ❌ May confuse React DevTools
- ❌ Extra wrapping layer

### Option D: Module-Level Singleton (Simplified)

```tsx
// Each file = one reactive component instance
import { signal, effect } from 'reactive-rsc/server';

const time = signal(Date.now());

effect(() => {
  const interval = setInterval(() => time.set(Date.now()), 1000);
  return () => clearInterval(interval);
});

export function Clock() {
  return <div>{new Date(time.get()).toLocaleTimeString()}</div>;
}
```

**Pros:**
- ✅ No ID needed - file path is identity
- ✅ Very simple mental model
- ✅ Similar to SolidJS signals

**Cons:**
- ❌ Can't have multiple instances of same component
- ❌ Module-level side effects are problematic
- ❌ Doesn't fit React's component model

### Option E: Convention-Based Naming (Hotwire-inspired)

```tsx
export function Clock() {
  // Component name becomes the channel/ID
  const [time, setTime] = useServerSignal('time', Date.now());

  useServerEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <ReactiveWrapper channel="Clock">
    <div>{new Date(time).toLocaleTimeString()}</div>
  </ReactiveWrapper>;
}
```

**Pros:**
- ✅ Component name is human-readable
- ✅ Explicit but simple
- ✅ Multiple instances with different channels

**Cons:**
- ❌ Still need to pass channel to wrapper
- ❌ Multiple instances need manual naming
- ❌ Not much simpler than current v0.3

---

## Recommendation

After analyzing all these patterns, here's my recommendation:

### **Hybrid: Module-Level Context + Auto-Wrapping**

Combine the best ideas:

```tsx
// reactive-rsc/server-hooks.ts
import { AsyncLocalStorage } from 'node:async_hooks';

const componentContext = new AsyncLocalStorage<string>();

export function useServerSignal(key, initialValue) {
  const reactiveId = componentContext.getStore() ?? useId();
  // ... state management
  return [value, setValue];
}

export function useServerEffect(effect, deps) {
  const reactiveId = componentContext.getStore()!;
  // ... effect management
}

// reactive-rsc/components.tsx
export function createReactive(Component) {
  return function ReactiveComponent(props) {
    const reactiveId = useId();

    const content = componentContext.run(reactiveId, () => {
      return <Component {...props} />;
    });

    return (
      <ReactiveWrapper componentId={reactiveId}>
        {content}
      </ReactiveWrapper>
    );
  };
}
```

Usage:
```tsx
import { createReactive } from 'reactive-rsc';

export const Clock = createReactive(() => {
  const [time, setTime] = useServerSignal('time', Date.now());

  useServerEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>{new Date(time).toLocaleTimeString()}</div>;
});

// Usage in page
<Clock /> // No wrapper needed!
```

**Benefits:**
- ✅ No ID passing needed
- ✅ Clean component definition
- ✅ Auto-wrapping handled by factory
- ✅ AsyncLocalStorage ensures correct scoping
- ✅ Familiar React patterns

**Trade-offs:**
- ⚠️ Requires `createReactive()` wrapper
- ⚠️ AsyncLocalStorage adds slight overhead
- ⚠️ May be confusing if context is lost

---

## Alternative: Class-Based (Simplest DX)

If we're willing to use classes:

```tsx
import { ReactiveServerComponent } from 'reactive-rsc';

export class Clock extends ReactiveServerComponent {
  time = this.signal(Date.now());

  mount() {
    this.interval = setInterval(() => {
      this.time.set(Date.now());
    }, 1000);
  }

  unmount() {
    clearInterval(this.interval);
  }

  render() {
    return <div>{new Date(this.time.get()).toLocaleTimeString()}</div>;
  }
}

// Usage
<Clock /> // Automatically reactive!
```

This is **by far the simplest** because:
- ✅ Component instance IS the identity
- ✅ `this` provides natural scoping
- ✅ No ID management whatsoever
- ✅ Lifecycle methods are natural

But requires accepting class components.

---

## Conclusion

**Best pattern depends on priorities:**

1. **Simplest DX:** Class-based components
2. **Most "React-like":** Factory function with AsyncLocalStorage
3. **Most explicit:** Current v0.3 (pass reactiveId around)
4. **Most magical:** Decorators (but experimental)

**My recommendation:** Try the **Factory + AsyncLocalStorage** approach first. It balances simplicity with modern React patterns.
