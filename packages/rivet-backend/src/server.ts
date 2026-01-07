import { registry } from './registry.js';

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 RivetKit backend starting on port ${port}`);

// Start the registry server with default in-memory driver
// The start() method will use built-in defaults for development
const server = registry.start({
  defaultServerPort: port
});

console.log(`
✨ RivetKit Backend Server Ready on port ${server.port}!
Server URL: http://localhost:${server.port}

The server exposes automatic REST and WebSocket endpoints for all actors:

Actor endpoints (automatically generated):
- POST http://localhost:${port}/actors/:actorType/:actorId/actions/:actionName
- WS   http://localhost:${port}/actors/:actorType/:actorId/events

Available actors:
- counter
- chatRoom
- serverTime

Examples:

Counter:
- POST http://localhost:${port}/actors/counter/default/actions/increment
- POST http://localhost:${port}/actors/counter/default/actions/getCount
- WS   http://localhost:${port}/actors/counter/default/events

Chat Room:
- POST http://localhost:${port}/actors/chatRoom/lobby/actions/sendMessage
  Body: { "username": "alice", "text": "Hello!" }
- POST http://localhost:${port}/actors/chatRoom/lobby/actions/getMessages
- WS   http://localhost:${port}/actors/chatRoom/lobby/events

Server Time:
- POST http://localhost:${port}/actors/serverTime/global/actions/getTime
- WS   http://localhost:${port}/actors/serverTime/global/events
`);
