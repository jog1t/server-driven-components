import type { Registry } from 'rivetkit';
import type { Signal } from '../signal';
import type { StreamCallback, StreamFunction, Subscriber } from '../runtime';

interface ActorHandle {
  call(action: string, params?: any): Promise<any>;
  // We'll implement WebSocket subscription for real-time updates
}

/**
 * RivetKit Backend for Reactive State
 *
 * Stores signals and streams in RivetKit actors with automatic
 * persistence and multi-server coordination.
 */
export class RivetBackend {
  private actorId: string;
  private subscribers = new Map<string, Set<Subscriber<any>>>();
  private streamCleanups = new Map<string, () => void>();

  constructor(
    private registry: Registry<any>,
    private actorName: string
  ) {
    // Use a single actor instance for all reactive state
    this.actorId = 'default';
  }

  /**
   * Get the actor handle
   */
  private async getActor(): Promise<ActorHandle> {
    // RivetKit client API - need to get the client from registry
    // For now, we'll use direct actor calls
    return {
      call: async (action: string, params?: any) => {
        // This will be replaced with actual RivetKit client calls
        // For now, placeholder
        throw new Error('RivetKit client integration pending');
      },
    };
  }

  /**
   * Register a stream with the backend
   */
  async registerStream<T>(
    streamKey: string,
    initialValue: T,
    streamFn: StreamFunction<T>
  ): Promise<void> {
    // Store initial value in actor
    const actor = await this.getActor();
    await actor.call('updateStream', { key: streamKey, value: initialValue });

    // Start the stream if there are subscribers
    if (this.subscribers.has(streamKey) && this.subscribers.get(streamKey)!.size > 0) {
      this.startStream(streamKey, streamFn);
    }
  }

  /**
   * Subscribe to a stream
   */
  subscribe<T>(streamKey: string, subscriber: Subscriber<T>): () => void {
    // Add subscriber
    if (!this.subscribers.has(streamKey)) {
      this.subscribers.set(streamKey, new Set());
    }
    this.subscribers.get(streamKey)!.add(subscriber);

    // Get current value from actor and send immediately
    this.getCurrentValue(streamKey).then((value) => {
      if (value !== undefined) {
        subscriber.send(value);
      }
    });

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(streamKey);
      if (subs) {
        subs.delete(subscriber);

        // Stop stream if no more subscribers
        if (subs.size === 0) {
          const cleanup = this.streamCleanups.get(streamKey);
          if (cleanup) {
            cleanup();
            this.streamCleanups.delete(streamKey);
          }
        }
      }
    };
  }

  /**
   * Start a stream (begin producing values)
   */
  private startStream<T>(streamKey: string, streamFn: StreamFunction<T>): void {
    const cleanup = streamFn({
      next: async (value: T) => {
        // Update actor state
        const actor = await this.getActor();
        await actor.call('updateStream', { key: streamKey, value });

        // Broadcast to local subscribers
        const subs = this.subscribers.get(streamKey);
        if (subs) {
          subs.forEach((sub) => sub.send(value));
        }
      },
    });

    if (cleanup) {
      this.streamCleanups.set(streamKey, cleanup);
    }
  }

  /**
   * Get current value for a stream
   */
  async getCurrentValue<T>(streamKey: string): Promise<T | undefined> {
    const actor = await this.getActor();
    const result = await actor.call('getStream', { key: streamKey });
    return result.exists ? result.value : undefined;
  }

  /**
   * Subscribe to a signal
   */
  subscribeToSignal<T>(signal: Signal<T>, subscriber: Subscriber<T>): () => void {
    // Signals have their own subscription mechanism
    // We need to sync signal changes to the actor
    const unsubscribe = signal.subscribe(async (value) => {
      // Update actor
      const actor = await this.getActor();
      await actor.call('setSignal', { key: signal.toString(), value });

      // Send to subscriber
      subscriber.send(value);
    });

    return unsubscribe;
  }

  /**
   * Get or create a signal backed by RivetKit
   */
  async getSignal<T>(key: string, initialValue?: T): Promise<T | undefined> {
    const actor = await this.getActor();
    const result = await actor.call('getSignal', { key });

    if (!result.exists && initialValue !== undefined) {
      await actor.call('setSignal', { key, value: initialValue });
      return initialValue;
    }

    return result.value;
  }

  /**
   * Set a signal value
   */
  async setSignal<T>(key: string, value: T): Promise<void> {
    const actor = await this.getActor();
    await actor.call('setSignal', { key, value });
  }
}
