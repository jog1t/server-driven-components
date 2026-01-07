/**
 * Namespace System for Reactive Signals
 *
 * Provides hierarchical organization of signals with:
 * - Nested namespaces: global.namespace("shop")
 * - Families: Dynamic signal generation for entities
 * - Automatic key prefixing: "global:shop:items"
 */

import type { WritableSignal } from './signal';
import { signal as createSignal } from './signal';
import type { ReactiveBackend } from './rivet/init';

/**
 * Signal family - generates signals dynamically based on parameters
 */
export type SignalFamily<TParam, TValue> = (param: TParam) => WritableSignal<TValue>;

/**
 * Namespace options
 */
export interface NamespaceOptions {
  /**
   * Optional backend for persisting signals in this namespace
   */
  backend?: ReactiveBackend;
}

/**
 * Namespace interface
 */
export interface Namespace {
  /**
   * Create a nested namespace
   */
  namespace(name: string, options?: NamespaceOptions): Namespace;

  /**
   * Create a signal in this namespace
   */
  signal<T>(key: string, initialValue: T): WritableSignal<T>;

  /**
   * Create a signal family (parametric signals)
   */
  family<TParam, TValue>(
    fn: (param: TParam) => { key: string; default: TValue }
  ): SignalFamily<TParam, TValue>;

  /**
   * Get the full namespace path
   */
  readonly path: string;

  /**
   * Get the backend for this namespace (if any)
   */
  readonly backend?: ReactiveBackend;
}

/**
 * Internal namespace implementation
 */
class NamespaceImpl implements Namespace {
  private signalCache = new Map<string, WritableSignal<any>>();
  private _backend?: ReactiveBackend;

  constructor(private _path: string, backend?: ReactiveBackend) {
    this._backend = backend;
  }

  get path(): string {
    return this._path;
  }

  get backend(): ReactiveBackend | undefined {
    return this._backend;
  }

  namespace(name: string, options?: NamespaceOptions): Namespace {
    const childBackend = options?.backend || this._backend;
    return new NamespaceImpl(`${this._path}:${name}`, childBackend);
  }

  signal<T>(key: string, initialValue: T): WritableSignal<T> {
    const fullKey = this._path ? `${this._path}:${key}` : key;

    // Return cached signal if exists
    if (this.signalCache.has(fullKey)) {
      return this.signalCache.get(fullKey)!;
    }

    // Create new signal
    const sig = createSignal(initialValue);

    // Store the key and backend on the signal for backend integration
    (sig as any).__key = fullKey;
    (sig as any).__backend = this._backend;

    this.signalCache.set(fullKey, sig);
    return sig;
  }

  family<TParam, TValue>(
    fn: (param: TParam) => { key: string; default: TValue }
  ): SignalFamily<TParam, TValue> {
    const familyCache = new Map<string, WritableSignal<TValue>>();
    const backend = this._backend;

    return (param: TParam) => {
      const { key, default: defaultValue } = fn(param);
      const fullKey = this._path ? `${this._path}:${key}` : key;

      if (!familyCache.has(fullKey)) {
        const sig = createSignal(defaultValue);
        (sig as any).__key = fullKey;
        (sig as any).__backend = backend;
        familyCache.set(fullKey, sig);
      }

      return familyCache.get(fullKey)!;
    };
  }
}

/**
 * Create a namespace
 *
 * @example
 * ```typescript
 * const app = namespace("app");
 * const shop = app.namespace("shop");
 * const items = shop.signal("items", []);
 * // Key: "app:shop:items"
 * ```
 *
 * @example With backend
 * ```typescript
 * const userBackend = initReactiveBackend({
 *   registry,
 *   actorId: 'users',
 *   global: false
 * });
 * const users = namespace("users", { backend: userBackend });
 * ```
 */
export function namespace(name: string, options?: NamespaceOptions): Namespace {
  return new NamespaceImpl(name, options?.backend);
}

/**
 * Root namespace for global signals
 */
export const root = new NamespaceImpl('');

/**
 * Create a signal without namespace (shorthand)
 */
export function signal<T>(key: string, initialValue: T): WritableSignal<T> {
  return root.signal(key, initialValue);
}
