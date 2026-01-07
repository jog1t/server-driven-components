/**
 * RivetKit Backend
 *
 * A backend implementation using RivetKit actors for stateful,
 * real-time server-driven components.
 */

export { registry, type Registry } from './registry.js';
export { counter } from './actors/counter.js';
export { chatRoom, type Message } from './actors/chatRoom.js';
export { serverTime } from './actors/serverTime.js';
