# Dashboard Server (`lib/server/`)

The `lib/server/` directory contains the HTTP static asset server and WebSocket server that powers the live visualization dashboard.

## 📁 Files

### `dashboard-server.js`
- **Class**: `DashboardServer`
- **Port**: Default `4444` (configurable via `dashboardPort` option)
- **Responsibilities**:
  - Serves static dashboard HTML, CSS, and JS assets from `public/`.
  - Manages WebSocket Server (`ws`) for real-time live telemetry streaming.
  - Subscribes to `collector` events (`trace_start`, `node_active`, `node_remove`, `trace_complete`).
  - Supports optional HTTP Basic Authentication (`dashboardAuth: { user, pass }`).
  - Exposes REST API endpoints for search and session export/import:
    - `GET /api/traces`: Filtered trace search results.
    - `GET /api/traces/export`: Export JSON trace session bundle.
    - `POST /api/traces/import`: Import external trace JSON bundle.
