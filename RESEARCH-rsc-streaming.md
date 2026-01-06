# Research: Streaming RSC Payloads Over SSE

**Goal:** Instead of triggering refetch, stream RSC payloads directly over SSE when channels broadcast.

## The Vision

```
Channel broadcasts
   ↓
Server renders component to RSC payload (React Flight format)
   ↓
SSE streams RSC payload chunks
   ↓
Client consumes RSC stream
   ↓
React automatically updates component tree
```

## React Server Components Streaming API

### Server-Side (Rendering to RSC Payload)

```typescript
import { renderToReadableStream } from 'react-server-dom-webpack/server';

// Render component to RSC stream
const stream = renderToReadableStream(
  <MyComponent />,
  bundlerConfig  // Webpack/Vite module map
);

// Stream chunks
for await (const chunk of stream) {
  // Send chunk over SSE
}
```

### Client-Side (Consuming RSC Stream)

```typescript
import { createFromReadableStream } from 'react-server-dom-webpack/client';

// Create component from RSC stream
const Component = await createFromReadableStream(
  rscStream,
  {
    callServer: async (id, args) => {
      // Server action handler
    }
  }
);

// React automatically renders it
```

## Challenges with Waku

Waku uses `@vitejs/plugin-rsc` which abstracts away direct access to React's RSC renderer.

### Options:

**Option 1: Use Waku's internal renderer**
- Access Waku's RSC rendering pipeline
- May be tightly coupled to routing

**Option 2: Direct React Server DOM API**
- Import `react-server-dom-webpack/server` directly
- Need to provide bundler config (module map)
- More control but more complex

**Option 3: Hybrid - Render to string, parse on client**
- Render component to HTML string
- Less efficient but simpler
- Loses some RSC benefits

## Implementation Plan

### Phase 1: Explore Waku's RSC Renderer ✅

- Waku uses `@vitejs/plugin-rsc` which provides `renderToReadableStream`
- We can use this to render components to RSC payload

### Phase 2: Direct RSC Streaming ✅

Implemented RSC streaming:

1. **Server (`/api/rsc-stream.ts`):**
   - Dynamically imports component
   - Renders to RSC stream using `renderToReadableStream`
   - Streams RSC chunks over SSE (base64 encoded)

2. **Transport:**
   - SSE with RSC_START, RSC_CHUNK, RSC_END events
   - Base64 encoding for safe text transmission

3. **Client (`ReactiveSubscribe`):**
   - Consumes RSC chunks from SSE
   - Reconstructs RSC payload
   - Uses `createFromReadableStream` to parse
   - Renders component with Suspense

### Phase 3: Integration with Channels ✅

Channels now power RSC streaming:
1. Channel broadcasts data (e.g., `{ time: Date.now() }`)
2. SSE endpoint receives broadcast
3. Renders component with data as `_channelData` prop
4. Streams RSC payload to all subscribers

## Implementation Summary

### New Files

**`/api/rsc-stream.ts`** - RSC Streaming SSE Endpoint
- Subscribes to channels
- Dynamically imports components
- Renders to RSC payload using `renderToReadableStream`
- Streams chunks over SSE

**Updated `ReactiveSubscribe`** - RSC Stream Consumer
- Connects to `/api/rsc-stream`
- Accumulates RSC chunks
- Parses with `createFromReadableStream`
- Renders with Suspense boundary

**Updated Reactive Components**
- `ReactiveClock` - Accepts `_channelData` prop with time
- `ReactiveCounter` - Accepts `_channelData` prop with count
- Both remain true server components

### Architecture

```
Channel broadcasts data
   ↓
SSE endpoint (/api/rsc-stream)
   ↓
Dynamic import component
   ↓
Render with data → renderToReadableStream
   ↓
Stream RSC chunks (base64)
   ↓
ReactiveSubscribe (client)
   ↓
createFromReadableStream
   ↓
React renders component
   ↓
Smooth update! 🎉
```

## Key Questions

1. **How to get bundler config?** Needed for `renderToReadableStream`
   - Waku uses `@vitejs/plugin-rsc` which patches react-server-dom-webpack
   - For now, try with `null` or minimal config
2. **How to target specific component?** Need component reference + props
   - Channels will broadcast component element (JSX) instead of just data
   - e.g., `broadcast(<ReactiveClock interval={1000} />)`
3. **How to merge RSC updates?** React needs to know where to patch the tree
   - Need to investigate if we can stream updates to specific component slots
   - May need to re-render entire tree (but only send updated components)
4. **SSE format?** Can we stream binary RSC payload over SSE?
   - RSC payload is text-based (not binary)
   - Can be streamed over SSE with proper encoding

## Findings

### Waku's RSC Setup

- Waku patches `react-server-dom-webpack/client` to use `@vitejs/plugin-rsc/browser`
- Server uses `createRenderUtils` which wraps `renderToReadableStream`
- Client uses `createFromFetch` from react-server-dom-webpack
- RSC payload is streamed as ReadableStream

### Available Packages

- `react-server-dom-webpack@19.2.3` is installed
- Can import from `react-server-dom-webpack/server` and `/client`

### Approach

Instead of fighting Waku's abstraction, we can:
1. Import `renderToReadableStream` from `react-server-dom-webpack/server`
2. Render component elements to RSC stream
3. Stream over SSE as text chunks
4. Client uses `createFromReadableStream` to reconstruct component

## References

- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [react-server-dom-webpack API](https://github.com/facebook/react/tree/main/packages/react-server-dom-webpack)
- [Waku RSC Plugin](https://github.com/dai-shi/waku)
