# Event System

SuriLens broadcasts real-time trace events over WebSocket and exposes the same events via the `collector` EventEmitter.

---

## Connecting via WebSocket

```js
const ws = new WebSocket('ws://localhost:4444');

ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  console.log(type, data);
};
```

---

## Events

### `snapshot`

Sent immediately on WebSocket connection. Contains the full current state.

```json
{
  "type": "snapshot",
  "data": {
    "stats": {
      "totalRequests": 42,
      "activeRequests": 1,
      "completedRequests": 41,
      "failedRequests": 3,
      "avgResponseTime": 87,
      "errorRatePercent": 7.1,
      "rps": 5,
      "memoryMb": 48.2,
      "cpuPercent": 3
    },
    "activeTraces": [],
    "recentTraces": []
  }
}
```

---

### `trace_start`

Fired when a new HTTP request is received.

```json
{
  "type": "trace_start",
  "data": {
    "trace": {
      "traceId": "tr_a1b2c3d4",
      "parentTraceId": null,
      "correlationId": "tr_a1b2c3d4",
      "method": "POST",
      "url": "/api/orders",
      "route": "/api/orders",
      "startTime": 1700000000000,
      "clientIP": "127.0.0.1",
      "headers": { "content-type": "application/json", "authorization": "Bearer ****abcd" },
      "body": { "item": "keyboard", "qty": 2 },
      "query": {},
      "params": {},
      "activeNode": "Express"
    },
    "stats": { "rps": 5, "memoryMb": 48.2, ... }
  }
}
```

**Notes:**
- `parentTraceId` is set when a `traceparent` header is detected (distributed tracing)
- `authorization` header is automatically masked to show only the last 4 chars
- `cookie` header is masked to `****`

---

### `node_active`

Fired each time execution transitions to a new node.

```json
{
  "type": "node_active",
  "data": {
    "traceId": "tr_a1b2c3d4",
    "spanId": "sp_x9y8z7w6",
    "parentSpanId": "sp_root",
    "activeNode": "Controller",
    "prevNode": "Router",
    "category": "controller",
    "step": {
      "node": "Controller",
      "fromNode": "Router",
      "spanId": "sp_x9y8z7w6",
      "parentSpanId": "sp_root",
      "category": "controller",
      "timestamp": 1700000000012,
      "elapsedMs": 12,
      "metadata": { "handler": "getUser" }
    },
    "requestContext": {
      "method": "GET",
      "route": "/api/users/:id",
      "clientIP": "127.0.0.1",
      "headers": { ... },
      "body": null,
      "query": {},
      "params": { "id": "1" }
    },
    "stats": { ... }
  }
}
```

**Category values:**

| `category` | Description |
|-----------|-------------|
| `express` | Express framework entry |
| `router` | Route matching layer |
| `middleware` | Middleware layer |
| `controller` | Route handler |
| `service` | Business logic layer |
| `repository` | Data access layer |
| `database` | Database / ORM operations |
| `redis` | Cache operations |
| `jwt` | Auth / JWT / Bcrypt operations |
| `external_http` | Outbound HTTP calls |
| `client` | Incoming client |
| `response` | Final response |
| `function` | General-purpose / custom node |

---

### `node_remove`

Fired when `suriLens.removeStep()` is called.

```json
{
  "type": "node_remove",
  "data": {
    "traceId": "tr_a1b2c3d4",
    "nodeName": "TempWorker",
    "timestamp": 1700000001500,
    "metadata": { "reason": "job_completed_deallocating" },
    "stats": { ... }
  }
}
```

---

### `trace_complete`

Fired when the HTTP response is sent.

```json
{
  "type": "trace_complete",
  "data": {
    "trace": {
      "id": "tr_a1b2c3d4",
      "traceId": "tr_a1b2c3d4",
      "method": "POST",
      "route": "/api/orders",
      "statusCode": 201,
      "status": "completed",
      "responseTime": 143,
      "startTime": 1700000000000,
      "endTime": 1700000000143,
      "execution": ["Express", "Router", "Controller", "Service", "Database", "Response"],
      "steps": [ ... ],
      "stagePayloads": {
        "Client": { "item": "keyboard", "qty": 2 },
        "Controller": { "item": "keyboard", "qty": 2 }
      },
      "performanceFlags": [],
      "error": null,
      "responseBody": { "success": true, "orderId": "ord_12345" },
      "memory": 48.2,
      "cpu": 3
    },
    "stats": { ... }
  }
}
```

**`status` values:**
- `"completed"` — Response code < 400 and no error thrown
- `"failed"` — Response code >= 400 or an error was caught

**`performanceFlags` schema:**
```json
[
  { "type": "SLOW_ROUTE", "message": "Route response time 743ms exceeds 500ms threshold" },
  { "type": "SLOW_STEP", "message": "Step 'Database' took 320ms" },
  { "type": "HIGH_MEMORY", "message": "System heap usage is high: 312MB" },
  { "type": "HIGH_CPU", "message": "System CPU load is high: 85%" }
]
```

---

## Server-Side EventEmitter

All events are also available from the `collector` EventEmitter directly:

```js
const suriLens = require('surilens');

suriLens.collector.on('trace_start', (event) => {
  // event.traceId, event.method, event.route, ...
});

suriLens.collector.on('node_active', (event) => {
  // event.traceId, event.activeNode, event.category, ...
});

suriLens.collector.on('node_remove', (event) => {
  // event.traceId, event.nodeName, ...
});

suriLens.collector.on('trace_complete', (trace) => {
  // trace.traceId, trace.responseTime, trace.statusCode, ...
});
```

Note: The collector emits the raw event payloads (before the `{ type, data }` wrapping that WebSocket clients receive).
