/**
 * Reactive server component utilities
 *
 * - createStream: Create component-local reactive streams
 * - observe: Subscribe to shared server-side signals
 */

import { useId } from 'react';
import { reactiveRuntime, type StreamFunction } from './runtime';
import type { Signal } from './signal';

// Track which components have registered to prevent duplicates during render
const registeredComponents = new Map<string, string>();

/**
 * observe - Subscribe to a shared server-side signal
 *
 * Use this when you want to subscribe to external/shared state that's
 * managed outside of your component (e.g., global signals).
 *
 * @example
 * import { serverTime } from './signals/server-time';
 *
 * function Clock() {
 *   const time = observe(serverTime);
 *   return <div>{new Date(time).toLocaleTimeString()}</div>;
 * }
 */
export function observe<T>(signal: Signal<T>): T {
  // For signals, we just return current value
  // Client-side subscription will be handled by the client component wrapper
  return signal.value;
}

/**
 * createStream - Create a reactive stream for side effects
 *
 * Use this when you want to set up reactive side effects that modify signals.
 * This function doesn't return a value - use observe() to read signal values.
 *
 * @example
 * function Timer() {
 *   const time = signal(Date.now());
 *
 *   createStream(
 *     () => {
 *       const id = setInterval(() => time.value = Date.now(), 1000);
 *       return () => clearInterval(id);
 *     },
 *     []
 *   );
 *
 *   return <div>{new Date(observe(time)).toLocaleTimeString()}</div>;
 * }
 */
export function createStream(
  streamFn: StreamFunction<any>,
  deps: any[]
): void {
  // Generate unique component ID
  const componentId = useId();

  // Register stream if not already registered
  const registrationKey = `${componentId}:${JSON.stringify(deps)}`;

  if (!registeredComponents.has(registrationKey)) {
    const streamKey = reactiveRuntime.registerStream(componentId, deps, undefined, streamFn);
    registeredComponents.set(registrationKey, streamKey);
  }
}

/**
 * Get metadata about a reactive component (for internal use)
 */
export function getReactiveMetadata(componentId: string, deps: any[]) {
  const registrationKey = `${componentId}:${JSON.stringify(deps)}`;
  return {
    streamKey: registeredComponents.get(registrationKey),
    isReactive: registeredComponents.has(registrationKey),
  };
}
