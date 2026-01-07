/**
 * Shared Server Time Signal
 *
 * Global signal that all components can subscribe to.
 * Demonstrates signal reuse across multiple components.
 */

import { signal } from 'kawa';

// Create shared signal for server time
export const serverTime = signal(Date.now());

// Update every second
setInterval(() => {
  serverTime.set(Date.now());
}, 1000);

console.log('[ServerTime] Shared time signal initialized');
