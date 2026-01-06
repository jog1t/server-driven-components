/**
 * In-Memory Channel Backend
 *
 * Simple backend for development and single-instance deployments.
 * State is stored in memory and lost on server restart.
 */

import type {
  ChannelBackend,
  ChannelHandlers,
  Subscriber,
  ScopeInstance,
  BroadcastOptions,
} from '../types';

export function createMemoryBackend(): ChannelBackend {
  // Channel name -> handlers
  const channels = new Map<string, ChannelHandlers<any, any>>();

  // Scope key -> active scope instance
  const activeScopes = new Map<string, ScopeInstance>();

  /**
   * Generate unique key for channel+scope combination
   */
  function getScopeKey(channelName: string, scope: any): string {
    return `${channelName}:${JSON.stringify(scope)}`;
  }

  return {
    registerChannel(name: string, handlers: ChannelHandlers<any, any>) {
      console.log(`[MemoryBackend] Registering channel: ${name}`);
      channels.set(name, handlers);
    },

    subscribe(channelName: string, scope: any, callback: (data: any) => void) {
      const handlers = channels.get(channelName);
      if (!handlers) {
        console.error(`[MemoryBackend] Channel not registered: ${channelName}`);
        return () => {};
      }

      const scopeKey = getScopeKey(channelName, scope);
      const subscriber: Subscriber = { send: callback };

      // Initialize scope if first subscriber
      if (!activeScopes.has(scopeKey)) {
        console.log(`[MemoryBackend] Initializing scope: ${scopeKey}`);

        const scopeInstance: ScopeInstance = {
          subscribers: new Set([subscriber]),
          scope,
        };

        // Call init handler
        if (handlers.init) {
          const cleanup = handlers.init({
            scope,
            broadcast: (data) => {
              // Broadcast to all subscribers of this scope
              for (const sub of scopeInstance.subscribers) {
                sub.send(data);
              }
            },
          });

          if (cleanup) {
            scopeInstance.cleanup = cleanup;
          }
        }

        activeScopes.set(scopeKey, scopeInstance);
      } else {
        // Add subscriber to existing scope
        const scopeInstance = activeScopes.get(scopeKey)!;
        scopeInstance.subscribers.add(subscriber);
        console.log(
          `[MemoryBackend] Added subscriber to ${scopeKey} (total: ${scopeInstance.subscribers.size})`
        );
      }

      // Call onSubscribe
      if (handlers.onSubscribe) {
        handlers.onSubscribe({ scope, subscriber });
      }

      // Return unsubscribe function
      return () => {
        const scopeInstance = activeScopes.get(scopeKey);
        if (!scopeInstance) return;

        scopeInstance.subscribers.delete(subscriber);
        console.log(
          `[MemoryBackend] Removed subscriber from ${scopeKey} (remaining: ${scopeInstance.subscribers.size})`
        );

        // Cleanup if last subscriber
        if (scopeInstance.subscribers.size === 0) {
          console.log(`[MemoryBackend] Cleaning up scope: ${scopeKey}`);

          if (scopeInstance.cleanup) {
            scopeInstance.cleanup();
          }

          activeScopes.delete(scopeKey);

          // Call onUnsubscribe
          if (handlers.onUnsubscribe) {
            handlers.onUnsubscribe({ scope, subscriber });
          }
        }
      };
    },

    broadcast(channelName: string, data: any, options?: BroadcastOptions<any>) {
      let broadcastCount = 0;

      // Iterate all active scopes for this channel
      for (const [scopeKey, scopeInstance] of activeScopes) {
        if (!scopeKey.startsWith(`${channelName}:`)) continue;

        // Apply filter if provided
        if (options?.filter && !options.filter({ scope: scopeInstance.scope })) {
          continue;
        }

        // Broadcast to all subscribers in this scope
        for (const subscriber of scopeInstance.subscribers) {
          subscriber.send(data);
          broadcastCount++;
        }
      }

      console.log(
        `[MemoryBackend] Broadcast to ${channelName}: ${broadcastCount} subscribers`
      );
    },
  };
}
