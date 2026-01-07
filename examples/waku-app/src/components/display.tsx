'use client';

import { useState } from 'react';

interface DisplayProps {
  initialMessage: string;
  serverTime: string;
}

export const Display = ({ initialMessage, serverTime }: DisplayProps) => {
  const [message, setMessage] = useState(initialMessage);

  return (
    <section className="border-purple-400 -mx-4 mt-4 rounded-sm border border-dashed p-4">
      <h3 className="text-sm font-bold mb-2">Client Component: Display (with Server Props)</h3>
      <div className="mb-2 text-sm">
        <div className="mb-1">
          <span className="text-gray-600">Server passed prop:</span>{' '}
          <span className="font-mono text-xs">{serverTime}</span>
        </div>
        <div>
          <span className="text-gray-600">Current message:</span>{' '}
          <span className="font-bold">{message}</span>
        </div>
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full rounded-xs border border-gray-300 px-2 py-1 text-sm"
        placeholder="Type something..."
      />
    </section>
  );
};
