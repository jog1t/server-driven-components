/**
 * Reactive Counter - TRUE Server Component (RSC Streaming Version)
 *
 * Server component that re-renders when channel broadcasts,
 * streaming RSC payload directly to the client.
 */

interface ReactiveCounterProps {
  increment?: number;
  interval?: number;
  userId?: string;
  _channelData?: { count: number };
}

/**
 * Server component that displays counter value from channel
 *
 * The channel manages the count on the server. When it broadcasts,
 * this component re-renders and streams as RSC payload.
 */
export async function ReactiveCounter({
  increment = 1,
  interval = 2000,
  userId,
  _channelData,
}: ReactiveCounterProps) {
  // This runs on the SERVER
  const serverRenderTime = new Date().toISOString();
  const count = _channelData?.count ?? 0;

  return (
    <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded border border-orange-300">
      <h4 className="text-lg font-bold mb-3 text-orange-800">
        🔢 RSC Streaming Counter (+{increment} every {interval / 1000}s)
      </h4>

      <div className="text-4xl font-bold text-orange-900 my-4">Count: {count}</div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      {userId && <div className="mt-2 text-xs text-gray-600">User: {userId}</div>}

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-orange-700">
        🎯 <strong>TRUE Server Component + RSC Streaming!</strong>
        <br />
        Re-renders on server when channel broadcasts, streams RSC payload directly.
      </div>
    </div>
  );
}
