/**
 * Demo Shared Time - Uses Global Signal
 *
 * Demonstrates subscribing to a shared signal.
 * Multiple instances of this component share the same signal.
 */

import { useReactive } from '../lib/reactive';
import { serverTime } from '../lib/signals/server-time';

interface DemoSharedTimeProps {
  label?: string;
  _reactiveData?: number;
}

export default function DemoSharedTime({ label = 'Server Time', _reactiveData }: DemoSharedTimeProps) {
  const time = useReactive(serverTime);

  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-300">
      <h4 className="text-lg font-bold mb-3 text-purple-800">
        🌐 {label}
      </h4>

      <div className="text-3xl font-bold text-purple-900 my-4 font-mono">
        {new Date(time).toLocaleTimeString()}
      </div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-purple-700">
        🔗 <strong>Shared Signal!</strong>
        <br />
        All instances share the same server-side signal
      </div>
    </div>
  );
}
