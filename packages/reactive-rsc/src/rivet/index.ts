/**
 * RivetKit backend for reactive-rsc
 *
 * Provides persistent, multi-server reactive state using RivetKit actors.
 */

export { reactiveStateActor } from './actors/reactiveState';
export { reactiveRegistry } from './registry';
export { RivetBackend } from './backend';
export { createReactiveBackend } from './factory';
export type { Registry } from 'rivetkit';
