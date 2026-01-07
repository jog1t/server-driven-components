/**
 * Comparison Page - Demonstrates separated state and stream APIs
 *
 * Shows the difference between:
 * - createStream: Component-local reactive streams
 * - observe: Global signal subscriptions
 */

import { Reactive } from '../components/reactive';

export default function ComparisonPage() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4 text-gray-800">
        Separated State & Stream APIs
      </h1>

      <div className="mb-8 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="text-xl font-bold mb-2 text-blue-900">
          API Separation Experiment
        </h2>
        <p className="text-gray-700 mb-2">
          This page demonstrates the separation of state and reactive streams into two distinct functions:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>
            <code className="bg-white px-2 py-1 rounded text-sm">createStream()</code> -
            For component-local reactive streams (timers, intervals, async data)
          </li>
          <li>
            <code className="bg-white px-2 py-1 rounded text-sm">observe()</code> -
            For subscribing to global/shared signals
          </li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Component using createStream */}
        <div>
          <h3 className="text-xl font-bold mb-3 text-gray-700">
            createStream()
          </h3>
          <Reactive
            streamKey="demo-stream-clock"
            componentPath="./src/components/demo-stream-clock"
            showDebug={true}
          />
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <h4 className="font-bold mb-1">When to use:</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Component-specific timers/intervals</li>
              <li>Local async data streams</li>
              <li>State that doesn't need to be shared</li>
            </ul>
          </div>
        </div>

        {/* Component using observe */}
        <div>
          <h3 className="text-xl font-bold mb-3 text-gray-700">
            observe()
          </h3>
          <Reactive
            streamKey="demo-server-state"
            componentPath="./src/components/demo-server-state"
            showDebug={true}
          />
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <h4 className="font-bold mb-1">When to use:</h4>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Global/shared application state</li>
              <li>State managed outside components</li>
              <li>Multiple components subscribing to same data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Multiple instances to show shared state */}
      <div className="mt-8">
        <h3 className="text-2xl font-bold mb-4 text-gray-700">
          Shared State Demo
        </h3>
        <p className="mb-4 text-gray-600">
          These three components all subscribe to the same <code className="bg-gray-100 px-2 py-1 rounded">serverTime</code> signal.
          They stay in sync because they share the same global state!
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Reactive
            streamKey="demo-server-state-1"
            componentPath="./src/components/demo-server-state"
          />
          <Reactive
            streamKey="demo-server-state-2"
            componentPath="./src/components/demo-server-state"
          />
          <Reactive
            streamKey="demo-server-state-3"
            componentPath="./src/components/demo-server-state"
          />
        </div>
      </div>

      {/* API Comparison */}
      <div className="mt-8 p-6 bg-gray-50 rounded border border-gray-200">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">
          API Comparison
        </h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-lg mb-2">createStream()</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
{`// Create a signal
const time = signal(Date.now());

// Set up a stream to modify it
createStream(
  () => {
    const id = setInterval(() => time.value = Date.now(), 1000);
    return () => clearInterval(id);
  },
  []
);

// Read the signal
<div>{observe(time)}</div>`}
            </pre>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-2">observe()</h4>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
{`// In signals/server-time.ts
export const serverTime = signal(Date.now());
setInterval(() => serverTime.value = Date.now(), 1000);

// In your component
const time = observe(serverTime);`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getConfig = async () => {
  return {
    render: 'static',
  };
};
