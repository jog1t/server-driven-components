/**
 * Factory for creating reactive server components
 *
 * Eliminates the need to manually pass reactiveId by binding it at creation time.
 *
 * Usage:
 * ```tsx
 * // Define your reactive component
 * const MyClock = createReactiveComponent('my-clock-1', async ({ useSignal, useEffect }) => {
 *   const [time, setTime] = await useSignal('time', new Date().toISOString());
 *
 *   await useEffect(async () => {
 *     const interval = setInterval(() => setTime(new Date().toISOString()), 1000);
 *     return () => clearInterval(interval);
 *   }, []);
 *
 *   return <div>{new Date(time).toLocaleTimeString()}</div>;
 * });
 *
 * // Use it in your page (ID automatically wrapped)
 * <ReactiveWrapper componentId="my-clock-1">
 *   <MyClock />
 * </ReactiveWrapper>
 * ```
 */

import { ReactNode } from 'react';
import { useServerSignal, useServerEffect } from './server-hooks';

type ReactiveComponentContext = {
  useSignal: typeof useServerSignal;
  useEffect: typeof useServerEffect;
  componentId: string;
};

type ReactiveComponentFn = (ctx: ReactiveComponentContext) => Promise<ReactNode>;

/**
 * Create a reactive server component with bound ID
 *
 * The component ID is bound at creation time, so you don't need to pass it
 * every time you call useServerSignal or useServerEffect.
 *
 * @param componentId - Unique identifier for this component
 * @param component - Async function that defines the component
 * @returns Server component with bound ID
 */
export function createReactiveComponent(
  componentId: string,
  component: ReactiveComponentFn
) {
  return async function ReactiveServerComponent() {
    // Create bound versions of the hooks
    const boundUseSignal: typeof useServerSignal = async (key, initialValue) => {
      return useServerSignal(componentId, key as string, initialValue);
    };

    const boundUseEffect: typeof useServerEffect = async (effect, deps) => {
      return useServerEffect(componentId, effect, deps);
    };

    // Call the component with bound hooks
    return component({
      useSignal: boundUseSignal,
      useEffect: boundUseEffect,
      componentId,
    });
  };
}

/**
 * Alternative: Export helper that returns both component and ID
 *
 * Usage:
 * ```tsx
 * const { Component: MyClock, id } = defineReactive('my-clock', async ({ useSignal, useEffect }) => {
 *   // ... component logic
 * });
 *
 * // In page:
 * <ReactiveWrapper componentId={id}>
 *   <MyClock />
 * </ReactiveWrapper>
 * ```
 */
export function defineReactive(
  componentId: string,
  component: ReactiveComponentFn
) {
  return {
    Component: createReactiveComponent(componentId, component),
    id: componentId,
  };
}
