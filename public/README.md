# Dashboard Frontend (`public/`)

The `public/` directory contains the frontend client application rendered in the browser at `http://localhost:4444`.

## 📁 Files & Modules

### `index.html`
- Topbar live metrics (Traces, Avg Response Time, Active Requests, Memory, CPU).
- Onboarding card with Quick Start commands and Interactive Demo Trace preview trigger.
- Advanced Search & Filter toolbar.
- Export / Import Session buttons.
- SVG edge layer, DOM node layer, and HTML5 60fps packet animation canvas.

### `js/app.js`
- Application bootstrapper.
- Connects to WebSocket server (`ws://localhost:4444`).
- Binds UI controls, search filters, zoom/pan canvas transform, and file import/export.

### `js/execution-engine.js`
- `TraceSession`: Represents a single HTTP request lifecycle.
- `ExecutionEngine`: Coordinates live WebSocket event routing, replay playback state, playback speeds (0.25x – 4x), step controls, and interactive onboarding demo trace.

### `js/inspector.js`
- `Inspector`: Slide-in side panel displaying request headers, body, query params, response payloads, payload diffs, performance intelligence alerts, and distributed tracing correlation metadata.

### `js/node-manager.js`
- `NodeManager`: DOM node cards renderer, state updates (`processing`, `success`, `error`), and drag-and-drop mechanics.

### `js/svg-edges.js`
- `SVGEdgeRenderer`: Cubic Bezier SVG curve renderer connecting graph stage nodes.

### `js/canvas-renderer.js`
- `CanvasRenderer`: High-performance 60fps HTML5 Canvas packet orb animation renderer.

### `js/timeline.js`
- `Timeline`: Interactive bottom timeline track with scrubable trace event markers.
