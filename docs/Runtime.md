# ⏱️ Runtime Execution Engine

SuriLens instruments your application process at runtime using Node.js `AsyncLocalStorage` and microtask execution hooks.

---

## 1. Context Storage (`async-context.js`)

Node.js `AsyncLocalStorage` maintains state across asynchronous call stacks without manually passing context arguments through your functions.

When a request enters:
1. SuriLens invokes `createTraceContext(traceData)`.
2. A unique `traceId` (e.g. `tr_8477756d`) and W3C distributed tracing context (`parentTraceId`, `correlationId`) are generated.
3. `runWithContext(traceContext, fn)` runs the request execution chain inside the storage context.

```javascript
const { runWithContext, getContext } = require('./lib/core/async-context');

runWithContext(traceContext, () => {
  // Any function executed inside this boundary can access getContext()
  const context = getContext();
  console.log('Current Trace ID:', context.traceId);
});
```

---

## 2. Dynamic Layer Detection (`instrumentor.js`)

Instead of CPU-intensive timer polling (`setInterval`), SuriLens uses deterministic microtask execution hooks:

- Entry: Node `'Router'` is recorded immediately.
- Router Resolution: In the next microtask tick (`process.nextTick`), SuriLens checks if Express matched a route pattern (`req.route.path`).
- Controller Node: If `req.route` exists, transition to `'Controller'` is recorded with `{ path: req.route.path }`.
- Middleware Node: If `req.route` does not exist yet, transition to `'Middleware'` is recorded.

---

## 3. Outbound Auto-Instrumentation (`auto-instrument.js`)

Outbound HTTP and HTTPS calls (`http.request`, `https.request`, and global `fetch`) are monkey-patched upon middleware initialization.

When your application calls an external HTTP endpoint (e.g. Stripe, OpenAI, or a remote database):
1. `auto-instrument.js` extracts the target hostname.
2. If `localhost` or `127.0.0.1`, it assigns stage node `'Database'`.
3. If remote (e.g. `api.stripe.com`), it assigns stage node `'External API (api.stripe.com)'`.
4. Automatically injects W3C `traceparent` headers into outgoing request headers.
