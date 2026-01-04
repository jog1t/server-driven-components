# Reactive Server Components Prototype

An experimental implementation of **server-driven UI** using React Server Components (RSC) and Server-Sent Events (SSE).

## 🎯 Concept

This prototype extends the standard React Server Components model with **server-push** capabilities:

- **Standard RSC**: Client requests updates (client-pull model)
- **Reactive RSC**: Server pushes updates to client (server-push model)

### Architecture

```
┌─────────────┐      SSE Stream       ┌─────────────┐
│   Client    │◄─────────────────────│   Server    │
│             │                       │             │
│ - Client    │                       │ - RSC       │
│   Components│                       │   Renderer  │
│ - SSE       │                       │ - Hono API  │
│   Listener  │                       │ - SSE       │
└─────────────┘                       └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

## 📁 Project Structure

```
reactive-rsc/
├── src/
│   ├── components/
│   │   ├── counter.tsx              # Client: Interactive counter
│   │   ├── toggle.tsx               # Client: Toggle button
│   │   ├── display.tsx              # Client: Display with server props
│   │   ├── server-info.tsx          # Server: Node/process info
│   │   ├── data-fetch.tsx           # Server: Async data fetching
│   │   ├── reactive-wrapper.tsx     # Client: SSE connection wrapper
│   │   └── reactive-server-clock.tsx # Server: Reactive clock component
│   ├── pages/
│   │   ├── _layout.tsx              # Root layout
│   │   ├── index.tsx                # Home page with demos
│   │   └── api/
│   │       └── reactive-stream.ts   # SSE endpoint (Hono API route)
│   └── styles.css
├── package.json
├── waku.config.ts
└── README.md
```

## 🧪 Demo Components

### Client Components (`'use client'`)

1. **Counter** - Simple interactive counter
2. **Toggle** - ON/OFF toggle button
3. **Display** - Shows server-passed props + client state

### Server Components (default)

1. **ServerInfo** - Displays Node.js version, platform, render time
2. **DataFetch** - Demonstrates async data fetching on server

### Reactive Components (prototype)

1. **ReactiveWrapper** - Client component that:
   - Establishes SSE connection to `/api/reactive-stream`
   - Listens for server events
   - Updates UI when server pushes data

2. **ReactiveServerClock** - Server component that:
   - Renders server-side data (time, PID, etc.)
   - Can be updated via server push (through wrapper)

## 🔧 Tech Stack

- **Framework**: [Waku](https://waku.gg/) (minimal RSC framework)
- **Server**: Hono (built into Waku)
- **Transport**: Server-Sent Events (SSE)
- **React**: React 19 (RSC support)
- **Build**: Vite + @vitejs/plugin-rsc
- **Styling**: TailwindCSS

## 🎓 How It Works

### 1. SSE Endpoint (`/api/reactive-stream`)

Waku's API routes provide a simple way to create custom endpoints:

```typescript
// src/pages/api/reactive-stream.ts
export const GET = async () => {
  const stream = new ReadableStream({
    start(controller) {
      // Send updates every 2 seconds
      setInterval(() => {
        controller.enqueue(/* data */);
      }, 2000);
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
};
```

### 2. Client SSE Connection

The `ReactiveWrapper` component connects to the SSE endpoint:

```typescript
// Client Component
const eventSource = new EventSource('/api/reactive-stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI with server data
};
```

### 3. Server Component Rendering

Server components render on the server, showing server-only data:

```typescript
// Server Component (no 'use client')
export const ReactiveServerClock = async () => {
  const serverData = {
    renderTime: new Date().toISOString(),
    pid: process.pid,
  };

  return <div>{/* Render server data */}</div>;
};
```

### 4. The Innovation

The key innovation is the **ReactiveWrapper** pattern:

- Server component is wrapped by a client component
- Client component maintains SSE connection
- Server events trigger UI updates
- Client displays both static server-rendered content and live SSE data

## 📊 Current Limitations

This is a **prototype** with simplified architecture:

1. **Global updates**: All reactive components update together (no selective subscriptions)
2. **No server component re-rendering**: Current implementation shows SSE data in wrapper, not true server component refetch
3. **No persistence**: Server state is in-memory
4. **Basic error handling**: Limited reconnection logic
5. **No auth**: SSE connection is open

## 🔮 Future Improvements

### Phase 2 Enhancements

- [ ] **Selective subscriptions**: Component-specific update streams
- [ ] **True RSC refetch**: Trigger actual server component re-render on SSE events
- [ ] **Optimistic updates**: Client-side optimistic rendering
- [ ] **Error boundaries**: Comprehensive error handling
- [ ] **Reconnection logic**: Exponential backoff for SSE reconnection
- [ ] **Authentication**: Secure SSE connections with tokens

### Phase 3 Advanced Features

- [ ] **Incremental updates**: Send diffs instead of full payloads
- [ ] **Multi-instance support**: Redis pub/sub for horizontal scaling
- [ ] **Framework-agnostic**: Extract core concept into library
- [ ] **WebSocket alternative**: Bidirectional communication option
- [ ] **Developer tools**: Debug UI for tracking reactive updates

## 📝 Key Learnings

See [../NOTES.md](../NOTES.md) for detailed architecture decisions and learnings.

## 🤝 Contributing

This is an experimental prototype. Feedback and ideas are welcome!

## 📄 License

MIT

---

**Note**: This is a proof-of-concept implementation. Not recommended for production use without significant enhancements to error handling, security, and scalability.
