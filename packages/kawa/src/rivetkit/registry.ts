import { setup } from 'rivetkit';
import { reactiveStateActor } from './actors/reactiveState';

/**
 * Pre-made registry with just the reactiveState actor
 *
 * Use this if you don't have your own RivetKit actors.
 *
 * @example
 * ```typescript
 * import { reactiveRegistry } from 'kawa/rivetkit';
 * import { createReactiveBackend } from 'kawa/rivetkit';
 *
 * const { signal } = createReactiveBackend({ registry: reactiveRegistry });
 * ```
 */
export const reactiveRegistry = setup({
  use: {
    reactiveState: reactiveStateActor,
  },
});
