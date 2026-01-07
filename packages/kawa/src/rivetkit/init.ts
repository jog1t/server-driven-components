/**
 * Initialize RivetKit backend for reactive-rsc
 *
 * Call this once in your server startup to enable RivetKit persistence.
 */

import type { Registry } from 'rivetkit';
import type { WritableSignal } from '../signal';

/**
 * Backend instance for persisting signals to RivetKit
 */
export interface ReactiveBackend {
  registry: Registry<any>;
  actorName: string;
  actorId: string;
  /**
   * Optional function to get user context for actor calls
   * This allows you to pass auth/user data from components to actors
   */
  getContext?: () => any | Promise<any>;
}

let globalBackend: ReactiveBackend | null = null;

/**
 * Initialize RivetKit backend
 *
 * Can be called with or without setting as global default.
 *
 * @example
 * ```typescript
 * import { initReactiveBackend } from 'kawa/rivetkit';
 * import { registry } from './registry';
 *
 * // Set as global default
 * initReactiveBackend({ registry });
 *
 * // Or create isolated backend for specific namespace
 * const userBackend = initReactiveBackend({
 *   registry,
 *   actorId: 'users',
 *   global: false
 * });
 * const users = namespace("users", { backend: userBackend });
 * ```
 */
export function initReactiveBackend(options: {
  registry: Registry<any>;
  actorName?: string;
  actorId?: string;
  global?: boolean;
  /**
   * Optional function to get user context for actor calls
   * This allows you to pass auth/user data from components to actors
   *
   * @example
   * initReactiveBackend({
   *   registry,
   *   getContext: () => ({ userId: '123', role: 'admin' })
   * })
   */
  getContext?: () => any | Promise<any>;
}): ReactiveBackend {
  const backend: ReactiveBackend = {
    registry: options.registry,
    actorName: options.actorName || 'reactiveState',
    actorId: options.actorId || 'global',
    getContext: options.getContext,
  };

  // Set as global backend by default
  if (options.global !== false) {
    globalBackend = backend;
    console.log(`[reactive-rsc] Initialized global RivetKit backend: ${backend.actorName}:${backend.actorId}`);
  }

  return backend;
}

/**
 * Check if RivetKit backend is initialized
 */
export function isRivetBackendInitialized(): boolean {
  return globalBackend !== null;
}

/**
 * Get the global backend (internal)
 */
export function getGlobalBackend(): ReactiveBackend | null {
  return globalBackend;
}

/**
 * Get the RivetKit actor for a backend
 * (Internal - used by signal implementation)
 */
export async function getReactiveActor(backend: ReactiveBackend) {
  // Get the actor from the registry using RivetKit's client API
  // The registry is typed as `any` to support different RivetKit versions
  const registry = backend.registry as any;

  // RivetKit registries should provide an actor() method
  if (typeof registry.actor === 'function') {
    return registry.actor(backend.actorName, backend.actorId);
  }

  throw new Error(
    `Registry does not support actor access. Make sure you're using a compatible RivetKit version.`
  );
}

/**
 * Sync a signal to RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function syncSignalToRivet(
  key: string,
  value: any,
  backend?: ReactiveBackend,
  context?: any
) {
  const targetBackend = backend || globalBackend;

  if (!targetBackend) {
    // No RivetKit backend - skip sync
    return;
  }

  try {
    const actor = await getReactiveActor(targetBackend);

    // Get context from backend or use provided context
    const userContext = context || (await targetBackend.getContext?.());

    // Call actor with context if available
    if (userContext) {
      await actor.call('setSignal', { key, value }, { user: userContext });
    } else {
      await actor.call('setSignal', { key, value });
    }
  } catch (error) {
    console.error(`[reactive-rsc] Failed to sync signal ${key}:`, error);
  }
}

/**
 * Load a signal from RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function loadSignalFromRivet(
  key: string,
  backend?: ReactiveBackend,
  context?: any
): Promise<any | undefined> {
  const targetBackend = backend || globalBackend;

  if (!targetBackend) {
    return undefined;
  }

  try {
    const actor = await getReactiveActor(targetBackend);

    // Get context from backend or use provided context
    const userContext = context || (await targetBackend.getContext?.());

    // Call actor with context if available
    const result = userContext
      ? await actor.call('getSignal', { key }, { user: userContext })
      : await actor.call('getSignal', { key });

    return result.exists ? result.value : undefined;
  } catch (error) {
    console.error(`[reactive-rsc] Failed to load signal ${key}:`, error);
    return undefined;
  }
}
