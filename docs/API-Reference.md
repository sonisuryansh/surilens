# 📑 API Reference

Exhaustive public API documentation for `surilens`.

---

## Primary Export: `suriLens(options)`

Middleware factory for Express applications.

```javascript
const suriLens = require('surilens');
app.use(suriLens(options));
```

### Parameters (`options` object)
- `dashboardPort` *(Number, default: 4444)*: Port for the embedded HTTP and WebSocket dashboard server.
- `port` *(Number)*: Alias for `dashboardPort`.
- `dashboardAuth` *(Object, optional)*: `{ user: string, pass: string }` for HTTP Basic Authentication.
- `enableFileStore` *(Boolean, default: true)*: Asynchronous file logging to `./events`.
- `eventsDir` *(String, default: `./events`)*: Target directory for trace JSON/MD log files.
- `maxHistory` *(Number, default: 100)*: Max trace sessions kept in memory.
- `traceTtlMs` *(Number, default: 60000)*: Active trace TTL before garbage collection.

---

## Static SDK Methods

### `suriLens.step(nodeName, metadata)`
Manually records a stage transition in the active trace context.

### `suriLens.removeStep(nodeName, metadata)`
Removes a stage node from the active trace graph.

### `suriLens.traceAsync(nodeName, fn, metadata)`
Instruments an asynchronous function execution.

### `suriLens.wrapFunction(nodeName, targetFn)`
Wraps a function to auto-instrument its execution.

### `suriLens.traceCacheOperation(cacheType, operation, key, cacheFn)`
Instruments cache GET/SET operations.

### `suriLens.traceQueueJob(queueName, jobName, jobFn)`
Instruments background queue job execution.

### `suriLens.createPlugin(name, initFn)`
Creates a custom plugin extension.

### `suriLens.autoInstrument()`
Manually triggers outbound HTTP/HTTPS and `fetch` auto-instrumentation.

---

## Framework Adapters (`suriLens.adapters`)

- `suriLens.adapters.express(options)`
- `suriLens.adapters.fastify(fastifyInstance, options)`
- `suriLens.adapters.koa(options)`
- `suriLens.adapters.nest`: NestJS Interceptor class.
- `suriLens.adapters.hono(options)`
