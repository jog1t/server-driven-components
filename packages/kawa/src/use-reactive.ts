/**
 * useReactive - Hook for reactive server components
 *
 * Supports two modes:
 * 1. Inline reactive state with stream function
 * 2. Subscribe to existing signal
 */

import { useId } from 'react';
import { reactiveRuntime, type StreamFunction } from './runtime';
import { isSignal, type Signal } from './signal';

// Track which components have registered to prevent duplicates during render
const registeredComponents = new Map<string, string>();

/**
 * useServerState - Subscribe to a shared server-side signal
 *
 * Use this when you want to subscribe to external/shared state that's
 * managed outside of your component (e.g., global signals).
 *
 * @example
 * import { serverTime } from './signals/server-time';
 *
 * function Clock() {
 *   const time = useServerState(serverTime);
 *   return <div>{new Date(time).toLocaleTimeString()}</div>;
 * }
 *
 * @example
 * // With auth context
 * function UserProfile() {
 *   const profile = useServerState(userProfileSignal, {
 *     context: { userId: '123', role: 'admin' }
 *   });
 *   return <div>{profile.name}</div>;
 * }
 */
export function useServerState<T>(
  signal: Signal<T>,
  options?: { context?: any }
): T {
  // For signals, we just return current value
  // Client-side subscription will be handled by the client component wrapper
  // Context is stored for use during SSE streaming
  if (options?.context) {
    reactiveRuntime.setComponentContext(signal, options.context);
  }

  return signal.value;
}

/**
 * useReactiveStream - Create a reactive stream with inline state management
 *
 * Use this when you want to create component-local reactive state that
 * updates over time (e.g., timers, intervals, async data streams).
 *
 * @example
 * function Timer() {
 *   const time = useReactiveStream(
 *     Date.now(),
 *     (stream) => {
 *       const id = setInterval(() => stream.next(Date.now()), 1000);
 *       return () => clearInterval(id);
 *     },
 *     []
 *   );
 *   return <div>{new Date(time).toLocaleTimeString()}</div>;
 * }
 *
 * @example
 * // With auth context
 * function UserNotifications() {
 *   const notifications = useReactiveStream(
 *     [],
 *     (stream) => {
 *       // Stream will have access to user context
 *       fetchUserNotifications(stream);
 *     },
 *     [],
 *     { context: { userId: '123' } }
 *   );
 *   return <div>{notifications.length} notifications</div>;
 * }
 */
export function useReactiveStream<T>(
  initialValue: T,
  streamFn: StreamFunction<T>,
  deps: any[],
  options?: { context?: any }
): T {
  // Generate unique component ID
  const componentId = useId();

  // Register stream if not already registered
  const registrationKey = `${componentId}:${JSON.stringify(deps)}`;

  if (!registeredComponents.has(registrationKey)) {
    const streamKey = reactiveRuntime.registerStream(
      componentId,
      deps,
      initialValue,
      streamFn,
      options?.context
    );
    registeredComponents.set(registrationKey, streamKey);
  }

  // Get current value from runtime
  const streamKey = registeredComponents.get(registrationKey)!;
  const currentValue = reactiveRuntime.getCurrentValue<T>(streamKey);

  return currentValue ?? initialValue;
}

/**
 * useReactive - Create reactive state that auto-streams updates
 *
 * @deprecated Use useServerState() for signals or useReactiveStream() for inline streams.
 * This function is kept for backward compatibility.
 *
 * @example
 * // Inline reactive state - prefer useReactiveStream()
 * const time = useReactive(Date.now(), (stream) => {
 *   const id = setInterval(() => stream.next(Date.now()), 1000)
 *   return () => clearInterval(id)
 * }, [])
 *
 * @example
 * // Subscribe to signal - prefer useServerState()
 * const time = useReactive(timeSignal)
 */
export function useReactive<T>(signal: Signal<T>, options?: { context?: any }): T;
export function useReactive<T>(
  initialValue: T,
  streamFn: StreamFunction<T>,
  deps: any[],
  options?: { context?: any }
): T;
export function useReactive<T>(
  initialValueOrSignal: T | Signal<T>,
  streamFnOrOptions?: StreamFunction<T> | { context?: any },
  deps?: any[],
  options?: { context?: any }
): T {
  // Mode 1: Subscribe to existing signal
  if (isSignal(initialValueOrSignal)) {
    const opts = streamFnOrOptions as { context?: any } | undefined;
    return useServerState(initialValueOrSignal, opts);
  }

  // Mode 2: Inline reactive state with stream function
  const streamFn = streamFnOrOptions as StreamFunction<T>;
  if (!streamFn || !deps) {
    throw new Error('useReactive requires streamFn and deps when not using a signal');
  }

  return useReactiveStream(initialValueOrSignal as T, streamFn, deps, options);
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
