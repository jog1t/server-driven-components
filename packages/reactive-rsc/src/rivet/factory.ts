import type { Registry } from 'rivetkit';
import { RivetBackend } from './backend';
import type { Signal, WritableSignal, Listener, Cleanup } from '../signal';
import type { StreamFunction } from '../runtime';

/**
 * Create a RivetKit-backed reactive system
 *
 * This factory creates signal(), useReactive(), etc. that are backed
 * by RivetKit actors instead of in-memory storage.
 *
 * @example
 * ```typescript
 * import { createReactiveBackend } from 'reactive-rsc/rivet';
 * import { registry } from './registry';
 *
 * export const { signal, useReactive } = createReactiveBackend({ registry });
 * ```
 */
export function createReactiveBackend(options: {
  registry: Registry<any>;
  actorName?: string;
}) {
  const backend = new RivetBackend(options.registry, options.actorName || 'reactiveState');

  /**
   * Create a RivetKit-backed signal
   */
  function signal<T>(initialValue: T): WritableSignal<T> {
    // Generate unique key for this signal
    const signalKey = `signal_${Math.random().toString(36).substr(2, 9)}`;
    let value = initialValue;
    const listeners = new Set<Listener<T>>();

    // Initialize in backend
    backend.setSignal(signalKey, initialValue);

    const sig: WritableSignal<T> = {
      get value() {
        return value;
      },

      set(newValue: T | ((prev: T) => T)) {
        const nextValue =
          typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

        if (nextValue !== value) {
          value = nextValue;
          // Persist to backend
          backend.setSignal(signalKey, value);
          // Notify local listeners
          listeners.forEach((listener) => listener(value));
        }
      },

      update(fn: (prev: T) => T) {
        sig.set(fn);
      },

      subscribe(listener: Listener<T>) {
        listeners.add(listener);
        // Send current value immediately
        listener(value);

        return () => {
          listeners.delete(listener);
        };
      },

      __isSignal: true as const,
    };

    return sig;
  }

  /**
   * Create a computed signal
   */
  function computed<T>(compute: () => T): Signal<T> {
    const sig = signal(compute());

    return {
      get value() {
        return sig.value;
      },
      subscribe: sig.subscribe.bind(sig),
      __isSignal: true as const,
    };
  }

  /**
   * useReactive hook - RivetKit-backed version
   *
   * Creates reactive state that's persisted in RivetKit actors.
   */
  function useReactive<T>(
    initialValueOrSignal: T | Signal<T>,
    streamFn?: StreamFunction<T>,
    deps: any[] = []
  ): T {
    // If it's a signal, subscribe to it
    if (
      initialValueOrSignal &&
      typeof initialValueOrSignal === 'object' &&
      '__isSignal' in initialValueOrSignal
    ) {
      const signal = initialValueOrSignal as Signal<T>;
      return signal.value;
    }

    // Otherwise, register stream with backend
    const initialValue = initialValueOrSignal as T;
    const componentId = 'component'; // TODO: Get from React context
    const scopeKey = `${componentId}:${JSON.stringify(deps)}`;

    if (streamFn) {
      // Register stream with backend (async, but we return sync)
      backend.registerStream(scopeKey, initialValue, streamFn);
    }

    // Return current value (sync)
    // In a real implementation, we'd get this from backend
    return initialValue;
  }

  /**
   * useServerState hook - Subscribe to shared signals
   */
  function useServerState<T>(signal: Signal<T>): T {
    return signal.value;
  }

  /**
   * useReactiveStream hook - Create component-local streams
   */
  function useReactiveStream<T>(
    initialValue: T,
    streamFn: StreamFunction<T>,
    deps: any[] = []
  ): T {
    return useReactive(initialValue, streamFn, deps);
  }

  return {
    signal,
    computed,
    useReactive,
    useServerState,
    useReactiveStream,
    backend,
  };
}
