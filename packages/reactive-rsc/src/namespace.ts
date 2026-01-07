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

/**
 * Signal family - generates signals dynamically based on parameters
 */
export type SignalFamily<TParam, TValue> = (param: TParam) => WritableSignal<TValue>;

/**
 * Namespace interface
 */
export interface Namespace {
  /**
   * Create a nested namespace
   */
  namespace(name: string): Namespace;

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
}

/**
 * Internal namespace implementation
 */
class NamespaceImpl implements Namespace {
  private signalCache = new Map<string, WritableSignal<any>>();

  constructor(private _path: string) {}

  get path(): string {
    return this._path;
  }

  namespace(name: string): Namespace {
    return new NamespaceImpl(`${this._path}:${name}`);
  }

  signal<T>(key: string, initialValue: T): WritableSignal<T> {
    const fullKey = this._path ? `${this._path}:${key}` : key;

    // Return cached signal if exists
    if (this.signalCache.has(fullKey)) {
      return this.signalCache.get(fullKey)!;
    }

    // Create new signal
    const sig = createSignal(initialValue);

    // Store the key on the signal for backend integration
    (sig as any).__key = fullKey;

    this.signalCache.set(fullKey, sig);
    return sig;
  }

  family<TParam, TValue>(
    fn: (param: TParam) => { key: string; default: TValue }
  ): SignalFamily<TParam, TValue> {
    const familyCache = new Map<string, WritableSignal<TValue>>();

    return (param: TParam) => {
      const { key, default: defaultValue } = fn(param);
      const fullKey = this._path ? `${this._path}:${key}` : key;

      if (!familyCache.has(fullKey)) {
        const sig = createSignal(defaultValue);
        (sig as any).__key = fullKey;
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
 */
export function namespace(name: string): Namespace {
  return new NamespaceImpl(name);
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
