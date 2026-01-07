/**
 * Reactive Component Wrapper
 *
 * Client component that subscribes to reactive streams and renders RSC payloads.
 * Automatically detects reactive components and sets up SSE connections.
 */

'use client';

import { useEffect, useState, Suspense, type ReactNode } from 'react';
import { createFromReadableStream } from '@vitejs/plugin-rsc/browser';

interface ReactiveProps {
  streamKey: string;
  componentPath: string;
  fallback?: ReactNode;
  showDebug?: boolean;
}

/**
 * Reactive wrapper for server components with reactive state
 *
 * Connects to SSE endpoint and renders streamed RSC payloads.
 */
export function Reactive({ streamKey, componentPath, fallback, showDebug = false }: ReactiveProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [renderedComponent, setRenderedComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let rscChunks: string[] = [];
    let isReceivingRSC = false;

    try {
      const params = new URLSearchParams({
        streamKey,
        component: componentPath,
      });

      const url = `/api/reactive?${params}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log(`[Reactive] Connected to stream: ${streamKey}`);
      };

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log(`[Reactive] Initial connection established`);
            return;
          }

          if (data.type === 'RSC_START') {
            console.log(`[Reactive] Starting RSC stream`);
            rscChunks = [];
            isReceivingRSC = true;
            return;
          }

          if (data.type === 'RSC_CHUNK') {
            if (isReceivingRSC) {
              rscChunks.push(data.chunk);
            }
            return;
          }

          if (data.type === 'RSC_END') {
            console.log(`[Reactive] RSC stream complete, processing...`);
            isReceivingRSC = false;

            try {
              // Decode base64 chunks back to text
              const rscPayload = rscChunks.map((chunk) => atob(chunk)).join('');

              console.log('[Reactive] RSC payload received:', rscPayload.slice(0, 200));

              // Create ReadableStream from RSC payload
              const rscStream = new ReadableStream({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode(rscPayload));
                  controller.close();
                },
              });

              // Use React's createFromReadableStream to parse RSC payload
              const component = await createFromReadableStream(rscStream, {
                callServer: async (id: string, args: any[]) => {
                  console.log('[Reactive] Server action called:', id, args);
                  throw new Error('Server actions not yet implemented');
                },
              });

              console.log('[Reactive] Component created from RSC stream');

              setRenderedComponent(component);
              setUpdateCount((prev) => prev + 1);
              setLastUpdate(new Date().toISOString());
            } catch (err) {
              console.error('[Reactive] Error parsing RSC stream:', err);
              setError(String(err));
            }

            rscChunks = [];
            return;
          }

          if (data.type === 'RSC_ERROR') {
            console.error(`[Reactive] RSC error:`, data.error);
            setError(data.error);
            isReceivingRSC = false;
            rscChunks = [];
            return;
          }
        } catch (err) {
          console.error(`[Reactive] Error parsing event:`, err);
          setError(String(err));
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[Reactive] SSE error:`, error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error(`[Reactive] Error creating EventSource:`, err);
      setIsConnected(false);
      setError(String(err));
    }

    return () => {
      if (eventSource) {
        console.log(`[Reactive] Closing connection`);
        eventSource.close();
      }
    };
  }, [streamKey, componentPath]);

  return (
    <div>
      {showDebug && (
        <div className="mb-2 text-xs flex items-center gap-2 text-gray-600">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>
            {isConnected ? 'Connected' : 'Disconnected'} | Updates: {updateCount}
            {lastUpdate && ` | Last: ${new Date(lastUpdate).toLocaleTimeString()}`}
          </span>
          {error && <span className="text-red-600">Error: {error}</span>}
        </div>
      )}

      {/* Render the RSC component */}
      {renderedComponent ? (
        <Suspense fallback={fallback || <div className="text-xs text-gray-500">Loading...</div>}>
          {renderedComponent}
        </Suspense>
      ) : (
        fallback || <div className="text-xs text-gray-500">Connecting...</div>
      )}
    </div>
  );
}
