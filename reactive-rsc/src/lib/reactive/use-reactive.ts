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
 * useReactive - Create reactive state that auto-streams updates
 *
 * @example
 * // Inline reactive state
 * const time = useReactive(Date.now(), (stream) => {
 *   const id = setInterval(() => stream.next(Date.now()), 1000)
 *   return () => clearInterval(id)
 * }, [])
 *
 * @example
 * // Subscribe to signal
 * const time = useReactive(timeSignal)
 */
export function useReactive<T>(signal: Signal<T>): T;
export function useReactive<T>(
  initialValue: T,
  streamFn: StreamFunction<T>,
  deps: any[]
): T;
export function useReactive<T>(
  initialValueOrSignal: T | Signal<T>,
  streamFn?: StreamFunction<T>,
  deps?: any[]
): T {
  // Generate unique component ID
  const componentId = useId();

  // Mode 1: Subscribe to existing signal
  if (isSignal(initialValueOrSignal)) {
    // For signals, we just return current value
    // Client-side subscription will be handled by the client component wrapper
    return initialValueOrSignal.value;
  }

  // Mode 2: Inline reactive state with stream function
  if (!streamFn || !deps) {
    throw new Error('useReactive requires streamFn and deps when not using a signal');
  }

  const initialValue = initialValueOrSignal as T;

  // Register stream if not already registered
  const registrationKey = `${componentId}:${JSON.stringify(deps)}`;

  if (!registeredComponents.has(registrationKey)) {
    const streamKey = reactiveRuntime.registerStream(componentId, deps, initialValue, streamFn);
    registeredComponents.set(registrationKey, streamKey);
    console.log(`[useReactive] Registered component ${componentId} with stream ${streamKey}`);
  }

  // Get current value from runtime
  const streamKey = registeredComponents.get(registrationKey)!;
  const currentValue = reactiveRuntime.getCurrentValue<T>(streamKey);

  return currentValue ?? initialValue;
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
