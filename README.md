<div align="center">

<img src="https://raw.githubusercontent.com/sonisuryansh/surilens/main/docs/assets/logo.png" alt="SuriLens Logo" width="75" />

# ⚡ SuriLens

**Enterprise-grade Real-Time Backend Observability Platform for Node.js**

<p>
  <a href="https://www.npmjs.com/package/surilens"><img alt="npm version" src="https://img.shields.io/npm/v/surilens.svg?style=flat-square&color=blue" /></a>
  <a href="https://nodejs.org"><img alt="node version" src="https://img.shields.io/node/v/surilens.svg?style=flat-square&color=green" /></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/npm/l/surilens.svg?style=flat-square&color=orange" /></a>
  <a href="https://www.npmjs.com/package/surilens"><img alt="weekly downloads" src="https://img.shields.io/npm/dw/surilens.svg?style=flat-square&color=purple" /></a>
  <img alt="frameworks" src="https://img.shields.io/badge/frameworks-Express%20%7C%20Fastify%20%7C%20NestJS%20%7C%20Koa%20%7C%20Hono-6366f1?style=flat-square" />
</p>

```bash
npm i surilens
```

<br/>

<img src="https://raw.githubusercontent.com/sonisuryansh/surilens/main/docs/assets/dashboard.png" alt="SuriLens Hero Dashboard" width="800" style="border-radius: 8px;" />

<p><sub><em>Live execution graph showing complete request lifecycle through middleware, controllers, services, and databases.</em></sub></p>

</div>

---

## 🔭 What is SuriLens?

**SuriLens** is a zero-dependency, drop-in observability middleware for Node.js backends. It automatically captures every HTTP request, traces execution through your application layers (**Router → Middleware → Controller → Service → Database → Response**), and streams the data live to a real-time dark-mode dashboard — all in a single `npm install`.

### Why use SuriLens?
- **Instant Visual Clarity**: No more guessing what happens inside complex async routes or middleware chains.
- **Zero Config & Local-First**: No external SaaS accounts, no heavy agents, no setup steps, and no extra dependencies beyond `ws`. Runs 100% locally.
- **Interactive Time-Travel Debugging**: Step through captured requests using the built-in **Visual Replay Engine** to pinpoint bottlenecks and errors instantly.
- **Built-in Data Privacy**: Automatic recursive security masking for passwords, tokens, cookies, and sensitive headers.

---

## 💡 Why SuriLens Over Alternatives?

| Problem | SuriLens Solution |
|---------|------------------|
| "I don't know what happens inside my Express app" | Live execution graph shows every layer as it executes in real-time |
| "I can't reproduce what happened on that failing request" | Visual Replay Engine — step through any captured request step-by-step |
| "My DB queries are slow but I don't know which ones" | Per-stage timing waterfall in the Timeline panel |
| "I can't debug distributed microservice calls" | W3C Trace Context propagation with `traceparent` headers |
| "Sensitive data leaks into logs" | Automatic security masking of passwords, tokens, cookies |
| "My observability tool costs $$$ or needs cloud agents" | SuriLens is 100% open source, lightweight, and runs locally |

---

## Features

### Real-Time Execution Graph
- Live animated flow graph: `Client → Express → Router → Middleware → Controller → Service → Database → Response`
- 15 distinct node category colors with state animations (active pulse glow, completed solid, failed shake)
- Directional SVG arrowheads on every connection path
- Node chain hover highlighting (prev + current + next nodes illuminate together)
- Dynamic node creation and deletion live from the graph during execution

### Request Explorer
- Scrollable list of all captured requests with method, route, status, latency, timestamp
- Live search by route text, method, status code, and minimum latency
- Click any request to instantly render its full execution graph

### Inspector Panel
- Detailed view of the selected node: payload, headers, metadata, stage diffs
- Git-style diff showing what changed between pipeline stages
- Security-masked display of sensitive fields
- Smooth slide/fade open and close animation; re-opens automatically on node selection

### Timeline Panel
- Per-stage waterfall timing visualization
- Identify exactly where latency accumulates in the pipeline

### Visual Replay Engine
- Step-by-step re-execution of any captured trace
- Play, Pause, speed controls (0.5x, 1x, 2x, 4x)
- All completed and error states rendered with full glow animations

### Performance Metrics (Live)
- **RPS** — Requests per second (1-second rolling window)
- **Avg Response Time** — Cumulative moving average
- **Memory (MB)** — Process heap usage
- **CPU%** — Process CPU utilization
- **Error Rate%** — Percentage of failed requests (4xx/5xx)

