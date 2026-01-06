/**
 * Reactive Counter - TRUE Server Component
 *
 * Server component that re-renders when channel broadcasts.
 */

import { ReactiveSubscribe } from './reactive-subscribe';
import { counterChannel } from '../channels/counter';

interface ReactiveCounterProps {
  increment?: number;
  interval?: number;
  userId?: string;
}

/**
 * Server component that displays counter value from channel
 *
 * The channel manages the count on the server. When it broadcasts,
 * ReactiveSubscribe triggers RSC refetch, re-rendering this component.
 */
export async function ReactiveCounter({
  increment = 1,
  interval = 2000,
  userId,
}: ReactiveCounterProps) {
  // This runs on the SERVER
  // We need to get the current count from the channel
  // For now, we'll show the server render time
  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded border border-orange-300">
      {/* Client component that triggers refetch */}
      <ReactiveSubscribe
        channel={counterChannel}
        scope={{ increment, interval, userId }}
      />

      <h4 className="text-lg font-bold mb-3 text-orange-800">
        🔢 Reactive Counter (+{increment} every {interval / 1000}s)
      </h4>

      <div className="text-sm text-gray-600">
        Server rendered at: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      {userId && <div className="mt-2 text-xs text-gray-600">User: {userId}</div>}

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-orange-700">
        🎯 <strong>TRUE Server Component!</strong>
        <br />
        Re-renders on server when channel broadcasts.
      </div>
    </div>
  );
}
