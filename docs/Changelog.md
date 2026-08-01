# 📜 Changelog

All notable changes to **SuriLens** are documented in this file.

---

## [1.0.0] - 2026-08-01

### Added
- **Universal Framework Adapters**: Native adapters for Express, Fastify, Koa, NestJS, and Hono (`suriLens.adapters`).
- **Distributed Tracing**: W3C `traceparent` and `x-correlation-id` header injection and extraction across outbound HTTP calls (`auto-instrument.js`).
- **Outbound Auto-Instrumentation**: Automatic HTTP/HTTPS and `fetch` monkey-patching with target hostname node resolution (`External API: api.stripe.com`).
- **Performance Intelligence Engine**: Automated detection of slow routes (>500ms), high memory (>300MB), high CPU (>80%), and slow steps.
- **Advanced Search & Filtering**: REST API `/api/traces` and UI search toolbar (filter by route, method, status code, latency, and errors).
- **Session Export & Import**: REST API `/api/traces/export` and `/api/traces/import` for trace session bundles.
- **SDK Plugin Helpers**: `traceAsync`, `wrapFunction`, `traceQueueJob`, `traceCacheOperation`, and `createPlugin`.
- **Interactive Onboarding Experience**: Onboarding demo trace with auto-clearing upon receipt of real backend telemetry events.
- **Dashboard Authentication**: Optional HTTP Basic Auth (`dashboardAuth: { user, pass }`).

### Fixed & Hardened
- **Timer Overhead**: Replaced 10ms `setInterval` polling in `instrumentor.js` with deterministic microtask execution hooks.
- **File I/O Performance**: Replaced synchronous `fs.writeFileSync` in `event-store.js` with non-blocking `fs.promises.writeFile`.
- **Memory & Leak Safety**: Added 60-second Trace TTL garbage collection with `.unref()` timers and 32KB stage payload truncation.
- **Security**: Applied recursive data masking to WebSocket `trace_start` broadcasts.
