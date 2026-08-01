# 📂 Codebase Folder Structure

Below is the complete file and folder mapping for the **SuriLens** codebase:

```
NPM_Package/
├── index.js                     # Primary entry point & public API exports
├── package.json                 # Package configuration, scripts, and exports
├── README.md                    # Root GitHub repository documentation
│
├── docs/                        # Complete Enterprise Documentation System
│   ├── README.md                # Documentation index
│   ├── Getting-Started.md       # Overview & core concepts
│   ├── Installation.md          # Package manager installation commands
│   ├── Quick-Start.md           # Express, Fastify, NestJS, Koa, Hono quickstarts
│   ├── Architecture.md          # System design & architecture diagrams
│   ├── Folder-Structure.md      # Directory map and module guide
│   ├── Runtime.md               # AsyncLocalStorage & instrumentation runtime
│   ├── Request-Lifecycle.md     # Step-by-step trace movement
│   ├── Event-System.md          # Collector event emission & WS protocol
│   ├── Payload-Tracking.md      # Payloads, diffing, data masking
│   ├── Replay-System.md         # Visual replay engine & playback controls
│   ├── Dashboard.md             # Graph UI, canvas, explorer, search
│   ├── Plugin-System.md         # SDK helpers & custom plugins
│   ├── API-Reference.md         # Public API signature reference
│   ├── Configuration.md         # Configuration options & flags
│   ├── Development.md           # Local contributor guide
│   ├── Production.md            # Production security & memory guidelines
│   ├── Deployment.md            # Docker, K8s, Monorepos
│   ├── Troubleshooting.md       # Debugging & FAQ
│   ├── FAQ.md                   # Frequently Asked Questions
│   ├── Best-Practices.md        # Recommended production patterns
│   ├── Contributing.md          # Contributor guide
│   └── Changelog.md             # Version release history
│
├── lib/                         # Core Backend Engine
│   ├── README.md                # lib directory overview
│   ├── adapters/                # Framework Adapters
│   │   ├── README.md            # Adapters overview
│   │   ├── express.js           # Express middleware adapter
│   │   ├── fastify.js           # Fastify plugin adapter
│   │   ├── koa.js               # Koa middleware adapter
│   │   ├── nest.js              # NestJS Interceptor adapter
│   │   └── hono.js              # Hono Fetch API adapter
│   │
│   ├── core/                    # Tracing & Telemetry Core
│   │   ├── README.md            # Core modules overview
│   │   ├── async-context.js     # AsyncLocalStorage context manager
│   │   ├── auto-instrument.js   # Outbound HTTP/HTTPS & fetch auto-instrumentor
│   │   ├── collector.js         # SuriCollector metrics & TTL manager
│   │   ├── event-store.js       # Event persistence, diffing, data masking
│   │   ├── instrumentor.js      # Main Express middleware & transition hooks
│   │   └── plugin-sdk.js        # High-level SDK helpers (traceAsync, wrapFunction)
│   │
│   └── server/                  # Embedded Server Layer
│       ├── README.md            # Server directory overview
│       └── dashboard-server.js  # Static file server, WS server, REST API router
│
└── public/                      # Dashboard Web Client
    ├── README.md                # Public UI overview
    ├── index.html               # Main dashboard HTML template
    ├── css/
    │   └── dashboard.css        # Premium dark mode CSS styles & animations
    └── js/
        ├── app.js               # Dashboard UI bootstrapper & event listeners
        ├── canvas-renderer.js   # HTML5 60fps packet orb renderer
        ├── execution-engine.js  # Replay engine, sessions & onboarding demo
        ├── inspector.js         # Slide-in inspector panel & payload diffs
        ├── node-manager.js      # DOM node cards state manager
        ├── svg-edges.js         # Cubic Bezier SVG curve renderer
        └── timeline.js          # Bottom timeline scrubbing track
```
