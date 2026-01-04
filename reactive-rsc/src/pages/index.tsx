import { Link } from 'waku';
import { Counter } from '../components/counter';
import { Toggle } from '../components/toggle';
import { Display } from '../components/display';
import { ServerInfo } from '../components/server-info';
import { DataFetch } from '../components/data-fetch';
import { ReactiveWrapper } from '../components/reactive-wrapper';
import { ReactiveServerClock } from '../components/reactive-server-clock';

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
          <li><strong>Reactive Components</strong> (coming next) - Server components that update via SSE</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold mt-6 mb-3">Client Components</h2>
      <Counter />
      <Toggle />
      <Display initialMessage={data.body} serverTime={serverTime} />

      <h2 className="text-2xl font-bold mt-6 mb-3">Server Components</h2>
      <ServerInfo />
      <DataFetch />

      <h2 className="text-2xl font-bold mt-6 mb-3">Reactive Server Component</h2>
      <div className="border-yellow-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-yellow-50">
        <h3 className="text-sm font-bold mb-2">Server-Driven UI via SSE</h3>
        <p className="text-sm mb-3">
          The component below demonstrates server-push updates.
          The client maintains an SSE connection and receives real-time updates from the server every 2 seconds.
        </p>
        <ReactiveWrapper>
          <ReactiveServerClock />
        </ReactiveWrapper>
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
