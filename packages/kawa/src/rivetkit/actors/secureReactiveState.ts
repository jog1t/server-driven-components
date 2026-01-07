/**
 * Secure Reactive State Actor
 *
 * Example actor demonstrating auth guards and permissions.
 * Shows how to build secure actors with custom authorization logic.
 */

import { actor } from 'rivetkit';
import {
  withGuards,
  requireAuth,
  requireRole,
  requireOwnership,
  rateLimit,
  createAuditLog,
  type AuthActorContext,
} from '../auth';

/**
 * Secure reactive state actor with permission checks
 *
 * Features:
 * - Authenticated reads and writes
 * - Role-based access control for admin actions
 * - Rate limiting on mutations
 * - Audit logging
 * - Resource ownership validation
 */
export const secureReactiveStateActor = actor({
  state: {
    // Signal storage: key -> { value, ownerId, createdAt }
    signals: {} as Record<string, { value: any; ownerId?: string; createdAt: number }>,

    // Stream metadata: key -> { value, ownerId }
    streams: {} as Record<string, { value: any; ownerId?: string }>,

    // Audit log
    auditLog: [] as Array<{
      timestamp: number;
      userId?: string;
      action: string;
      key: string;
      success: boolean;
    }>,
  },

  onStateChange: (c, newState) => {
    // Broadcast signals (without internal metadata)
    const publicSignals: Record<string, any> = {};
    for (const [key, data] of Object.entries(newState.signals)) {
      publicSignals[key] = data.value;
    }

    const publicStreams: Record<string, any> = {};
    for (const [key, data] of Object.entries(newState.streams)) {
      publicStreams[key] = data.value;
    }

    c.broadcast('stateChanged', {
      signals: publicSignals,
      streams: publicStreams,
    });
  },

  actions: {
    /**
     * Get a signal value (authenticated users only)
     */
    getSignal: withGuards(requireAuth, (c: AuthActorContext, { key }: { key: string }) => {
      const data = c.state.signals[key];

      return {
        value: data?.value,
        exists: key in c.state.signals,
        ownerId: data?.ownerId,
      };
    }),

    /**
     * Set a signal value (authenticated + rate limited)
     */
    setSignal: withGuards(
      [requireAuth, rateLimit({ maxCalls: 100, windowMs: 60000 })],
      (c: AuthActorContext, { key, value }: { key: string; value: any }) => {
        const userId = c.user?.userId || c.auth?.userId;

        // Check if signal exists and user is not the owner
        const existing = c.state.signals[key];
        if (existing && existing.ownerId && existing.ownerId !== userId) {
          // Only owner or admin can modify
          const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';
          if (!isAdmin) {
            c.state.auditLog.push({
              timestamp: Date.now(),
              userId,
              action: 'setSignal',
              key,
              success: false,
            });

            throw new Error(`Permission denied: signal '${key}' is owned by another user`);
          }
        }

        c.state.signals[key] = {
          value,
          ownerId: existing?.ownerId || userId,
          createdAt: existing?.createdAt || Date.now(),
        };

        c.state.auditLog.push({
          timestamp: Date.now(),
          userId,
          action: 'setSignal',
          key,
          success: true,
        });

        return { success: true, key, value };
      }
    ),

    /**
     * Delete a signal (owner or admin only)
     */
    deleteSignal: withGuards(
      requireAuth,
      (c: AuthActorContext, { key }: { key: string }) => {
        const userId = c.user?.userId || c.auth?.userId;
        const existing = c.state.signals[key];

        if (existing?.ownerId && existing.ownerId !== userId) {
          const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';
          if (!isAdmin) {
            throw new Error(
              `Permission denied: can only delete your own signals (or be admin)`
            );
          }
        }

        const existed = key in c.state.signals;
        delete c.state.signals[key];

        c.state.auditLog.push({
          timestamp: Date.now(),
          userId,
          action: 'deleteSignal',
          key,
          success: true,
        });

        return { success: true, existed };
      }
    ),

    /**
     * Get all signals (authenticated users only)
     * Only returns signals the user owns or public signals
     */
    getAllSignals: withGuards(requireAuth, (c: AuthActorContext) => {
      const userId = c.user?.userId || c.auth?.userId;
      const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

      const signals: Record<string, any> = {};

      for (const [key, data] of Object.entries(c.state.signals)) {
        // Include if: no owner (public), user is owner, or user is admin
        if (!data.ownerId || data.ownerId === userId || isAdmin) {
          signals[key] = data.value;
        }
      }

      return { signals };
    }),

    /**
     * Update stream value (authenticated + rate limited)
     */
    updateStream: withGuards(
      [requireAuth, rateLimit({ maxCalls: 200, windowMs: 60000 })],
      (c: AuthActorContext, { key, value }: { key: string; value: any }) => {
        const userId = c.user?.userId || c.auth?.userId;
        const existing = c.state.streams[key];

        // Check ownership
        if (existing?.ownerId && existing.ownerId !== userId) {
          const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';
          if (!isAdmin) {
            throw new Error(`Permission denied: stream '${key}' is owned by another user`);
          }
        }

        c.state.streams[key] = {
          value,
          ownerId: existing?.ownerId || userId,
        };

        return { success: true, key, value };
      }
    ),

    /**
     * Get stream (authenticated)
     */
    getStream: withGuards(requireAuth, (c: AuthActorContext, { key }: { key: string }) => {
      const data = c.state.streams[key];
      return {
        value: data?.value,
        exists: key in c.state.streams,
      };
    }),

    /**
     * Delete stream (owner or admin only)
     */
    deleteStream: withGuards(
      requireAuth,
      (c: AuthActorContext, { key }: { key: string }) => {
        const userId = c.user?.userId || c.auth?.userId;
        const existing = c.state.streams[key];

        if (existing?.ownerId && existing.ownerId !== userId) {
          const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';
          if (!isAdmin) {
            throw new Error(`Permission denied: can only delete your own streams`);
          }
        }

        const existed = key in c.state.streams;
        delete c.state.streams[key];

        return { success: true, existed };
      }
    ),

    /**
     * Get all streams (filtered by ownership)
     */
    getAllStreams: withGuards(requireAuth, (c: AuthActorContext) => {
      const userId = c.user?.userId || c.auth?.userId;
      const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

      const streams: Record<string, any> = {};

      for (const [key, data] of Object.entries(c.state.streams)) {
        if (!data.ownerId || data.ownerId === userId || isAdmin) {
          streams[key] = data.value;
        }
      }

      return { streams };
    }),

    /**
     * Clear all state (admin only)
     */
    clear: withGuards(
      requireRole('admin'),
      (c: AuthActorContext) => {
        const userId = c.user?.userId || c.auth?.userId;

        c.state.signals = {};
        c.state.streams = {};

        c.state.auditLog.push({
          timestamp: Date.now(),
          userId,
          action: 'clear',
          key: '*',
          success: true,
        });

        return { success: true };
      }
    ),

    /**
     * Get audit log (admin only)
     */
    getAuditLog: withGuards(
      requireRole('admin'),
      (
        c: AuthActorContext,
        { limit = 100, userId }: { limit?: number; userId?: string } = {}
      ) => {
        let logs = c.state.auditLog;

        if (userId) {
          logs = logs.filter((log) => log.userId === userId);
        }

        // Return most recent entries
        return {
          logs: logs.slice(-limit).reverse(),
        };
      }
    ),

    /**
     * Get user's own signals
     */
    getMySignals: withGuards(requireAuth, (c: AuthActorContext) => {
      const userId = c.user?.userId || c.auth?.userId;
      const signals: Record<string, any> = {};

      for (const [key, data] of Object.entries(c.state.signals)) {
        if (data.ownerId === userId) {
          signals[key] = data.value;
        }
      }

      return { signals };
    }),
  },
});
