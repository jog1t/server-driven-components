/**
 * Reactive - Enhanced wrapper with automatic ID generation using React's useId()
 *
 * This wrapper generates a unique ID using React's useId() and passes it
 * to both the SSE connection and the server component.
 *
 * Usage:
 * ```tsx
 * // Server component receives _reactiveId prop automatically
 * export async function MyClock({ _reactiveId }: { _reactiveId?: string }) {
 *   const [time, setTime] = await useServerSignal(_reactiveId!, 'time', Date.now());
 *   await useServerEffect(_reactiveId!, async () => {
 *     const interval = setInterval(() => setTime(Date.now()), 1000);
 *     return () => clearInterval(interval);
 *   }, []);
 *   return <div>{new Date(time).toLocaleTimeString()}</div>;
 * }
 *
 * // Wrap with <Reactive> - no manual ID needed!
 * <Reactive>
 *   <MyClock />
 * </Reactive>
 * ```
 */

'use client';

import { useId, type ReactElement, cloneElement } from 'react';
import { ReactiveWrapper } from './reactive-wrapper';

interface ReactiveProps {
  children: ReactElement;
  showDebug?: boolean;
  id?: string; // Optional manual ID override
}

/**
 * Enhanced reactive wrapper with automatic ID generation using React's useId()
 *
 * Uses React's useId() hook (which works in both client and server components)
 * to generate a stable ID that's shared between the SSE connection and the server component.
 *
 * The ID is injected into the server component via the special _reactiveId prop.
 */
export function Reactive({ children, showDebug = true, id: manualId }: ReactiveProps) {
  // Generate automatic ID using React's useId() hook
  const autoId = useId();
  const componentId = manualId || autoId;

  // Clone the server component and inject the _reactiveId prop
  const enhancedChildren = cloneElement(children, {
    // @ts-ignore - _reactiveId is a special prop we inject
    _reactiveId: componentId,
  });

  return (
    <ReactiveWrapper componentId={componentId} showDebug={showDebug}>
      {enhancedChildren}
    </ReactiveWrapper>
  );
}
