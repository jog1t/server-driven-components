/**
 * Authentication and authorization utilities for RivetKit actors
 *
 * This module provides flexible primitives for securing actor actions.
 * Users can define their own auth context and permission logic.
 */

import type { ActorContext } from 'rivetkit';

/**
 * User context that flows from components to actors
 *
 * Extend this interface in your app:
 * @example
 * declare module 'kawa/rivetkit' {
 *   interface UserContext {
 *     userId: string;
 *     role: 'admin' | 'user';
 *     permissions: string[];
 *   }
 * }
 */
export interface UserContext {
  [key: string]: any;
}

/**
 * Extended actor context with user information
 */
export interface AuthActorContext<TState = any> extends ActorContext<TState> {
  user?: UserContext;
  auth?: UserContext; // Alias for convenience
}

/**
 * Auth error thrown when permission is denied
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = 'UNAUTHORIZED',
    public details?: any
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Guard function type - validates context and throws if unauthorized
 */
export type Guard<TContext = UserContext, TParams = any> = (
  context: AuthActorContext,
  params: TParams
) => void | Promise<void>;

/**
 * Create a custom guard with your own logic
 *
 * @example
 * const requireAdmin = createGuard((ctx) => {
 *   if (!ctx.user || ctx.user.role !== 'admin') {
 *     throw new AuthError('Admin access required', 'FORBIDDEN');
 *   }
 * });
 */
export function createGuard<TContext = UserContext, TParams = any>(
  validate: (ctx: AuthActorContext, params: TParams) => void | Promise<void>
): Guard<TContext, TParams> {
  return validate;
}

/**
 * Compose multiple guards (all must pass)
 *
 * @example
 * const canEditPost = composeGuards(
 *   requireAuth,
 *   requireRole('admin', 'editor'),
 *   requirePermission('posts.edit')
 * );
 */
export function composeGuards<TParams = any>(
  ...guards: Guard<any, TParams>[]
): Guard<any, TParams> {
  return async (ctx, params) => {
    for (const guard of guards) {
      await guard(ctx, params);
    }
  };
}

/**
 * Require that user is authenticated
 */
export const requireAuth: Guard = (ctx) => {
  if (!ctx.user && !ctx.auth) {
    throw new AuthError('Authentication required', 'UNAUTHENTICATED');
  }
};

/**
 * Require specific user ID
 *
 * @example
 * requireUserId('user123')
 */
export function requireUserId(userId: string): Guard {
  return (ctx) => {
    requireAuth(ctx);
    const user = ctx.user || ctx.auth;
    if (user?.userId !== userId) {
      throw new AuthError(`Access denied: user ${userId} required`, 'FORBIDDEN');
    }
  };
}

/**
 * Require one of the specified roles
 *
 * @example
 * requireRole('admin', 'moderator')
 */
export function requireRole(...roles: string[]): Guard {
  return (ctx) => {
    requireAuth(ctx);
    const user = ctx.user || ctx.auth;
    if (!user?.role || !roles.includes(user.role)) {
      throw new AuthError(
        `Access denied: requires role ${roles.join(' or ')}`,
        'FORBIDDEN',
        { requiredRoles: roles, userRole: user?.role }
      );
    }
  };
}

/**
 * Require specific permission
 *
 * @example
 * requirePermission('posts.edit')
 */
export function requirePermission(permission: string): Guard {
  return (ctx) => {
    requireAuth(ctx);
    const user = ctx.user || ctx.auth;
    if (!user?.permissions || !user.permissions.includes(permission)) {
      throw new AuthError(
        `Access denied: requires permission '${permission}'`,
        'FORBIDDEN',
        { requiredPermission: permission }
      );
    }
  };
}

/**
 * Require user owns the resource (by checking userId in params)
 *
 * @example
 * // In actor action with params: { userId: string, ... }
 * requireOwnership('userId')
 */
export function requireOwnership(userIdField: string = 'userId'): Guard {
  return (ctx, params: any) => {
    requireAuth(ctx);
    const user = ctx.user || ctx.auth;
    const resourceUserId = params[userIdField];

    if (!resourceUserId) {
      throw new AuthError(
        `Cannot verify ownership: ${userIdField} not provided`,
        'BAD_REQUEST'
      );
    }

    if (user?.userId !== resourceUserId) {
      throw new AuthError(
        'Access denied: you can only access your own resources',
        'FORBIDDEN'
      );
    }
  };
}

