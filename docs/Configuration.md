# Configuration

All configuration options for SuriLens, with defaults and descriptions.

---

## Passing Options

Pass an options object as the first argument to the middleware factory:

```js
const suriLens = require('surilens');

app.use(suriLens({
  dashboardPort: 4444,
  maxHistory: 200,
  traceTtlMs: 30000
}));
```

---

## Complete Options Reference

### Dashboard

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dashboardPort` | `number` | `4444` | Port the dashboard HTTP server listens on |
| `port` | `number` | `4444` | Alias for `dashboardPort` |
| `host` | `string` | `'localhost'` | Hostname the dashboard binds to. Set to `'0.0.0.0'` to expose on all interfaces (not recommended for production) |
| `disableDashboard` | `boolean` | `false` | When `true`, no dashboard server is launched. Tracing still works; use `collector` events directly |
| `dashboardAuth` | `object \| null` | `null` | HTTP Basic Auth credentials. Format: `{ user: 'admin', pass: 'secret' }`. `null` = no auth required |

### Trace Storage

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxHistory` | `number` | `100` | Maximum number of completed traces kept in the in-memory `completedTraces` array |
| `traceTtlMs` | `number` | `60000` | Milliseconds before a never-completed (hanging) trace is force-expired as a 504 error. Prevents memory leaks |
| `maxPayloadSize` | `number` | `32768` | Maximum payload size in bytes. Payloads larger than this are truncated to a summary. Default is 32KB (32768 bytes) |
| `maxEvents` | `number` | `100` | Maximum number of events kept in the `EventStore` in-memory map |
| `enableFileStore` | `boolean` | `true` | When `true`, each completed trace is written to disk as `events/request-{traceId}.json` and `events/request-{traceId}.md` |
| `eventsDir` | `string` | `'./events'` | Directory path for persisted trace files. Created automatically if it does not exist |

---

## Examples

### Minimal Setup

```js
app.use(suriLens());
// Dashboard on http://localhost:4444
```

### Custom Port

```js
app.use(suriLens({ dashboardPort: 9999 }));
// Dashboard on http://localhost:9999
```

### HTTP Basic Auth

```js
app.use(suriLens({
  dashboardPort: 4444,
  dashboardAuth: { user: 'admin', pass: 'supersecret' }
}));
```

Users visiting the dashboard will be prompted for credentials.

### High-Traffic Configuration

Increase history and reduce TTL for high-volume applications:

```js
app.use(suriLens({
  maxHistory: 500,
  maxEvents: 500,
  traceTtlMs: 10000    // expire hanging traces after 10s
}));
```

### Disable Dashboard (Collector Only)

Use SuriLens purely as a collector without the web UI:

```js
app.use(suriLens({ disableDashboard: true }));

// Listen to events directly
const suriLens = require('surilens');
suriLens.collector.on('trace_complete', (trace) => {
  myMonitoringService.send(trace);
});
```

### Disable File Persistence

Keep traces only in memory — useful for ephemeral or read-only environments:

```js
app.use(suriLens({ enableFileStore: false }));
```

### Custom Events Directory

```js
app.use(suriLens({
  eventsDir: '/var/log/surilens'
}));
```

---

## Environment-Based Configuration

Recommended pattern for environment-aware setup:

```js
app.use(suriLens({
  dashboardPort: parseInt(process.env.SURILENS_PORT || '4444'),
  dashboardAuth: process.env.SURILENS_USER ? {
    user: process.env.SURILENS_USER,
    pass: process.env.SURILENS_PASS
  } : null,
  enableFileStore: process.env.NODE_ENV !== 'test',
  disableDashboard: process.env.SURILENS_DISABLE === 'true'
}));
```

---

## Port Conflict Behavior

If the dashboard port is already in use when SuriLens starts, it prints a warning and skips the dashboard:

```
[SuriLens] Port 4444 in use. SuriLens dashboard disabled or port busy.
```

Your application continues to run normally. Tracing still works; events are still emitted on the `collector`. Only the dashboard is unavailable.
