/**
 * RSC Streaming Endpoint
 *
 * Streams React Server Component payloads over SSE for reactive components.
 * Instead of sending JSON data, this streams actual RSC payloads that
 * React can consume and render.
 */

import { channelManager } from '../../lib/channel-manager';
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';
import { createElement } from 'react';

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const channelName = url.searchParams.get('channel');
  const scopeParam = url.searchParams.get('scope');
  const componentPath = url.searchParams.get('component');

  if (!channelName) {
    return new Response('Missing channel parameter', { status: 400 });
  }

  if (!componentPath) {
    return new Response('Missing component parameter', { status: 400 });
  }

  let scope: any = {};
  if (scopeParam) {
    try {
      scope = JSON.parse(scopeParam);
    } catch (err) {
      return new Response('Invalid scope JSON', { status: 400 });
    }
  }

  console.log(`[RSCStream] New connection: ${channelName}`, { scope, componentPath });

  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isActive = true;

      // Helper to send SSE message
      const sendEvent = (eventData: string) => {
        if (!isActive) return;
        const message = `data: ${eventData}\n\n`;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error('[RSCStream] Error sending event:', err);
          isActive = false;
        }
      };

      // Helper to render component to RSC and stream it
      const renderAndStream = async (data: any) => {
        if (!isActive) return;

        try {
          // Dynamically import the component
          const componentModule = await import(`../../${componentPath}`);
          const Component = componentModule.default || componentModule[Object.keys(componentModule)[0]];

          if (!Component) {
            console.error('[RSCStream] Component not found:', componentPath);
            return;
          }

          // Create element with data + scope as props
          const element = createElement(Component, { ...scope, _channelData: data });

          // Render to RSC stream
          const rscStream = await renderToReadableStream(element, {
            onError: (error: any) => {
              console.error('[RSCStream] Render error:', error);
            },
          });

          // Read RSC stream and send chunks over SSE
          const reader = rscStream.getReader();
          const decoder = new TextDecoder();

          // Send RSC_START marker
          sendEvent(JSON.stringify({ type: 'RSC_START' }));

          while (isActive) {
            const { done, value } = await reader.read();
            if (done) break;

            // Encode RSC chunk as base64 to safely send over SSE
            const chunk = decoder.decode(value, { stream: true });
            const base64Chunk = Buffer.from(chunk).toString('base64');

            sendEvent(
              JSON.stringify({
                type: 'RSC_CHUNK',
                chunk: base64Chunk,
              })
            );
          }

          // Send RSC_END marker
          sendEvent(JSON.stringify({ type: 'RSC_END' }));

          console.log('[RSCStream] Finished streaming RSC payload');
        } catch (err) {
          console.error('[RSCStream] Error rendering component:', err);
          sendEvent(
            JSON.stringify({
              type: 'RSC_ERROR',
              error: String(err),
            })
          );
        }
      };

      // Subscribe to channel
      const unsubscribe = channelManager.backend.subscribe(
        channelName,
        scope,
        (data) => {
          console.log('[RSCStream] Received data from channel, rendering...', data);
          renderAndStream(data);
        }
      );

      // Send initial connection message
      sendEvent(JSON.stringify({ type: 'connected', channel: channelName, scope }));

      // Cleanup on disconnect
      return () => {
        console.log(`[RSCStream] Client disconnected: ${channelName}`);
        isActive = false;
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
