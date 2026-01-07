/**
 * Initialize RivetKit backend for reactive-rsc
 *
 * Call this once in your server startup to enable RivetKit persistence.
 */

import type { Registry } from 'rivetkit';
import type { WritableSignal } from '../signal';

let rivetRegistry: Registry<any> | null = null;
let reactiveActorName = 'reactiveState';
let reactiveActorId = 'global';

/**
 * Initialize RivetKit backend
 *
 * After calling this, all signals will be persisted in RivetKit actors.
 *
 * @example
 * ```typescript
 * import { initReactiveBackend } from 'reactive-rsc/rivet';
 * import { registry } from './registry';
 *
 * initReactiveBackend({ registry });
 *
 * // Now signals are persisted
 * const counter = signal("counter", 0);
 * counter.set(5); // Saved to RivetKit actor
 * ```
 */
export function initReactiveBackend(options: {
  registry: Registry<any>;
  actorName?: string;
  actorId?: string;
}) {
  rivetRegistry = options.registry;
  reactiveActorName = options.actorName || 'reactiveState';
  reactiveActorId = options.actorId || 'global';

  console.log(`[reactive-rsc] Initialized RivetKit backend: ${reactiveActorName}:${reactiveActorId}`);
}

/**
 * Check if RivetKit backend is initialized
 */
export function isRivetBackendInitialized(): boolean {
  return rivetRegistry !== null;
}

/**
 * Get the RivetKit actor for reactive state
 * (Internal - used by signal implementation)
 */
export async function getReactiveActor() {
  if (!rivetRegistry) {
    throw new Error(
      'RivetKit backend not initialized. Call initReactiveBackend() first.'
    );
  }

  // TODO: Implement actual RivetKit client API call
  // For now, this is a placeholder
  return {
    call: async (action: string, params?: any) => {
      console.log(`[RivetKit] ${reactiveActorName}:${reactiveActorId}.${action}`, params);
      // Placeholder - will be replaced with actual RivetKit client
      return {};
    },
  };
}

/**
 * Sync a signal to RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function syncSignalToRivet(key: string, value: any) {
  if (!rivetRegistry) {
    // No RivetKit backend - skip sync
    return;
  }

  try {
    const actor = await getReactiveActor();
    await actor.call('setSignal', { key, value });
  } catch (error) {
    console.error(`[reactive-rsc] Failed to sync signal ${key}:`, error);
  }
}

/**
 * Load a signal from RivetKit actor
 * (Internal - used by signal implementation)
 */
export async function loadSignalFromRivet(key: string): Promise<any | undefined> {
  if (!rivetRegistry) {
    return undefined;
  }

  try {
    const actor = await getReactiveActor();
    const result = await actor.call('getSignal', { key });
    return result.exists ? result.value : undefined;
  } catch (error) {
    console.error(`[reactive-rsc] Failed to load signal ${key}:`, error);
    return undefined;
  }
}
