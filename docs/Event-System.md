# 📡 Event System & Telemetry Streaming

SuriLens relies on internal EventEmitter broadcasts and WebSocket protocols to communicate telemetry from the Node.js backend to the browser UI.

---

## Internal Collector Events (`collector.js`)

`SuriCollector` extends `EventEmitter` and emits 4 core telemetry events:

| Event Name | Trigger | Payload Contents |
| :--- | :--- | :--- |
| `trace_start` | Incoming request initialized | `traceId`, `method`, `url`, `route`, `headers` (sanitized), `body`, `query`, `clientIP`, `stats` |
| `node_active` | Request enters a new stage | `traceId`, `activeNode`, `prevNode`, `step` metadata, `stats` |
| `node_remove` | Temporary stage removed | `traceId`, `nodeName`, `metadata`, `stats` |
| `trace_complete` | Request finishes (`res.end`) | `formattedEvent` (status, responseBody, timing, memory, cpu, diffs, errors, flags) |

---

## WebSocket Telemetry Protocol (`dashboard-server.js`)

Connected dashboard clients receive JSON messages over WebSocket (`ws://localhost:4444`):

### 1. Connection Snapshot (`type: "snapshot"`)
Sent immediately when a dashboard client connects:
```json
{
  "type": "snapshot",
  "data": {
    "stats": { "totalRequests": 42, "activeRequests": 1, "avgResponseTime": 15, "memoryMb": 45.2, "cpuPercent": 4 },
    "activeTraces": [...],
    "recentTraces": [...]
  }
}
```

### 2. Live Trace Event (`type: "node_active"`)
Sent when a request advances through the pipeline:
```json
{
  "type": "node_active",
  "data": {
    "traceId": "tr_a7b9c1d2",
    "activeNode": "Controller",
    "prevNode": "Router",
    "step": { "node": "Controller", "elapsedMs": 4, "metadata": { "path": "/api/users/:id" } },
    "stats": { ... }
  }
}
```
