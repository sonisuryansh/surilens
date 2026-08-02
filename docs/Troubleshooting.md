# Troubleshooting

Common issues and their solutions.

---

## Dashboard Not Opening

**Symptom:** Browser shows "Connection refused" at `http://localhost:4444`

**Causes & Fixes:**
1. SuriLens middleware was not registered before `app.listen()` — check middleware order
2. Port 4444 is in use by another process — configure `dashboardPort: 9999` (or any free port)
3. `disableDashboard: true` is set — remove this option

---

## Execution Graph is Empty After Browser Refresh

**Symptom:** After refreshing the browser, the graph is blank even though traces exist in the Explorer

**Expected Behavior:** SuriLens automatically restores the last selected trace from `localStorage` and `?traceId=` URL parameter.

**Fixes:**
1. Ensure you are connected to the backend (check WebSocket status — green dot in header)
2. The selected `traceId` may have been cleared from in-memory if the backend restarted
3. Import a previously exported session bundle via **Import** button

---

## Inspector Close Button Not Working

**Symptom:** Clicking the × button in the Inspector panel does nothing

**Fix:** This was fixed in v1.1.3. Ensure you are running the latest version.

---

## No Traces Appearing

**Symptom:** Requests are being made to the app, but nothing appears in the Explorer

**Fixes:**
1. Confirm the middleware is registered **before** your routes
2. Confirm the middleware is called for the right paths — avoid mounting on a sub-path
3. Check browser DevTools Network tab — you should see a WebSocket connection to `ws://localhost:4444`
4. Ensure there is no reverse proxy dropping the connection

---

## `suriLens.step()` Not Showing in Graph

**Symptom:** You call `suriLens.step()` but the node does not appear

**Causes:**
1. Called outside of a request lifecycle (no active trace context) — `suriLens.step()` is a no-op if there is no active trace
2. Node name not unique — if the same node name is already in the execution chain, a duplicate may not visually appear as a new step

---

## WebSocket Disconnects Frequently

**Symptom:** The dashboard shows "Disconnected" and stops receiving updates

**Fix:** SuriLens auto-reconnects with exponential backoff. If disconnections are frequent:
1. Check if the backend process is restarting (nodemon/watch mode)
2. Check for network-level timeouts (proxies, load balancers)

---

## Port Already In Use

**Symptom:** Console shows `[SuriLens] Port 4444 in use.`

**Fix:** Set a different port:
```js
app.use(suriLens({ dashboardPort: 9090 }));
```

Your application continues to run normally. Only the dashboard is affected.

---

## Events Directory Fills Up Disk

**Symptom:** `events/` directory grows very large over time

**Fix:** Either:
1. Set `enableFileStore: false` to disable file persistence
2. Periodically clear the `events/` directory (files are ephemeral — only needed for import/export)
3. Configure a custom `eventsDir` pointing to a location with a cleanup cron job

---

## TypeScript Import Errors

**Symptom:** TypeScript cannot find types for `surilens`

**Fix:** SuriLens ships as CommonJS. Use:
```ts
import suriLens = require('surilens');
// or
const suriLens = require('surilens');
```

---

## Payload Shows `_truncated: true`

**Symptom:** Inspector shows `{ "_truncated": true, "_originalSize": 98304, "summary": "..." }`

**Cause:** The payload exceeded `maxPayloadSize` (default 32KB).

**Fix:** Increase the limit:
```js
app.use(suriLens({ maxPayloadSize: 131072 })); // 128KB
```

---

## Getting Help

- Open an issue on [GitHub](https://github.com/sonisuryansh/surilens/issues)
- See [FAQ.md](FAQ.md) for additional questions