### Security Masking
Automatic recursive masking of sensitive fields in headers, request body, and stage payloads:
`password`, `pass`, `secret`, `token`, `authorization`, `auth`, `apikey`, `privatekey`, `cookie`, `bearer`, `access_token`, `id_token`, `ssn`, `card`

### Distributed Tracing
- W3C Trace Context (`traceparent` header) extraction from inbound requests
- `x-correlation-id` / `x-request-id` header propagation
- Automatic injection of `traceparent` and `x-correlation-id` into all outbound HTTP/fetch calls

### Import / Export
- **Export** — Download all current traces as a JSON session bundle via `GET /api/traces/export`
- **Import** — Upload a previously exported bundle via `POST /api/traces/import` to restore sessions

### Browser Persistence
- Selected trace and filters restored from `localStorage` after page refresh
- URL query string sync (`?traceId=tr_xxx`) for shareable deep-links
- Auto-renders the latest or previously selected trace on load without any manual click
- WebSocket auto-reconnect with graceful retry on backend unavailability

### Auto-Instrumentation (Zero Config)
Automatically instruments on `require` — no code changes needed:
- `mongoose` — MongoDB operations
- `ioredis` / `redis` — Cache operations
- `pg` — PostgreSQL queries
- `mysql2` — MySQL queries
- `sequelize` — ORM operations
- `prisma` — Prisma Client
- `kafkajs` — Kafka produce/consume
- `@aws-sdk/client-s3` — S3 operations
- All outbound `http.request` / `https.request` / `fetch` calls

---

## Installation

```bash
npm install surilens
```

**Requirements:** Node.js >= 18.0.0

---

## Quick Start

### Express

```js
const express = require('express');
const suriLens = require('surilens');

const app = express();
app.use(express.json());

// Dashboard launches automatically on http://localhost:4444
app.use(suriLens({ dashboardPort: 4444 }));

app.get('/users/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'getUser' });
  suriLens.step('Service', { action: 'fetchUser' });
  suriLens.step('Database', { query: 'SELECT * FROM users WHERE id = ?' });
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000, () => console.log('App on http://localhost:3000'));
```

Open **http://localhost:4444** to see the live dashboard.

### Fastify

```js
const fastify = require('fastify')();
const { adapters } = require('surilens');

fastify.register(adapters.fastify, { dashboardPort: 4444 });

fastify.get('/users/:id', async (request, reply) => {
  return { id: request.params.id };
});

fastify.listen({ port: 3000 });
```

### Koa

```js
const Koa = require('koa');
const { adapters } = require('surilens');

const app = new Koa();
app.use(adapters.koa({ dashboardPort: 4444 }));

app.use(async ctx => {
  ctx.body = { hello: 'world' };
});

app.listen(3000);
```

### NestJS

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const { adapters } = require('surilens');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(adapters.nest({ dashboardPort: 4444 }));
  await app.listen(3000);
}
bootstrap();
```

### Hono

```ts
import { Hono } from 'hono';
const { adapters } = require('surilens');

const app = new Hono();
app.use('*', adapters.hono({ dashboardPort: 4444 }));

app.get('/hello', (c) => c.json({ hello: 'world' }));

export default app;
```

---

## Supported Frameworks

| Framework | Import | Min Version |
|-----------|--------|-------------|
| Express | `require('surilens')` | 4.x, 5.x |
| Fastify | `suriLens.adapters.fastify` | 4.x, 5.x |
| Koa | `suriLens.adapters.koa` | 2.x |
| NestJS | `suriLens.adapters.nest` | 9.x, 10.x |
| Hono | `suriLens.adapters.hono` | 3.x, 4.x |

---

## Dashboard Overview

Open `http://localhost:4444` after starting your app.

```
+-------------------------------------------------------------+
|  Header: SuriLens · RPS · Avg RT · Memory · CPU · Error%   |
+----------------+---------------------------+----------------+
|                |                           |                |
|  Request       |   Execution Graph         |   Inspector    |
|  Explorer      |   (Live SVG Canvas)       |   Panel        |
|                |                           |                |
+----------------+---------------------------+----------------+
|                     Timeline Panel                         |
+------------------------------------------------------------+
```

### Execution Graph — Node Colors

| Node | Color |
|------|-------|
| Client | Blue `#3B82F6` |
| Express | Amber `#F59E0B` |
| Router | Cyan `#06B6D4` |
| Middleware | Purple `#A855F7` |
| Controller | Pink `#EC4899` |
| Service | Indigo `#6366F1` |
| Repository | Teal `#14B8A6` |
| Database / MongoDB / Prisma / Sequelize | Violet `#8B5CF6` |
| Redis / Cache | Orange `#F97316` |
| JWT / Bcrypt / Auth | Yellow `#EAB308` |
| External API | Sky Blue `#0EA5E9` |
| Worker | Emerald `#10B981` |
| Filesystem | Brown `#D97706` |
| Response | Green `#22C55E` |

