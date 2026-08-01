# ⚙️ Configuration Reference

Detailed configuration options for SuriLens.

---

## Configuration Flags

```javascript
app.use(suriLens({
  dashboardPort: 4444,
  dashboardAuth: { user: 'admin', pass: 'secret123' },
  enableFileStore: true,
  eventsDir: './logs/events',
  maxHistory: 100,
  traceTtlMs: 60000,
  maxPayloadSize: 32768
}));
```

| Option | Type | Default | Purpose | Production Notes |
| :--- | :--- | :--- | :--- | :--- |
| `dashboardPort` | `Number` | `4444` | Port for embedded HTTP/WS dashboard | Ensure port 4444 is open or proxied |
| `dashboardAuth` | `Object` | `null` | Basic Auth credentials `{ user, pass }` | **Recommended in production** |
| `enableFileStore` | `Boolean` | `true` | Persists trace logs to disk asynchronously | Set `false` in read-only serverless |
| `eventsDir` | `String` | `./events` | Directory for output trace files | Use absolute paths in monorepos |
| `maxHistory` | `Number` | `100` | Max traces retained in process memory | Adjust based on available RAM |
| `traceTtlMs` | `Number` | `60000` | GC timeout for hanging traces | Prevents memory leaks |
| `maxPayloadSize` | `Number` | `32768` | Max bytes (32KB) captured per stage | Protects V8 heap memory |
