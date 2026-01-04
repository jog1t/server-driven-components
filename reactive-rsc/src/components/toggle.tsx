'use client';

import { useState } from 'react';

export const Toggle = () => {
  const [isOn, setIsOn] = useState(false);

  return (
    <section className="border-green-400 -mx-4 mt-4 rounded-sm border border-dashed p-4">
      <h3 className="text-sm font-bold mb-2">Client Component: Toggle</h3>
      <div className="mb-2">
        Status: <span className="font-bold">{isOn ? 'ON' : 'OFF'}</span>
      </div>
      <button
        onClick={() => setIsOn(!isOn)}
        className={`rounded-xs px-4 py-1 text-sm text-white transition-colors ${
          isOn ? 'bg-green-600' : 'bg-gray-600'
        }`}
      >
        Toggle {isOn ? 'Off' : 'On'}
      </button>
    </section>
  );
};
