/**
 * reactive - HOC (Higher-Order Component) for reactive server components
 *
 * Automatically wraps a server component with the <Reactive> client boundary.
 * This eliminates the need to manually wrap components at usage sites.
 *
 * Usage:
 * ```tsx
 * // Define your reactive component
 * function ClockBase({ interval = 1000 }) {
 *   const time = useReactive(...)
 *   return <div>{time}</div>
 * }
 *
 * // Wrap it with reactive() HOC
 * export default reactive(ClockBase)
 * ```
 *
 * Now you can use it without the <Reactive> wrapper:
 * ```tsx
 * import Clock from './components/clock'
 * <Clock interval={1000} />  // No wrapper needed!
 * ```
 */

import type { ComponentType } from 'react';
import { Reactive } from './reactive';

/**
 * Wrap a server component to make it reactive
 *
 * This HOC automatically wraps the component with <Reactive> so users don't
 * need to manually wrap it at usage sites.
 *
 * @example
 * ```tsx
 * const Clock = reactive(function Clock({ interval }) {
 *   const time = useReactive(Date.now(), stream => {
 *     const id = setInterval(() => stream.next(Date.now()), interval)
 *     return () => clearInterval(id)
 *   }, [interval])
 *   return <div>{new Date(time).toLocaleTimeString()}</div>
 * })
 *
 * export default Clock
 * ```
 */
export function reactive<P extends Record<string, any>>(
  Component: ComponentType<P & { _reactiveData?: any }>
): ComponentType<P> {
  const ReactiveWrapper = (props: P) => {
    return (
      <Reactive>
        <Component {...props} />
      </Reactive>
    );
  };

  // Preserve component name for debugging
  const componentName = Component.displayName || Component.name || 'ReactiveComponent';
  ReactiveWrapper.displayName = `Reactive(${componentName})`;

  return ReactiveWrapper as ComponentType<P>;
}
