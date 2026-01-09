import { actor, type ActorContext } from 'rivetkit';

/**
 * Reactive State Actor
 *
 * Stores reactive signals and streams with automatic broadcasting.
 * This actor provides persistent, multi-user reactive state for
 * reactive-rsc server components.
 *
 * To add authentication or custom logic, use `createReactiveStateActor()` instead.
 */
export const reactiveStateActor = actor({
  state: {
    // Signal storage: key -> value
    signals: {} as Record<string, any>,

    // Stream metadata: key -> current value
    streams: {} as Record<string, any>,
  },

  onStateChange: (c, newState) => {
    // Broadcast all state changes to connected clients
    c.broadcast('stateChanged', {
      signals: newState.signals,
      streams: newState.streams,
    });
  },

  actions: {
    /**
     * Get a signal value by key
     */
    getSignal: (c, { key }: { key: string }) => {
      return {
        value: c.state.signals[key],
        exists: key in c.state.signals,
      };
    },

    /**
     * Set a signal value
     */
    setSignal: (c, { key, value }: { key: string; value: any }) => {
      c.state.signals[key] = value;
      return { success: true, key, value };
    },

    /**
     * Delete a signal
     */
    deleteSignal: (c, { key }: { key: string }) => {
      const existed = key in c.state.signals;
      delete c.state.signals[key];
      return { success: true, existed };
    },

    /**
     * Get all signals
     */
    getAllSignals: (c) => {
      return { signals: c.state.signals };
    },

    /**
     * Get a stream value by key
     */
    getStream: (c, { key }: { key: string }) => {
      return {
        value: c.state.streams[key],
        exists: key in c.state.streams,
      };
    },

    /**
     * Update a stream value
     */
    updateStream: (c, { key, value }: { key: string; value: any }) => {
      c.state.streams[key] = value;
      return { success: true, key, value };
    },

    /**
     * Delete a stream
     */
    deleteStream: (c, { key }: { key: string }) => {
      const existed = key in c.state.streams;
      delete c.state.streams[key];
      return { success: true, existed };
    },

    /**
     * Get all streams
     */
    getAllStreams: (c) => {
      return { streams: c.state.streams };
    },

    /**
     * Clear all state (useful for testing)
     */
    clear: (c) => {
      c.state.signals = {};
      c.state.streams = {};
      return { success: true };
    },
  },
});

/**
 * Action hook that can wrap actor actions with custom logic
 */
export type ActionHook<TParams = any, TResult = any> = (
  context: ActorContext,
  params: TParams,
  next: (params: TParams) => TResult | Promise<TResult>
) => TResult | Promise<TResult>;

/**
 * Hooks that can be applied to the reactive state actor
 */
export interface ReactiveStateActorHooks {
  /**
   * Called when a client connects to the actor
   * Use this to validate authentication/authorization
   */
  onConnect?: (context: ActorContext) => void | Promise<void>;

  /**
   * Called before any action is executed
   * Use this to implement authorization logic
   */
  beforeAction?: ActionHook<any, any>;

  /**
   * Specific hooks for each action
   */
  getSignal?: ActionHook<{ key: string }, any>;
  setSignal?: ActionHook<{ key: string; value: any }, any>;
  deleteSignal?: ActionHook<{ key: string }, any>;
  getAllSignals?: ActionHook<void, any>;
  getStream?: ActionHook<{ key: string }, any>;
  updateStream?: ActionHook<{ key: string; value: any }, any>;
  deleteStream?: ActionHook<{ key: string }, any>;
  getAllStreams?: ActionHook<void, any>;
  clear?: ActionHook<void, any>;
}

/**
 * Create a reactive state actor with custom hooks
 *
 * This allows you to add authorization, logging, or any custom logic
 * before/after actions execute. You control how to check permissions
 * (via input params, actor state, etc.)
 *
 * @example
 * ```typescript
 * const myActor = createReactiveStateActor({
 *   onConnect: (c) => {
 *     // Validate on connection
 *     console.log('Client connected to actor', c.actorId);
 *   },
 *
 *   beforeAction: async (c, params, next) => {
 *     // Check authorization before ANY action
 *     // (Access user info however you pass it - e.g., via params)
 *     if (!params.userId) {
 *       throw new Error('userId required');
 *     }
 *     return await next(params);
 *   },
 *
 *   setSignal: async (c, params, next) => {
 *     // Or check authorization for specific actions
 *     if (params.key.startsWith('admin:') && !params.isAdmin) {
 *       throw new Error('Admin access required');
 *     }
 *     return await next(params);
 *   }
 * });
 * ```
 */
export function createReactiveStateActor(
  hooks: ReactiveStateActorHooks = {}
) {
  return actor({
    state: {
      signals: {} as Record<string, any>,
      streams: {} as Record<string, any>,
    },

    onConnect: hooks.onConnect
      ? async (c) => {
          await hooks.onConnect!(c);
        }
      : undefined,

    onStateChange: (c, newState) => {
      c.broadcast('stateChanged', {
        signals: newState.signals,
        streams: newState.streams,
      });
    },

    actions: {
      getSignal: async (c, params: { key: string }) => {
        const next = () => ({
          value: c.state.signals[params.key],
          exists: params.key in c.state.signals,
        });

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.getSignal) {
          return hooks.getSignal(c, params, next);
        }
        return next();
      },

      setSignal: async (c, params: { key: string; value: any }) => {
        const next = () => {
          c.state.signals[params.key] = params.value;
          return { success: true, key: params.key, value: params.value };
        };

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.setSignal) {
          return hooks.setSignal(c, params, next);
        }
        return next();
      },

      deleteSignal: async (c, params: { key: string }) => {
        const next = () => {
          const existed = params.key in c.state.signals;
          delete c.state.signals[params.key];
          return { success: true, existed };
        };

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.deleteSignal) {
          return hooks.deleteSignal(c, params, next);
        }
        return next();
      },

      getAllSignals: async (c, params?: void) => {
        const next = () => ({ signals: c.state.signals });

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.getAllSignals) {
          return hooks.getAllSignals(c, params, next);
        }
        return next();
      },

      getStream: async (c, params: { key: string }) => {
        const next = () => ({
          value: c.state.streams[params.key],
          exists: params.key in c.state.streams,
        });

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.getStream) {
          return hooks.getStream(c, params, next);
        }
        return next();
      },

      updateStream: async (c, params: { key: string; value: any }) => {
        const next = () => {
          c.state.streams[params.key] = params.value;
          return { success: true, key: params.key, value: params.value };
        };

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.updateStream) {
          return hooks.updateStream(c, params, next);
        }
        return next();
      },

      deleteStream: async (c, params: { key: string }) => {
        const next = () => {
          const existed = params.key in c.state.streams;
          delete c.state.streams[params.key];
          return { success: true, existed };
        };

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.deleteStream) {
          return hooks.deleteStream(c, params, next);
        }
        return next();
      },

      getAllStreams: async (c, params?: void) => {
        const next = () => ({ streams: c.state.streams });

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.getAllStreams) {
          return hooks.getAllStreams(c, params, next);
        }
        return next();
      },

      clear: async (c, params?: void) => {
        const next = () => {
          c.state.signals = {};
          c.state.streams = {};
          return { success: true };
        };

        if (hooks.beforeAction) {
          return hooks.beforeAction(c, params, next);
        }
        if (hooks.clear) {
          return hooks.clear(c, params, next);
        }
        return next();
      },
    },
  });
}
