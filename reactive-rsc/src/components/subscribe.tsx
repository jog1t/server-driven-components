/**
 * Subscribe Component
 *
 * Client component that subscribes to a channel and renders data.
 */

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { ChannelDefinition } from '../lib/channels/types';

interface SubscribeProps<TData, TScope> {
  channel: ChannelDefinition<TData, TScope>;
  scope?: TScope;
  children: (data: TData | null) => ReactNode;
  showDebug?: boolean;
}

export function Subscribe<TData, TScope>({
  channel,
  scope = {} as TScope,
  children,
  showDebug = true,
}: SubscribeProps<TData, TScope>) {
  const [data, setData] = useState<TData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      // Build SSE endpoint URL
      const params = new URLSearchParams({
        channel: channel.name,
        scope: JSON.stringify(scope),
      });

      const url = `/api/channel-stream?${params}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        console.log(`[Subscribe] Connected to ${channel.name}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          console.log(`[Subscribe] ${channel.name} received:`, parsedData);

          setData(parsedData);
          setUpdateCount((prev) => prev + 1);
          setLastUpdate(new Date().toISOString());
        } catch (err) {
          console.error(`[Subscribe] Error parsing data:`, err);
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[Subscribe] ${channel.name} SSE error:`, error);
        setIsConnected(false);
      };
    } catch (err) {
      console.error(`[Subscribe] Error creating EventSource:`, err);
      setIsConnected(false);
    }

    // Cleanup on unmount
    return () => {
      if (eventSource) {
        console.log(`[Subscribe] Closing connection to ${channel.name}`);
        eventSource.close();
      }
    };
  }, [channel.name, scope]);

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
        </div>
      )}

      {children(data)}
    </div>
  );
}
