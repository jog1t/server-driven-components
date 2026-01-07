/**
 * Demo Stream Clock - Using createStream
 *
 * Demonstrates the createStream function for component-local reactive state.
 * This is the recommended approach for creating timers, intervals, or any
 * component-specific reactive streams.
 */

import { signal, observe, createStream } from 'kawa';

interface DemoStreamClockProps {
  interval?: number;
}

export default function DemoStreamClock({ interval = 1000 }: DemoStreamClockProps) {
  // Create a signal for the time
  const time = signal(Date.now());

  // Use createStream to set up the interval that modifies the signal
  createStream(
    () => {
      console.log(`[DemoStreamClock] Starting clock with interval: ${interval}ms`);

      const id = setInterval(() => {
        time.value = Date.now();
      }, interval);

      return () => {
        console.log(`[DemoStreamClock] Stopping clock`);
        clearInterval(id);
      };
    },
    [interval]
  );

  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-300">
      <h4 className="text-lg font-bold mb-3 text-purple-800">
        🕐 Stream Clock (createStream)
      </h4>

      <div className="text-4xl font-bold text-purple-900 my-4 font-mono">
        {new Date(observe(time)).toLocaleTimeString()}
      </div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-purple-700">
        ⚡ <strong>Component-local reactive stream</strong>
        <br />
        Uses createStream() for inline state management
        <br />
        Updates every {interval}ms via RSC streaming over SSE
      </div>
    </div>
  );
}
