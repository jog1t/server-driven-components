/**
 * Reactive Subscribe Component (RSC Streaming)
 *
 * Consumes RSC payload streams from SSE and renders server components reactively.
 * This allows true reactive server components without page navigation.
 */

'use client';

import { useEffect, useState, Suspense } from 'react';
import type { ChannelDefinition } from '../lib/channels/types';
import { createFromReadableStream } from '@vitejs/plugin-rsc/browser';

interface ReactiveSubscribeProps<TData, TScope> {
  channel: ChannelDefinition<TData, TScope>;
  scope?: TScope;
  componentPath: string; // Path to the component to render (e.g., "components/reactive-clock")
  showDebug?: boolean;
}

/**
 * Subscribe to a channel and render RSC payloads
 *
 * This component connects to the RSC streaming endpoint, consumes
 * RSC payloads, and renders the server component reactively.
 */
export function ReactiveSubscribe<TData, TScope>({
  channel,
  scope = {} as TScope,
  componentPath,
  showDebug = true,
}: ReactiveSubscribeProps<TData, TScope>) {
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
        channel: channel.name,
        scope: JSON.stringify(scope),
        component: componentPath,
      });

      const url = `/api/rsc-stream?${params}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log(`[ReactiveSubscribe] Connected to ${channel.name}`);
      };

      eventSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log(`[ReactiveSubscribe] Initial connection to ${channel.name}`);
            return;
          }

          if (data.type === 'RSC_START') {
            console.log(`[ReactiveSubscribe] Starting RSC stream`);
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
            console.log(`[ReactiveSubscribe] RSC stream complete, processing...`);
            isReceivingRSC = false;

            try {
              // Decode base64 chunks back to text (browser-compatible)
              const rscPayload = rscChunks
                .map((chunk) => atob(chunk))
                .join('');

              console.log('[ReactiveSubscribe] RSC payload received:', rscPayload.slice(0, 200));

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
                  console.log('[ReactiveSubscribe] Server action called:', id, args);
                  // TODO: Implement server action handler
                  throw new Error('Server actions not yet implemented');
                },
              });

              console.log('[ReactiveSubscribe] Component created from RSC stream:', component);

              setRenderedComponent(component);
              setUpdateCount((prev) => prev + 1);
              setLastUpdate(new Date().toISOString());
            } catch (err) {
              console.error('[ReactiveSubscribe] Error parsing RSC stream:', err);
              setError(String(err));
            }

            rscChunks = [];
            return;
          }

          if (data.type === 'RSC_ERROR') {
            console.error(`[ReactiveSubscribe] RSC error:`, data.error);
            setError(data.error);
            isReceivingRSC = false;
            rscChunks = [];
            return;
          }
        } catch (err) {
          console.error(`[ReactiveSubscribe] Error parsing event:`, err);
          setError(String(err));
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[ReactiveSubscribe] ${channel.name} SSE error:`, error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error(`[ReactiveSubscribe] Error creating EventSource:`, err);
      setIsConnected(false);
      setError(String(err));
    }

    return () => {
      if (eventSource) {
        console.log(`[ReactiveSubscribe] Closing connection to ${channel.name}`);
        eventSource.close();
      }
    };
  }, [channel.name, JSON.stringify(scope), componentPath]);

  return (
    <div>
      {showDebug && (
        <div className="mb-2 text-xs flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>
            {channel.name}: {isConnected ? 'Connected' : 'Disconnected'} | Updates: {updateCount}
            {lastUpdate && ` | Last: ${new Date(lastUpdate).toLocaleTimeString()}`}
          </span>
          {error && <span className="text-red-600">Error: {error}</span>}
        </div>
      )}

      {/* Render the RSC component */}
      {renderedComponent && (
        <Suspense fallback={<div className="text-xs text-gray-500">Loading component...</div>}>
          {renderedComponent}
        </Suspense>
      )}
    </div>
  );
}
