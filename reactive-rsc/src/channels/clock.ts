/**
 * Clock Channel
 *
 * Broadcasts current time every second.
 */

import { defineChannel, onChannel } from '../lib/channel-manager';

// Define typed channel
export const clockChannel = defineChannel<
  { time: number; formatted: string },
  { interval?: number }
>('clock');

// Register channel handler
onChannel(clockChannel, {
  init: ({ scope, broadcast }) => {
    const interval = scope.interval || 1000;

    console.log(`[ClockChannel] Starting clock with interval ${interval}ms`);

    // Broadcast current time
    const sendTime = () => {
      const now = Date.now();
      broadcast({
        time: now,
        formatted: new Date(now).toLocaleTimeString(),
      });
    };

    // Send initial time immediately
    sendTime();

    // Then send every interval
    const intervalId = setInterval(sendTime, interval);

    // Cleanup function
    return () => {
      console.log(`[ClockChannel] Stopping clock`);
      clearInterval(intervalId);
    };
  },

  onSubscribe: ({ scope, subscriber }) => {
    console.log(`[ClockChannel] New subscriber with interval ${scope.interval || 1000}ms`);

    // Send current time immediately to new subscriber
    const now = Date.now();
    subscriber.send({
      time: now,
      formatted: new Date(now).toLocaleTimeString(),
    });
  },
});
