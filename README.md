# Server-Driven Components

Reactive Server Components with SSE streaming - A monorepo containing the `kawa` library and example implementations.

## Overview

This project demonstrates a novel approach to building reactive server components using React Server Components (RSC) and Server-Sent Events (SSE). Server state updates are automatically streamed to clients as RSC payloads, enabling real-time updates without client-side state management.

> **About the name "kawa":** The library is named "kawa" (川) which means "river" in Japanese, representing the continuous flow of reactive data streaming from server to client. It's also "coffee" in Polish - because developers love coffee! ☕

## Repository Structure

```
.
├── packages/
│   └── kawa/       # Core reactive library
├── examples/
│   └── waku-app/           # Waku framework example
├── docs/                   # Design documents and research
└── package.json            # Workspace configuration
```

## Packages

### [`kawa`](./packages/kawa)

The core library providing reactive primitives for React Server Components:

- `useServerState()` - Subscribe to shared server-side signals **[New!]**
- `useReactiveStream()` - Create component-local reactive streams **[New!]**
- `useReactive()` - Legacy hook (backward compatible)
- `signal()` - Shared reactive primitives
- `computed()` - Derived reactive values
- `reactiveRuntime` - Stream management and deduplication

**[See API Separation Experiment →](./docs/API-SEPARATION-EXPERIMENT.md)**

[Read the full documentation →](./packages/kawa/README.md)

## Examples

### [Waku App](./examples/waku-app)

A complete example application built with [Waku](https://waku.gg/) demonstrating:

- Real-time clock updates
- Auto-incrementing counters
- Shared signals across components
- RSC streaming over SSE

[View the example →](./examples/waku-app/README.md)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run the example app
pnpm dev

# Build all packages
pnpm build
```

## Documentation

Detailed design documents and research can be found in the [`docs/`](./docs) directory:

- **[API Separation Experiment](./docs/API-SEPARATION-EXPERIMENT.md)** - New separated state and stream APIs
- [API Design Proposal](./docs/API_DESIGN_PROPOSAL.md)
- [Reactive API Documentation](./docs/REACTIVE_API.md)
- [Design Notes](./docs/DESIGN-v0.2.md)
- [Research on RSC Streaming](./docs/RESEARCH-rsc-streaming.md)
- [Research on Reactivity Patterns](./docs/RESEARCH-reactivity-patterns.md)

## Features

- ✅ **React-like API** - Familiar syntax using hooks
- ✅ **Type-safe** - Full TypeScript support
- ✅ **Server-first** - True server components, minimal client JS
- ✅ **Efficient** - Automatic deduplication and stream management
- ✅ **Flexible** - Works with any RSC framework

## How It Works

1. Server components use `useReactive()` to create reactive state
2. State updates trigger RSC re-renders on the server
3. RSC payloads are streamed to clients via SSE
4. React automatically patches the component tree
5. No client-side state management needed

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build:lib

# Build the example
pnpm build:example

# Run the example in dev mode
pnpm dev
```

## Architecture

The system consists of three main parts:

1. **Reactive Runtime** - Manages streams and subscriptions on the server
2. **SSE Endpoint** - Streams RSC payloads to clients
3. **Client Wrapper** - Receives and renders RSC updates

See the [architecture documentation](./docs/REACTIVE_API.md#architecture) for more details.

## Contributing

This is a research project exploring new patterns for reactive server components. Contributions, ideas, and feedback are welcome!

## License

MIT
