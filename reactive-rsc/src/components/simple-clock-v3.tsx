/**
 * SimpleClock v0.3 - Using synchronous hooks with useId()
 *
 * Demonstrates the new v0.3 API:
 * - useServerSignal is synchronous and calls useId() internally
 * - Returns [value, setter, reactiveId]
 * - Component self-wraps with ReactiveWrapper using the returned ID
 */

import { useServerSignal, useServerEffect } from '../lib/server-hooks';
import { ReactiveWrapper } from './reactive-wrapper';

interface SimpleClockV3Props {
  interval?: number;
}

export function SimpleClockV3({ interval = 1000 }: SimpleClockV3Props) {
  // New API: hook calls useId() internally and returns the reactiveId!
  const [time, setTime, reactiveId] = useServerSignal('time', new Date().toISOString());
  const [ticks, setTicks, _] = useServerSignal('ticks', 0);

  // useServerEffect uses the reactiveId from useServerSignal
  useServerEffect(
    reactiveId,
    () => {
      const intervalId = setInterval(() => {
        setTime(new Date().toISOString());
        setTicks((prev: number) => prev + 1);
      }, interval);

      return () => clearInterval(intervalId);
    },
    [interval]
  );

  const formattedTime = new Date(time).toLocaleTimeString();

  // Component self-wraps with ReactiveWrapper
  return (
    <ReactiveWrapper componentId={reactiveId} showDebug={true}>
      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-300">
        <h4 className="text-lg font-bold mb-3 text-green-800">
          🎉 Simple Clock v0.3 (Synchronous useId!)
        </h4>

        <div className="text-3xl font-mono font-bold text-green-900">{formattedTime}</div>

        <div className="mt-2 text-sm text-green-600">
          Ticks: <span className="font-bold">{ticks}</span>
        </div>

        <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600">
          🎯 ID: <code className="bg-white px-1">{reactiveId}</code>
        </div>

        <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-700">
          ✨ <strong>v0.3 API!</strong> Synchronous hooks with automatic useId() - no manual ID
          passing!
        </div>
      </div>
    </ReactiveWrapper>
  );
}
