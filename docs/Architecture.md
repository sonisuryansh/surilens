# Architecture

Internal architecture of the SuriLens observability engine.

---

## Overview

SuriLens is structured as three distinct layers:

1. **Instrumentation Layer** — Captures execution context from your Node.js application
2. **Collector Layer** — Aggregates, enriches, and persists trace data
3. **Dashboard Layer** — Serves the frontend and broadcasts real-time events via WebSocket

---

## Layer 1 — Instrumentation

### AsyncLocalStorage (`async-context.js`)

SuriLens uses Node.js `AsyncLocalStorage` to propagate trace context across all asynchronous operations without modifying your code. Each HTTP request creates a unique trace context that flows through:

- `await` chains
- `setTimeout` / `setInterval` callbacks
- `EventEmitter` listeners
- `Promise` chains

This means `suriLens.step('Service')` called deep inside a nested async function automatically knows which HTTP request it belongs to.

### Auto-Instrumentation (`auto-instrument.js`)

On first middleware invocation, SuriLens patches the Node.js module system to intercept:

**Outbound HTTP/HTTPS:**
- `http.request` and `https.request` are wrapped to detect the target hostname
- Localhost calls are categorized as `Database`
- External calls are categorized as `External API (hostname)`
- W3C `traceparent` and `x-correlation-id` headers are automatically injected

**Native Fetch (Node 18+):**
- `globalThis.fetch` is wrapped for the same hostname detection and header propagation

**Module Loader:**
- When `mongoose`, `ioredis`, `redis`, `pg`, `mysql2`, `sequelize`, `@prisma/client`, `kafkajs`, or `@aws-sdk/client-s3` are `require()`d, they are wrapped to automatically emit node transitions when their core operations execute.

### Express Middleware (`instrumentor.js`)

The `createMiddleware()` factory returns an Express middleware that:

1. Extracts distributed tracing headers (`traceparent`, `x-correlation-id`, `x-request-id`)
2. Generates a `traceId` (`tr_XXXXXXXX` hex string)
3. Captures request context (method, URL, client IP, headers, body, query)
4. Sanitizes `Authorization` headers and `Cookie` values before storing
5. Creates an `AsyncLocalStorage` context and calls `collector.startTrace()`
6. Transitions the trace to the `Router` node on `process.nextTick`
7. Hooks `res.end` to call `collector.completeTrace()` when the response is sent
8. Hooks `res.json` to capture the response body

---

## Layer 2 — Collector

### `SuriCollector` (`collector.js`)

A singleton `EventEmitter` that is the central hub of the engine.

**Trace Lifecycle:**

```
startTrace(traceContext)
  → creates trace in activeTraces Map
  → emits 'trace_start'

transitionNode(traceId, nodeName, metadata)
  → resolves category from node name keywords
  → generates spanId / parentSpanId for distributed tracing
  → updates trace.activeNode and trace.execution array
  → appends step to trace.steps
  → emits 'node_active'

removeNodeStage(traceId, nodeName, metadata)
  → removes node from trace.execution
  → emits 'node_remove'

completeTrace(traceId, statusCode, error, responseBody)
  → moves trace from activeTraces to completedTraces
  → calculates responseTime
  → runs detectBottlenecks()
  → calls eventStore.addEvent()
  → emits 'trace_complete'
```

**Category Resolution:**

Node names are automatically classified based on keywords:

| Keyword in node name | Category |
|---------------------|----------|
| `express` | `express` |
| `router` | `router` |
| `middleware` | `middleware` |
| `mongo`, `prisma`, `sequelize`, `postgres`, `mysql`, `database` | `database` |
| `redis`, `cache` | `redis` |
| `jwt`, `bcrypt`, `auth` | `jwt` |
| `external`, `axios`, `fetch` | `external_http` |
| `client` | `client` |
| `response` | `response` |
| anything else | `function` |

**Performance Metrics (live 1-second window):**
- RPS calculated from timestamps in a rolling 1-second array
- Memory from `process.memoryUsage().heapUsed`
- CPU from `process.cpuUsage()` delta between intervals
- Error rate from `failedRequests / totalRequests * 100`

