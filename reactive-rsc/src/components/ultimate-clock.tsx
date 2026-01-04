/**
 * UltimateClock - Cleanest API possible using useId() in server component
 *
 * This tests if we can call useId() directly in the server component
 * and pass it to useServerSignal/useServerEffect.
 */

import { useId } from 'react';
import { useServerSignal, useServerEffect } from '../lib/server-hooks';

export async function UltimateClock({ interval = 1000 }: { interval?: number }) {
  // Call useId() directly in server component!
  const reactiveId = useId();

  // Use the ID with our hooks
  const [time, setTime] = await useServerSignal(reactiveId, 'time', new Date().toISOString());
  const [ticks, setTicks] = await useServerSignal(reactiveId, 'ticks', 0);

  await useServerEffect(reactiveId, async () => {
    const intervalId = setInterval(() => {
      setTime(new Date().toISOString());
      setTicks((prev: number) => prev + 1);
    }, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  const formattedTime = new Date(time).toLocaleTimeString();

  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded border border-indigo-300">
      <h4 className="text-lg font-bold mb-3 text-indigo-800">
        ✨ Ultimate Clock (useId in Server Component!)
      </h4>

      <div className="text-3xl font-mono font-bold text-indigo-900">
        {formattedTime}
      </div>

      <div className="mt-2 text-sm text-indigo-600">
        Ticks: <span className="font-bold">{ticks}</span>
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600">
        🎯 ID: <code className="bg-white px-1">{reactiveId}</code>
      </div>

      <div className="mt-2 p-2 bg-indigo-100 rounded text-xs text-indigo-700">
        ✨ <strong>Perfect API!</strong> useId() called in server component, no wrapper needed!
      </div>
    </div>
  );
}

// Export the component ID for the wrapper
export const UltimateClockId = 'ultimate-clock';
