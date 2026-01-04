/**
 * Reactive Context - Provides reactive ID to server components via Context
 *
 * This allows server components to access their reactive ID without
 * needing it passed as a prop.
 *
 * Usage:
 * ```tsx
 * <ReactiveProvider>
 *   <MyServerComponent />
 * </ReactiveProvider>
 *
 * // In server component:
 * export async function MyServerComponent() {
 *   const id = useReactiveId(); // Gets ID from context!
 *   const [state] = await useServerSignal(id, 'key', initial);
 * }
 * ```
 */

'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { ReactiveWrapper } from '../components/reactive-wrapper';

const ReactiveIdContext = createContext<string | null>(null);

interface ReactiveProviderProps {
  children: ReactNode;
  showDebug?: boolean;
  id?: string;
}

/**
 * Reactive Provider - wraps server components and provides reactive ID via context
 */
export function ReactiveProvider({ children, showDebug = true, id: manualId }: ReactiveProviderProps) {
  const autoId = useId();
  const componentId = manualId || autoId;

  return (
    <ReactiveIdContext.Provider value={componentId}>
      <ReactiveWrapper componentId={componentId} showDebug={showDebug}>
        {children}
      </ReactiveWrapper>
    </ReactiveIdContext.Provider>
  );
}

/**
 * Hook to get the reactive ID from context
 *
 * This can be called from client components that are children of ReactiveProvider.
 * Server components cannot use context, so they still need the ID passed as prop.
 */
export function useReactiveId(): string {
  const id = useContext(ReactiveIdContext);
  if (!id) {
    throw new Error('useReactiveId must be used within a ReactiveProvider');
  }
  return id;
}
