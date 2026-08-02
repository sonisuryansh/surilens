# Changelog

All notable changes to SuriLens are documented here.

---

## [1.1.3] — Production Release

### Improved
- **Visual Presentation**: Updated hero dashboard preview images and optimized layout for GitHub and npm
- **Dynamic Shields**: Live version, Node.js requirement, MIT license, and weekly download badges
- **Modular Documentation**: Clean landing page architecture linking to dedicated docs

## [1.0.2] — Production Release

### Added
- **Visual Replay Engine** — Step-by-step re-execution of captured traces with Play/Pause/Speed controls (0.5×, 1×, 2×, 4×)
- **Node Chain Hover Highlighting** — Hovering a node highlights the previous → current → next nodes and their connecting edges
- **Directional SVG Arrowheads** — Every connection path now has a directional arrowhead marker indicating execution flow
- **15 Node Category Colors** — Distinct, vibrant colors for every runtime category (Client, Express, Router, Middleware, Controller, Service, Repository, Database, Redis, JWT, Bcrypt, External API, Worker, Filesystem, Response)
- **Node Status Animations** — Active pulsing glow, completed solid border, failed red shake animation
- **Browser Refresh Persistence** — Selected trace ID, filters, zoom level, and panel sizes restored from `localStorage` on page reload
- **URL State Sync** — Selected trace ID synced to `?traceId=tr_xxx` URL query string for shareable deep-links
- **Auto Graph Restore** — Latest or previously selected trace automatically rendered after browser refresh — no manual click required
- **WebSocket Auto-Reconnect** — Graceful reconnect with exponential backoff if the backend is temporarily unavailable
- **Inspector Panel Close Button** — X button smoothly closes the Inspector panel; selecting any node or request reopens it automatically
- **QA Suite Mode** — `GET /api/qa/run-suite` triggers 17-scenario architecture tests that appear live in the dashboard graph

### Improved
- **Node Category Resolution** — Expanded keyword detection for `mongo`, `prisma`, `sequelize`, `postgres`, `mysql`, `redis`, `cache`, `jwt`, `bcrypt`, `axios`, `fetch`, `external`
- **Execution Graph Layout** — Cleaner left-to-right layout with consistent node spacing
- **Inspector Panel** — Smooth slide/fade transition with resizer hide/show on open/close

### Fixed
- Inspector panel close button (`#btn-close-inspector`) click not working due to missing `.closed` CSS class
- Execution graph empty after browser refresh — now auto-selects the latest or saved trace
- WebSocket duplicate connections on hot reload

---

## [1.0.1]

### Added
- Import / Export session bundles via `GET /api/traces/export` and `POST /api/traces/import`
- HTTP Basic Auth support (`dashboardAuth` option)
- `suriLens.removeStep()` — live remove a dynamic node from the execution graph
- `suriLens.traceQueueJob()` — queue consumer tracing (BullMQ, Kafka, RabbitMQ)
- `suriLens.traceCacheOperation()` — cache hit/miss tracing
- `suriLens.createPlugin()` — Plugin SDK for third-party integrations
- Distributed Tracing: W3C `traceparent` extraction and outbound header propagation
- Auto-instrumentation for `mongoose`, `ioredis`, `redis`, `pg`, `mysql2`, `sequelize`, `prisma`, `kafkajs`, `@aws-sdk/client-s3`
- Native `fetch` instrumentation (Node 18+)
- Trace TTL sweep (auto-expire hanging traces after 60s)
- Payload truncation at 32KB with summary fallback
- Security masking for all sensitive field names (recursive, all depths)
- Git-style payload diff engine in Inspector panel
- Bottleneck detection: `SLOW_ROUTE`, `HIGH_MEMORY`, `HIGH_CPU`, `SLOW_STEP` flags
- Performance metrics: RPS, CPU%, Memory MB, Error Rate%, Avg Response Time
- File-based event persistence (`events/request-{traceId}.json` + `.md`)
- Event search API (`GET /api/traces?method=&status=&q=&minLatency=`)
- Panel resizing (draggable splitter handles for explorer, inspector, timeline)

---

## [1.0.0] — Initial Release

### Added
- Express middleware integration
- Fastify, Koa, NestJS, Hono adapters
- Real-time WebSocket execution graph
- Request Explorer with live capture list
- Inspector Panel with payload and header display
- Timeline Panel with per-stage timing waterfall
- `suriLens.step()` manual node demarcation
- `suriLens.wrapFunction()` and `suriLens.traceAsync()` SDK helpers
- `suriLens.autoInstrument()` zero-config instrumentation
- Dashboard static server on configurable port (default 4444)
- Architecture-independent tracing (works with any folder structure)
- `AsyncLocalStorage` trace context propagation (no code changes required)
