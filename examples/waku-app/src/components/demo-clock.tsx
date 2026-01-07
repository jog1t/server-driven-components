/**
 * Demo Clock - Reactive Server Component
 *
 * Demonstrates createStream with interval-based updates.
 * Uses the reactive() HOC to auto-wrap with <Reactive> boundary.
 */

import { signal, observe, createStream } from 'kawa';
import { reactive } from './reactive-hoc';

interface DemoClockProps {
  interval?: number;
}

function DemoClock({ interval = 1000 }: DemoClockProps) {
  const time = signal(Date.now());

  createStream(
    () => {
      console.log(`[DemoClock] Starting clock with interval: ${interval}ms`);

      const id = setInterval(() => {
        time.value = Date.now();
      }, interval);

      return () => {
        console.log(`[DemoClock] Stopping clock`);
        clearInterval(id);
      };
    },
    [interval]
  );

  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded border border-blue-300">
      <h4 className="text-lg font-bold mb-3 text-blue-800">
        🕐 Reactive Clock (updates every {interval}ms)
      </h4>

      <div className="text-4xl font-bold text-blue-900 my-4 font-mono">
        {new Date(observe(time)).toLocaleTimeString()}
      </div>

      <div className="text-sm text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-blue-700">
        ⚡ <strong>Pure Server Component!</strong>
        <br />
        Updates via createStream() + RSC streaming over SSE
      </div>
    </div>
  );
}

// Wrap with reactive() HOC - no need for <Reactive> wrapper at usage sites!
export default reactive(DemoClock);
