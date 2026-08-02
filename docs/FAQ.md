# FAQ

Frequently asked questions about SuriLens.

---

## General

**Q: What is SuriLens?**
SuriLens is a drop-in observability middleware for Node.js. It captures every HTTP request, traces its execution through your app layers, and displays it live in a dark-mode dashboard with an animated execution graph.

**Q: Does it require an account, API key, or cloud service?**
No. SuriLens runs entirely locally. No account, no API key, no telemetry sent anywhere.

**Q: What frameworks does SuriLens support?**
Express, Fastify, Koa, NestJS, and Hono. All adapters are included in the package.

**Q: What Node.js version is required?**
Node.js >= 18.0.0. SuriLens uses `AsyncLocalStorage` (stable since Node 16) and optionally instruments native `fetch` (available since Node 18).

---

## Performance

**Q: Will SuriLens slow down my application?**
Overhead is typically < 2ms per request. All operations are non-blocking. `setInterval` timers use `.unref()` so they never prevent your process from exiting.

**Q: Will it cause memory leaks?**
No. The collector limits in-memory trace history (`maxHistory`, default 100). The EventStore has an LRU eviction limit (`maxEvents`, default 100). Hanging traces are auto-expired by the TTL sweep every 30 seconds.

**Q: Can I use it in production?**
SuriLens is designed for development and staging environments. For production, ensure the dashboard port is not exposed to the public internet, enable `dashboardAuth`, and consider tuning `maxHistory` and `traceTtlMs` for your traffic volume.

---

## Dashboard

**Q: What port does the dashboard run on?**
Port `4444` by default. Configure with `dashboardPort` option.

**Q: How do I access the dashboard?**
Open `http://localhost:4444` in your browser after starting your app.

**Q: Can I password-protect the dashboard?**
Yes. Use `dashboardAuth: { user: 'admin', pass: 'secret' }` to enable HTTP Basic Auth.

**Q: The dashboard is blank after browser refresh. What's wrong?**
SuriLens automatically restores the last selected trace from `localStorage` and the `?traceId=` URL parameter. If the backend is restarted, in-memory traces are cleared. Use the Export/Import feature to persist sessions across restarts.

**Q: Can I share a specific trace with a colleague?**
Yes. The URL includes `?traceId=tr_xxx` when a trace is selected. Share the URL, and the colleague needs to import the same session bundle to see it.

---

## Tracing

**Q: Do I need to call `suriLens.step()` everywhere?**
No. Auto-instrumentation traces outbound HTTP, database calls (mongoose, redis, pg, etc.) automatically. `suriLens.step()` is for adding custom named stages to the graph.

**Q: What happens if I call `suriLens.step()` outside of a request context?**
Nothing. The call is safely ignored — no error is thrown.

**Q: Does it work with concurrent requests?**
Yes. Each request gets its own `AsyncLocalStorage` context. 100 concurrent requests are tracked independently.

**Q: How does distributed tracing work?**
SuriLens reads `traceparent` from inbound requests and injects it into all outbound HTTP/fetch calls. Each service running SuriLens extracts the parent trace ID to link parent-child traces.

**Q: What is the `events/` directory?**
At runtime, SuriLens writes each completed trace to `events/request-{traceId}.json` and `.md`. This is controlled by `enableFileStore` (default `true`) and `eventsDir` (default `./events`). These files are gitignored and not committed to source control.

---

## Integration

**Q: Does it work with TypeScript?**
Yes. Use `const suriLens = require('surilens')` or `import suriLens = require('surilens')`.

**Q: Does it work with ESM (`import`/`export`)?**
Not natively. SuriLens is CommonJS. Use `createRequire` or dynamic `import()` as needed.

**Q: Can I use it without the dashboard UI?**
Yes. Pass `disableDashboard: true` and listen to events on `suriLens.collector` directly.

**Q: Can I forward SuriLens events to my own monitoring system?**
Yes. Listen to `suriLens.collector` events and forward to any sink:
```js
suriLens.collector.on('trace_complete', (trace) => {
  myMonitor.send({ traceId: trace.traceId, route: trace.route, latency: trace.responseTime });
});
```

---

## Troubleshooting

See [Troubleshooting.md](Troubleshooting.md) for common issues and solutions.
