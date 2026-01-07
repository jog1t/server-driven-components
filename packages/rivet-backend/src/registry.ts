import { setup } from 'rivetkit';
import { counter } from './actors/counter.js';
import { chatRoom } from './actors/chatRoom.js';
import { serverTime } from './actors/serverTime.js';

/**
 * Actor registry - defines all available actors
 *
 * Each actor can be instantiated with a unique ID:
 * - counter:default - shared counter
 * - counter:user123 - per-user counter
 * - chatRoom:lobby - lobby chat
 * - chatRoom:room42 - specific room chat
 * - serverTime:global - global server time
 */
export const registry = setup({
  use: {
    counter,
    chatRoom,
    serverTime
  }
});

export type Registry = typeof registry;
