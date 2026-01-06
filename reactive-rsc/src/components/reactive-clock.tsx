/**
 * Reactive Clock - TRUE Server Component (RSC Streaming Version)
 *
 * This is a server component that receives data from channel broadcasts.
 * It's rendered on the server and streamed as RSC payload.
 */

interface ReactiveClockProps {
  interval?: number;
  _channelData?: { time: number; formatted: string };
}

/**
 * Server component that displays current time from channel data
 *
 * This component is rendered on the server. When the channel broadcasts,
 * it's re-rendered with new data and streamed as RSC payload to the client.
 */
export async function ReactiveClock({ interval = 1000, _channelData }: ReactiveClockProps) {
  // This runs on the SERVER
  // If we have channel data, use it; otherwise use server time
  const displayTime = _channelData?.formatted || new Date().toLocaleTimeString();
  const serverRenderTime = new Date().toISOString();

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-300">
      <h4 className="text-lg font-bold mb-3 text-purple-800">
        ⚡ RSC Streaming Clock (interval: {interval / 1000}s)
      </h4>

      <div className="text-3xl font-mono font-bold text-purple-900">{displayTime}</div>

      <div className="mt-2 text-xs text-gray-600">
        Server rendered: {new Date(serverRenderTime).toLocaleTimeString()}
      </div>

      <div className="mt-3 p-2 bg-white/50 rounded text-xs text-purple-700">
        🎯 <strong>TRUE Server Component + RSC Streaming!</strong>
        <br />
        This component renders on the server. Channel broadcasts trigger re-render,
        <br />
        and RSC payload is streamed directly over SSE. No page reload!
      </div>
    </div>
  );
}
