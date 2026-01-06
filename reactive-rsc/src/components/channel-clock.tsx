/**
 * Channel Clock Component
 *
 * Displays a live clock using the clock channel.
 */

import { Subscribe } from './subscribe';
import { clockChannel } from '../channels/clock';

interface ChannelClockProps {
  interval?: number;
}

export function ChannelClock({ interval = 1000 }: ChannelClockProps) {
  return (
    <Subscribe channel={clockChannel} scope={{ interval }}>
      {(data) => (
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded border border-blue-300">
          <h4 className="text-lg font-bold mb-3 text-blue-800">
            🕐 Channel Clock (updates every {interval / 1000}s)
          </h4>

          {data ? (
            <>
              <div className="text-3xl font-mono font-bold text-blue-900">
                {data.formatted}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Timestamp: {data.time}
              </div>
            </>
          ) : (
            <div className="text-gray-500">Connecting...</div>
          )}

          <div className="mt-3 p-2 bg-white/50 rounded text-xs text-green-700">
            ✨ <strong>v0.4!</strong> Channel-based reactivity with type safety
          </div>
        </div>
      )}
    </Subscribe>
  );
}
