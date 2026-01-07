# RivetKit Backend

A backend implementation using [RivetKit](https://rivet.dev) actors for stateful, real-time server-driven components.

## Overview

This package provides a complete backend server with example actors demonstrating:

- **Stateful actors** with persistent in-memory state
- **Real-time updates** via WebSocket events
- **REST API** endpoints for actor actions
- **Automatic state management** with lifecycle hooks
- **File System driver** for local development

## Features

- ✅ **Counter actor** - Simple shared state with increment/decrement
- ✅ **Chat room actor** - Real-time messaging with message history
- ✅ **Server time actor** - Automatic time updates with lifecycle management
- ✅ **Type-safe** - Full TypeScript support
- ✅ **REST + WebSocket** - HTTP endpoints and real-time events
- ✅ **File System persistence** - Actor state persists across restarts

## Quick Start

```bash
# Install dependencies (from root of monorepo)
pnpm install

# Run in development mode
cd packages/rivet-backend
pnpm dev
```

The server will start on port 3001. RivetKit will also start an internal file system backend on a separate port (shown in startup logs).

## API Endpoints

RivetKit automatically creates endpoints for all actors:

### Counter Actor

```bash
# Get current count
POST http://localhost:3001/rpc/counter:default/getCount
Body: {}

# Increment counter
POST http://localhost:3001/rpc/counter:default/increment
Body: {}

# Decrement counter
POST http://localhost:3001/rpc/counter:default/decrement
Body: {}

# Add specific value
POST http://localhost:3001/rpc/counter:default/add
Body: { "value": 5 }

# Reset counter
POST http://localhost:3001/rpc/counter:default/reset
Body: {}
```

### Chat Room Actor

```bash
# Send a message
POST http://localhost:3001/rpc/chatRoom:lobby/sendMessage
Body: { "username": "alice", "text": "Hello!" }

# Get message history
POST http://localhost:3001/rpc/chatRoom:lobby/getMessages
Body: { "limit": 50 }

# Join room
POST http://localhost:3001/rpc/chatRoom:lobby/join
Body: { "username": "alice" }

# Leave room
POST http://localhost:3001/rpc/chatRoom:lobby/leave
Body: { "username": "alice" }

# Get participants
POST http://localhost:3001/rpc/chatRoom:lobby/getParticipants
Body: {}
```

### Server Time Actor

```bash
# Get current server time
POST http://localhost:3001/rpc/serverTime:global/getTime
Body: {}

# Set timezone
POST http://localhost:3001/rpc/serverTime:global/setTimezone
Body: { "timezone": "America/New_York" }
```

### WebSocket Events

Connect to actor events via WebSocket:

```
WS http://localhost:3001/ws/:actorType/:actorId
```

## Example Usage

### Counter

```javascript
// Increment counter
const response = await fetch('http://localhost:3001/api/counter/default/increment', {
  method: 'POST'
});
const result = await response.json();
console.log(result); // { count: 1 }

// Get current count
const response = await fetch('http://localhost:3001/api/counter/default');
const result = await response.json();
console.log(result); // { count: 1, lastUpdated: 1234567890 }
```

### Chat Room

```javascript
// Join a room
await fetch('http://localhost:3001/api/chat/lobby/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice' })
});

// Send a message
await fetch('http://localhost:3001/api/chat/lobby/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice', text: 'Hello everyone!' })
});

// Get messages
const response = await fetch('http://localhost:3001/api/chat/lobby/messages');
const { messages } = await response.json();
```

### WebSocket Events

```javascript
// Connect to counter events
const ws = new WebSocket('ws://localhost:3001/actors/counter/default/events');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Count updated:', data);
  // { type: 'countUpdated', count: 42, lastUpdated: 1234567890 }
};

// Connect to chat room events
const chatWs = new WebSocket('ws://localhost:3001/actors/chatRoom/lobby/events');

chatWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'newMessage') {
    console.log('New message:', data);
  }
  if (data.type === 'userJoined') {
    console.log('User joined:', data.username);
  }
};
```

## Architecture

### Actors

Actors are long-lived, stateful processes that:
- Maintain state in memory
- Respond to action calls
- Broadcast events to connected clients
- Support lifecycle hooks (onWake, onSleep, onStateChange)

### Actor Lifecycle

1. **Inactive** - Actor doesn't exist yet
2. **Wake** - First action call creates the actor and runs `onWake` hook
3. **Active** - Actor handles actions and broadcasts events
4. **Sleep** - After period of inactivity, runs `onSleep` hook and shuts down

### State Management

- State is stored in-memory within each actor instance
- State persists as long as the actor is active
- State changes trigger `onStateChange` hook for broadcasting updates
- Multiple clients can share the same actor state (e.g., same chat room)

## Adding New Actors

1. Create a new actor file in `src/actors/`:

```typescript
import { actor } from 'rivetkit';

export const myActor = actor({
  state: {
    value: 0
  },

  onStateChange: (c, newState) => {
    c.broadcast('stateUpdated', newState);
  },

  actions: {
    updateValue: (c, data: { value: number }) => {
      c.state.value = data.value;
      return { success: true };
    }
  }
});
```

2. Register it in `src/registry.ts`:

```typescript
import { myActor } from './actors/myActor.js';

export const registry = setup({
  actors: {
    counter,
    chatRoom,
    serverTime,
    myActor  // Add here
  }
});
```

3. (Optional) Add convenience endpoints in `src/server.ts`

## Integration with React

Use [@rivetkit/react](https://rivet.dev/docs/client/react) to connect React components to actors:

```tsx
import { useActor } from '@rivetkit/react';

function Counter() {
  const counter = useActor('counter', 'default');

  return (
    <div>
      <p>Count: {counter.state.count}</p>
      <button onClick={() => counter.call('increment')}>+</button>
      <button onClick={() => counter.call('decrement')}>-</button>
    </div>
  );
}
```

## Environment Variables

- `PORT` - Server port (default: 3001)

## Learn More

- [RivetKit Documentation](https://rivet.dev/docs)
- [Actor State Management](https://rivet.dev/docs/actors/state/)
- [Actor Actions](https://rivet.dev/docs/actors/actions/)
- [Actor Events](https://rivet.dev/docs/actors/events/)
- [Lifecycle Hooks](https://rivet.dev/docs/actors/lifecycle/)

## License

MIT
