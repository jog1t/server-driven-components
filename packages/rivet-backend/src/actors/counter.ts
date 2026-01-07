import { actor } from 'rivetkit';

/**
 * Counter actor with persistent state
 *
 * Demonstrates:
 * - Simple state management
 * - Actions for state updates
 * - Broadcasting state changes
 */
export const counter = actor({
  state: {
    count: 0,
    lastUpdated: Date.now()
  },

  onStateChange: (c, newState) => {
    // Broadcast state updates to all connected clients
    c.broadcast('countUpdated', {
      count: newState.count,
      lastUpdated: newState.lastUpdated
    });
  },

  actions: {
    /**
     * Increment the counter by 1
     */
    increment: (c) => {
      c.state.count += 1;
      c.state.lastUpdated = Date.now();
      return { count: c.state.count };
    },

    /**
     * Decrement the counter by 1
     */
    decrement: (c) => {
      c.state.count -= 1;
      c.state.lastUpdated = Date.now();
      return { count: c.state.count };
    },

    /**
     * Add a specific value to the counter
     */
    add: (c, value: number) => {
      c.state.count += value;
      c.state.lastUpdated = Date.now();
      return { count: c.state.count };
    },

    /**
     * Reset the counter to 0
     */
    reset: (c) => {
      c.state.count = 0;
      c.state.lastUpdated = Date.now();
      return { count: c.state.count };
    },

    /**
     * Get the current count
     */
    getCount: (c) => {
      return {
        count: c.state.count,
        lastUpdated: c.state.lastUpdated
      };
    }
  }
});
