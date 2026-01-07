import { actor } from 'rivetkit';

/**
 * Reactive State Actor
 *
 * Stores reactive signals and streams with automatic broadcasting.
 * This actor provides persistent, multi-user reactive state for
 * reactive-rsc server components.
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
