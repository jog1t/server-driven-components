import { actor } from 'rivetkit';

// Store interval IDs outside actor state
const timeIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Server time actor with automatic updates
 *
 * Demonstrates:
 * - Lifecycle hooks (onWake/onSleep)
 * - Interval-based updates
 * - Resource cleanup
 */
export const serverTime = actor({
  state: {
    currentTime: Date.now(),
    timezone: 'UTC'
  },

  onWake: (c) => {
    // Get actor ID from context - using a unique identifier
    const actorKey = 'global';

    // Start updating time every second when actor wakes up
    const intervalId = setInterval(() => {
      c.state.currentTime = Date.now();
    }, 1000);

    // Store interval ID for cleanup
    timeIntervals.set(actorKey, intervalId);
  },

  onSleep: (c) => {
    // Clean up interval when actor goes to sleep
    const actorKey = 'global';
    const intervalId = timeIntervals.get(actorKey);
    if (intervalId) {
      clearInterval(intervalId);
      timeIntervals.delete(actorKey);
    }
  },

  onStateChange: (c, newState) => {
    // Broadcast time updates to all connected clients
    c.broadcast('timeUpdated', {
      currentTime: newState.currentTime,
      timezone: newState.timezone
    });
  },

  actions: {
    /**
     * Get the current server time
     */
    getTime: (c) => {
      return {
        currentTime: c.state.currentTime,
        timezone: c.state.timezone,
        formatted: new Date(c.state.currentTime).toISOString()
      };
    },

    /**
     * Set the timezone for time display
     */
    setTimezone: (c, data: { timezone: string }) => {
      c.state.timezone = data.timezone;
      return {
        timezone: c.state.timezone
      };
    }
  }
});
