# Dashboard

Guide to every panel and feature in the SuriLens dashboard.

---

## Opening the Dashboard

Start your app with SuriLens middleware, then open: **http://localhost:4444**

The dashboard connects automatically via WebSocket and begins receiving live trace events.

---

## Layout

```
+-------------------------------------------------------------+
|  Header Bar                                                 |
|  SuriLens   RPS   Avg RT   Memory   CPU   Error%   Buttons |
+----------------+---------------------------+----------------+
|                |                           |                |
|  Request       |   Execution Graph         |   Inspector    |
|  Explorer      |   (SVG Canvas)            |   Panel        |
|                |                           |                |
+----------------+---------------------------+----------------+
|               Timeline Panel                               |
+------------------------------------------------------------+
```

All panels are resizable via drag handles between them.

---

## Header Bar

The header displays live performance metrics updated every second:

| Metric | Source |
|--------|--------|
| **RPS** | Requests in the last 1-second window |
| **Avg RT** | Cumulative moving average response time (ms) |
| **Memory** | Process heap usage (MB) |
| **CPU%** | Process CPU utilization |
| **Error%** | Percentage of requests with status >= 400 |

**Buttons:**
- **Live** — Switch back to live stream mode
- **Export** — Download all traces as a JSON session bundle
- **Import** — Upload a session bundle to restore traces

---

## Request Explorer (Left Panel)

Shows all captured requests in a scrollable list. Columns:

- **Method badge** — Color-coded: GET (blue), POST (green), PUT (orange), PATCH (purple), DELETE (red)
- **Route** — URL path
- **Status** — HTTP status code with color (2xx green, 4xx orange, 5xx red)
- **Latency** — Response time in ms
- **Timestamp** — Human-readable relative time

### Search & Filter

The filter bar above the list:
- **Search box** — Filters by route path text
- **Method** — Dropdown: All, GET, POST, PUT, PATCH, DELETE
- **Status** — Dropdown: All, 2xx, 3xx, 4xx, 5xx
- **Min Latency** — Number input (ms) — shows only requests slower than this threshold

Filters persist across browser refreshes via `localStorage`.

---

## Execution Graph (Center Panel)

The SVG canvas renders the execution flow graph for the selected request.

### Nodes

Each box represents one execution stage. Node appearance:

| State | Appearance |
|-------|-----------|
| **Active** | Bright border + pulsing halo glow animation |
| **Completed** | Solid bright border, category color |
| **Failed** | Red border + shake animation |
| **Idle** | Dimmed, muted color, no glow |

### Node Categories & Colors

| Node | Color |
|------|-------|
| Client | Blue `#3B82F6` |
| Express | Amber `#F59E0B` |
| Router | Cyan `#06B6D4` |
| Middleware | Purple `#A855F7` |
| Controller | Pink `#EC4899` |
| Service | Indigo `#6366F1` |
| Repository | Teal `#14B8A6` |
| Database / MongoDB / Prisma / Sequelize | Violet `#8B5CF6` |
| Redis / Cache | Orange `#F97316` |
| JWT / Bcrypt / Auth | Yellow `#EAB308` |
| External API | Sky Blue `#0EA5E9` |
| Worker | Emerald `#10B981` |
| Filesystem | Brown `#D97706` |
| Response | Green `#22C55E` |

### Connections

Every node is connected by animated SVG paths with:
- Directional arrowheads indicating execution flow
- Color matches the source node category
- Edges illuminate when hovering a node

### Hover Highlighting

Hovering any node:
- Highlights the **previous node**, **current node**, and **next node**
- Highlights the connecting edges
- All other nodes and edges are dimmed

### Clicking a Node

Clicking a node opens the **Inspector Panel** with the node's payload, metadata, and stage diff.

---

## Inspector Panel (Right Panel)

Shows detailed information for the selected node or request.

### Content

- **Title** — Node name, HTTP method, route
- **Type badge** — Request, Response, or stage name
- **Stage Diff** — Git-style diff of what changed from the previous stage
- **Payload** — Current stage payload (security-masked)
- **Headers** — Request headers (auth/cookie masked)
- **Metadata** — Any metadata passed to `suriLens.step()`
- **Performance Flags** — Any bottleneck warnings for this trace

### Closing the Inspector

Click the **×** button in the Inspector header. The panel slides out smoothly. Selecting another node or request reopens it automatically.

### Expanding the Inspector

Click the **⤢** (expand) button to maximize the Inspector panel for detailed viewing.

---

## Timeline Panel (Bottom Panel)

Displays a per-stage waterfall timing chart for the selected trace.

- Each row is one execution stage
- Bar width represents relative duration
- Total response time is shown
- Makes it easy to spot where latency accumulates

---

## Visual Replay Engine

Switch from live mode to replay mode by clicking any request in the Explorer.

**Controls:**
- **▶ Play** — Animate through each step sequentially
- **⏸ Pause** — Stop animation at current step
- **Speed** — Choose 0.5×, 1×, 2×, 4×
- **Live** (header button) — Exit replay, return to live stream

During replay, each node re-activates with its pulse animation in sequence, showing the exact execution path as it originally happened.

---

## Import / Export

### Export

Click **Export** in the header (or `GET /api/traces/export`) to download all current traces as `surilens-session.json`.

### Import

Click **Import** and select a previously exported `.json` file (or `POST /api/traces/import`). All traces from the bundle are loaded into the Explorer and are fully replayable.

---

## QA Suite Mode

Trigger `GET /api/qa/run-suite` to run 17 predefined architecture test scenarios. Each test appears live in the dashboard graph as a real trace, demonstrating all node categories.

Use this to verify your SuriLens installation is working correctly, or as a demo for stakeholders.
