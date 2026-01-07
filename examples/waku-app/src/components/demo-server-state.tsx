/**
 * Demo Server State - Using useServerState
 *
 * Demonstrates the new useServerState hook for subscribing to global signals.
 * This is the recommended approach for shared state that's managed outside
 * of individual components.
 */

import { useServerState } from 'reactive-rsc';
import { serverTime } from '../lib/signals/server-time';

export default function DemoServerState() {
  // Use the new useServerState hook to subscribe to a global signal
  const time = useServerState(serverTime);

  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-300">
      <h4 className="text-lg font-bold mb-3 text-green-800">
        🌐 Shared Server State (useServerState)
      </h4>

      <div className="text-4xl font-bold text-green-900 my-4 font-mono">
        {new Date(time).toLocaleTimeString()}
      </div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-green-700">
        ⚡ <strong>Global signal subscription</strong>
        <br />
        Uses useServerState() to subscribe to shared serverTime signal
        <br />
        Multiple components can share the same signal!
      </div>
    </div>
  );
}
