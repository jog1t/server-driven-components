/**
 * Reactive Server Components Library
 *
 * Simple, type-safe reactivity for React Server Components.
 * Powered by @preact/signals-core for robust auto-tracking reactivity.
 */

export { signal, computed, isSignal } from './signal';
export type { Signal, WritableSignal, Cleanup, Listener } from './signal';

export { namespace, root, signal as keyedSignal } from './namespace';
export type { Namespace, SignalFamily, NamespaceOptions } from './namespace';

export { observe, createStream } from './use-reactive';

export { reactiveRuntime } from './runtime';
export type { StreamCallback, StreamFunction, Subscriber } from './runtime';

// Re-export useful @preact/signals-core utilities
export { effect, batch, untracked } from '@preact/signals-core';
