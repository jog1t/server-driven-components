/**
 * Reactive Runtime - Manages reactive component streams
 *
 * Handles component registration, subscription management, and deduplication.
 */

import type { Signal } from './signal';

export type StreamCallback<T> = {
  next: (value: T) => void;
};

export type StreamFunction<T> = (stream: StreamCallback<T>) => (() => void) | void;

export type Subscriber<T> = {
  send: (data: T) => void;
};

interface ReactiveStream<T = any> {
  initialValue: T;
  streamFn: StreamFunction<T>;
  scope: any[];
  subscribers: Set<Subscriber<T>>;
  cleanup?: () => void;
  currentValue: T;
}

class ReactiveRuntime {
  // Map of componentId+scopeHash -> ReactiveStream
  private streams = new Map<string, ReactiveStream>();

  /**
   * Register a reactive component stream
   */
  registerStream<T>(
    componentId: string,
    scope: any[],
    initialValue: T,
    streamFn: StreamFunction<T>
  ): string {
    const scopeKey = this.getScopeKey(componentId, scope);

    // Check if stream already exists for this scope
    if (this.streams.has(scopeKey)) {
      console.log(`[ReactiveRuntime] Reusing existing stream: ${scopeKey}`);
      return scopeKey;
    }

    console.log(`[ReactiveRuntime] Registering new stream: ${scopeKey}`, { scope });

    const stream: ReactiveStream<T> = {
      initialValue,
      streamFn,
      scope,
      subscribers: new Set(),
      currentValue: initialValue,
    };

    this.streams.set(scopeKey, stream);

    return scopeKey;
  }

  /**
   * Subscribe to a reactive stream
   */
  subscribe<T>(streamKey: string, subscriber: Subscriber<T>): () => void {
    const stream = this.streams.get(streamKey) as ReactiveStream<T> | undefined;

    if (!stream) {
      console.error(`[ReactiveRuntime] Stream not found: ${streamKey}`);
      return () => {};
    }

    console.log(`[ReactiveRuntime] New subscriber for stream: ${streamKey}`);

    // Add subscriber
    stream.subscribers.add(subscriber);

    // Send current value immediately
    subscriber.send(stream.currentValue);

    // Start stream if this is first subscriber
    if (stream.subscribers.size === 1 && !stream.cleanup) {
      this.startStream(streamKey, stream);
    }

    // Return unsubscribe function
    return () => {
      stream.subscribers.delete(subscriber);
      console.log(
        `[ReactiveRuntime] Subscriber removed from ${streamKey} (${stream.subscribers.size} remaining)`
      );

      // Stop stream if no more subscribers
      if (stream.subscribers.size === 0 && stream.cleanup) {
        console.log(`[ReactiveRuntime] Stopping stream: ${streamKey}`);
        stream.cleanup();
        stream.cleanup = undefined;
      }
    };
  }

  /**
   * Start a stream (begin producing values)
   */
  private startStream<T>(streamKey: string, stream: ReactiveStream<T>): void {
    console.log(`[ReactiveRuntime] Starting stream: ${streamKey}`);

    const cleanup = stream.streamFn({
      next: (value: T) => {
        stream.currentValue = value;
        // Broadcast to all subscribers
        stream.subscribers.forEach((sub) => sub.send(value));
      },
    });

    if (cleanup) {
      stream.cleanup = cleanup;
    }
  }

  /**
   * Subscribe to a signal
   */
  subscribeToSignal<T>(signal: Signal<T>, subscriber: Subscriber<T>): () => void {
    console.log(`[ReactiveRuntime] Subscribing to signal`);

    // Subscribe to signal changes
    const unsubscribe = signal.subscribe((value) => {
      subscriber.send(value);
    });

    return unsubscribe;
  }

  /**
   * Get current value for a stream
   */
  getCurrentValue<T>(streamKey: string): T | undefined {
    const stream = this.streams.get(streamKey);
    return stream?.currentValue;
  }

  /**
   * Generate scope key for deduplication
   */
  private getScopeKey(componentId: string, scope: any[]): string {
    // Serialize scope array to create unique key
    const scopeHash = JSON.stringify(scope);
    return `${componentId}:${scopeHash}`;
  }

  /**
   * Get stats for debugging
   */
  getStats() {
    return {
      totalStreams: this.streams.size,
      activeStreams: Array.from(this.streams.values()).filter((s) => s.cleanup).length,
      totalSubscribers: Array.from(this.streams.values()).reduce(
        (sum, s) => sum + s.subscribers.size,
        0
      ),
    };
  }
}

// Singleton instance
export const reactiveRuntime = new ReactiveRuntime();
