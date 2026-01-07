import { Link } from 'waku';
import { Counter } from '../components/counter';
import { Toggle } from '../components/toggle';
import { Display } from '../components/display';
import { ServerInfo } from '../components/server-info';
import { DataFetch } from '../components/data-fetch';

// Import reactive components (automatically wrapped with reactive() HOC)
import DemoClock from '../components/demo-clock';
import DemoCounter from '../components/demo-counter';
import DemoSharedTime from '../components/demo-shared-time';

// Import shared signals to start them
import '../lib/signals/server-time';

export default async function HomePage() {
  const data = await getData();
  const serverTime = new Date().toISOString();

  return (
    <div className="max-w-4xl">
      <title>Reactive Server Components Demo</title>
      <h1 className="text-4xl font-bold tracking-tight mb-2">Reactive Server Components</h1>
      <p className="text-gray-600 mb-6">
        React Server Components + SSE streaming with the new <code>useReactive</code> hook
      </p>

      <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border-2 border-purple-300">
        <h2 className="text-xl font-bold mb-2">🎉 v0.5: useReactive Hook!</h2>
        <p className="text-sm mb-2">
          <strong>Maximum simplicity!</strong> React-like syntax for reactive server components:
        </p>
        <pre className="bg-white p-3 rounded text-xs font-mono overflow-x-auto">
          {`// Just use the hook + reactive() HOC!
import { useReactive, reactive } from './lib/reactive'

function Clock({ interval = 1000 }) {
  const time = useReactive(Date.now(), (stream) => {
    const id = setInterval(() => {
      stream.next(Date.now())
    }, interval)
    return () => clearInterval(id)
  }, [interval])  // deps array = automatic deduplication!

  return <div>{new Date(time).toLocaleTimeString()}</div>
}

export default reactive(Clock)  // Wrap with HOC - no <Reactive> needed!`}
        </pre>
        <div className="mt-3 p-2 bg-purple-100 rounded text-xs">
          <strong>Key features:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Familiar React-like syntax (useState + useEffect pattern)</li>
            <li>Auto-deduplication via deps array</li>
            <li>Full TypeScript support with inference</li>
            <li>Supports shared signals for global state</li>
            <li>Pure server components - no client JS needed!</li>
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
            <strong>Reactive Components</strong> (below) - Server components with live updates via SSE
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

      <h2 className="text-2xl font-bold mt-6 mb-3">
        ⚡ Reactive Server Components (useReactive)
      </h2>

      <div className="border-purple-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-purple-50">
        <h3 className="text-sm font-bold mb-3">
          Server Components That Stream Updates Over SSE
        </h3>
        <p className="text-sm mb-4">
          These are <strong>actual server components</strong> (not client). They use the{' '}
          <code>useReactive</code> hook to create reactive state. When state updates, the server
          renders the component to an <strong>RSC payload</strong> and streams it over SSE. React
          automatically patches the component tree.{' '}
          <strong>No navigation, no refetch - just pure streaming!</strong>
        </p>

        <div className="mt-4 p-3 bg-white rounded border border-purple-300">
          <p className="text-xs text-purple-900 mb-2">
            <strong>How it works:</strong>
          </p>
          <ol className="text-xs text-gray-700 list-decimal list-inside space-y-1">
            <li>Component calls <code>useReactive(initialValue, streamFn, deps)</code></li>
            <li>Runtime registers stream handler with automatic deduplication</li>
            <li>Stream function produces updates on the server</li>
            <li>Server renders component to RSC payload (React Flight format)</li>
            <li>RSC payload streamed over SSE to client wrapper</li>
            <li>Client parses with <code>createFromReadableStream</code></li>
            <li>React automatically updates component tree - smooth and efficient!</li>
          </ol>
        </div>

        <div className="mt-3 p-3 bg-purple-100 rounded border border-purple-200">
          <p className="text-xs text-purple-800">
            <strong>🚀 The DX breakthrough!</strong> No more manual channel definitions, no string
            paths, no registration boilerplate. Just use <code>useReactive</code> in your server
            component and it works. Familiar React patterns, maximum simplicity!
          </p>
        </div>

        <div className="mt-3 p-3 bg-green-100 rounded border border-green-200">
          <p className="text-xs text-green-800">
            <strong>✨ NEW: reactive() HOC!</strong> Wrap your components with <code>reactive()</code>{' '}
            and you don't need to add <code>&lt;Reactive&gt;</code> wrappers at usage sites!{' '}
            <code>export default reactive(Clock)</code> - that's it!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* No <Reactive> wrapper needed - components are wrapped with reactive() HOC! */}
          <DemoClock interval={1000} />
          <DemoCounter increment={1} interval={2000} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Multiple instances of shared signal component */}
          <DemoSharedTime label="Shared Server Time #1" />
          <DemoSharedTime label="Shared Server Time #2" />
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
