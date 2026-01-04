// SSE (Server-Sent Events) endpoint for reactive server components
// This API route provides a stream of server events to connected clients

export const GET = async () => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      // Send connection established message
      send({
        type: 'connected',
        message: 'SSE connection established',
        timestamp: new Date().toISOString(),
      });

      // Server-driven updates - send a message every 2 seconds
      const intervalId = setInterval(() => {
        send({
          type: 'server-update',
          timestamp: new Date().toISOString(),
          data: {
            serverTime: new Date().toLocaleTimeString(),
            counter: Math.floor(Date.now() / 2000) % 100, // Changes every 2s
            randomValue: Math.floor(Math.random() * 100),
          },
        });
      }, 2000);

      // Cleanup on connection close
      // Note: This might not be called in all scenarios, especially in development
      return () => {
        clearInterval(intervalId);
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
