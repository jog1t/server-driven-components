import { Link } from 'waku';
import { Counter } from '../components/counter';
import { Toggle } from '../components/toggle';
import { Display } from '../components/display';
import { ServerInfo } from '../components/server-info';
import { DataFetch } from '../components/data-fetch';
import { SimpleClockV3 } from '../components/simple-clock-v3';
import { SimpleCounterV3 } from '../components/simple-counter-v3';

export default async function HomePage() {
  const data = await getData();
  const serverTime = new Date().toISOString();

  return (
    <div className="max-w-4xl">
      <title>Reactive Server Components Demo</title>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Reactive Server Components</h1>
      <p className="text-gray-600 mb-6">
        Exploring server-driven UI with React Server Components + SSE
      </p>

      <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="text-xl font-bold mb-2">About This Demo</h2>
        <p className="text-sm mb-2">
          This page demonstrates the boundaries between Server and Client Components:
        </p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>
            <strong>Client Components</strong> (green/blue/purple borders) - Interactive, run in
            browser
          </li>
          <li>
            <strong>Server Components</strong> (orange/cyan borders) - Run only on server
          </li>
          <li>
            <strong>Reactive Components</strong> (yellow section) - Server components with state
            that auto-updates via SSE
          </li>
        </ul>
      </div>

      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded border-2 border-green-300">
        <h2 className="text-xl font-bold mb-2">✨ v0.3: Synchronous Hooks with useId()!</h2>
        <p className="text-sm mb-2">
          <strong>Revolutionary change!</strong> Hooks are now synchronous and use React's{' '}
          <code className="bg-white px-1">useId()</code> internally:
        </p>
        <pre className="bg-white p-2 rounded text-xs font-mono overflow-x-auto">
          {`// ✅ Synchronous hooks with automatic ID generation!
export function MyClock() {
  // useServerSignal calls useId() internally
  const [time, setTime, reactiveId] = useServerSignal('time', Date.now());

  // useServerEffect uses the reactiveId
  useServerEffect(reactiveId, () => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Component self-wraps with ReactiveWrapper
  return (
    <ReactiveWrapper componentId={reactiveId}>
      <div>{new Date(time).toLocaleTimeString()}</div>
    </ReactiveWrapper>
  );
}`}
        </pre>
        <div className="mt-2 p-2 bg-green-100 rounded text-xs">
          <strong>Key improvements:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Hooks are now synchronous (no async/await needed)</li>
            <li>useId() called internally - fully automatic!</li>
            <li>Clean, simple API with no manual ID management</li>
            <li>Server components self-wrap for SSE connection</li>
          </ul>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-6 mb-3">Client Components</h2>
      <Counter />
      <Toggle />
      <Display initialMessage={data.body} serverTime={serverTime} />

      <h2 className="text-2xl font-bold mt-6 mb-3">Server Components</h2>
      <ServerInfo />
      <DataFetch />

      <h2 className="text-2xl font-bold mt-6 mb-3">Reactive Server Components (v0.3)</h2>

      <div className="border-yellow-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-yellow-50">
        <h3 className="text-sm font-bold mb-3">Component-Specific Reactive Updates</h3>
        <p className="text-sm mb-4">
          Each component below uses the new v0.3 synchronous hooks API. They call{' '}
          <code className="bg-white px-1">useId()</code> internally for automatic component
          identification and self-wrap for SSE connection.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Clock updating every second */}
          <SimpleClockV3 interval={1000} />

          {/* Counter incrementing by 1 every 2 seconds */}
          <SimpleCounterV3 increment={1} interval={2000} />

          {/* Fast clock updating every 500ms */}
          <SimpleClockV3 interval={500} />

          {/* Counter incrementing by 5 every 3 seconds */}
          <SimpleCounterV3 increment={5} interval={3000} />
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <p className="text-xs text-gray-600">
            <strong>How it works:</strong> Each component uses <code>useServerSignal</code> which
            calls <code>useId()</code> internally to generate a unique ID. The component then uses
            this ID with <code>useServerEffect</code> and <code>ReactiveWrapper</code> for SSE
            connection. When state changes, the server notifies only clients subscribed to that
            specific component.
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
