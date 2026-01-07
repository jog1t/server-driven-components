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
  context?: any;
}

class ReactiveRuntime {
  // Map of componentId+scopeHash -> ReactiveStream
  private streams = new Map<string, ReactiveStream>();

  // Map of signal -> context for component-level auth
  private signalContexts = new Map<any, any>();

  /**
   * Register a reactive component stream
   */
  registerStream<T>(
    componentId: string,
    scope: any[],
    initialValue: T,
    streamFn: StreamFunction<T>,
    context?: any
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
      context,
    };

    this.streams.set(scopeKey, stream);

    return scopeKey;
  }

  /**
   * Set context for a signal (used by components)
   */
  setComponentContext(signal: any, context: any): void {
    this.signalContexts.set(signal, context);
  }

  /**
   * Get context for a signal
   */
  getComponentContext(signal: any): any | undefined {
    return this.signalContexts.get(signal);
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
   *
   * Uses signal's built-in subscribe method which is powered by
   * @preact/signals-core's effect system for efficient reactivity
   */
  subscribeToSignal<T>(signal: Signal<T>, subscriber: Subscriber<T>): () => void {
    console.log(`[ReactiveRuntime] Subscribing to signal`);

    // Subscribe to signal changes using the signal's subscribe method
    // This now uses Preact's effect() under the hood for auto-tracking
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
   * Get context for a stream
   */
  getStreamContext(streamKey: string): any | undefined {
    const stream = this.streams.get(streamKey);
    return stream?.context;
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
