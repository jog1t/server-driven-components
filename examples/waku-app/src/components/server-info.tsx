// Server Component (no 'use client' directive)
// This component runs only on the server

export const ServerInfo = async () => {
  // Server-only data - these won't be exposed to client bundle
  const serverData = {
    nodeVersion: process.version,
    platform: process.platform,
    renderTime: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  };

  // Simulate async data fetching
  await new Promise((resolve) => setTimeout(resolve, 100));

  return (
    <section className="border-orange-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-orange-50">
      <h3 className="text-sm font-bold mb-2">
        Server Component: Server Info
      </h3>
      <div className="text-xs font-mono space-y-1">
        <div>
          <span className="text-gray-600">Node Version:</span>{' '}
          <span className="font-bold">{serverData.nodeVersion}</span>
        </div>
        <div>
          <span className="text-gray-600">Platform:</span>{' '}
          <span className="font-bold">{serverData.platform}</span>
        </div>
        <div>
          <span className="text-gray-600">Render Time:</span>{' '}
          <span className="font-bold">{serverData.renderTime}</span>
        </div>
        <div>
          <span className="text-gray-600">Environment:</span>{' '}
          <span className="font-bold">{serverData.env}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        ℹ️ This component runs only on the server. Process info is not exposed to client.
      </p>
    </section>
  );
};
