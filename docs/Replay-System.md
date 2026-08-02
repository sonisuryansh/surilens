# Replay System

The Visual Replay Engine allows you to step through any previously captured request trace, re-animating the execution graph exactly as it happened.

---

## Overview

After a request completes and appears in the Request Explorer, you can replay it at any time:

1. Click any request in the Request Explorer
2. The execution graph renders the completed trace
3. Press **Play** in the Replay controls to animate step-by-step

---

## Replay Controls

| Control | Description |
|---------|-------------|
| **Play / Pause** | Start or pause step-by-step replay animation |
| **Speed** | Choose replay speed: 0.5×, 1×, 2×, 4× |
| **Live Mode** | Exit replay, return to live WebSocket stream |

---

## How Replay Works

When a completed trace is selected:

1. The engine enters **Replay Mode** — live WebSocket updates are paused
2. All nodes in the execution path are rendered immediately in their completed/error states (with full glow animations)
3. Pressing **Play** steps through each node in sequence, re-activating the pulse animation for each node as if the request were executing right now
4. Edges between nodes light up directionally as each step is replayed
5. The Inspector panel shows the payload, metadata, and stage diff for the selected step

---

## Persistence Across Refresh

The last selected trace ID is saved to `localStorage` and synced to the URL query string (`?traceId=tr_xxx`). After a browser refresh:

1. SuriLens restores the saved `traceId` from `localStorage` or the URL
2. If that trace is still available in the snapshot, it is automatically selected
3. The execution graph renders immediately — no manual click required
4. If no saved trace is found, the most recent trace is selected automatically

---

## Switching Between Modes

- **Live Mode** — The graph animates in real-time as new requests arrive via WebSocket
- **Replay Mode** — The graph shows a static completed trace; live updates are paused

Use the **Live** button in the header to switch back to live mode at any time.

---

## Using the REST API for Replay

Export a session and replay it later:

```bash
# Export current session
curl http://localhost:4444/api/traces/export -o my-session.json

# Import in a later session (e.g., for a demo or debugging session)
curl -X POST http://localhost:4444/api/traces/import \
  -H "Content-Type: application/json" \
  -d @my-session.json
```

All imported traces appear in the Request Explorer and are fully replayable.
