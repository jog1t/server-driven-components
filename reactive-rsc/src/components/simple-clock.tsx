/**
 * SimpleClock - Demo of the new simplified reactive component API
 *
 * This shows how to create reactive components without manually passing
 * reactiveId to every hook call.
 */

import { createReactiveComponent } from '../lib/create-reactive';

/**
 * Method 1: Using createReactiveComponent
 *
 * The component ID is bound at creation, so useSignal and useEffect
 * don't need the componentId parameter.
 */
export const SimpleClock = createReactiveComponent(
  'simple-clock-1',
  async ({ useSignal, useEffect }) => {
    // No need to pass componentId!
    const [time, setTime] = await useSignal('time', new Date().toISOString());
    const [ticks, setTicks] = await useSignal('ticks', 0);

    await useEffect(async () => {
      const interval = setInterval(() => {
        setTime(new Date().toISOString());
        setTicks((prev: number) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }, []);

    const formattedTime = new Date(time).toLocaleTimeString();

    return (
      <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-300">
        <h4 className="text-lg font-bold mb-3 text-purple-800">
          ⚡ Simple Clock (New API)
        </h4>

        <div className="text-3xl font-mono font-bold text-purple-900">
          {formattedTime}
        </div>

        <div className="mt-2 text-sm text-purple-600">
          Ticks: <span className="font-bold">{ticks}</span>
        </div>

        <div className="mt-3 p-2 bg-white/50 rounded text-xs text-gray-600">
          ✨ No reactiveId needed! Uses <code>createReactiveComponent()</code>
        </div>
      </div>
    );
  }
);

// Export the component ID for the wrapper
export const SimpleClockId = 'simple-clock-1';
