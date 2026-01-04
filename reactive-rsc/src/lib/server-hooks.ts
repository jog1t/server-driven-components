/**
 * Server-Side "Hooks" for Reactive Server Components
 *
 * These are not real React hooks (server components don't support hooks),
 * but async functions that provide a hook-like API for managing server-side
 * state and effects.
 *
 * NEW in v0.2.1: Automatic component ID generation!
 * You no longer need to pass componentId - it's auto-generated.
 *
 * Usage in server components:
 *
 * ```tsx
 * export async function MyComponent() {
 *   const [count, setCount] = await useServerSignal('count', 0);
 *
 *   await useServerEffect(async () => {
 *     const interval = setInterval(() => {
 *       setCount(count + 1);
 *     }, 1000);
 *
 *     return () => clearInterval(interval);
 *   }, []);
 *
 *   return <div>Count: {count}</div>;
 * }
 * ```
 */

import { stateManager } from './server-state-manager';
import { generateComponentId } from './component-id';

// Store component IDs per component instance
const componentIdCache = new Map<string, string>();
let callCounter = 0;

/**
 * Get or create a component ID for the current component
 *
 * Uses call stack to automatically generate a unique ID based on
 * component location. Caches the ID for subsequent calls.
 */
function getComponentId(): string {
  const callId = `call-${callCounter++}`;

  // Check if we already have an ID for this call location
  const stack = new Error().stack || '';
  const callerLine = stack.split('\n')[3] || '';

  if (componentIdCache.has(callerLine)) {
    return componentIdCache.get(callerLine)!;
  }

  // Generate new ID
  const id = generateComponentId();
  componentIdCache.set(callerLine, id);

  return id;
}

/**
 * Create or access server-side state for a component
 *
 * Similar to useState, but the state lives on the server and persists
 * across renders. When state changes, subscribed clients are notified via SSE.
 *
 * NEW: componentId is now optional and auto-generated!
 *
 * @param keyOrComponentId - State key, or componentId if using manual IDs
 * @param initialValueOrKey - Initial value, or key if componentId provided
 * @param optionalInitialValue - Initial value if using manual componentId
 * @returns Tuple of [value, setValue]
 */
export async function useServerSignal<T>(
  keyOrComponentId: string,
  initialValueOrKey: T | string,
  optionalInitialValue?: T
): Promise<[T, (value: T | ((prev: T) => T)) => void]> {
  // Determine if old API (3 params) or new API (2 params)
  let componentId: string;
  let key: string;
  let initialValue: T;

  if (optionalInitialValue !== undefined) {
    // Old API: useServerSignal(componentId, key, initialValue)
    componentId = keyOrComponentId;
    key = initialValueOrKey as string;
    initialValue = optionalInitialValue;
  } else {
    // New API: useServerSignal(key, initialValue)
    componentId = getComponentId();
    key = keyOrComponentId;
    initialValue = initialValueOrKey as T;
  }
  // Get existing state or use initial value
  let currentValue = stateManager.getState(componentId, key);

  if (currentValue === undefined) {
    currentValue = initialValue;
    stateManager.setState(componentId, key, initialValue);
  }

  // Create setter function
  const setValue = (newValue: T | ((prev: T) => T)) => {
    const current = stateManager.getState(componentId, key) as T;

    const value = typeof newValue === 'function' ? (newValue as (prev: T) => T)(current) : newValue;

    stateManager.setState(componentId, key, value);
  };

  return [currentValue as T, setValue];
}

/**
 * Run server-side effects for a component
 *
 * Similar to useEffect, but runs on the server. The effect function runs
 * once when the component is initialized and can return a cleanup function.
 *
 * Note: Unlike React's useEffect, this doesn't re-run on dependency changes.
 * Dependencies are mainly for documentation purposes.
 *
 * NEW: componentId is now optional and auto-generated!
 *
 * @param componentIdOrEffect - ComponentId (old API) or effect function (new API)
 * @param effectOrDeps - Effect function (old API) or deps array (new API)
 * @param optionalDeps - Dependencies array (old API only)
 */
export async function useServerEffect(
  componentIdOrEffect: string | (() => Promise<(() => void) | void> | (() => void) | void),
  effectOrDeps?: (() => Promise<(() => void) | void> | (() => void) | void) | any[],
  optionalDeps?: any[]
): Promise<void> {
  // Determine if old API (3 params) or new API (2 params)
  let componentId: string;
  let effect: () => Promise<(() => void) | void> | (() => void) | void;
  let deps: any[];

  if (typeof componentIdOrEffect === 'string') {
    // Old API: useServerEffect(componentId, effect, deps)
    componentId = componentIdOrEffect;
    effect = effectOrDeps as () => Promise<(() => void) | void> | (() => void) | void;
    deps = optionalDeps || [];
  } else {
    // New API: useServerEffect(effect, deps)
    componentId = getComponentId();
    effect = componentIdOrEffect;
    deps = (effectOrDeps as any[]) || [];
  }
  // Check if this component already has effects registered
  // to avoid running effects multiple times
  const stats = stateManager.getStats();
  const hasEffects = stats.subscribers.some((s) => s.componentId === componentId);

  if (hasEffects) {
    console.log(`[useServerEffect] ${componentId} already initialized, skipping effect`);
    return;
  }

  console.log(`[useServerEffect] Running effect for ${componentId}`);

  try {
    const cleanup = await effect();

    if (cleanup && typeof cleanup === 'function') {
      stateManager.registerEffect(componentId, cleanup);
    }
  } catch (error) {
    console.error(`[useServerEffect] Error in effect for ${componentId}:`, error);
  }
}

/**
 * Initialize a reactive component
 *
 * This should be called once to set up the component's reactive behavior.
 * Typically called from an API route or server initialization.
 *
 * @param componentId - Unique identifier for the component
 * @param setup - Async setup function that configures state and effects
 */
export async function initReactiveComponent(
  componentId: string,
  setup: () => Promise<void> | void
): Promise<void> {
  console.log(`[initReactiveComponent] Initializing ${componentId}`);

  try {
    await setup();
  } catch (error) {
    console.error(`[initReactiveComponent] Error initializing ${componentId}:`, error);
    throw error;
  }
}

/**
 * Cleanup a reactive component
 *
 * Removes all state, effects, and subscribers for a component.
 * Should be called when a component is no longer needed.
 *
 * @param componentId - Component to cleanup
 */
export function cleanupReactiveComponent(componentId: string): void {
  console.log(`[cleanupReactiveComponent] Cleaning up ${componentId}`);
  stateManager.cleanupComponent(componentId);
}

/**
 * Get current state for a component (for debugging)
 */
export function getComponentState(componentId: string): Record<string, any> {
  return stateManager.getAllState(componentId);
}

/**
 * Get stats about all reactive components (for debugging)
 */
export function getReactiveStats() {
  return stateManager.getStats();
}
