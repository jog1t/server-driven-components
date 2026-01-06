/**
 * Counter Channel
 *
 * Auto-incrementing counter with configurable interval.
 */

import { defineChannel, onChannel } from '../lib/channel-manager';

// Define typed channel
export const counterChannel = defineChannel<
  { count: number },
  { increment?: number; interval?: number; userId?: string }
>('counter');

// Register channel handler
onChannel(counterChannel, {
  init: ({ scope, broadcast }) => {
    const increment = scope.increment || 1;
    const interval = scope.interval || 2000;
    let count = 0;

    console.log(
      `[CounterChannel] Starting counter (increment: ${increment}, interval: ${interval}ms, userId: ${scope.userId || 'none'})`
    );

    // Broadcast initial count
    broadcast({ count });

    // Increment and broadcast
    const intervalId = setInterval(() => {
      count += increment;
      broadcast({ count });
    }, interval);

    // Cleanup function
    return () => {
      console.log(`[CounterChannel] Stopping counter at ${count}`);
      clearInterval(intervalId);
    };
  },

  onSubscribe: ({ scope, subscriber }) => {
    console.log(
      `[CounterChannel] New subscriber (userId: ${scope.userId || 'none'})`
    );
  },

  onUnsubscribe: ({ scope }) => {
    console.log(
      `[CounterChannel] Subscriber left (userId: ${scope.userId || 'none'})`
    );
  },
});
