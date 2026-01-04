/**
 * Server-Side State Management for Reactive Server Components
 *
 * This module provides state management for server components that need
 * reactive updates. Since server components are stateless by design,
 * we maintain state in a server-side registry and notify clients via SSE
 * when state changes.
 */

type StateValue = any;
type ComponentStates = Map<string, StateValue>;
type EffectCleanup = () => void;
type StateChangeCallback = (componentId: string, key: string, value: StateValue) => void;

interface SSEClient {
  send: (data: any) => void;
  componentId: string;
}

class ServerStateManager {
  // Component state storage: componentId -> { key: value }
  private states = new Map<string, ComponentStates>();

  // Component effect cleanups: componentId -> [cleanup functions]
  private effects = new Map<string, EffectCleanup[]>();

  // SSE subscribers: componentId -> Set<SSEClient>
  private subscribers = new Map<string, Set<SSEClient>>();

  // State change listeners for debugging/logging
  private listeners: StateChangeCallback[] = [];

  /**
   * Get state value for a component
   */
  getState(componentId: string, key: string): StateValue | undefined {
    const componentState = this.states.get(componentId);
    return componentState?.get(key);
  }

  /**
   * Get all state for a component
   */
  getAllState(componentId: string): Record<string, StateValue> {
    const componentState = this.states.get(componentId);
    if (!componentState) return {};

    const result: Record<string, StateValue> = {};
    for (const [key, value] of componentState.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Set state value for a component and notify subscribers
   */
  setState(componentId: string, key: string, value: StateValue): void {
    // Get or create component state
    let componentState = this.states.get(componentId);
    if (!componentState) {
      componentState = new Map();
      this.states.set(componentId, componentState);
    }

    // Update state
    const oldValue = componentState.get(key);
    componentState.set(key, value);

    console.log(`[StateManager] ${componentId}.${key} = ${JSON.stringify(value)}`);

    // Notify listeners
    this.listeners.forEach((listener) => listener(componentId, key, value));

    // Notify SSE subscribers if value changed
    if (oldValue !== value) {
      this.notifySubscribers(componentId, key, value);
    }
  }

  /**
   * Register an effect cleanup function for a component
   */
  registerEffect(componentId: string, cleanup: EffectCleanup): void {
    let cleanups = this.effects.get(componentId);
    if (!cleanups) {
      cleanups = [];
      this.effects.set(componentId, cleanups);
    }
    cleanups.push(cleanup);
    console.log(`[StateManager] Registered effect cleanup for ${componentId}`);
  }

  /**
   * Cleanup all effects for a component
   */
  cleanupComponent(componentId: string): void {
    const cleanups = this.effects.get(componentId);
    if (cleanups) {
      console.log(`[StateManager] Cleaning up ${cleanups.length} effects for ${componentId}`);
      cleanups.forEach((cleanup) => cleanup());
      this.effects.delete(componentId);
    }

    // Also remove state
    this.states.delete(componentId);

    // Close all SSE connections for this component
    const subs = this.subscribers.get(componentId);
    if (subs) {
      subs.clear();
      this.subscribers.delete(componentId);
    }
  }

  /**
   * Subscribe an SSE client to component updates
   */
  subscribe(client: SSEClient): () => void {
    const { componentId } = client;

    let subs = this.subscribers.get(componentId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(componentId, subs);
    }

    subs.add(client);
    console.log(`[StateManager] Client subscribed to ${componentId} (total: ${subs.size})`);

    // Return unsubscribe function
    return () => {
      subs?.delete(client);
      console.log(`[StateManager] Client unsubscribed from ${componentId}`);

      // If no more subscribers, consider cleanup
      if (subs?.size === 0) {
        console.log(`[StateManager] No more subscribers for ${componentId}`);
        // Optional: cleanup component after timeout
      }
    };
  }

  /**
   * Notify all subscribers of a component about state change
   */
  private notifySubscribers(componentId: string, key: string, value: StateValue): void {
    const subs = this.subscribers.get(componentId);
    if (!subs || subs.size === 0) return;

    const message = {
      type: 'component-update',
      componentId,
      timestamp: new Date().toISOString(),
      state: {
        [key]: value,
      },
      allState: this.getAllState(componentId),
    };

    console.log(`[StateManager] Notifying ${subs.size} subscribers of ${componentId}`);

    subs.forEach((client) => {
      try {
        client.send(message);
      } catch (error) {
        console.error(`[StateManager] Error sending to client:`, error);
        // Remove failed client
        subs.delete(client);
      }
    });
  }

  /**
   * Add a state change listener for debugging
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get stats about current state
   */
  getStats() {
    return {
      components: this.states.size,
      effects: this.effects.size,
      subscribers: Array.from(this.subscribers.entries()).map(([id, subs]) => ({
        componentId: id,
        count: subs.size,
      })),
    };
  }
}

// Singleton instance
export const stateManager = new ServerStateManager();

// Export for debugging
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__serverStateManager = stateManager;
}
