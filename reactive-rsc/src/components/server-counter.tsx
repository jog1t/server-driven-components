/**
 * ServerCounter - Another Reactive Server Component Demo
 *
 * Demonstrates multiple reactive components with different update rates
 */

import { useServerSignal, useServerEffect } from '../lib/server-hooks';

interface ServerCounterProps {
  reactiveId: string;
  increment?: number;
  interval?: number;
}

export async function ServerCounter({
  reactiveId,
  increment = 1,
  interval = 2000,
}: ServerCounterProps) {
  const [count, setCount] = await useServerSignal(reactiveId, 'count', 0);

  await useServerEffect(
    reactiveId,
    async () => {
      console.log(`[ServerCounter] Initializing ${reactiveId}`);

      const intervalId = setInterval(() => {
        setCount((prev: number) => prev + increment);
      }, interval);

      return () => {
        console.log(`[ServerCounter] Cleaning up ${reactiveId}`);
        clearInterval(intervalId);
      };
    },
    [increment, interval]
  );

  return (
    <div className="p-4 bg-white rounded border border-gray-300">
      <h4 className="text-lg font-bold mb-3">🔢 Server Counter</h4>

      <div className="space-y-2">
        <div className="text-4xl font-bold tabular-nums text-blue-600">
          {count}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs space-y-1">
          <div>
            <span className="text-gray-600">Component ID:</span>{' '}
            <span className="font-mono">{reactiveId}</span>
          </div>
          <div>
            <span className="text-gray-600">Increment:</span>{' '}
            <span className="font-mono">+{increment}</span>
          </div>
          <div>
            <span className="text-gray-600">Interval:</span>{' '}
            <span className="font-mono">{interval}ms</span>
          </div>
        </div>
      </div>

      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-600">
        ℹ️ Counter increments by {increment} every {interval}ms on the server
      </div>
    </div>
  );
}
