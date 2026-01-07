/**
 * Signal - Reactive primitive for server-side state
 *
 * Signals are observable values that can be subscribed to.
 * When a signal's value changes, all subscribers are notified.
 */

export type Listener<T> = (value: T) => void;
export type Cleanup = () => void;

export interface Signal<T> {
  readonly value: T;
  subscribe(listener: Listener<T>): Cleanup;
  readonly __isSignal: true;
}

export interface WritableSignal<T> extends Signal<T> {
  set(value: T | ((prev: T) => T)): void;
  update(fn: (prev: T) => T): void;
}

/**
 * Create a writable signal
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
  let value = initialValue;
  const listeners = new Set<Listener<T>>();

  const sig: WritableSignal<T> = {
    get value() {
      return value;
    },

    set(newValue: T | ((prev: T) => T)) {
      const nextValue = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue;

      if (nextValue !== value) {
        value = nextValue;
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
 * Create a computed signal that derives its value from other signals
 */
export function computed<T>(compute: () => T): Signal<T> {
  // For now, just create a static signal
  // Full reactive graph would require dependency tracking
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
 * Type guard to check if value is a signal
 */
export function isSignal<T = any>(value: any): value is Signal<T> {
  return value && typeof value === 'object' && value.__isSignal === true;
}