### Node States

| State | Visual |
|-------|--------|
| Active | Pulsing halo glow animation |
| Completed | Solid bright border |
| Failed | Red shake animation |
| Idle | Dimmed, no glow |

---

## Manual Step API

```js
// Mark any stage transition
suriLens.step('Controller', { handler: 'processPayment' });
suriLens.step('PaymentService', { action: 'chargeCard', currency: 'USD' });
suriLens.step('Database', { query: 'INSERT INTO transactions ...' });

// Remove a temporary dynamic node live from the graph
suriLens.step('TempWorker', { action: 'allocating' });
await doWork();
suriLens.removeStep('TempWorker', { reason: 'job_complete' });
```

---

## SDK Helpers

### `suriLens.traceAsync(name, fn, metadata?)`
Trace any async function with automatic entry and exit:
```js
const result = await suriLens.traceAsync('PaymentGateway', async () => {
  return await stripe.charges.create({ amount: 5000, currency: 'usd' });
}, { provider: 'stripe' });
```

### `suriLens.wrapFunction(name, fn)`
Wrap a sync or async function for automatic tracing:
```js
const tracedFetchUser = suriLens.wrapFunction('UserRepository', fetchUser);
const user = await tracedFetchUser(userId);
```

### `suriLens.traceQueueJob(queue, job, fn, metadata?)`
Trace queue consumers (BullMQ, Kafka, RabbitMQ):
```js
await suriLens.traceQueueJob('email-queue', 'sendWelcomeEmail', async () => {
  await mailer.send({ to: user.email, template: 'welcome' });
});
```

### `suriLens.traceCacheOperation(type, op, key, fn)`
Trace cache hits and misses:
```js
const data = await suriLens.traceCacheOperation('Redis', 'GET', `user:${id}`, async () => {
  return await redis.get(`user:${id}`);
});
```

### `suriLens.createPlugin(name, initFn)`
Build third-party integration plugins:
```js
const myPlugin = suriLens.createPlugin('MyService', ({ collector, getContext, traceAsync }) => {
  // custom integration
});
myPlugin.init({});
```

---

## Configuration

```js
app.use(suriLens({
  // Dashboard
  dashboardPort: 4444,         // Dashboard port (default: 4444)
  host: 'localhost',           // Dashboard bind host (default: 'localhost')
  disableDashboard: false,     // Skip dashboard launch (default: false)
  dashboardAuth: {             // HTTP Basic Auth — null means no auth
    user: 'admin',
    pass: 'secret'
  },

  // Trace Storage
  maxHistory: 100,             // Max completed traces in memory (default: 100)
  traceTtlMs: 60000,           // Auto-expire hanging traces in ms (default: 60000)
  maxPayloadSize: 32768,       // Truncate payloads over N bytes (default: 32768 = 32KB)
  maxEvents: 100,              // Max events in EventStore (default: 100)
  enableFileStore: true,       // File-based persistence (default: true)
  eventsDir: './events'        // Events directory (default: './events')
}));
```

---

## REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/traces` | Search traces (`method`, `status`, `route`, `minLatency`, `q` params) |
| `GET` | `/api/traces/export` | Download all traces as a JSON bundle |
| `POST` | `/api/traces/import` | Import a previously exported session bundle |
| `GET` | `/api/qa/run-suite` | Trigger the 17-scenario QA suite (visible in dashboard) |

**Examples:**
```bash
# Search failed POST requests
curl "http://localhost:4444/api/traces?method=POST&status=500"

# Export session
curl "http://localhost:4444/api/traces/export" -o session.json

# Import session
curl -X POST "http://localhost:4444/api/traces/import" \
  -H "Content-Type: application/json" -d @session.json
```

---

## WebSocket Events

Connect to `ws://localhost:4444`. On connection you receive a `snapshot` of all current state. Then:

| Event | Trigger |
|-------|---------|
| `snapshot` | On connection — full current state |
| `trace_start` | New HTTP request received |
| `node_active` | Execution transitions to a new node |
| `node_remove` | A dynamic node is removed from the graph |
| `trace_complete` | Request response sent |

Each event payload includes a `stats` object with live performance metrics.

---

## Distributed Tracing

