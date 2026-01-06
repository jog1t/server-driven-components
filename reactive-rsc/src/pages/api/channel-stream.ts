/**
 * Channel SSE Endpoint
 *
 * Establishes Server-Sent Events connection for channel subscriptions.
 */

import { channelManager } from '../../lib/channel-manager';

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const channelName = url.searchParams.get('channel');
  const scopeParam = url.searchParams.get('scope');

  if (!channelName) {
    return new Response('Missing channel parameter', { status: 400 });
  }

  let scope: any = {};
  if (scopeParam) {
    try {
      scope = JSON.parse(scopeParam);
    } catch (err) {
      return new Response('Invalid scope JSON', { status: 400 });
    }
  }

  console.log(`[ChannelStream] New connection: ${channelName}`, scope);

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE message
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Subscribe to channel
      const unsubscribe = channelManager.backend.subscribe(channelName, scope, (data) => {
        send(data);
      });

      // Send initial connection message
      send({ type: 'connected', channel: channelName, scope });

      // Store unsubscribe for cleanup
      return () => {
        console.log(`[ChannelStream] Client disconnected: ${channelName}`);
        unsubscribe();
      };
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
