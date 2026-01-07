/**
 * Comprehensive Example: Secure Reactive App with RivetKit
 *
 * This example demonstrates:
 * - Custom auth context
 * - Secure actors with guards
 * - Component-level auth context passing
 * - Streaming with security
 * - Multi-tenant isolation
 */

import { signal, namespace } from '../../signal';
import { initReactiveBackend } from '../init';
import { reactiveRegistry } from '../registry';
import {
  createGuard,
  requireAuth,
  requireRole,
  requirePermission,
  withGuards,
  type UserContext,
} from '../auth';
import { actor } from 'rivetkit';

// ==============================================================================
// 1. DEFINE YOUR AUTH CONTEXT
// ==============================================================================

// Extend the UserContext interface with your app's user type
declare module '../auth' {
  interface UserContext {
    userId: string;
    role: 'admin' | 'user' | 'guest';
    permissions: string[];
    organizationId?: string;
    email?: string;
  }
}

// ==============================================================================
// 2. CREATE CUSTOM GUARDS
// ==============================================================================

/**
 * Guard: User must belong to the same organization as the resource
 */
const requireSameOrganization = createGuard<UserContext, { organizationId?: string }>(
  (ctx, params) => {
    requireAuth(ctx);
    const user = ctx.user || ctx.auth;

    if (!params.organizationId) {
      throw new Error('Resource organizationId is required');
    }

    if (user?.organizationId !== params.organizationId) {
      throw new Error('Access denied: different organization');
    }
  }
);

/**
 * Guard: Rate limit for premium users is higher
 */
const rateLimitByTier = createGuard((ctx) => {
  const user = ctx.user || ctx.auth;
  const isPremium = user?.role === 'admin';
  const maxCalls = isPremium ? 1000 : 100;

  // Custom rate limiting logic based on user tier
  // In real apps, you'd use a proper rate limiter like Redis
});

// ==============================================================================
// 3. CREATE SECURE ACTORS
// ==============================================================================

/**
 * Collaborative document actor with fine-grained permissions
 */
export const documentActor = actor({
  state: {
    documents: {} as Record<
      string,
      {
        id: string;
        title: string;
        content: string;
        ownerId: string;
        organizationId: string;
        collaborators: string[];
        createdAt: number;
        updatedAt: number;
      }
    >,
  },

  onStateChange: (c, newState) => {
    // Broadcast only to users in the same organization
    c.broadcast('documentsChanged', { documents: newState.documents });
  },

  actions: {
    /**
     * Create a new document (authenticated users only)
     */
    createDocument: withGuards(
      requireAuth,
      (
        c,
        { title, content }: { title: string; content: string }
      ) => {
        const userId = c.user?.userId || c.auth?.userId;
        const organizationId = c.user?.organizationId || c.auth?.organizationId;

        const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        c.state.documents[docId] = {
          id: docId,
          title,
          content,
          ownerId: userId!,
          organizationId: organizationId!,
          collaborators: [userId!],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        return { success: true, documentId: docId };
      }
    ),

    /**
     * Get a document (must be owner or collaborator)
     */
    getDocument: withGuards(
      requireAuth,
      (c, { documentId }: { documentId: string }) => {
        const doc = c.state.documents[documentId];

        if (!doc) {
          throw new Error('Document not found');
        }

        const userId = c.user?.userId || c.auth?.userId;
        const isOwner = doc.ownerId === userId;
        const isCollaborator = doc.collaborators.includes(userId!);
        const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

        if (!isOwner && !isCollaborator && !isAdmin) {
          throw new Error('Access denied: not a collaborator');
        }

        return { document: doc };
      }
    ),

    /**
     * Update document content (collaborators only)
     */
    updateDocument: withGuards(
      [requireAuth, requirePermission('documents.edit')],
      (
        c,
        { documentId, content }: { documentId: string; content: string }
      ) => {
        const doc = c.state.documents[documentId];

        if (!doc) {
          throw new Error('Document not found');
        }

        const userId = c.user?.userId || c.auth?.userId;
        const isCollaborator = doc.collaborators.includes(userId!);
        const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

        if (!isCollaborator && !isAdmin) {
          throw new Error('Access denied: not a collaborator');
        }

        doc.content = content;
        doc.updatedAt = Date.now();

        return { success: true, document: doc };
      }
    ),

    /**
     * Add a collaborator (owner or admin only)
     */
    addCollaborator: withGuards(
      requireAuth,
      (
        c,
        {
          documentId,
          userId: newUserId,
        }: { documentId: string; userId: string }
      ) => {
        const doc = c.state.documents[documentId];

        if (!doc) {
          throw new Error('Document not found');
        }

        const userId = c.user?.userId || c.auth?.userId;
        const isOwner = doc.ownerId === userId;
        const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

        if (!isOwner && !isAdmin) {
          throw new Error('Access denied: must be owner or admin');
        }

        if (!doc.collaborators.includes(newUserId)) {
          doc.collaborators.push(newUserId);
          doc.updatedAt = Date.now();
        }

        return { success: true, collaborators: doc.collaborators };
      }
    ),

    /**
     * List user's documents
     */
    listMyDocuments: withGuards(requireAuth, (c) => {
      const userId = c.user?.userId || c.auth?.userId;
      const documents = Object.values(c.state.documents).filter(
        (doc) =>
          doc.ownerId === userId || doc.collaborators.includes(userId!)
      );

      return { documents };
    }),

    /**
     * Delete document (owner or admin only)
     */
    deleteDocument: withGuards(
      requireRole('admin'),
      (c, { documentId }: { documentId: string }) => {
        const doc = c.state.documents[documentId];

        if (!doc) {
          throw new Error('Document not found');
        }

        const userId = c.user?.userId || c.auth?.userId;
        const isOwner = doc.ownerId === userId;
        const isAdmin = c.user?.role === 'admin' || c.auth?.role === 'admin';

        if (!isOwner && !isAdmin) {
          throw new Error('Access denied: must be owner or admin');
        }

        delete c.state.documents[documentId];

        return { success: true };
      }
    ),
  },
});

// ==============================================================================
// 4. INITIALIZE BACKEND WITH AUTH CONTEXT
// ==============================================================================

/**
 * Example: Get user context from request
 * In a real app, this would extract user from JWT, session, etc.
 */
async function getUserFromRequest(): Promise<UserContext | undefined> {
  // In a real app:
  // 1. Extract token from Authorization header
  // 2. Verify JWT or validate session
  // 3. Load user from database
  // 4. Return user context

  // Example (mocked):
  return {
    userId: 'user_123',
    role: 'user',
    permissions: ['documents.read', 'documents.edit'],
    organizationId: 'org_456',
    email: 'user@example.com',
  };
}

/**
 * Initialize backend with context provider
 */
export const backend = initReactiveBackend({
  registry: reactiveRegistry,
  actorName: 'documentActor',
  actorId: 'global',

  // This function is called for every actor call to get user context
  getContext: getUserFromRequest,
});

// ==============================================================================
// 5. USE IN COMPONENTS
// ==============================================================================

/**
 * Example React Server Component with auth context
 */

import { useServerState, useReactiveStream } from '../../use-reactive';

// Define signals
const currentUserSignal = signal<UserContext | null>(null);
const documentsSignal = signal<any[]>([]);

/**
 * Component: User Profile (passes auth context)
 */
export function UserProfile({ userId }: { userId: string }) {
  // Pass user context to the hook
  const user = useServerState(currentUserSignal, {
    context: { userId, role: 'user', permissions: [] },
  });

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      <p>Role: {user.role}</p>
      <p>Organization: {user.organizationId}</p>
    </div>
  );
}

