# 🏗️ Architecture Overview

SuriLens is architected as a modular, event-driven telemetry and visualization engine.

---

## System Diagram

```
+-----------------------------------------------------------------------------------+
|                              YOUR APPLICATION PROCESS                             |
|                                                                                   |
|  Incoming HTTP Request                                                            |
|         │                                                                         |
|         ▼                                                                         |
|  [ Framework Adapter ] ──► [ AsyncLocalStorage Context ] (async-context.js)      |
|         │                           │                                             |
|         ▼                           ▼                                             |
|  [ Middleware / Router ] ──► [ SuriCollector ] (collector.js)                     |
|         │                           │                                             |
|         ▼                           ├──► Performance Intelligence Engine          |
|  [ Outbound Auto-Inst ]             ├──► Trace TTL Garbage Collector (60s)        |
|  (http/https/fetch)                 │                                             |
|                                     ▼                                             |
|                             [ EventStore ] (event-store.js)                       |
|                                     │                                             |
|                                     ├──► Sensitive Data Masker (recursive)        |
|                                     ├──► Payload Diff Engine                      |
|                                     └──► Async File Persistence (fs.promises)     |
+-------------------------------------│---------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------------+
|                             DASHBOARD SERVER (Port 4444)                          |
|                                                                                   |
|  [ HTTP Server ] (dashboard-server.js) ──► Serves Static Assets (public/)          |
|  [ WebSocket Server ] (ws)            ──► Streams Live Telemetry Events          |
|  [ REST API Router ]                  ──► /api/traces, export, import             |
+-------------------------------------│---------------------------------------------+
                                      │ (WebSocket Connection)
                                      ▼
+-----------------------------------------------------------------------------------+
|                             BROWSER DASHBOARD UI                                  |
|                                                                                   |
|  [ App Bootstrapper ] (app.js)                                                     |
|  [ Execution Engine ] (execution-engine.js) ──► Replay Mode, Speed (0.25x - 4x)   |
|  [ Graph Renderer ]   (canvas-renderer.js) ──► HTML5 60fps Packet Animation      |
|  [ Edge Renderer ]    (svg-edges.js)       ──► Dynamic Cubic Bezier Edges       |
|  [ Node Manager ]     (node-manager.js)    ──► DOM Cards & Visual States          |
|  [ Inspector ]        (inspector.js)       ──► Payloads, Diffs & Performance      |
+-----------------------------------------------------------------------------------+
```

---

## Architectural Principles

1. **Non-Blocking Execution**: Asynchronous microtask wrapping avoids polling overhead (`setInterval` eliminated from core middleware).
2. **Zero-Dependency Auto-Instrumentation**: Patches outbound HTTP/HTTPS requests and `fetch` calls dynamically.
3. **Data Safety**: Sensitive header and body keys are deep-masked before persistence or WebSocket broadcasting.
4. **Memory Guarding**: Payload caps (32KB max per stage) and automatic 60s Trace TTL cleanups protect against memory exhaustion.
