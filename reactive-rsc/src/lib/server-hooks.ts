/**
 * Server-Side Hooks for Reactive Server Components (v0.3)
 *
 * Synchronous hooks that use React's useId() for automatic component identification.
 *
 * Usage in server components:
 *
 * ```tsx
 * import { ReactiveWrapper } from '../components/reactive-wrapper';
 *
 * export function MyClock() {
 *   const [time, setTime, reactiveId] = useServerSignal('time', Date.now());
 *
 *   useServerEffect(reactiveId, () => {
 *     const interval = setInterval(() => setTime(Date.now()), 1000);
 *     return () => clearInterval(interval);
 *   }, []);
 *
 *   return (
 *     <ReactiveWrapper componentId={reactiveId}>
 *       <div>{new Date(time).toLocaleTimeString()}</div>
 *     </ReactiveWrapper>
 *   );
 * }
 * ```
 */

import { useId } from 'react';
import { stateManager } from './server-state-manager';

// Track which components have initialized effects to prevent duplicates
const initializedEffects = new Set<string>();

/**
 * Create or access server-side state for a component
 *
 * This is a synchronous React hook that automatically generates a unique
 * component ID using React's useId(). State lives on the server and persists
 * across renders. When state changes, subscribed clients are notified via SSE.
 *
 * @param key - State key within this component
 * @param initialValue - Initial value for the state
 * @returns Tuple of [value, setValue, reactiveId]
 */
export function useServerSignal<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, string] {
  // Generate unique component ID using React's useId()
  const reactiveId = useId();

  // Get existing state or use initial value
  let currentValue = stateManager.getState(reactiveId, key);

  if (currentValue === undefined) {
    currentValue = initialValue;
    stateManager.setState(reactiveId, key, initialValue);
  }

  // Create setter function
  const setValue = (newValue: T | ((prev: T) => T)) => {
    const current = stateManager.getState(reactiveId, key) as T;
    const value = typeof newValue === 'function' ? (newValue as (prev: T) => T)(current) : newValue;
    stateManager.setState(reactiveId, key, value);
  };

  return [currentValue as T, setValue, reactiveId];
}

/**
 * Run server-side effects for a component
 *
 * Similar to useEffect, but runs on the server. The effect function runs
 * once when the component is initialized and can return a cleanup function.
 *
 * @param reactiveId - Component ID from useServerSignal
 * @param effect - Effect function that may return a cleanup function
 * @param deps - Dependencies array (for documentation, doesn't trigger re-runs)
 */
export function useServerEffect(
  reactiveId: string,
  effect: () => (() => void) | void,
  deps: any[]
): void {
  // Check if this component already has effects registered
  if (initializedEffects.has(reactiveId)) {
    return;
  }

  console.log(`[useServerEffect] Running effect for ${reactiveId}`);
  initializedEffects.add(reactiveId);

  try {
    const cleanup = effect();

    if (cleanup && typeof cleanup === 'function') {
      stateManager.registerEffect(reactiveId, cleanup);
    }
  } catch (error) {
    console.error(`[useServerEffect] Error in effect for ${reactiveId}:`, error);
  }
}

/**
 * Cleanup a reactive component
 *
 * Removes all state, effects, and subscribers for a component.
 * Should be called when a component is no longer needed.
 *
 * @param reactiveId - Component to cleanup
 */
export function cleanupReactiveComponent(reactiveId: string): void {
  console.log(`[cleanupReactiveComponent] Cleaning up ${reactiveId}`);
  initializedEffects.delete(reactiveId);
  stateManager.cleanupComponent(reactiveId);
}

/**
 * Get current state for a component (for debugging)
 */
export function getComponentState(reactiveId: string): Record<string, any> {
  return stateManager.getAllState(reactiveId);
}

/**
 * Get stats about all reactive components (for debugging)
 */
export function getReactiveStats() {
  return stateManager.getStats();
}