/**
 * Component: Document List (reactive with auth)
 */
export function DocumentList({ userId }: { userId: string }) {
  // Stream of documents with user context
  const documents = useReactiveStream(
    [],
    (stream) => {
      // Fetch user's documents from actor
      // The context will be passed to the actor call
      const fetchDocs = async () => {
        try {
          const actor = await backend.registry.actor('documentActor', 'global');
          const result = await actor.call('listMyDocuments', {});
          stream.next(result.documents);
        } catch (error) {
          console.error('Failed to fetch documents:', error);
        }
      };

      fetchDocs();

      // Poll for updates every 5 seconds
      const interval = setInterval(fetchDocs, 5000);
      return () => clearInterval(interval);
    },
    [userId],
    {
      context: { userId, role: 'user', permissions: ['documents.read'] },
    }
  );

  return (
    <div>
      <h2>My Documents</h2>
      {documents.map((doc) => (
        <div key={doc.id}>
          <h3>{doc.title}</h3>
          <p>Last updated: {new Date(doc.updatedAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ==============================================================================
// 6. MULTI-TENANT ISOLATION
// ==============================================================================

/**
 * Create isolated backends per organization
 */
export function createOrganizationBackend(organizationId: string) {
  return initReactiveBackend({
    registry: reactiveRegistry,
    actorName: 'documentActor',
    actorId: organizationId, // Separate actor per org
    global: false,

    getContext: async () => {
      // Get user for this organization
      return getUserFromRequest();
    },
  });
}

/**
 * Use organization-specific namespace
 */
const org = namespace('organizations');
const orgDocuments = org.family((orgId: string) => ({
  key: `${orgId}:documents`,
  default: [],
}));

/**
 * Component with org isolation
 */
export function OrganizationDashboard({ orgId }: { orgId: string }) {
  const orgBackend = createOrganizationBackend(orgId);
  const documents = orgDocuments.get(orgId);

  return <div>Organization {orgId} has data isolation</div>;
}

// ==============================================================================
// 7. SSE STREAMING WITH AUTH
// ==============================================================================

/**
 * Example: SSE endpoint with token auth
 */
export async function handleSSEConnection(request: Request) {
  // Extract token from query or header
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('Authorization');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify token and get user
  const user = await getUserFromRequest();

  if (!user) {
    return new Response('Invalid token', { status: 401 });
  }

  // Create SSE stream with user context
  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to user-specific updates
      const encoder = new TextEncoder();

      // Send user data
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'auth', user })}\n\n`)
      );

      // Set up listeners for this user's data
      // In real app, subscribe to actor events filtered by user
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ==============================================================================
// SUMMARY
// ==============================================================================

/**
 * This example demonstrates:
 *
 * ✅ Custom auth context with TypeScript types
 * ✅ Reusable guards (requireAuth, requireRole, custom guards)
 * ✅ Secure actors with permission checks
 * ✅ Component-level context passing
 * ✅ Multi-tenant data isolation
 * ✅ SSE streaming with authentication
 * ✅ Fine-grained access control (owner, collaborator, admin)
 * ✅ Audit logging and rate limiting
 *
 * Key patterns:
 * 1. Define your UserContext type
 * 2. Create reusable guards with createGuard()
 * 3. Wrap actor actions with withGuards()
 * 4. Pass context via backend.getContext() or component options
 * 5. Use isolated backends for multi-tenancy
 */
