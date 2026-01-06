/**
 * Channel System Types
 *
 * Type-safe channel-based reactivity for server components.
 */

/**
 * Channel definition with typed data and scope
 */
export type ChannelDefinition<TData, TScope> = {
  readonly name: string;
  readonly __data: TData;
  readonly __scope: TScope;
};

/**
 * Subscriber interface
 */
export interface Subscriber<TData = any> {
  send: (data: TData) => void;
}

/**
 * Channel handlers define lifecycle and behavior
 */
export interface ChannelHandlers<TData, TScope> {
  /**
   * Runs when first subscriber connects to this channel+scope
   * Return a cleanup function to run when last subscriber disconnects
   */
  init?: (context: {
    scope: TScope;
    broadcast: (data: TData) => void;
  }) => void | (() => void);

  /**
   * Runs every time a subscriber connects
   */
  onSubscribe?: (context: {
    scope: TScope;
    subscriber: Subscriber<TData>;
  }) => void;

  /**
   * Runs every time a subscriber disconnects
   */
  onUnsubscribe?: (context: {
    scope: TScope;
    subscriber: Subscriber<TData>;
  }) => void;
}

/**
 * Broadcast options
 */
export interface BroadcastOptions<TScope> {
  /**
   * Filter which subscriptions receive the broadcast
   */
  filter?: (subscription: { scope: TScope }) => boolean;
}

/**
 * Scope instance tracking
 */
export interface ScopeInstance {
  subscribers: Set<Subscriber>;
  cleanup?: () => void;
  scope: any;
}

/**
 * Channel backend interface
 * Backends handle the actual state management and message delivery
 */
export interface ChannelBackend {
  /**
   * Register a channel with its handlers
   */
  registerChannel(name: string, handlers: ChannelHandlers<any, any>): void;

  /**
   * Subscribe to a channel with a specific scope
   * Returns unsubscribe function
   */
  subscribe(
    channelName: string,
    scope: any,
    callback: (data: any) => void
  ): () => void;

  /**
   * Broadcast data to channel subscribers
   */
  broadcast(channelName: string, data: any, options?: BroadcastOptions<any>): void;

  /**
   * Optional: Initialize backend
   */
  initialize?(): Promise<void>;

  /**
   * Optional: Cleanup backend
   */
  shutdown?(): Promise<void>;
}

/**
 * Channel manager API
 */
export interface ChannelManager {
  /**
   * Define a new typed channel
   */
  defineChannel<TData = unknown, TScope = Record<string, never>>(
    name: string
  ): ChannelDefinition<TData, TScope>;

  /**
   * Register handlers for a channel
   */
  onChannel<TData, TScope>(
    channel: ChannelDefinition<TData, TScope>,
    handlers: ChannelHandlers<TData, TScope>
  ): void;

  /**
   * Broadcast data to channel subscribers
   */
  broadcast<TData, TScope>(
    channel: ChannelDefinition<TData, TScope>,
    data: TData,
    options?: BroadcastOptions<TScope>
  ): void;

  /**
   * Access underlying backend
   */
  backend: ChannelBackend;
}