/**
 * Rate limit guard - limits calls per user
 *
 * @example
 * const limitWrites = rateLimit({ maxCalls: 100, windowMs: 60000 });
 */
export function rateLimit(options: {
  maxCalls: number;
  windowMs: number;
  keyFn?: (ctx: AuthActorContext) => string;
}): Guard {
  const calls = new Map<string, number[]>();

  return (ctx) => {
    const key = options.keyFn
      ? options.keyFn(ctx)
      : (ctx.user?.userId || ctx.auth?.userId || 'anonymous');

    const now = Date.now();
    const userCalls = calls.get(key) || [];

    // Remove old calls outside the window
    const recentCalls = userCalls.filter((time) => now - time < options.windowMs);

    if (recentCalls.length >= options.maxCalls) {
      throw new AuthError(
        `Rate limit exceeded: ${options.maxCalls} calls per ${options.windowMs}ms`,
        'RATE_LIMIT_EXCEEDED',
        {
          maxCalls: options.maxCalls,
          windowMs: options.windowMs,
          retryAfter: Math.ceil((recentCalls[0] + options.windowMs - now) / 1000),
        }
      );
    }

    recentCalls.push(now);
    calls.set(key, recentCalls);
  };
}

/**
 * Wrap an actor action with guards
 *
 * @example
 * const myActor = actor({
 *   actions: {
 *     updatePost: withGuards(
 *       [requireAuth, requireRole('admin')],
 *       (c, params) => {
 *         // Your action logic
 *       }
 *     )
 *   }
 * });
 */
export function withGuards<TState, TParams, TResult>(
  guards: Guard<any, TParams> | Guard<any, TParams>[],
  action: (c: AuthActorContext<TState>, params: TParams) => TResult | Promise<TResult>
): (c: AuthActorContext<TState>, params: TParams) => Promise<TResult> {
  const guardArray = Array.isArray(guards) ? guards : [guards];

  return async (c, params) => {
    // Run all guards
    for (const guard of guardArray) {
      await guard(c, params);
    }

    // If all guards pass, execute action
    return await action(c, params);
  };
}

/**
 * Extract user context from request headers (common pattern)
 *
 * @example
 * // In your RivetKit setup
 * setup({
 *   contextFn: (req) => ({
 *     user: parseAuthHeader(req.headers.get('Authorization'))
 *   })
 * });
 */
export function parseAuthHeader(authHeader: string | null): UserContext | undefined {
  if (!authHeader) return undefined;

  // Support "Bearer <token>" format
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;

  const token = match[1];

  try {
    // In real apps, verify JWT or session token here
    // This is a placeholder - implement your own token verification
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as UserContext;
  } catch {
    return undefined;
  }
}

/**
 * Create an audit log entry (utility for tracking actions)
 *
 * @example
 * const logs = createAuditLog();
 *
 * // In actor action
 * logs.log(ctx, 'updatePost', { postId: '123' });
 */
export function createAuditLog() {
  const entries: Array<{
    timestamp: number;
    userId?: string;
    action: string;
    params: any;
    ip?: string;
  }> = [];

  return {
    log(ctx: AuthActorContext, action: string, params: any) {
      entries.push({
        timestamp: Date.now(),
        userId: ctx.user?.userId || ctx.auth?.userId,
        action,
        params,
        ip: ctx.user?.ip || ctx.auth?.ip,
      });
    },

    getEntries(filter?: { userId?: string; action?: string; since?: number }) {
      let filtered = entries;

      if (filter?.userId) {
        filtered = filtered.filter((e) => e.userId === filter.userId);
      }

      if (filter?.action) {
        filtered = filtered.filter((e) => e.action === filter.action);
      }

      if (filter?.since) {
        filtered = filtered.filter((e) => e.timestamp >= filter.since);
      }

      return filtered;
    },

    clear() {
      entries.length = 0;
    },
  };
}
