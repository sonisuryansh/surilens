# 📘 Getting Started with SuriLens

**SuriLens** is a real-time backend execution visualizer and APM observability platform designed for Node.js backend applications.

---

## What is SuriLens?

When building backend APIs using Node.js, understanding how an HTTP request travels through routers, middleware chains, business controllers, services, database queries, and external APIs can be difficult—especially during local development or debugging.

SuriLens automatically hooks into your Node.js application process, traces the request lifecycle, and renders a live, interactive 60fps graph in your browser.

---

## Core Concepts

1. **TraceContext**: A lightweight store powered by Node.js `AsyncLocalStorage` that tracks metadata (`traceId`, `parentTraceId`, `correlationId`, `method`, `url`) across asynchronous call stacks.
2. **Collector**: An internal EventEmitter singleton (`SuriCollector`) that receives node transitions, calculates system metrics (RPS, memory, CPU), and flags performance anomalies.
3. **EventStore**: Manages trace history, computes payload diffs, applies recursive data masking, and asynchronously persists trace logs to disk.
4. **DashboardServer**: An embedded HTTP and WebSocket server running on port `4444` that streams live telemetry to the browser dashboard.
5. **Replay Engine**: Allows developers to pause live execution, step backward and forward, and replay past request executions frame-by-frame.

---

## Next Steps

- Proceed to [Installation](./Installation.md) to install SuriLens.
- Check the [Quick Start Guide](./Quick-Start.md) for code snippets.
