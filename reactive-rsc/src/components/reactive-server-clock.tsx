// Reactive Server Component
// This component demonstrates server-side rendering that can be updated
// via server-push events through SSE

export const ReactiveServerClock = async () => {
  // This runs on the server
  const serverData = {
    renderTime: new Date().toISOString(),
    serverTime: new Date().toLocaleTimeString(),
    nodeVersion: process.version,
    pid: process.pid,
  };

  // Simulate server-side async operation
  await new Promise((resolve) => setTimeout(resolve, 50));

  return (
    <div className="p-3 bg-white rounded border border-gray-300">
      <h4 className="text-sm font-bold mb-2">Server Component (Reactive)</h4>
      <div className="text-xs space-y-1">
        <div>
          <span className="text-gray-600">Rendered at:</span>{' '}
          <span className="font-mono font-bold">{serverData.serverTime}</span>
        </div>
        <div>
          <span className="text-gray-600">Server Timestamp:</span>{' '}
          <span className="font-mono text-[10px]">{serverData.renderTime}</span>
        </div>
        <div>
          <span className="text-gray-600">Node:</span>{' '}
          <span className="font-mono">{serverData.nodeVersion}</span>
        </div>
        <div>
          <span className="text-gray-600">PID:</span>{' '}
          <span className="font-mono">{serverData.pid}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-gray-500">
        ℹ️ This component is rendered on the server.
        The wrapper component receives SSE updates.
      </p>
    </div>
  );
};
