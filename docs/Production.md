# Production

Using SuriLens responsibly in production and staging environments.

---

## Recommended Usage

SuriLens is designed primarily for **development and staging** environments. It can be used in production with the following precautions.

---

## Security Checklist

- [ ] Dashboard port is **not** exposed to the public internet
- [ ] `dashboardAuth` is configured with strong credentials
- [ ] `host` is `'localhost'` (the default) — never `'0.0.0.0'` in production
- [ ] Sensitive environment variables (DB passwords, API keys) are not passed as `suriLens.step()` metadata
- [ ] File persistence (`enableFileStore`) is reviewed for disk usage

---

## Secure Configuration Example

```js
app.use(suriLens({
  dashboardPort: parseInt(process.env.SURILENS_PORT || '4444'),
  host: 'localhost',
  dashboardAuth: {
    user: process.env.SURILENS_USER,
    pass: process.env.SURILENS_PASS
  },
  maxHistory: 100,
  traceTtlMs: 30000,
  enableFileStore: false  // Disable disk writes in production
}));
```

---

## Disabling in Production

If you only want SuriLens active in development:

```js
if (process.env.NODE_ENV !== 'production') {
  const suriLens = require('surilens');
  app.use(suriLens({ dashboardPort: 4444 }));
}
```

Or use `disableDashboard` to keep tracing but skip the UI:

```js
app.use(suriLens({
  disableDashboard: process.env.NODE_ENV === 'production'
}));

// Still collect events
suriLens.collector.on('trace_complete', (trace) => {
  // Forward to your production monitoring system
  logger.info({ traceId: trace.traceId, route: trace.route, latency: trace.responseTime });
});
```

---

## Performance Impact

Typical overhead per request:
- Context propagation (`AsyncLocalStorage`): < 0.1ms
- Event emission and collector update: < 0.5ms
- File write (if `enableFileStore: true`): async, non-blocking, no impact on response time

Total overhead: **< 2ms per request** in most cases.

Memory usage:
- In-memory trace history: ~100 traces × ~4KB per trace ≈ ~400KB
- EventStore: ~100 events ≈ additional ~400KB
- Total SuriLens memory footprint: **< 5MB** under default settings

---

## Deployment Considerations

**Container/Kubernetes:**
- Set `enableFileStore: false` if the container filesystem is ephemeral
- Use environment variables for all configuration
- Use a `NodePort` or `kubectl port-forward` to access the dashboard (never a public `LoadBalancer`)

**Serverless:**
- SuriLens is not compatible with serverless environments (Lambda, Cloud Functions) — it requires a persistent HTTP server process

**Reverse Proxy:**
- If behind nginx/Apache, do not proxy the dashboard port publicly
- For internal access, proxy with Basic Auth at the nginx level in addition to `dashboardAuth`
