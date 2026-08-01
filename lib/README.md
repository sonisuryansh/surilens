# SuriLens Library Core (`lib/`)

The `lib/` directory contains the complete backend instrumentation engine, event store, framework adapters, and WebSocket/HTTP dashboard server.

## 📂 Subdirectories

- [`lib/core/`](./core/README.md): Core execution engine, AsyncLocalStorage context, event store, collector, auto-instrumentation, and SDK helpers.
- [`lib/adapters/`](./adapters/README.md): Framework adapters for Express, Fastify, Koa, NestJS, and Hono.
- [`lib/server/`](./server/README.md): HTTP static asset server and real-time WebSocket dashboard server.

## 🔄 Execution Flow

```
HTTP Request
   │
   ▼
lib/adapters/ (or lib/core/instrumentor.js)
   │
   ▼
lib/core/async-context.js  ──► Stores AsyncLocalStorage Context
   │
   ▼
lib/core/collector.js      ──► Records transitions & calculates metrics
   │
   ▼
lib/core/event-store.js    ──► Masks PII & writes async trace logs
   │
   ▼
lib/server/dashboard-server.js ──► Broadcasts events over WebSocket
```
