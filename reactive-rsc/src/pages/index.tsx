import { Link } from 'waku';
import { Counter } from '../components/counter';
import { Toggle } from '../components/toggle';
import { Display } from '../components/display';
import { ServerInfo } from '../components/server-info';
import { DataFetch } from '../components/data-fetch';
import { ReactiveWrapper } from '../components/reactive-wrapper';
import { ServerClock } from '../components/server-clock';
import { ServerCounter } from '../components/server-counter';

export default async function HomePage() {
  const data = await getData();
  const serverTime = new Date().toISOString();

  return (
    <div className="max-w-4xl">
      <title>Reactive Server Components Demo</title>
      <h1 className="text-4xl font-bold tracking-tight mb-2">
        Reactive Server Components
      </h1>
      <p className="text-gray-600 mb-6">
        Exploring server-driven UI with React Server Components + SSE
      </p>

      <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="text-xl font-bold mb-2">About This Demo</h2>
        <p className="text-sm mb-2">
          This page demonstrates the boundaries between Server and Client Components:
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><strong>Client Components</strong> (green/blue/purple borders) - Interactive, run in browser</li>
          <li><strong>Server Components</strong> (orange/cyan borders) - Run only on server</li>
          <li><strong>Reactive Components</strong> (yellow section) - Server components with state that auto-updates via SSE</li>
        </ul>
      </div>

      <div className="mb-4 p-4 bg-green-50 rounded border border-green-200">
        <h2 className="text-xl font-bold mb-2">✨ New in v0.2: Component-Specific Signals</h2>
        <p className="text-sm mb-2">
          Reactive components now use server-side state management:
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><code className="bg-white px-1">useServerSignal(id, key, initial)</code> - Server-side state (like useState)</li>
          <li><code className="bg-white px-1">useServerEffect(id, fn, deps)</code> - Server-side effects (like useEffect)</li>
          <li>Each component has its own SSE stream</li>
          <li>Multiple components can run with different update rates</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold mt-6 mb-3">Client Components</h2>
      <Counter />
      <Toggle />
      <Display initialMessage={data.body} serverTime={serverTime} />

      <h2 className="text-2xl font-bold mt-6 mb-3">Server Components</h2>
      <ServerInfo />
      <DataFetch />

      <h2 className="text-2xl font-bold mt-6 mb-3">Reactive Server Components (v0.2)</h2>

      <div className="border-yellow-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-yellow-50">
        <h3 className="text-sm font-bold mb-3">Component-Specific Reactive Updates</h3>
        <p className="text-sm mb-4">
          Each component below has its own server-side state and SSE connection.
          State updates on the server are pushed to connected clients in real-time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Server Clock - updates every 1 second */}
          <ReactiveWrapper componentId="server-clock-1">
            <ServerClock reactiveId="server-clock-1" interval={1000} />
          </ReactiveWrapper>

          {/* Server Counter - increments by 1 every 2 seconds */}
          <ReactiveWrapper componentId="server-counter-1">
            <ServerCounter reactiveId="server-counter-1" increment={1} interval={2000} />
          </ReactiveWrapper>

          {/* Second Server Counter - increments by 5 every 3 seconds */}
          <ReactiveWrapper componentId="server-counter-2">
            <ServerCounter reactiveId="server-counter-2" increment={5} interval={3000} />
          </ReactiveWrapper>
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <p className="text-xs text-gray-600">
            <strong>How it works:</strong> Each component uses <code>useServerSignal</code> to manage
            server-side state and <code>useServerEffect</code> to run server-side intervals. When state
            changes, the server notifies only clients subscribed to that specific component via SSE.
          </p>
        </div>
      </div>

      <Link to="/about" className="mt-6 inline-block underline text-blue-600">
        About page →
      </Link>
    </div>
  );
}

const getData = async () => {
  const data = {
    title: 'Reactive Server Components',
    headline: 'Reactive Server Components Demo',
    body: 'Hello from the server!',
  };

  return data;
};

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const;
};
