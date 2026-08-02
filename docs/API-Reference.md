# API Reference

Complete reference for all SuriLens public APIs, middleware options, SDK helpers, REST endpoints, and WebSocket events.

---

## Initialization

### `suriLens(options?)` — Express Middleware

The default export. Call as middleware on your Express app.

```js
const suriLens = require('surilens');
app.use(suriLens(options));
```

Auto-launches the SuriLens dashboard on the configured port and begins capturing traces.

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dashboardPort` / `port` | `number` | `4444` | Dashboard HTTP server port |
| `host` | `string` | `'localhost'` | Dashboard bind hostname |
| `disableDashboard` | `boolean` | `false` | Skip auto-launching the dashboard |
| `dashboardAuth` | `{ user: string, pass: string }` | `null` | HTTP Basic Auth credentials. `null` = no auth |
| `maxHistory` | `number` | `100` | Max completed traces kept in memory |
| `traceTtlMs` | `number` | `60000` | Auto-expire hanging (never-completed) traces after N ms |
| `maxPayloadSize` | `number` | `32768` | Truncate payloads larger than N bytes (32KB default) |
| `maxEvents` | `number` | `100` | Max events in the persistent EventStore |
| `enableFileStore` | `boolean` | `true` | Enable file-based trace persistence to `eventsDir` |
| `eventsDir` | `string` | `'./events'` | Directory for persisted JSON/Markdown trace files |

---

## Framework Adapters

### Express (default)

```js
const suriLens = require('surilens');
app.use(suriLens({ dashboardPort: 4444 }));
```

### Fastify

```js
const { adapters } = require('surilens');
fastify.register(adapters.fastify, { dashboardPort: 4444 });
```

### Koa

```js
const { adapters } = require('surilens');
app.use(adapters.koa({ dashboardPort: 4444 }));
```

### NestJS

```js
const { adapters } = require('surilens');
app.use(adapters.nest({ dashboardPort: 4444 }));
```

### Hono

```js
const { adapters } = require('surilens');
app.use('*', adapters.hono({ dashboardPort: 4444 }));
```

---

## Manual Step Helpers

### `suriLens.step(nodeName, metadata?)`

Records a manual execution step. Transitions the current trace to the named node.

```js
suriLens.step('Controller', { handler: 'getUser' });
suriLens.step('Service', { action: 'processOrder', orderId: 'ord_123' });
suriLens.step('Database', { query: 'SELECT * FROM users WHERE id = ?', id: 1 });
```

- **`nodeName`** — Any string. SuriLens auto-detects the category from common keywords (e.g., `MongoDB`, `Redis`, `JWT`).
- **`metadata`** — Optional object. Displayed in the Inspector panel.
- Has no effect if called outside of an active trace context (i.e., outside of a request lifecycle).

### `suriLens.removeStep(nodeName, metadata?)`

Removes a previously created dynamic node from the execution graph in real-time.

```js
suriLens.step('TempWorker', { action: 'allocating_worker' });
await doWork();
suriLens.removeStep('TempWorker', { reason: 'job_completed' });
```

---

## SDK Helpers

### `suriLens.traceAsync(nodeName, fn, metadata?)`

Wraps an async function. Records a node transition on entry. If the function throws, logs the error to the trace.

```js
const result = await suriLens.traceAsync('PaymentGateway', async () => {
  return await stripe.charges.create({ amount: 5000, currency: 'usd' });
}, { provider: 'stripe' });
```

**Returns:** The return value of `fn()`.

### `suriLens.wrapFunction(nodeName, fn)`

Returns a new function that automatically records a node transition on every invocation.

```js
const tracedFn = suriLens.wrapFunction('UserRepository', fetchUser);
const user = await tracedFn(userId);
```

Works with both synchronous and asynchronous functions.

### `suriLens.traceQueueJob(queueName, jobName, fn, metadata?)`

Traces a queue consumer job. Creates a `Queue (queueName)` node in the execution graph.

```js
await suriLens.traceQueueJob('email-queue', 'sendWelcomeEmail', async () => {
  await mailer.send({ to: user.email });
}, { priority: 'high' });
```

### `suriLens.traceCacheOperation(cacheType, operation, key, fn)`

Traces a cache operation. Creates a `Cache (cacheType)` node and records hit/miss status.

```js
const data = await suriLens.traceCacheOperation('Redis', 'GET', `user:${id}`, async () => {
  return await redis.get(`user:${id}`);
});
```

### `suriLens.autoInstrument()`

Manually triggers zero-config auto-instrumentation. Called automatically by the default middleware on initialization. Call this explicitly only if you are not using the default middleware.

```js
suriLens.autoInstrument();
```

### `suriLens.createPlugin(name, initFn)`

Creates a SuriLens plugin object for custom third-party integrations. The `initFn` receives `{ collector, getContext, traceAsync, wrapFunction }`.

```js
const myPlugin = suriLens.createPlugin('S3Integration', ({ collector, getContext }) => {
  // custom instrumentation
});
myPlugin.init({ bucket: 'my-bucket' });
```

---

## Exposed Internals

### `suriLens.collector`

The singleton `SuriCollector` instance (an `EventEmitter`). Use to listen to trace lifecycle events directly.

```js
suriLens.collector.on('trace_complete', (trace) => {
  console.log('Trace finished:', trace.traceId, trace.responseTime + 'ms');
});
```

### `suriLens.getContext()`

Returns the current `AsyncLocalStorage` trace context, or `null` if called outside of a request lifecycle.

```js
const ctx = suriLens.getContext();
if (ctx) {
  console.log('Current trace ID:', ctx.traceId);
}
```

---

## REST API Endpoints

The dashboard server (`http://localhost:4444`) exposes:

