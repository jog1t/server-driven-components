# Research: 'use reactive' Directive for Auto-Wrapping Reactive Components

**Date**: 2026-01-07
**Status**: Research Complete
**Author**: Claude (AI Assistant)

## Executive Summary

This document explores the feasibility of implementing a `'use reactive'` directive to automatically wrap reactive server components, eliminating the need for manual `useReactive` hook calls and the `<Reactive>` wrapper component.

**Key Finding**: A `'use reactive'` directive is **technically feasible** but would require significant bundler infrastructure and introduces trade-offs that led this project to initially reject it in favor of the current hook-based approach.

---

## Table of Contents

1. [Background](#background)
2. [What is a 'use reactive' Directive?](#what-is-a-use-reactive-directive)
3. [How React Directives Work](#how-react-directives-work)
4. [Technical Feasibility](#technical-feasibility)
5. [Implementation Approach](#implementation-approach)
6. [Comparison: Directive vs Hook-Based](#comparison-directive-vs-hook-based)
7. [Pros and Cons](#pros-and-cons)
8. [Recommendation](#recommendation)
9. [Sources](#sources)

---

## Background

### Current Implementation

The kawa project currently uses a **hook-based approach** (API Design #3 + #7):

```tsx
// Current approach - explicit hook usage
export default function Clock({ interval = 1000 }) {
  const time = useReactive(
    Date.now(),
    (stream) => {
      const id = setInterval(() => stream.next(Date.now()), interval);
      return () => clearInterval(id);
    },
    [interval]
  );

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

This approach was chosen over **7 alternative designs** including a directive-based approach (Design #1).

### Why Revisit This?

The question is whether a directive-based approach could provide better DX by:
- Eliminating boilerplate
- Making reactive components more declarative
- Auto-handling SSE connections and streaming
- Providing a familiar pattern (like `'use client'`)

---

## What is a 'use reactive' Directive?

A `'use reactive'` directive would be a **file-level marker** similar to `'use client'` and `'use server'`:

```tsx
'use reactive'  // Directive at top of file

export default function Clock({ interval = 1000 }) {
  // Special reactive hook - only works in 'use reactive' files
  const time = useReactiveState(() => Date.now(), {
    subscribe: ({ setState }) => {
      const id = setInterval(() => setState(Date.now()), interval);
      return () => clearInterval(id);
    }
  });

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}

// Usage - automatic wrapping and streaming
<Clock interval={1000} />  // No <Reactive> wrapper needed!
```

### Key Behaviors

1. **Automatic Registration**: Components are auto-registered with the reactive runtime
2. **Auto-Wrapping**: Framework automatically wraps with `<Reactive>` client boundary
3. **SSE Streaming**: Framework handles SSE connection setup
4. **Bundler Integration**: Directive triggers special bundler transformations

---

## How React Directives Work

### Official React Directives

React Server Components introduced two official directives:

#### `'use client'`

- **Purpose**: Marks the boundary where code needs to run in the browser
- **Bundler Behavior**:
  - Tells the bundler to include this file and its dependencies in the client bundle
  - Creates a "client reference" that the server can serialize
  - Marks the entry point where server-client boundary is crossed
- **Module Graph**: Everything imported by a `'use client'` file becomes client code
- **Rendering**: Still server-renders initially, but also sends code to client

#### `'use server'`

- **Purpose**: Marks server actions (functions that run on server when called from client)
- **Not for Components**: Server components don't need this (they're server by default)
- **Bundler Behavior**: Creates a "server reference" that client can call via RPC

### How They're Processed

1. **Parse Stage**: Bundler parses file, detects directive at top
2. **Graph Analysis**: Walks module dependency graph from directive boundary
3. **Code Splitting**: Splits code into client/server bundles
4. **Reference Creation**: Creates serializable references for cross-boundary calls
5. **Runtime Handling**: React runtime handles boundary crossing during render

**Key Insight**: These directives require **deep bundler integration** to work correctly.

---

## Technical Feasibility

### Can We Create Custom Directives?

**Short Answer**: Yes, but with caveats.

#### What's Technically Required

1. **Bundler Plugin** to detect and process the directive
2. **AST Transformation** to modify component code
3. **Code Generation** to inject wrapper components
4. **Runtime Registration** to track reactive components
5. **Framework Integration** with Waku/RSC rendering pipeline

#### Bundler Support

The project uses **Vite** with `@vitejs/plugin-react`:

```json
// package.json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.0",
    "babel-plugin-react-compiler": "^1.0.0"
  }
}
```

**Vite Plugin Capabilities**:
- ✅ Can parse files and detect directives
- ✅ Can transform code via `transform` hook
- ✅ Can modify AST using Babel or SWC
- ✅ Can inject code at boundaries
- ❌ No built-in support for custom React directives (need to build it)

#### Challenges

1. **Directive Preservation**: Vite/Rollup may strip directives during bundling
2. **Module Graph Tracking**: Need to track which components are reactive
3. **Component Identity**: Must generate stable IDs for reactive components
4. **Wrapper Injection**: Must inject `<Reactive>` wrapper at usage sites
5. **Props Forwarding**: Must properly forward props through wrapper
6. **Type Safety**: TypeScript needs to understand the transformation

### What Other Projects Do

**Next.js**: Deep integration with webpack/turbopack for `'use client'`/`'use server'`
- Custom webpack loader to detect directives
- Custom module graph tracking
- Tight coupling with framework

**Remix/React Router**: Uses Vite plugins for RSC boundaries
- Less directive-based, more convention-based
- Explicit component splitting

**Community Libraries**:
- `react-directive` - Custom directive system for Vue-like directives
- Limited to runtime directives, not build-time transformations

### Is It Worth It?

**Technical Feasibility**: 7/10 - Possible but requires significant work

**Complexity Cost**: High - Requires:
- Custom Vite plugin (~300-500 lines)
- AST transformation logic
- Module graph tracking
- Testing across different bundler configs
- Documentation and debugging tools

---

## Implementation Approach

If we were to implement `'use reactive'`, here's how it would work:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Developer writes component with 'use reactive' directive │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Vite plugin detects directive during build               │
│    - Parse file with Babel                                  │
│    - Check for 'use reactive' at top                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Plugin transforms component                              │
│    - Inject reactive runtime registration                   │
│    - Generate unique component ID                           │
│    - Add metadata for SSE endpoint                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Plugin transforms usage sites                            │
│    - Detect imports of reactive components                  │
│    - Wrap with <Reactive> at JSX usage                      │
│    - Forward props correctly                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Runtime handles streaming                                │
│    - Same SSE endpoint as current implementation            │
│    - Same ReactiveRuntime as current                        │
└─────────────────────────────────────────────────────────────┘
```

### Code Transformation Example

**Input** (developer writes):

```tsx
'use reactive'

export default function Clock({ interval = 1000 }) {
  const time = useReactiveState(() => Date.now(), {
    subscribe: ({ setState }) => {
      const id = setInterval(() => setState(Date.now()), interval);
      return () => clearInterval(id);
    }
  });

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}
```

**Output** (after bundler transformation):

```tsx
import { registerReactiveComponent } from '@/lib/reactive/runtime';

function Clock({ interval = 1000, _reactiveData }) {
  const time = useReactiveState(() => Date.now(), {
    subscribe: ({ setState }) => {
      const id = setInterval(() => setState(Date.now()), interval);
      return () => clearInterval(id);
    }
  });

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}

// Auto-register with runtime
registerReactiveComponent('Clock-xyz123', Clock, {
  scope: ['interval']
});

export default Clock;

// Also export metadata for wrapper injection
export const __reactive_meta = {
  componentId: 'Clock-xyz123',
  scopeKeys: ['interval']
};
```

**Usage Site Transformation**:

```tsx
// Before transformation
import Clock from './components/Clock';

<Clock interval={1000} />

// After transformation
import Clock, { __reactive_meta } from './components/Clock';
import { Reactive } from '@/components/reactive';

<Reactive
  componentId={__reactive_meta.componentId}
  scope={{ interval: 1000 }}
>
  {(data) => <Clock interval={1000} _reactiveData={data} />}
</Reactive>
```

### Vite Plugin Implementation Sketch

```ts
// vite-plugin-use-reactive.ts
import { Plugin } from 'vite';
import * as babel from '@babel/core';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

export function vitePluginUseReactive(): Plugin {
  const reactiveComponents = new Map<string, ComponentMetadata>();

  return {
    name: 'vite-plugin-use-reactive',

    transform(code, id) {
      // Only process .tsx/.jsx files
      if (!id.match(/\.(tsx|jsx)$/)) return;

      // Parse and detect 'use reactive' directive
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      let hasReactiveDirective = false;

      traverse(ast, {
        Program(path) {
          const directives = path.node.directives || [];
          hasReactiveDirective = directives.some(
            d => d.value.value === 'use reactive'
          );
        }
      });

      if (!hasReactiveDirective) {
        // Check if this file imports reactive components
        return transformUsageSite(ast, code, id, reactiveComponents);
      }

      // Transform reactive component definition
      return transformReactiveComponent(ast, code, id, reactiveComponents);
    }
  };
}

function transformReactiveComponent(ast, code, id, registry) {
  // 1. Generate unique component ID
  // 2. Inject registration code
  // 3. Add metadata exports
  // 4. Remove 'use reactive' directive (or keep it as marker)
  // ...implementation...
}

function transformUsageSite(ast, code, id, registry) {
  // 1. Find imports of reactive components
  // 2. Wrap JSX usage with <Reactive>
  // 3. Forward props correctly
  // ...implementation...
}
```

**Complexity Estimate**: ~500-800 lines for full implementation with edge cases.

### Integration with Current System

**Good News**: The directive approach could **reuse most of the current infrastructure**:

- ✅ Keep `ReactiveRuntime` as-is
- ✅ Keep `/api/reactive` SSE endpoint as-is
- ✅ Keep `<Reactive>` wrapper component as-is
- ✅ Keep signal system as-is

**What Changes**:
- ❌ Replace manual `useReactive` hook calls with `useReactiveState`
- ❌ Remove manual `<Reactive>` wrapper usage
- ➕ Add Vite plugin for transformations
- ➕ Add component registration system

---

## Comparison: Directive vs Hook-Based

### Current Hook-Based Approach

```tsx
// Component definition
export default function Clock({ interval = 1000 }) {
  const time = useReactive(
    Date.now(),
    (stream) => {
      const id = setInterval(() => stream.next(Date.now()), interval);
      return () => clearInterval(id);
    },
    [interval]
  );

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}

// Usage - manual wrapper
import { Reactive } from '@/components/reactive';

<Reactive>
  <Clock interval={1000} />
</Reactive>
```

**Lines of Code**:
- Component: ~10 lines
- Usage: ~3 lines (with wrapper)
- **Total: ~13 lines**

**Developer Actions**:
1. Import `useReactive`
2. Call hook with stream function
3. Wrap usage with `<Reactive>`

### Proposed Directive Approach

```tsx
// Component definition
'use reactive'

export default function Clock({ interval = 1000 }) {
  const time = useReactiveState(() => Date.now(), {
    subscribe: ({ setState }) => {
      const id = setInterval(() => setState(Date.now()), interval);
      return () => clearInterval(id);
    }
  });

  return <div>{new Date(time).toLocaleTimeString()}</div>;
}

// Usage - automatic wrapper
<Clock interval={1000} />
```

**Lines of Code**:
- Component: ~11 lines (1 directive + 10 logic)
- Usage: ~1 line
- **Total: ~12 lines**

**Developer Actions**:
1. Add `'use reactive'` directive
2. Call `useReactiveState`
3. ~~Wrap usage~~ (automatic!)

### Side-by-Side Metrics

| Aspect | Hook-Based (Current) | Directive (Proposed) |
|--------|---------------------|---------------------|
| **Boilerplate** | Manual wrapper | Directive only |
| **Explicitness** | Very explicit | Less explicit |
| **Learning Curve** | Familiar hooks | New concept |
| **Type Safety** | Excellent | Good (needs inference) |
| **Build Complexity** | None | High (Vite plugin) |
| **Runtime Overhead** | Minimal | Same |
| **Debugging** | Easy (explicit) | Harder (magic) |
| **Framework Lock-in** | Low | Medium |
| **Usage Boilerplate** | 3 lines | 1 line |
| **Component Boilerplate** | Same | Same (+1 directive) |

### Real-World Usage Example

**Scenario**: A dashboard with 5 reactive components

**Hook-Based**:
```tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Reactive><Clock interval={1000} /></Reactive>
      <Reactive><ServerTime /></Reactive>
      <Reactive><ActiveUsers /></Reactive>
      <Reactive><SystemMetrics /></Reactive>
      <Reactive><RecentActivity /></Reactive>
    </div>
  );
}
```

**Lines**: 11 lines, 5 `<Reactive>` wrappers

**Directive-Based**:
```tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Clock interval={1000} />
      <ServerTime />
      <ActiveUsers />
      <SystemMetrics />
      <RecentActivity />
    </div>
  );
}
```

**Lines**: 11 lines, no wrappers

**Savings**: ~10 characters per component usage (wrapper syntax)

---

## Pros and Cons

### Directive Approach Pros

1. **✅ Cleaner Usage Sites**
   - No manual `<Reactive>` wrapper needed
   - Looks like normal component usage
   - Less visual noise in JSX

2. **✅ Familiar Pattern**
   - Matches `'use client'` / `'use server'` convention
   - Declarative intent at file level
   - Clear boundary marker

3. **✅ Auto-Registration**
   - Components automatically registered with runtime
   - No risk of forgetting wrapper
   - Framework handles complexity

4. **✅ Potential for Optimization**
   - Bundler could optimize reactive component bundling
   - Could enable static analysis
   - Better tree-shaking opportunities

### Directive Approach Cons

1. **❌ Requires Complex Bundler Plugin**
   - 500-800 lines of code to maintain
   - Needs AST transformation
   - Must handle edge cases (HOCs, re-exports, etc.)
   - Testing across different bundler configs

2. **❌ "Magic" Behavior**
   - Less explicit what's happening
   - Harder to debug when things go wrong
   - Breaks principle of least surprise
   - New developers need to learn custom directive

3. **❌ Bundler Lock-in**
   - Plugin specific to Vite
   - Would need separate webpack/Rollup/etc. plugins
   - Framework portability concerns

4. **❌ Type Safety Challenges**
   - TypeScript doesn't know about transformations
   - Need custom TypeScript plugin for full inference
   - Props forwarding type issues

5. **❌ Build-Time Dependency**
   - Can't work in non-bundled environments
   - Adds complexity to build process
   - Slower builds (AST parsing for every file)

6. **❌ Limited Flexibility**
   - What if you want conditional wrapping?
   - What about HOCs wrapping reactive components?
   - Edge cases harder to handle

7. **❌ Documentation Burden**
   - Need extensive docs on how it works
   - Users need to understand transformation
   - More surface area for confusion

### Hook-Based Approach Pros (Current)

1. **✅ Explicit and Clear**
   - Obvious what's happening
   - No magic transformations
   - Easy to debug

2. **✅ Zero Build Complexity**
   - No bundler plugins needed
   - Works in any environment
   - Fast builds

3. **✅ Framework Agnostic**
   - Could work with any RSC framework
   - Not tied to Vite
   - Easy to port

4. **✅ Type-Safe**
   - Full TypeScript inference
   - No custom TypeScript plugins needed
   - Props properly typed

5. **✅ Flexible**
   - Easy to compose with HOCs
   - Conditional wrapping trivial
   - Full control over behavior

6. **✅ Familiar Hooks Pattern**
   - React developers know hooks
   - Similar to `useState` + `useEffect`
   - Low learning curve

### Hook-Based Approach Cons (Current)

1. **❌ Manual Wrapper Required**
   - Need to wrap usage with `<Reactive>`
   - 3 extra lines per usage
   - Easy to forget

2. **❌ More Verbose Usage**
   - Slight visual noise in JSX
   - Extra indentation

3. **❌ Potential for Mistakes**
   - Could forget to wrap
   - Would result in non-reactive component (silent failure)

---

## Recommendation

### Primary Recommendation: **Stick with Hook-Based Approach**

**Reasoning**:

1. **Marginal DX Improvement**: The directive approach saves ~10 characters per usage but adds significant complexity

2. **Current Approach Already Excellent**: The hook-based API is:
   - Clean and React-like
   - Type-safe
   - Explicit and debuggable
   - Well-documented

3. **Cost-Benefit Analysis**:
   ```
   Benefit: Slightly cleaner usage sites (-2 lines per usage)
   Cost: 500+ lines of bundler plugin + maintenance + documentation

   Verdict: NOT worth it
   ```

4. **Aligns with React Philosophy**: React is moving toward **explicit over magic** (see React 19 changes)

5. **Maintenance Burden**: Custom bundler plugins are hard to maintain and test

### Alternative: Wrapper Component Helper

If the `<Reactive>` wrapper feels too verbose, consider a **helper pattern**:

```tsx
// lib/reactive/helpers.tsx
export function reactive<T extends ComponentType<any>>(Component: T): T {
  return ((props: any) => (
    <Reactive>
      <Component {...props} />
    </Reactive>
  )) as T;
}

// Usage
import { reactive } from '@/lib/reactive/helpers';
import ClockBase from './components/clock';

const Clock = reactive(ClockBase);

// Now use without wrapper
<Clock interval={1000} />
```

**Benefits**:
- ✅ No bundler plugin needed
- ✅ Zero build complexity
- ✅ Type-safe
- ✅ Explicit wrapping at import site
- ✅ Only ~10 lines of code

**Trade-off**: Requires wrapping at import instead of usage (but only once per component)

### If You Must Implement Directive Approach

If the team strongly prefers the directive approach despite the trade-offs, here's the path:

**Phase 1: Prototype** (1-2 weeks)
- Build minimal Vite plugin for `'use reactive'` detection
- Transform simple cases (no HOCs, no re-exports)
- Test with 2-3 components

**Phase 2: Robustness** (2-3 weeks)
- Handle edge cases (HOCs, forwardRef, memo, etc.)
- Add TypeScript support
- Write comprehensive tests

**Phase 3: Production** (1-2 weeks)
- Documentation
- Error messages and debugging tools
- Migration guide from hook-based

**Total Effort**: 4-7 weeks of development + ongoing maintenance

**Alternative Effort**: Keep current approach = 0 weeks

---

## Conclusion

### Key Findings

1. **`'use reactive'` directive is technically feasible** but requires significant bundler infrastructure

2. **The current hook-based approach is already excellent** and follows React best practices

3. **The DX improvement is marginal** (saves ~2 lines per usage) compared to implementation cost (500+ lines of bundler code)

4. **React's philosophy is moving toward explicitness** over magic transformations

5. **If verbosity is the concern**, a simple `reactive()` helper function provides 90% of the benefit with 1% of the complexity

### Final Recommendation

**Do NOT implement the `'use reactive'` directive.** The current hook-based approach is:
- Simpler to maintain
- More explicit and debuggable
- Framework-agnostic
- Type-safe
- Aligned with React philosophy

**If usage-site verbosity is a concern**, implement the `reactive()` helper function wrapper instead.

### Decision Matrix

| Criterion | Weight | Hook-Based | Directive | Winner |
|-----------|--------|------------|-----------|---------|
| DX (Developer Experience) | 3x | 8/10 | 9/10 | Directive (+3) |
| Implementation Complexity | 5x | 10/10 | 3/10 | Hook (-35) |
| Maintainability | 4x | 10/10 | 5/10 | Hook (+20) |
| Type Safety | 3x | 10/10 | 7/10 | Hook (+9) |
| Debuggability | 2x | 10/10 | 6/10 | Hook (+8) |
| Framework Portability | 2x | 10/10 | 4/10 | Hook (+12) |
| Learning Curve | 2x | 9/10 | 7/10 | Hook (+4) |

**Weighted Score**:
- Hook-Based: **201 points**
- Directive: **147 points**

**Clear Winner: Hook-Based Approach** (current implementation)

---

## Next Steps

1. **Document current approach thoroughly** - Make sure the hook-based API is well-documented
2. **Add examples** - Show common patterns and best practices
3. **Consider helper function** - Implement `reactive()` wrapper if team wants less verbosity
4. **Monitor feedback** - Gather user feedback on current API before considering changes
5. **Revisit if needed** - If React introduces better directive support in future, reconsider

---

## Sources

### React Server Components and Directives

- [Making Sense of React Server Components • Josh W. Comeau](https://www.joshwcomeau.com/react/server-components/)
- [React - use client directive - TutorialsPoint](https://www.tutorialspoint.com/reactjs/reactjs_use_client_directive.htm)
- [Understanding use client & use server in Next.js (2025 Deep Guide) | Techify Blog](https://techify.blog/blog/understanding-use-client-and-use-server-in-nextjs)
- [React Router's take on React Server Components | Epic React by Kent C. Dodds](https://www.epicreact.dev/react-routers-take-on-react-server-components-4bj7q)
- [Decoding 'use client' - React and Next.js](https://blog.developerareeb.com/CscnHWaJ2QpMyM4JJLaZ)
- [What Does "use client" Do? — overreacted](https://overreacted.io/what-does-use-client-do/)
- [React Server Components: the Good, the Bad, and the Ugly](https://mayank.co/blog/react-server-components/)
- [What is use client and use server directives in reactjs? | by Rajdeep Singh | FrontEnd Web | Medium](https://medium.com/frontendweb/what-is-use-client-and-use-server-directives-in-reactjs-782e72ac7952)
- [React Server Components - Patterns.dev](https://www.patterns.dev/react/react-server-components/)

### Custom Directives and Bundler Plugins

- [Directives – React](https://react.dev/reference/rsc/directives)
- [GitHub - mkhstar/react-directive: A conditional, listing and className directives for react apps](https://github.com/mkhstar/react-directive)
- [react-directive - npm](https://www.npmjs.com/package/react-directive)
- [React Server Components and Client Components with Rollup - DEV Community](https://dev.to/mryechkin/react-server-components-and-client-components-with-rollup-3c05)
- [Mykhaylo Ryechkin | React Server Components and Client Components with Rollup](https://www.misha.wtf/blog/rollup-server-components)

### Project Documentation

- `/home/user/server-driven-components/API_DESIGN_PROPOSAL.md` - Original API design exploration (Design #1: Directive-based)
- `/home/user/server-driven-components/REACTIVE_API.md` - Current useReactive API documentation
- `/home/user/server-driven-components/kawa/src/lib/reactive/` - Current implementation

---

**End of Research Document**
