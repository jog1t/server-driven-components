/**
 * RivetKit backend for kawa
 *
 * Provides persistent, multi-server reactive state using RivetKit actors.
 *
 * @example
 * ```typescript
 * import { initReactiveBackend, reactiveRegistry } from 'kawa/rivetkit';
 *
 * // Initialize once at server startup
 * initReactiveBackend({ registry: reactiveRegistry });
 * reactiveRegistry.start({ defaultServerPort: 3001 });
 *
 * // Then use signals normally - they're automatically persisted!
 * import { namespace } from 'kawa';
 *
 * const users = namespace("users");
 * const userPos = users.signal("alice:position", { x: 0, y: 0 });
 * ```
 */

export { reactiveStateActor } from './actors/reactiveState';
export { reactiveRegistry } from './registry';
export { initReactiveBackend, isRivetBackendInitialized } from './init';
export type { ReactiveBackend } from './init';
export type { Registry } from 'rivetkit';

// Note: The factory pattern (createReactiveBackend) has been replaced
// with a simpler init function. Just call initReactiveBackend() once,
// then use signals normally throughout your app.
