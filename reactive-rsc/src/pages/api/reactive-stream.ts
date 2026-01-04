// SSE (Server-Sent Events) endpoint for reactive server components
// This API route provides component-specific streams of server events

import { stateManager } from '../../lib/server-state-manager';

export const GET = async (request: Request) => {
  // Get component ID from query params
  const url = new URL(request.url);
  const componentId = url.searchParams.get('componentId');

  if (!componentId) {
    return new Response('Missing componentId parameter', { status: 400 });
  }

  console.log(`[SSE] New connection for component: ${componentId}`);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send helper function
      const send = (data: any) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          console.error(`[SSE] Error sending data:`, error);
        }
      };

      // Send connection established message
      send({
        type: 'connected',
        componentId,
        message: `SSE connection established for ${componentId}`,
        timestamp: new Date().toISOString(),
        initialState: stateManager.getAllState(componentId),
      });

      // Subscribe to component state changes
      const unsubscribe = stateManager.subscribe({
        componentId,
        send,
      });

      // Cleanup on connection close
      return () => {
        console.log(`[SSE] Connection closed for ${componentId}`);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};
