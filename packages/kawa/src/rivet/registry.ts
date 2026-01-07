import { setup } from 'rivetkit';
import { reactiveStateActor } from './actors/reactiveState';

/**
 * Pre-made registry with just the reactiveState actor
 *
 * Use this if you don't have your own RivetKit actors.
 *
 * @example
 * ```typescript
 * import { reactiveRegistry } from 'reactive-rsc/rivet';
 * import { createReactiveBackend } from 'reactive-rsc/rivet';
 *
 * const { signal } = createReactiveBackend({ registry: reactiveRegistry });
 * ```
 */
export const reactiveRegistry = setup({
  use: {
    reactiveState: reactiveStateActor,
  },
});
