# Waku Example - Reactive Server Components

Example application demonstrating `kawa` with [Waku](https://waku.gg/).

## Features

This example shows:

- **Reactive Clock** - Server component that updates every second using `useReactive`
- **Reactive Counter** - Auto-incrementing counter with configurable interval
- **Shared Signal** - Multiple components subscribing to the same server-side signal
- **SSE Streaming** - Real-time updates via Server-Sent Events
- **RSC Streaming** - React Server Components streamed over SSE

## Getting Started

From the repository root:

```bash
# Install dependencies
pnpm install

# Run the example
pnpm dev
```

Or from this directory:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── components/         # Server and client components
│   ├── demo-clock.tsx       # Reactive clock demo
│   ├── demo-counter.tsx     # Reactive counter demo
│   ├── demo-shared-time.tsx # Shared signal demo
│   └── reactive.tsx         # Client wrapper component
├── lib/
│   └── signals/        # Shared signals
│       └── server-time.ts   # Global server time signal
├── pages/
│   ├── api/
│   │   └── reactive.ts      # SSE endpoint for reactive streams
│   ├── index.tsx            # Homepage
│   ├── about.tsx            # About page
│   └── _layout.tsx          # Layout wrapper
└── styles.css          # Global styles
```

## How It Works

1. Server components use `useReactive()` hook to create reactive state
2. Components are wrapped in `<Reactive>` client component
3. Client establishes SSE connection to `/api/reactive`
4. Server streams RSC payloads when state updates
5. Client receives and renders updates using React's RSC streaming

## Learn More

- [kawa documentation](../../packages/kawa/README.md)
- [Waku documentation](https://waku.gg/)
- [Design documentation](../../docs/)

## License

MIT
