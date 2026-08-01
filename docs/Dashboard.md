# 🖥️ Dashboard Interface Guide

The SuriLens Dashboard (`http://localhost:4444`) is a high-performance web interface designed for real-time observability.

---

## Interface Layout

1. **Top Bar Metrics**:
   - `TRACES`: Total requests completed.
   - `AVG`: Average response latency in milliseconds.
   - `ACTIVE`: Active in-flight HTTP requests.
   - `MEM`: Current process Heap Memory usage in MB.
   - `CPU`: Current process CPU utilization percentage.
   - `Export / Import`: Session bundle download/upload triggers.

2. **Advanced Search & Filter Toolbar**:
   - Filter by Route, Trace ID, HTTP Method (`GET`, `POST`, `PUT`, `DELETE`), Status Code (`200`, `400`, `500`), and Minimum Latency (ms).

3. **Request Explorer (Left Panel)**:
   - Chronological list of active and completed traces.
   - Click any trace to open full details in the Inspector.

4. **Execution Canvas (Center)**:
   - Interactive draggable stage node cards (`Client`, `Express`, `Router`, `Middleware`, `Controller`, `Service`, `Database`, `Response`).
   - 60fps HTML5 Canvas packet orb animations.
   - Zoom in (`+`), Zoom out (`-`), Fit View (`⛶`), and mouse drag panning.

5. **Inspector Side Panel (Right)**:
   - Click any packet orb or node card to view headers, query parameters, request body, response payload, payload transformations, performance warnings, and distributed tracing IDs.

6. **Timeline & Console (Bottom Panel)**:
   - Scrubable marker timeline.
   - Real-time backend console log stream.
