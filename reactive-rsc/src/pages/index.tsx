import { Link } from 'waku';
import { Counter } from '../components/counter';
import { Toggle } from '../components/toggle';
import { Display } from '../components/display';
import { ServerInfo } from '../components/server-info';
import { DataFetch } from '../components/data-fetch';
import { ChannelClock } from '../components/channel-clock';
import { ChannelCounter } from '../components/channel-counter';
import { ReactiveClock } from '../components/reactive-clock';
import { ReactiveCounter } from '../components/reactive-counter';

// Import channels to register them
import '../channels/clock';
import '../channels/counter';

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

      <div className="mb-4 p-4 bg-purple-50 rounded border-2 border-purple-300">
        <h2 className="text-xl font-bold mb-2">🎉 v0.4: Channel-Based Reactivity!</h2>
        <p className="text-sm mb-2">
          <strong>Revolutionary simplification!</strong> No more hook coordination - just
          type-safe channels:
        </p>
        <pre className="bg-white p-2 rounded text-xs font-mono overflow-x-auto">
          {`// 1. Define a typed channel
const clockChannel = defineChannel<
  { time: number },
  { interval?: number }
>('clock');

// 2. Register handler (runs on server)
onChannel(clockChannel, {
  init: ({ scope, broadcast }) => {
    const interval = setInterval(() => {
      broadcast({ time: Date.now() });
    }, scope.interval || 1000);
    return () => clearInterval(interval);
  },
});

// 3. Subscribe in component (no ID needed!)
<Subscribe channel={clockChannel} scope={{ interval: 1000 }}>
  {(data) => <div>{data?.time}</div>}
</Subscribe>`}
        </pre>
        <div className="mt-2 p-2 bg-purple-100 rounded text-xs">
          <strong>Key improvements:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Fully type-safe channels with data + scope</li>
            <li>No manual ID management whatsoever</li>
            <li>Flexible filtering with user-defined logic</li>
            <li>Pluggable backends (memory, Redis, Rivet, Cloudflare)</li>
            <li>Clean separation: state lives in channels, not components</li>
          </ul>
        </div>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded border border-blue-200">
        <h2 className="text-xl font-bold mb-2">About This Demo</h2>
        <p className="text-sm mb-2">
          This page demonstrates different component types:
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
            <strong>Channel Components</strong> (below) - Subscribe to reactive channels via SSE
          </li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold mt-6 mb-3">Client Components</h2>
      <Counter />
      <Toggle />
      <Display initialMessage={data.body} serverTime={serverTime} />

      <h2 className="text-2xl font-bold mt-6 mb-3">Server Components</h2>
      <ServerInfo />
      <DataFetch />

      <h2 className="text-2xl font-bold mt-6 mb-3">Channel-Based Reactive Components (v0.4)</h2>

      <div className="border-yellow-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-yellow-50">
        <h3 className="text-sm font-bold mb-3">Type-Safe Channel Subscriptions</h3>
        <p className="text-sm mb-4">
          Each component below subscribes to a typed channel. Channels manage state on the server
          and broadcast updates via SSE. Fully type-safe with autocomplete!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Clock updating every second */}
          <ChannelClock interval={1000} />

          {/* Counter incrementing by 1 every 2 seconds */}
          <ChannelCounter increment={1} interval={2000} />

          {/* Fast clock updating every 500ms */}
          <ChannelClock interval={500} />

          {/* Counter incrementing by 5 every 3 seconds */}
          <ChannelCounter increment={5} interval={3000} />
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
          <p className="text-xs text-gray-600">
            <strong>How it works:</strong> Define channels with typed data and scope. Channels run
            on the server and broadcast to subscribers. Components use <code>&lt;Subscribe&gt;</code>{' '}
            with full TypeScript autocomplete. State is managed by pluggable backends (memory,
            Redis, Rivet, Cloudflare Durable Objects, etc.).
          </p>
        </div>

        <div className="mt-3 p-3 bg-green-50 rounded border border-green-300">
          <p className="text-xs text-green-800">
            <strong>🎯 The breakthrough:</strong> By separating reactive state from component
            lifecycle, we embrace RSC's design instead of fighting it. Channels solve the
            fundamental mismatch between stateless RSC and stateful reactivity!
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-6 mb-3">
        ⚡ TRUE Reactive Server Components (RSC Refetch)
      </h2>

      <div className="border-purple-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-purple-50">
        <h3 className="text-sm font-bold mb-3">Server Components That Re-Render on Updates</h3>
        <p className="text-sm mb-4">
          These are <strong>actual server components</strong> (not client). When channels
          broadcast, <code>ReactiveSubscribe</code> triggers <code>router.reload()</code>, causing
          a full RSC payload refetch. The server components re-render on the server, sending new
          RSC payload to the client.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reactive server components */}
          <ReactiveClock interval={1000} />
          <ReactiveCounter increment={1} interval={2000} />
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-purple-300">
          <p className="text-xs text-purple-900">
            <strong>How it works:</strong>
          </p>
          <ol className="text-xs text-gray-700 list-decimal list-inside mt-2 space-y-1">
            <li>Channel broadcasts update on server</li>
            <li>
              Client receives SSE event via <code>ReactiveSubscribe</code>
            </li>
            <li>
              <code>router.reload()</code> triggers full RSC refetch
            </li>
            <li>Server components re-render on the server</li>
            <li>New RSC payload sent to client</li>
            <li>React updates the DOM</li>
          </ol>
        </div>

        <div className="mt-3 p-3 bg-purple-100 rounded border border-purple-200">
          <p className="text-xs text-purple-800">
            <strong>🎯 This is TRUE reactive server components!</strong> The components themselves
            are server components. They re-render on the server when data changes, just like a
            traditional server-rendered app, but with the performance benefits of RSC + SSE instead
            of full page reloads.
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
