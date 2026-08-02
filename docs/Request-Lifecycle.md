# Request Lifecycle

How SuriLens tracks a single HTTP request from arrival to response.

---

## Lifecycle Stages

```
1. Request arrives at Express
2. SuriLens Middleware intercepts
3. Trace context created (AsyncLocalStorage)
4. collector.startTrace() → 'trace_start' event
5. process.nextTick: transition to 'Router'
6. Express route matched → 'Controller' node
7. suriLens.step() calls → custom nodes
8. Auto-instrumented calls (DB, HTTP, Redis, etc.)
9. res.end() called → collector.completeTrace()
10. 'trace_complete' event emitted
11. EventStore persists to memory + disk
```

---

## Stage 1 — Request Arrival

When a request hits `app.use(suriLens())`:

- Distributed tracing headers extracted (`traceparent`, `x-correlation-id`, `x-request-id`)
- Unique `traceId` generated (`tr_XXXXXXXX`)
- Request context captured: method, URL, client IP, headers (with auth masking), body, query params

---

## Stage 2 — Trace Context

An `AsyncLocalStorage` context is created containing the trace metadata. This context automatically flows through all `async/await` descendants of this request — no manual passing required.

---

## Stage 3 — Node Transitions

| Event | When |
|-------|------|
| `Express` | Immediately on middleware entry |
| `Router` | On `process.nextTick` after `next()` is called |
| `Controller` | When `req.route` is resolved (route matched) |
| `Middleware` | When a middleware runs before route resolution |
| `[custom]` | When `suriLens.step()` is called |
| `[auto]` | When instrumented libraries are called (DB, HTTP, etc.) |
| `Response` | Appended to execution list on trace completion |

---

## Stage 4 — Response Interception

`res.end` is wrapped to detect when the response is sent:

- `res.json` is also wrapped to capture the response body
- When `res.end` fires: `traceContext.route` is resolved from `req.route.path`, URL params from `req.params`
- `collector.completeTrace(traceId, res.statusCode)` is called

---

## Stage 5 — Completion

`collector.completeTrace()`:

1. Calculates `responseTime` (ms since `startTime`)
2. Sets `status: 'completed'` or `status: 'failed'` (based on status code and errors)
3. Runs bottleneck detection (`performanceFlags`)
4. Moves trace from `activeTraces` to `completedTraces`
5. Calls `eventStore.addEvent()` to persist
6. Emits `'trace_complete'`
7. Dashboard broadcasts `trace_complete` to all WebSocket clients

---

## Execution Chain Example

For this route:
```js
app.get('/api/users/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'getUser' });
  suriLens.step('Service', { action: 'fetchFromDB' });
  suriLens.step('Database', { query: 'SELECT * FROM users' });
  const user = await db.findOne(req.params.id);
  res.json(user);
});
```

The recorded execution chain is:
```
Express → Router → Controller → Service → Database → Response
```

With full span timing, metadata, and payload diff at each step.

---

## Concurrent Requests

SuriLens handles concurrent requests correctly via `AsyncLocalStorage`. Each request gets its own isolated context. `suriLens.step()` always records to the correct trace, even when 100 requests are in-flight simultaneously.

---

## Error Handling

If your route throws an error or calls `next(err)`:

- The error is captured in `trace.error`
- `trace.status` is set to `'failed'`
- `trace.statusCode` reflects the actual HTTP status sent
- `performanceFlags` may include error-related entries
- The trace still completes and appears in the dashboard

If a trace never completes (e.g., a hanging request), the TTL sweep (every 30s) will force-expire it after `traceTtlMs` milliseconds with a `504 Gateway Timeout` status.
