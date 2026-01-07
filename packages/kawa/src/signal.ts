/**
 * Signal - Reactive primitive for server-side state
 *
 * Powered by @preact/signals-core for robust reactivity with auto-tracking.
 */

import {
  signal as preactSignal,
  computed as preactComputedFn,
  effect,
  type Signal as PreactSignal,
} from '@preact/signals-core';

export type Listener<T> = (value: T) => void;
export type Cleanup = () => void;

/**
 * Our Signal interface wraps Preact's Signal to maintain API compatibility
 * while adding our custom subscribe method
 */
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
 * Internal wrapper to add subscribe method to Preact signals
 */
function wrapSignal<T>(preactSig: PreactSignal<T>): Signal<T> {
  return {
    get value() {
      return preactSig.value;
    },
    subscribe(listener: Listener<T>) {
      // Use Preact's effect to subscribe to signal changes
      const dispose = effect(() => {
        listener(preactSig.value);
      });
      return dispose;
    },
    __isSignal: true as const,
  };
}

/**
 * Create a writable signal with auto-tracking capabilities
 *
 * Now powered by @preact/signals-core with full reactive graph support
 */
export function signal<T>(initialValue: T): WritableSignal<T> {
  const preactSig = preactSignal(initialValue);

  const wrapped = wrapSignal(preactSig);

  return {
    ...wrapped,
    set(value: T | ((prev: T) => T)) {
      if (typeof value === 'function') {
        preactSig.value = (value as (prev: T) => T)(preactSig.value);
      } else {
        preactSig.value = value;
      }
    },
    update(fn: (prev: T) => T) {
      preactSig.value = fn(preactSig.value);
    },
  };
}

/**
 * Create a computed signal that derives its value from other signals
 *
 * Now with FULL AUTO-TRACKING! Dependencies are automatically tracked
 * and the computed value updates when any dependency changes.
 */
export function computed<T>(compute: () => T): Signal<T> {
  const preactComp = preactComputedFn(compute);
  return wrapSignal(preactComp);
}

/**
 * Type guard to check if value is a signal
 */
export function isSignal<T = any>(value: any): value is Signal<T> {
  return value && typeof value === 'object' && value.__isSignal === true;
}
