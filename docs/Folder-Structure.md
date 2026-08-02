# Folder Structure

Complete reference for the SuriLens repository layout.

---

## Repository Root

```
surilens/
├── index.js                     # Main entry point — suriLens() + all SDK exports
├── package.json                 # Package metadata, scripts, peer dependencies
├── README.md                    # Project documentation
├── LICENSE                      # MIT License
├── CONTRIBUTING.md              # Contribution guidelines
├── SECURITY.md                  # Security policy
├── CODE_OF_CONDUCT.md           # Code of conduct
├── .gitignore                   # Git ignore rules (events/, node_modules/, etc.)
├── .npmignore                   # npm publish exclusions (docs/, test/, events/, etc.)
│
├── lib/                         # Core engine
├── public/                      # Dashboard frontend assets
├── example/                     # Working demo server
├── events/                      # Runtime trace files (auto-created, gitignored)
└── docs/                        # Extended documentation
```

---

## `lib/` — Core Engine

```
lib/
├── core/
│   ├── async-context.js         # AsyncLocalStorage-based trace context management
│   │                            # createTraceContext(), runWithContext(), getContext(),
│   │                            # getCallerInfo() for automatic stack-based node naming
│   │
│   ├── auto-instrument.js       # Zero-config protocol & ORM instrumentation
│   │                            # Patches: http, https, fetch, mongoose, ioredis,
│   │                            # redis, pg, mysql2, sequelize, prisma, kafkajs, S3
│   │
│   ├── collector.js             # SuriCollector — central EventEmitter
│   │                            # startTrace(), transitionNode(), removeNodeStage(),
│   │                            # completeTrace(), getSnapshot()
│   │                            # Live metrics: RPS, CPU, Memory, Error Rate
│   │                            # Trace TTL sweep (30s interval, unref'd)
│   │
│   ├── event-store.js           # EventStore — persistence, masking, search, diff
│   │                            # File store: events/request-{traceId}.json + .md
│   │                            # In-memory LRU map (maxEvents)
│   │                            # maskSensitiveData(), computePayloadDiff(),
│   │                            # searchEvents(), getAllEvents()
│   │
│   ├── instrumentor.js          # Express middleware factory + manual step helpers
│   │                            # createMiddleware() — wraps req/res, propagates context
│   │                            # recordStep() — suriLens.step() implementation
│   │                            # removeStep() — suriLens.removeStep() implementation
│   │
│   └── plugin-sdk.js            # High-level SDK helpers
│                                # traceAsync(), wrapFunction(), traceQueueJob(),
│                                # traceCacheOperation(), createPlugin()
│
├── adapters/
│   ├── express.js               # Thin wrapper around createMiddleware()
│   ├── fastify.js               # Fastify plugin using onRequest/onResponse hooks
│   ├── koa.js                   # Koa async middleware with try/catch completion
│   ├── nest.js                  # NestJS-compatible interceptor pattern
│   └── hono.js                  # Hono edge-compatible middleware
│
└── server/
    └── dashboard-server.js      # HTTP + WebSocket dashboard server
                                 # Static file server for public/
                                 # REST API: /api/traces, /api/traces/export, /import
                                 # WebSocket: broadcasts all collector events
                                 # QA Suite: executeQaSuiteLive() (17 test scenarios)
```

---

## `public/` — Dashboard Frontend

```
public/
├── index.html                   # Single-page dashboard application
├── css/
│   └── dashboard.css            # All styles: layout, node colors, animations,
│                                # glass cards, status glows, responsive breakpoints
└── js/
    ├── app.js                   # Main application: WebSocket connection, event routing,
    │                            # filter state, panel resizing, localStorage persistence,
    │                            # URL query string sync, auto trace restore on refresh
    │
    ├── execution-engine.js      # Execution Engine: live mode vs replay mode,
    │                            # enterReplayMode(), enterLiveMode(),
    │                            # step-by-step replay with Play/Pause/Speed controls
    │
    ├── inspector.js             # Inspector Panel: open(), close(), showPacketPayload(),
    │                            # showNodeDetails(), showTraceDetails()
    │
    ├── node-manager.js          # Graph node rendering:
    │                            # NodeManager, node creation/update/delete,
    │                            # category class assignment (getCategoryClass),
    │                            # highlightNodeChain(), clearHoverChain()
    │
    └── svg-edges.js             # SVG connection paths:
                                 # SVGEdgeRenderer, directional arrowhead markers
                                 # (#arr-amber, #arr-completed, #arr-cyan, etc.),
                                 # animated execution paths, highlightEdgeChain()
```

---

## `example/` — Demo Server

```
example/
├── package.json                 # { "dependencies": { "express": "..." } }
└── server.js                    # Complete Express demo with:
                                 # GET /api/users/:id     (Controller → Service → Database)
                                 # POST /api/orders       (Controller → Service → Database)
                                 # PUT /api/products/:id  (Controller → Service → Database)
                                 # PATCH /api/users/:id/status
                                 # DELETE /api/items/:id
                                 # GET /api/error-test    (500 response demo)
                                 # GET /api/stress        (high concurrency demo)
                                 # GET /api/dynamic-node  (create + remove TempWorker live)
                                 # GET /api/direct-db     (Controller → MongoDB, no Service)
                                 # GET /api/prisma-demo   (Prisma ORM demo)
                                 # POST /api/login-demo   (Bcrypt + JWT demo)
                                 # GET /api/redis-demo    (Redis cache demo)
```

---

## `events/` — Runtime Trace Files

```
events/
├── request-tr_XXXXXXXX.json     # Full trace event JSON (auto-generated at runtime)
└── request-tr_XXXXXXXX.md       # Human-readable trace summary (auto-generated)
```

**Note:** This directory is created automatically at runtime by `EventStore`. Its contents are gitignored (`.gitignore` excludes `events/*.json` and `events/*.md`). The directory itself is not committed to the repository.

---

## `docs/` — Documentation

```
docs/
├── README.md                    # Docs index
├── API-Reference.md             # Complete API reference
├── Architecture.md              # Internal engine architecture
├── Best-Practices.md            # Production best practices
├── Changelog.md                 # Version history
├── Configuration.md             # All configuration options
├── Dashboard.md                 # Dashboard UI guide
├── Deployment.md                # Deployment considerations
├── Development.md               # Contributing and local dev setup
├── Event-System.md              # WebSocket and EventEmitter events
├── FAQ.md                       # Frequently asked questions
├── Folder-Structure.md          # This file
├── Getting-Started.md           # Quickstart guide
├── Installation.md              # Installation guide
├── Payload-Tracking.md          # Payload capture, masking, and diffing
├── Plugin-System.md             # Plugin SDK reference
├── Production.md                # Production deployment guide
├── Quick-Start.md               # Five-minute quickstart
├── Replay-System.md             # Visual Replay Engine guide
├── Request-Lifecycle.md         # Full request lifecycle walkthrough
├── Runtime.md                   # Runtime and auto-instrumentation guide
└── Troubleshooting.md           # Common issues and solutions
```
