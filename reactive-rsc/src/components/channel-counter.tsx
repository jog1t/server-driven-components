/**
 * Channel Counter Component
 *
 * Displays an auto-incrementing counter using the counter channel.
 */

import { Subscribe } from './subscribe';
import { counterChannel } from '../channels/counter';

interface ChannelCounterProps {
  increment?: number;
  interval?: number;
  userId?: string;
}

export function ChannelCounter({
  increment = 1,
  interval = 2000,
  userId,
}: ChannelCounterProps) {
  return (
    <Subscribe channel={counterChannel} scope={{ increment, interval, userId }}>
      {(data) => (
        <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-300">
          <h4 className="text-lg font-bold mb-3 text-green-800">
            🔢 Channel Counter (+{increment} every {interval / 1000}s)
          </h4>

          {data ? (
            <div className="text-4xl font-mono font-bold text-green-900">{data.count}</div>
          ) : (
            <div className="text-gray-500">Connecting...</div>
          )}

          {userId && (
            <div className="mt-2 text-xs text-gray-600">User: {userId}</div>
          )}
        </div>
      )}
    </Subscribe>
  );
}
