/**
 * Reactive Clock - TRUE Server Component
 *
 * This is a server component that re-renders on the server when
 * the channel broadcasts updates.
 */

import { ReactiveSubscribe } from './reactive-subscribe';
import { clockChannel } from '../channels/clock';

interface ReactiveClockProps {
  interval?: number;
}

/**
 * Server component that displays current time
 *
 * ReactiveSubscribe triggers router.reload() on updates,
 * causing this component to re-render on the server.
 */
export async function ReactiveClock({ interval = 1000 }: ReactiveClockProps) {
  // This runs on the SERVER every time it re-renders
  const serverTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-300">
      {/* Client component that triggers refetch */}
      <ReactiveSubscribe channel={clockChannel} scope={{ interval }} />

      <h4 className="text-lg font-bold mb-3 text-purple-800">
        ⚡ Reactive Server Component (interval: {interval / 1000}s)
      </h4>

      <div className="text-3xl font-mono font-bold text-purple-900">
        {new Date(serverTime).toLocaleTimeString()}
      </div>

      <div className="mt-2 text-xs text-gray-600">
        Server timestamp: {serverTime}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-purple-700">
        🎯 <strong>TRUE Server Component!</strong>
        <br />
        This component renders on the server. When the channel broadcasts,
        ReactiveSubscribe triggers router.reload(), causing a full RSC refetch.
      </div>
    </div>
  );
}
