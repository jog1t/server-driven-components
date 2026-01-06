/**
 * SimpleCounter v0.3 - Using synchronous hooks with useId()
 */

import { useServerSignal, useServerEffect } from '../lib/server-hooks';
import { ReactiveWrapper } from './reactive-wrapper';

interface SimpleCounterV3Props {
  increment?: number;
  interval?: number;
}

export function SimpleCounterV3({ increment = 1, interval = 2000 }: SimpleCounterV3Props) {
  const [count, setCount, reactiveId] = useServerSignal('count', 0);

  useServerEffect(
    reactiveId,
    () => {
      const intervalId = setInterval(() => {
        setCount((prev: number) => prev + increment);
      }, interval);

      return () => clearInterval(intervalId);
    },
    [increment, interval]
  );

  return (
    <ReactiveWrapper componentId={reactiveId} showDebug={true}>
      <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded border border-blue-300">
        <h4 className="text-lg font-bold mb-3 text-blue-800">
          🔢 Counter v0.3 (+{increment} every {interval / 1000}s)
        </h4>

        <div className="text-4xl font-mono font-bold text-blue-900">{count}</div>

        <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600">
          🎯 ID: <code className="bg-white px-1">{reactiveId}</code>
        </div>
      </div>
    </ReactiveWrapper>
  );
}