### `GET /api/traces`

Search and filter captured traces.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search in route/method |
| `method` | string | Filter by HTTP method (`GET`, `POST`, etc.) |
| `status` | string | Filter by HTTP status code |
| `minLatency` | number | Return only traces with `responseTime >= minLatency` ms |

**Response:**
```json
{
  "total": 42,
  "traces": [ { "id": "tr_...", "method": "GET", ... } ]
}
```

### `GET /api/traces/export`

Downloads all stored traces as a JSON session bundle.

**Response:** `Content-Disposition: attachment; filename="surilens-session.json"`

```json
{
  "exportedAt": "2024-01-01T00:00:00.000Z",
  "traces": [ ... ]
}
```

### `POST /api/traces/import`

Imports a previously exported session bundle. All traces in the bundle are added to the EventStore.

**Request body:** A JSON object matching the export format.

**Response:**
```json
{ "success": true, "importedCount": 15 }
```

### `GET /api/qa/run-suite`

Triggers the 17-scenario architecture QA suite. All test traces are injected into the collector and appear live in the dashboard graph.

**Response:**
```json
{
  "success": true,
  "totalExecuted": 17,
  "passed": 17,
  "failed": 0,
  "scorecard": { ... }
}
```

---

## Collector EventEmitter

Subscribe to trace lifecycle events:

```js
const { collector } = require('surilens');

collector.on('trace_start', (event) => { /* ... */ });
collector.on('node_active', (event) => { /* ... */ });
collector.on('node_remove', (event) => { /* ... */ });
collector.on('trace_complete', (trace) => { /* ... */ });
```

See [Event-System.md](Event-System.md) for full payload shapes.

---

## Collector Methods

### `collector.getSnapshot()`

Returns a snapshot of all current state:

```js
const snapshot = collector.getSnapshot();
// {
//   stats: { rps, activeRequests, completedRequests, failedRequests, avgResponseTime, errorRatePercent, memoryMb, cpuPercent },
//   activeTraces: [...],
//   recentTraces: [...]  // last 50 completed
// }
```

### `collector.stats`

Live performance counters:
- `totalRequests` — Total requests since server start
- `activeRequests` — Currently in-flight requests
- `completedRequests` — Completed requests
- `failedRequests` — Requests with status >= 400
- `avgResponseTime` — Cumulative moving average (ms)
- `errorRatePercent` — `(failed / total) * 100`
- `rps` — Requests in the last 1-second window
- `memoryMb` — Current process heap usage (MB)
- `cpuPercent` — Current process CPU utilization (%)

---

## Error Handling

SuriLens never throws errors to your application. All internal errors are caught and logged via `console.warn` or silently ignored. If the dashboard port is already in use, a warning is printed and the dashboard is skipped — your application continues normally.

Tracing errors within your own code:

```js
app.get('/risky', async (req, res, next) => {
  try {
    suriLens.step('RiskyService');
    throw new Error('Something went wrong');
  } catch (err) {
    next(err); // SuriLens captures this as a failed trace (status 500)
  }
});
```
