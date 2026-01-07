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
}

let globalBackend: ReactiveBackend | null = null;

/**
 * Initialize RivetKit backend
 *
 * Can be called with or without setting as global default.
 *
 * @example
 * ```typescript
 * import { initReactiveBackend } from 'reactive-rsc/rivet';
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
}): ReactiveBackend {
  const backend: ReactiveBackend = {
    registry: options.registry,
    actorName: options.actorName || 'reactiveState',
    actorId: options.actorId || 'global',
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
  // TODO: Implement actual RivetKit client API call
  // For now, this is a placeholder
  return {
    call: async (action: string, params?: any) => {
      console.log(`[RivetKit] ${backend.actorName}:${backend.actorId}.${action}`, params);
      // Placeholder - will be replaced with actual RivetKit client
      return {};
    },
  };
}

/**
 * Sync a signal to RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function syncSignalToRivet(key: string, value: any, backend?: ReactiveBackend) {
  const targetBackend = backend || globalBackend;

  if (!targetBackend) {
    // No RivetKit backend - skip sync
    return;
  }

  try {
    const actor = await getReactiveActor(targetBackend);
    await actor.call('setSignal', { key, value });
  } catch (error) {
    console.error(`[reactive-rsc] Failed to sync signal ${key}:`, error);
  }
}

/**
 * Load a signal from RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function loadSignalFromRivet(key: string, backend?: ReactiveBackend): Promise<any | undefined> {
  const targetBackend = backend || globalBackend;

  if (!targetBackend) {
    return undefined;
  }

  try {
    const actor = await getReactiveActor(targetBackend);
    const result = await actor.call('getSignal', { key });
    return result.exists ? result.value : undefined;
  } catch (error) {
    console.error(`[reactive-rsc] Failed to load signal ${key}:`, error);
    return undefined;
  }
}
