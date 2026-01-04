/**
 * ServerClock - Reactive Server Component Demo
 *
 * This component demonstrates the new reactive server component API:
 * - useServerSignal: Server-side state management
 * - useServerEffect: Server-side lifecycle (similar to useEffect)
 *
 * The clock updates every second on the server, and clients receive
 * real-time updates via SSE.
 */

import { useServerSignal, useServerEffect } from '../lib/server-hooks';

interface ServerClockProps {
  reactiveId: string;
  interval?: number;
}

export async function ServerClock({
  reactiveId,
  interval = 1000,
}: ServerClockProps) {
  // Server-side state - stores current time
  const [time, setTime] = await useServerSignal(
    reactiveId,
    'time',
    new Date().toISOString()
  );

  // Server-side state - update counter
  const [updateCount, setUpdateCount] = await useServerSignal(
    reactiveId,
    'updateCount',
    0
  );

  // Server-side effect - runs on server initialization
  await useServerEffect(
    reactiveId,
    async () => {
      console.log(`[ServerClock] Initializing ${reactiveId} with ${interval}ms interval`);

      // Update time every interval
      const intervalId = setInterval(() => {
        const now = new Date();
        setTime(now.toISOString());
        setUpdateCount((prev: number) => prev + 1);

        console.log(`[ServerClock] ${reactiveId} tick: ${now.toLocaleTimeString()}`);
      }, interval);

      // Cleanup function (called when component unmounts)
      return () => {
        console.log(`[ServerClock] Cleaning up ${reactiveId}`);
        clearInterval(intervalId);
      };
    },
    [interval]
  );

  // Format time for display
  const formattedTime = new Date(time).toLocaleTimeString();
  const formattedDate = new Date(time).toLocaleDateString();

  return (
    <div className="p-4 bg-white rounded border border-gray-300">
      <h4 className="text-lg font-bold mb-3">🕐 Server Clock</h4>

      <div className="space-y-2">
        <div className="text-3xl font-mono font-bold tabular-nums">
          {formattedTime}
        </div>

        <div className="text-sm text-gray-600">
          {formattedDate}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 text-xs space-y-1">
          <div>
            <span className="text-gray-600">Component ID:</span>{' '}
            <span className="font-mono">{reactiveId}</span>
          </div>
          <div>
            <span className="text-gray-600">Updates:</span>{' '}
            <span className="font-bold">{updateCount}</span>
          </div>
          <div>
            <span className="text-gray-600">Update Interval:</span>{' '}
            <span className="font-mono">{interval}ms</span>
          </div>
          <div>
            <span className="text-gray-600">Server Time:</span>{' '}
            <span className="font-mono text-[10px]">{time}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-gray-600">
        ℹ️ This is a server component. Time updates on the server every {interval}ms
        and is pushed to all connected clients via SSE.
      </div>
    </div>
  );
}
