/**
 * Reactive Component Streaming Endpoint
 *
 * Streams React Server Component payloads over SSE when reactive state updates.
 * Works with both inline reactive state and signals.
 */

import { reactiveRuntime, isSignal, type Signal } from 'kawa';
import { renderToReadableStream } from '@vitejs/plugin-rsc/rsc';
import { createElement } from 'react';

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const streamKey = url.searchParams.get('streamKey');
  const signalId = url.searchParams.get('signalId');
  const componentPath = url.searchParams.get('component');

  if (!componentPath) {
    return new Response('Missing component parameter', { status: 400 });
  }

  if (!streamKey && !signalId) {
    return new Response('Missing streamKey or signalId parameter', { status: 400 });
  }

  console.log(`[ReactiveStream] New connection:`, {
    streamKey,
    signalId,
    componentPath,
  });

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
          console.error('[ReactiveStream] Error sending event:', err);
          isActive = false;
        }
      };

      // Helper to render component to RSC and stream it
      const renderAndStream = async (data: any) => {
        if (!isActive) return;

        try {
          // Dynamically import the component
          const componentModule = await import(`../../${componentPath}`);
          const Component =
            componentModule.default || componentModule[Object.keys(componentModule)[0]];

          if (!Component) {
            console.error('[ReactiveStream] Component not found:', componentPath);
            sendEvent(
              JSON.stringify({
                type: 'RSC_ERROR',
                error: `Component not found: ${componentPath}`,
              })
            );
            return;
          }

          // Create element with reactive data
          const element = createElement(Component, { _reactiveData: data });

          // Render to RSC stream
          const rscStream = await renderToReadableStream(element, {
            onError: (error: any) => {
              console.error('[ReactiveStream] Render error:', error);
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

          console.log('[ReactiveStream] Finished streaming RSC payload');
        } catch (err) {
          console.error('[ReactiveStream] Error rendering component:', err);
          sendEvent(
            JSON.stringify({
              type: 'RSC_ERROR',
              error: String(err),
            })
          );
        }
      };

      // Subscribe to reactive stream or signal
      let unsubscribe: (() => void) | undefined;

      if (streamKey) {
        // Subscribe to reactive stream from runtime
        unsubscribe = reactiveRuntime.subscribe(streamKey, {
          send: (data) => {
            console.log('[ReactiveStream] Received data from stream, rendering...', data);
            renderAndStream(data);
          },
        });
      } else if (signalId) {
        // TODO: Subscribe to signal by ID
        // For now, return error
        sendEvent(
          JSON.stringify({
            type: 'RSC_ERROR',
            error: 'Signal subscriptions not yet implemented',
          })
        );
      }

      // Send initial connection message
      sendEvent(
        JSON.stringify({
          type: 'connected',
          streamKey,
          signalId,
          component: componentPath,
        })
      );

      // Cleanup on disconnect
      return () => {
        console.log(`[ReactiveStream] Client disconnected`);
        isActive = false;
        if (unsubscribe) {
          unsubscribe();
        }
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
