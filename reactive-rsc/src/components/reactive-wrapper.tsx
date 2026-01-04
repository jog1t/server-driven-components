'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';

interface ReactiveWrapperProps {
  children: ReactNode;
  endpoint?: string;
}

export const ReactiveWrapper = ({
  children,
  endpoint = '/api/reactive-stream'
}: ReactiveWrapperProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [serverData, setServerData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // Create SSE connection
      eventSource = new EventSource(endpoint);

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('[Reactive Wrapper] SSE connection opened');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Reactive Wrapper] Received SSE event:', data);

          setLastUpdate(new Date().toISOString());
          setUpdateCount((prev) => prev + 1);

          if (data.type === 'server-update') {
            // Update server data when we receive updates
            startTransition(() => {
              setServerData(data.data);
            });
          }
        } catch (err) {
          console.error('[Reactive Wrapper] Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[Reactive Wrapper] SSE error:', error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error('[Reactive Wrapper] Error creating EventSource:', err);
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        console.log('[Reactive Wrapper] Closing SSE connection');
        eventSource.close();
      }
    };
  }, [endpoint]);

  return (
    <div>
      {/* SSE Connection Status */}
      <div className="mb-2 text-xs flex items-center gap-2">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>
          SSE: {isConnected ? 'Connected' : 'Disconnected'} | Updates: {updateCount}
          {lastUpdate && ` | Last: ${new Date(lastUpdate).toLocaleTimeString()}`}
        </span>
        {isPending && <span className="text-yellow-600">⟳ Updating...</span>}
      </div>

      {/* Render children with server data passed as context */}
      <div data-server-data={JSON.stringify(serverData)}>
        {children}
      </div>

      {/* Display live server data */}
      {serverData && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
          <div className="font-bold mb-1">Live Server Data (via SSE):</div>
          <div>Time: {serverData.serverTime}</div>
          <div>Counter: {serverData.counter}</div>
          <div>Random: {serverData.randomValue}</div>
        </div>
      )}
    </div>
  );
};
