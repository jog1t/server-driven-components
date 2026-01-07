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

// Core actors
export { reactiveStateActor } from './actors/reactiveState';
export { secureReactiveStateActor } from './actors/secureReactiveState';

// Registry
export { reactiveRegistry } from './registry';

// Backend initialization
export { initReactiveBackend, isRivetBackendInitialized } from './init';
export type { ReactiveBackend } from './init';

// Authentication & Authorization
export {
  // Error class
  AuthError,

  // Guard utilities
  createGuard,
  composeGuards,
  withGuards,

  // Built-in guards
  requireAuth,
  requireUserId,
  requireRole,
  requirePermission,
  requireOwnership,
  rateLimit,

  // Helpers
  parseAuthHeader,
  createAuditLog,

  // Types
  type UserContext,
  type AuthActorContext,
  type Guard,
} from './auth';

// RivetKit types
export type { Registry } from 'rivetkit';

// Note: The factory pattern (createReactiveBackend) has been replaced
// with a simpler init function. Just call initReactiveBackend() once,
// then use signals normally throughout your app.
