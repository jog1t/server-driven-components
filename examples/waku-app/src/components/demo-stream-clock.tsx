/**
 * Demo Stream Clock - Using useReactiveStream
 *
 * Demonstrates the new useReactiveStream hook for component-local reactive state.
 * This is the recommended approach for creating timers, intervals, or any
 * component-specific reactive streams.
 */

import { useReactiveStream } from 'reactive-rsc';

interface DemoStreamClockProps {
  interval?: number;
  _reactiveData?: number;
}

export default function DemoStreamClock({ interval = 1000, _reactiveData }: DemoStreamClockProps) {
  // Use the new useReactiveStream hook for component-local reactive state
  const time = useReactiveStream(
    _reactiveData ?? Date.now(),
    (stream) => {
      console.log(`[DemoStreamClock] Starting clock with interval: ${interval}ms`);

      const id = setInterval(() => {
        stream.next(Date.now());
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
        🕐 Stream Clock (useReactiveStream)
      </h4>

      <div className="text-4xl font-bold text-purple-900 my-4 font-mono">
        {new Date(time).toLocaleTimeString()}
      </div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-purple-700">
        ⚡ <strong>Component-local reactive stream</strong>
        <br />
        Uses useReactiveStream() for inline state management
        <br />
        Updates every {interval}ms via RSC streaming over SSE
      </div>
    </div>
  );
}
