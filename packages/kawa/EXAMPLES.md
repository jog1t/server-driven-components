# Namespace & Families Examples

## Basic Namespaces

```typescript
import { namespace } from 'kawa';

// Create top-level namespace
const app = namespace("app");

// Create nested namespaces
const shop = app.namespace("shop");
const user = app.namespace("user");

// Create signals in namespaces
const theme = app.signal("theme", "dark");        // Key: "app:theme"
const products = shop.signal("products", []);     // Key: "app:shop:products"
const cart = shop.signal("cart", []);             // Key: "app:shop:cart"
```

## Signal Families (Dynamic Entities)

```typescript
const users = namespace("users");

// Create a family for user positions
const userPosition = users.family((userId: string) => ({
  key: `${userId}:position`,
  default: { x: 0, y: 0 }
}));

// Use the family to create signals dynamically
const alicePos = userPosition("alice");  // Key: "users:alice:position"
const bobPos = userPosition("bob");      // Key: "users:bob:position"

// Update positions
alicePos.set({ x: 100, y: 200 });
bobPos.set({ x: 300, y: 400 });
```

## Real-World Example: E-commerce App

```typescript
// src/namespaces.ts
import { namespace } from 'kawa';

export const app = namespace("app");
export const shop = app.namespace("shop");
export const user = app.namespace("user");

// Global app state
export const theme = app.signal("theme", "light");
export const locale = app.signal("locale", "en");

// Shop state
export const products = shop.signal("products", []);
export const categories = shop.signal("categories", []);
export const selectedCategory = shop.signal("selectedCategory", "all");

// User families (dynamic per user)
export const userProfile = user.family((userId: string) => ({
  key: `${userId}:profile`,
  default: { name: "", email: "", avatar: "" }
}));

export const userCart = user.family((userId: string) => ({
  key: `${userId}:cart`,
  default: { items: [], total: 0 }
}));

export const userPreferences = user.family((userId: string) => ({
  key: `${userId}:preferences`,
  default: { notifications: true, newsletter: false }
}));
```

```typescript
// src/components/UserProfile.tsx
import { useServerState } from 'kawa';
import { userProfile } from '../namespaces';

export function UserProfile({ userId }: { userId: string }) {
  const profile = useServerState(userProfile(userId));

  return (
    <div>
      <img src={profile.avatar} alt={profile.name} />
      <h2>{profile.name}</h2>
      <p>{profile.email}</p>
    </div>
  );
}
```

```typescript
// src/actions/updateProfile.ts
import { userProfile } from '../namespaces';

export function updateUserProfile(userId: string, updates: Partial<Profile>) {
  const profile = userProfile(userId);
  profile.set({ ...profile.value, ...updates });
  // Automatically synced to RivetKit if initialized
}
```

## Multiplayer/Collaborative Example

```typescript
// src/namespaces.ts
import { namespace } from 'kawa';

const multiplayer = namespace("multiplayer");
const players = multiplayer.namespace("players");
const rooms = multiplayer.namespace("rooms");

// Player families
export const playerPosition = players.family((playerId: string) => ({
  key: `${playerId}:position`,
  default: { x: 0, y: 0 }
}));

export const playerCursor = players.family((playerId: string) => ({
  key: `${playerId}:cursor`,
  default: { x: 0, y: 0, color: "#000" }
}));

export const playerStatus = players.family((playerId: string) => ({
  key: `${playerId}:status`,
  default: { online: false, lastSeen: Date.now() }
}));

// Room families
export const roomState = rooms.family((roomId: string) => ({
  key: `${roomId}:state`,
  default: { playerIds: [], createdAt: Date.now() }
}));

export const roomMessages = rooms.family((roomId: string) => ({
  key: `${roomId}:messages`,
  default: []
}));
```

```typescript
// src/components/MultiplayerCursors.tsx
import { useServerState } from 'kawa';
import { playerCursor, roomState } from '../namespaces';

export function UserCursor({ playerId }: { playerId: string }) {
  const cursor = useServerState(playerCursor(playerId));

  return (
    <div
      style={{
        position: 'absolute',
        left: cursor.x,
        top: cursor.y,
        width: 20,
        height: 20,
        borderRadius: '50%',
        backgroundColor: cursor.color,
        pointerEvents: 'none'
      }}
    />
  );
}

export function CursorLayer({ roomId }: { roomId: string }) {
  const room = useServerState(roomState(roomId));

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
      {room.playerIds.map(id => (
        <UserCursor key={id} playerId={id} />
      ))}
    </div>
  );
}
```

## With RivetKit Backend

```typescript
// src/server.ts
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivet';

// Initialize RivetKit backend
initReactiveBackend({
  registry: reactiveRegistry,
  actorName: 'reactiveState',
  actorId: 'global'
});

// Start the registry
reactiveRegistry.start({ defaultServerPort: 3001 });

// Now all signals are automatically persisted!
```

```typescript
// src/namespaces.ts
import { namespace } from 'kawa';

// These signals are now automatically persisted in RivetKit
const users = namespace("users");

export const userPosition = users.family((userId: string) => ({
  key: `${userId}:position`,
  default: { x: 0, y: 0 }
}));

// When you update:
userPosition("alice").set({ x: 100, y: 200 });
// → Automatically saved to RivetKit actor
// → Broadcast to all connected clients
// → Survives server restarts
```

## Advanced: Scoped Backends

```typescript
// src/server.ts
import { initReactiveBackend, reactiveRegistry } from 'kawa/rivet';

// Different actor instances for different scopes
initReactiveBackend({
  registry: reactiveRegistry,
  actorName: 'reactiveState',
  actorId: 'global'  // Global state
});

// For user-scoped state, you could init a different actor
// (This is advanced usage - most apps just need one global actor)
```

## Type Safety

```typescript
interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

interface Position {
  x: number;
  y: number;
}

const users = namespace("users");

// Fully typed family
export const userProfile = users.family<string, UserProfile>((userId) => ({
  key: `${userId}:profile`,
  default: { name: "", email: "", avatar: "" }
}));

// TypeScript knows the type!
const profile = userProfile("alice");
profile.set({ name: "Alice" }); // ✅ Type-safe
profile.set({ invalid: true }); // ❌ TypeScript error
```

## Migration from Factory Pattern

**Before (factory pattern):**
```typescript
import { createReactiveBackend } from 'kawa/rivet';

export const { signal } = createReactiveBackend({ registry });
```

**After (init + namespaces):**
```typescript
import { initReactiveBackend } from 'kawa/rivet';
import { namespace } from 'kawa';

// Initialize once
initReactiveBackend({ registry });

// Use namespaces everywhere
const app = namespace("app");
export const counter = app.signal("counter", 0);
```

Much simpler and more flexible!
