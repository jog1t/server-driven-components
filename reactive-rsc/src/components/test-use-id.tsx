/**
 * Test if useId() works in server components
 */

import { useId } from 'react';

export async function TestUseId() {
  const id = useId();

  return (
    <div className="p-4 bg-blue-50 rounded">
      <h4 className="font-bold">Testing useId() in Server Component</h4>
      <p className="text-sm">Generated ID: <code className="bg-white px-1">{id}</code></p>
      <p className="text-xs text-gray-600 mt-2">
        {id ? '✅ useId() works in server components!' : '❌ useId() does not work'}
      </p>
    </div>
  );
}
