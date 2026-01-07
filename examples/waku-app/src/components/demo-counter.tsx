/**
 * Demo Counter - Reactive Server Component
 *
 * Demonstrates useReactive with auto-incrementing counter.
 * Uses the reactive() HOC to auto-wrap with <Reactive> boundary.
 */

import { useReactive } from 'kawa';
import { reactive } from './reactive-hoc';

interface DemoCounterProps {
  increment?: number;
  interval?: number;
  _reactiveData?: number;
}

function DemoCounter({
  increment = 1,
  interval = 2000,
  _reactiveData,
}: DemoCounterProps) {
  const count = useReactive(
    _reactiveData ?? 0,
    (stream) => {
      console.log(`[DemoCounter] Starting counter (increment: ${increment}, interval: ${interval}ms)`);

      let currentCount = 0;

      // Send initial value
      stream.next(currentCount);

      const id = setInterval(() => {
        currentCount += increment;
        stream.next(currentCount);
      }, interval);

      return () => {
        console.log(`[DemoCounter] Stopping counter at ${currentCount}`);
        clearInterval(id);
      };
    },
    [increment, interval]
  );

  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-300">
      <h4 className="text-lg font-bold mb-3 text-green-800">
        🔢 Reactive Counter (+{increment} every {interval}ms)
      </h4>

      <div className="text-4xl font-bold text-green-900 my-4">Count: {count}</div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-green-700">
        ⚡ <strong>Pure Server Component!</strong>
        <br />
        State managed on server, updates streamed as RSC payloads
      </div>
    </div>
  );
}

// Wrap with reactive() HOC - no need for <Reactive> wrapper at usage sites!
export default reactive(DemoCounter);
