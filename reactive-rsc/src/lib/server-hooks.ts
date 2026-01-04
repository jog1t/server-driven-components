/**
 * Server-Side "Hooks" for Reactive Server Components
 *
 * These are not real React hooks (server components don't support hooks),
 * but async functions that provide a hook-like API for managing server-side
 * state and effects.
 *
 * Usage in server components:
 *
 * ```tsx
 * export async function MyComponent({ reactiveId }: { reactiveId: string }) {
 *   const [count, setCount] = await useServerSignal(reactiveId, 'count', 0);
 *
 *   await useServerEffect(reactiveId, async () => {
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

/**
 * Create or access server-side state for a component
 *
 * Similar to useState, but the state lives on the server and persists
 * across renders. When state changes, subscribed clients are notified via SSE.
 *
 * @param componentId - Unique identifier for the component instance
 * @param key - State key (for multiple states in one component)
 * @param initialValue - Initial value if state doesn't exist
 * @returns Tuple of [value, setValue]
 */
export async function useServerSignal<T>(
  componentId: string,
  key: string,
  initialValue: T
): Promise<[T, (value: T | ((prev: T) => T)) => void]> {
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
 * @param componentId - Unique identifier for the component instance
 * @param effect - Async function that returns optional cleanup
 * @param deps - Dependencies (for documentation, not enforced)
 */
export async function useServerEffect(
  componentId: string,
  effect: () => Promise<(() => void) | void> | (() => void) | void,
  deps: any[] = []
): Promise<void> {
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
