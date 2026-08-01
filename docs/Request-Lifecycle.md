# 🔄 Request Lifecycle Walkthrough

This document details the step-by-step lifecycle of an HTTP request processed by SuriLens.

---

## Lifecycle Steps

```
[1. Client Request] ──► [2. Middleware Mount] ──► [3. Router Stage] ──► [4. Controller Stage]
                                                                               │
                                                                               ▼
[8. Response Sent]  ◄── [7. Outbound HTTP/DB] ◄── [6. Service Stage] ◄── [5. Business Logic]
```

### Step 1: Client Request
An HTTP request arrives from a browser or API client (e.g. `POST /api/orders`).

### Step 2: Middleware Mount
SuriLens middleware executes:
- Generates `traceId` (e.g., `tr_a7b9c1d2`).
- Extracts IP, headers, body, query parameters.
- Sanitizes authorization tokens and cookies.
- Calls `collector.startTrace(traceContext)`.
- Emits `trace_start` WebSocket event.
- Browser spawns a blue request packet orb moving from `Client` to `Express`.

### Step 3: Router & Middleware Stage
- Transition to `Router` node recorded.
- In next microtask tick, SuriLens inspects Express routing state to record `Controller` or `Middleware`.

### Step 4: Controller & Service Stage
- Developer custom code or SDK helpers (`suriLens.traceAsync('Service: OrderService', fn)`) record transitions.
- Node manager updates stage card visual states to `processing`.

### Step 5: Database & External API Stage
- Outbound HTTP/HTTPS or DB queries trigger node transition to `Database` or `External API (hostname)`.
- Outbound request headers are injected with W3C `traceparent`.

### Step 6: Response Completion
- `res.end()` executes:
  - Calculates total duration (`responseTime`).
  - Evaluates **Performance Intelligence** bottleneck flags.
  - Calls `collector.completeTrace()`.
  - Asynchronously writes `request-<id>.json` and `request-<id>.md` logs.
  - Emits `trace_complete` WebSocket event.
  - Browser spawns a green response return packet traveling back to `Client`.
