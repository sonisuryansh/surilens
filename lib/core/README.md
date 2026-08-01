# Core Instrumentation Engine (`lib/core/`)

The `lib/core/` directory houses the core tracing engine, context storage, performance telemetry collector, sensitive data masker, and plugin SDK.

## 📁 Files

### `async-context.js`
- **Purpose**: Manages Node.js `AsyncLocalStorage` state across asynchronous boundaries.
- **Key Functions**:
  - `createTraceContext(traceData)`: Initializes trace metadata object (`traceId`, `parentTraceId`, `correlationId`, `serviceName`, `tags`).
  - `runWithContext(context, fn)`: Runs an asynchronous function inside `AsyncLocalStorage`.
  - `getContext()`: Retrieves active trace store for the current execution thread.

### `instrumentor.js`
- **Purpose**: Main Express middleware factory and microtask layer transition hooks.
- **Key Functions**:
  - `createMiddleware(options)`: Creates the Express middleware handler.
  - `recordStep(nodeName, metadata)`: Manually records a custom stage transition.
  - `removeStep(nodeName, metadata)`: Removes a temporary stage node from the execution graph.

### `auto-instrument.js`
- **Purpose**: Zero-dependency auto-instrumentation for outbound HTTP/HTTPS calls and `globalThis.fetch`.
- **Key Functions**:
  - `autoInstrument()`: Monkey-patches `http.request`, `https.request`, and `fetch`. Automatically injects W3C `traceparent` headers and resolves target hostname nodes (`External API: api.stripe.com`).

### `collector.js`
- **Purpose**: Central EventEmitter managing active traces, system metrics, performance intelligence, and Trace TTL garbage collection.
- **Key Functions**:
  - `startTrace(traceContext)`: Registers a new active trace.
  - `transitionNode(traceId, targetNode, metadata)`: Advances trace active node.
  - `completeTrace(traceId, statusCode, error, responseBody)`: Finalizes trace and computes response times.
  - `detectBottlenecks(trace)`: Performance Intelligence Engine flagging slow routes (>500ms), high CPU (>80%), high memory (>300MB), and slow steps (>200ms).

### `event-store.js`
- **Purpose**: In-memory event repository, payload diff engine, sensitive data masker, and non-blocking asynchronous disk logger.
- **Key Functions**:
  - `maskSensitiveData(data)`: Deep recursive masking for passwords, tokens, cookies, auth headers, and secrets.
  - `computePayloadDiff(beforeObj, afterObj)`: Computes JSON field additions, modifications, and deletions between stages.
  - `persistEventFilesAsync(event)`: Asynchronously writes `request-<id>.json` and `request-<id>.md` via `fs.promises.writeFile`.
  - `searchEvents(filters)`: Advanced query engine filtering by traceId, method, route, status, latency, error status, and node.

### `plugin-sdk.js`
- **Purpose**: Developer SDK helpers for custom code, cache, queue, and third-party integrations.
- **Key Functions**:
  - `traceAsync(nodeName, fn, metadata)`: Instrument custom async functions.
  - `wrapFunction(nodeName, targetFn)`: Synchronous/asynchronous function wrapper.
  - `traceQueueJob(queueName, jobName, jobFn)`: Instrument BullMQ/Kafka/RabbitMQ jobs.
  - `traceCacheOperation(cacheType, operation, key, cacheFn)`: Instrument Redis and memory cache operations.
  - `createPlugin(name, initFn)`: Helper to build third-party SuriLens plugins.
