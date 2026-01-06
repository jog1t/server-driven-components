'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';

interface ReactiveWrapperProps {
  children: ReactNode;
  componentId: string;
  showDebug?: boolean;
}

export const ReactiveWrapper = ({
  children,
  componentId,
  showDebug = true,
}: ReactiveWrapperProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [serverState, setServerState] = useState<Record<string, any>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // Create component-specific SSE connection
      const endpoint = `/api/reactive-stream?componentId=${encodeURIComponent(componentId)}`;
      eventSource = new EventSource(endpoint);

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log(`[ReactiveWrapper] SSE connection opened for ${componentId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`[ReactiveWrapper] ${componentId} received:`, data);

          if (data.type === 'connected') {
            // Initial connection - set initial state
            if (data.initialState) {
              startTransition(() => {
                setServerState(data.initialState);
              });
            }
          } else if (data.type === 'component-update') {
            // State update - update with new state
            setLastUpdate(new Date().toISOString());
            setUpdateCount((prev) => prev + 1);

            startTransition(() => {
              setServerState(data.allState || {});
            });
          }
        } catch (err) {
          console.error(`[ReactiveWrapper] ${componentId} error parsing:`, err);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[ReactiveWrapper] ${componentId} SSE error:`, error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error(`[ReactiveWrapper] ${componentId} error creating EventSource:`, err);
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        console.log(`[ReactiveWrapper] Closing SSE connection for ${componentId}`);
        eventSource.close();
      }
    };
  }, [componentId]);

  return (
    <div>
      {showDebug && (
        <>
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
        </>
      )}

      {/* Render children with server state available */}
      <div data-component-id={componentId} data-server-state={JSON.stringify(serverState)}>
        {children}
      </div>

      {/* Display live server state */}
      {showDebug && Object.keys(serverState).length > 0 && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
          <div className="font-bold mb-1">Live Server State (via SSE):</div>
          {Object.entries(serverState).map(([key, value]) => (
            <div key={key}>
              {key}: {JSON.stringify(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