SuriLens propagates W3C Trace Context automatically. All outbound `http.request`, `https.request`, and `fetch` calls receive:

```
traceparent: 00-{traceId}-0000000000000001-01
x-correlation-id: {correlationId}
```

Inbound `traceparent` headers are extracted to link parent-child trace relationships across microservices.

---

## Architecture

```
 Your Node.js App
 +---------------------------------------------------------+
 | HTTP Request --> SuriLens Middleware                    |
 |                    |                                    |
 |    AsyncLocalStorage trace context propagation          |
 |                    |                                    |
 |   +----------------v------------------------------+     |
 |   |          SuriCollector (EventEmitter)         |     |
 |   |  startTrace / transitionNode / completeTrace  |     |
 |   |  Metrics: RPS / CPU / Memory / Error Rate     |     |
 |   |  EventStore: file + memory persistence        |     |
 |   +----------------+------------------------------+     |
 |                    |                                    |
 |         trace_start / node_active / trace_complete      |
 +-----------+-------+------------------------------------+
             |
 +-----------v--------------------------------------------+
 |           DashboardServer                               |
 |  HTTP Static (public/) + WebSocket Server               |
 |  REST: /api/traces, /api/traces/export, /import        |
 +-----------+--------------------------------------------+
             | WebSocket broadcast
 +-----------v--------------------------------------------+
 |       Browser Dashboard — http://localhost:4444         |
 |  Execution Graph · Inspector · Timeline · Replay       |
 +----------------------------------------------------+---+
```

---

## Folder Structure

```
surilens/
├── index.js                     # Main entry — suriLens() + all SDK exports
├── lib/
│   ├── core/
│   │   ├── async-context.js     # AsyncLocalStorage context management
│   │   ├── auto-instrument.js   # Zero-config protocol & ORM instrumentation
│   │   ├── collector.js         # Trace lifecycle, metrics, bottleneck detection
│   │   ├── event-store.js       # Persistence, security masking, search, payload diff
│   │   ├── instrumentor.js      # Express middleware + manual step helpers
│   │   └── plugin-sdk.js        # traceAsync, wrapFunction, traceQueueJob, etc.
│   ├── adapters/
│   │   ├── express.js           # Express adapter
│   │   ├── fastify.js           # Fastify plugin
│   │   ├── koa.js               # Koa middleware
│   │   ├── nest.js              # NestJS interceptor
│   │   └── hono.js              # Hono edge middleware
│   └── server/
│       └── dashboard-server.js  # HTTP + WebSocket dashboard server
├── public/                      # Dashboard frontend assets
├── example/
│   └── server.js                # Complete working demo server
├── events/                      # Runtime trace files (auto-created, gitignored)
├── docs/                        # Extended documentation
├── package.json
└── LICENSE
```

---

## Running the Example

```bash
cd example
npm install
node server.js
```

Then send some requests:

```bash
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"item":"keyboard","qty":2}'
curl http://localhost:3000/api/error-test
curl http://localhost:3000/api/redis-demo
curl http://localhost:3000/api/dynamic-node
```

Watch the execution graph animate live at **http://localhost:4444**.

---

## FAQ

**Q: Will SuriLens slow down my production app?**
Overhead is typically < 2ms per request. All operations are non-blocking and use `AsyncLocalStorage` for zero-cost context propagation.

**Q: Is the dashboard secure?**
By default the dashboard is only accessible on `localhost`. Enable `dashboardAuth: { user, pass }` for HTTP Basic Auth. Never expose port 4444 directly to the internet.

**Q: Can I disable the dashboard?**
Yes. Pass `disableDashboard: true`. Use `suriLens.collector` directly or listen on its EventEmitter.

**Q: Does it work with TypeScript?**
Yes. Use `const suriLens = require('surilens')` or `import suriLens = require('surilens')`.

**Q: Does it work with microservices?**
Yes. Each service runs its own SuriLens instance. Trace IDs are propagated via W3C `traceparent` headers automatically.

**Q: What happens when I restart the server?**
In-memory traces are cleared. File-persisted traces in `events/` remain on disk and can be re-imported via `POST /api/traces/import`.

---

## Roadmap

- [ ] OpenTelemetry exporter
- [ ] PostgreSQL query detail panel
- [ ] Trace comparison (diff two requests side-by-side)
- [ ] gRPC adapter
- [ ] Custom alerting rules (webhook on slow route threshold)
- [ ] Dark/Light theme toggle

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT © [Suryansh Soni](https://github.com/sonisuryansh)

---

<div align="center">
  <sub>Built for Node.js developers who deserve better observability.</sub>
</div>