**Trace TTL Sweep:**
- A `setInterval` (unref'd) runs every 30 seconds
- Any trace older than `traceTtlMs` (default 60s) is force-completed with a `504 Gateway Timeout` error
- Prevents memory leaks from requests that never send a response

### `EventStore` (`event-store.js`)

Handles persistence, search, security masking, and payload diffing.

**Storage:**
- In-memory: `Map<traceId, formattedEvent>` with a max-size LRU eviction
- File-based: each event is written as `events/request-{traceId}.json` and `events/request-{traceId}.md` (async, non-blocking)

**Security Masking (`maskSensitiveData`):**
- Recursively traverses any object
- Fields whose keys match sensitive keywords (`password`, `token`, `authorization`, `cookie`, `apikey`, etc.) have their values replaced with `'********'`
- Applied to all headers, request bodies, and stage payloads before storage or display

**Payload Diff (`computePayloadDiff`):**
- Computes a Git-style diff between two stage payloads
- Returns `{ added, modified, removed }` for display in the Inspector panel

**Bottleneck Detection (`detectBottlenecks`):**
- `SLOW_ROUTE` — response time > 500ms
- `HIGH_MEMORY` — heap > 300MB
- `HIGH_CPU` — CPU > 80%
- `SLOW_STEP` — any individual step > 200ms

---

## Layer 3 — Dashboard Server

### `DashboardServer` (`dashboard-server.js`)

A standalone HTTP + WebSocket server that serves the frontend dashboard.

**HTTP Server:**
- Serves all static files from `public/` directory
- Path traversal protection (validates all paths against `publicDir`)
- Falls back to `index.html` for extensionless routes (SPA support)
- Optional HTTP Basic Auth via `checkAuth()`

**WebSocket Server:**
- Attached to the same HTTP server port
- On client connection: immediately sends a `snapshot` of all current state
- Listens to `SuriCollector` events and broadcasts them to all connected clients
- Uses safe JSON serialization (handles `BigInt`)

**REST API Router:**
- Handles `/api/traces`, `/api/traces/export`, `/api/traces/import`, `/api/qa/run-suite`
- All routes return JSON

**QA Suite (`executeQaSuiteLive`):**
- 17 predefined architecture test scenarios
- Each test scenario directly calls `collector.startTrace()` → `collector.transitionNode()` → `collector.completeTrace()`
- Results are broadcast live over WebSocket and appear in the dashboard graph

---

## Data Flow Diagram

```
HTTP Request arrives
      |
      v
SuriLens Middleware (instrumentor.js)
  - Extract traceparent header (distributed trace)
  - Generate traceId
  - Sanitize auth headers
  - createTraceContext() via AsyncLocalStorage
  - collector.startTrace()
      |
      v
AsyncLocalStorage propagates context to all async descendants
      |
      v
collector.transitionNode() called by:
  - Middleware (process.nextTick after Router)
  - suriLens.step() manual calls
  - auto-instrument.js (http/https/fetch/ORM patches)
      |
      v
collector events --> DashboardServer --> WebSocket broadcast --> Browser
      |
      v
res.end() intercepted
  - collector.completeTrace()
  - eventStore.addEvent() (file + memory)
  - 'trace_complete' emitted --> broadcast
```

---

## Span Model

Each execution step creates a span:

```js
{
  node: 'Controller',           // Node name
  fromNode: 'Router',           // Previous node
  spanId: 'sp_a1b2c3d4',       // Unique span ID
  parentSpanId: 'sp_root',      // Parent span ID (for distributed trace nesting)
  category: 'controller',       // Resolved category
  timestamp: 1700000000000,     // Unix ms
  elapsedMs: 12,                // Time elapsed since trace start
  metadata: { handler: '...' } // User-provided metadata
}
```

---

## Distributed Tracing Model

```
Service A (SuriLens)                    Service B (SuriLens)
+---------------------------+           +---------------------------+
| traceId: tr_aabbccdd      |           | parentTraceId: tr_aabbccdd|
| correlationId: corr_xyz   |           | traceId: tr_11223344      |
|                           |           | correlationId: corr_xyz   |
| → outbound fetch()        |---------> | ← inbound traceparent     |
|   traceparent: 00-tr_aabb |           |   extracted on middleware  |
|   x-correlation-id: xyz   |           +---------------------------+
+---------------------------+
```
