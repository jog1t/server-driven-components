/**
 * Channel Manager Factory
 *
 * Creates a type-safe channel manager with a pluggable backend.
 */

import type {
  ChannelBackend,
  ChannelDefinition,
  ChannelHandlers,
  BroadcastOptions,
  ChannelManager,
} from './types';

/**
 * Create a channel manager with the specified backend
 */
export function createChannelManager(backend: ChannelBackend): ChannelManager {
  return {
    /**
     * Define a new typed channel
     *
     * @example
     * ```ts
     * const clockChannel = defineChannel<
     *   { time: number },
     *   { userId?: string }
     * >('clock');
     * ```
     */
    defineChannel<TData = unknown, TScope = Record<string, never>>(
      name: string
    ): ChannelDefinition<TData, TScope> {
      return {
        name,
        __data: undefined as any, // Phantom type - only for TypeScript
        __scope: undefined as any, // Phantom type - only for TypeScript
      };
    },

    /**
     * Register handlers for a channel
     *
     * @example
     * ```ts
     * onChannel(clockChannel, {
     *   init: ({ broadcast }) => {
     *     const interval = setInterval(() => {
     *       broadcast({ time: Date.now() });
     *     }, 1000);
     *     return () => clearInterval(interval);
     *   },
     * });
     * ```
     */
    onChannel<TData, TScope>(
      channel: ChannelDefinition<TData, TScope>,
      handlers: ChannelHandlers<TData, TScope>
    ): void {
      backend.registerChannel(channel.name, handlers);
    },

    /**
     * Broadcast data to channel subscribers
     *
     * @example
     * ```ts
     * broadcast(clockChannel, { time: Date.now() });
     *
     * // With filter
     * broadcast(
     *   clockChannel,
     *   { time: Date.now() },
     *   { filter: (sub) => sub.scope.userId === '123' }
     * );
     * ```
     */
    broadcast<TData, TScope>(
      channel: ChannelDefinition<TData, TScope>,
      data: TData,
      options?: BroadcastOptions<TScope>
    ): void {
      backend.broadcast(channel.name, data, options);
    },

    /**
     * Access underlying backend (for advanced use cases)
     */
    backend,
  };
}
