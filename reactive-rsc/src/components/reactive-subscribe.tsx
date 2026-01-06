/**
 * Reactive Subscribe Component
 *
 * Triggers RSC refetch when channel broadcasts updates.
 * This causes server components to re-render on the server.
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ChannelDefinition } from '../lib/channels/types';

interface ReactiveSubscribeProps<TData, TScope> {
  channel: ChannelDefinition<TData, TScope>;
  scope?: TScope;
  onUpdate?: (data: TData) => void;
  showDebug?: boolean;
}

/**
 * Subscribe to a channel and trigger RSC refetch on updates
 *
 * This causes server components to re-render on the server,
 * making them truly reactive.
 */
export function ReactiveSubscribe<TData, TScope>({
  channel,
  scope = {} as TScope,
  onUpdate,
  showDebug = true,
}: ReactiveSubscribeProps<TData, TScope>) {
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      const params = new URLSearchParams({
        channel: channel.name,
        scope: JSON.stringify(scope),
      });

      const url = `/api/channel-stream?${params}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log(`[ReactiveSubscribe] Connected to ${channel.name}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'connected') {
            console.log(`[ReactiveSubscribe] Initial connection to ${channel.name}`);
            return;
          }

          console.log(`[ReactiveSubscribe] ${channel.name} received update:`, data);

          setUpdateCount((prev) => prev + 1);
          setLastUpdate(new Date().toISOString());

          // Call optional update handler
          if (onUpdate) {
            onUpdate(data);
          }

          // Trigger RSC refetch using soft navigation
          // Navigate to same URL with cache-busting param, then navigate back
          startTransition(() => {
            const currentUrl = new URL(window.location.href);
            const tempUrl = new URL(window.location.href);
            tempUrl.searchParams.set('_rsc_refetch', Date.now().toString());

            // Push temp URL (triggers RSC refetch)
            window.history.pushState({}, '', tempUrl.toString());

            // Immediately replace back to original URL
            // This causes React to refetch RSC payload
            setTimeout(() => {
              window.history.replaceState({}, '', currentUrl.toString());
            }, 0);
          });
        } catch (err) {
          console.error(`[ReactiveSubscribe] Error parsing data:`, err);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[ReactiveSubscribe] ${channel.name} SSE error:`, error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error(`[ReactiveSubscribe] Error creating EventSource:`, err);
      setIsConnected(false);
    }

    return () => {
      if (eventSource) {
        console.log(`[ReactiveSubscribe] Closing connection to ${channel.name}`);
        eventSource.close();
      }
    };
  }, [channel.name, JSON.stringify(scope), onUpdate]);

  if (!showDebug) return null;

  return (
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
      {isPending && <span className="text-yellow-600">⟳ Refreshing...</span>}
    </div>
  );
}
