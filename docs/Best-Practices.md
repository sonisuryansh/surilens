# Best Practices

Recommendations for using SuriLens effectively in development and staging environments.

---

## Middleware Registration

Always register SuriLens **before** your routes and other middleware:

```js
app.use(express.json());
app.use(suriLens({ dashboardPort: 4444 })); // Must come before routes
app.use(helmet());
app.use(cors());
app.use('/api', apiRouter);
```

If SuriLens is registered after routes, it will miss trace context for those routes.

---

## Manual Steps

Use descriptive names for `suriLens.step()`:

```js
// Good — specific and searchable
suriLens.step('UserRepository', { action: 'findById', id: userId });
suriLens.step('StripeGateway', { action: 'charge', amount: 5000 });

// Avoid — too generic
suriLens.step('Step');
suriLens.step('DB');
```

---

## Security

**Never expose the dashboard port to the internet.**

Always use `dashboardAuth` in shared or staging environments:

```js
app.use(suriLens({
  dashboardAuth: {
    user: process.env.DASHBOARD_USER,
    pass: process.env.DASHBOARD_PASS
  }
}));
```

Bind to localhost only (the default):

```js
app.use(suriLens({ host: 'localhost' })); // Never '0.0.0.0' in production
```

---

## File Persistence

The `events/` directory is created automatically and accumulates trace files over time. For ephemeral or container environments, disable file persistence:

```js
app.use(suriLens({ enableFileStore: false }));
```

Or export important sessions before restarting and re-import them afterward.

---

## High-Traffic Applications

Tune memory limits for high-volume apps:

```js
app.use(suriLens({
  maxHistory: 200,        // Keep more traces in memory
  maxEvents: 200,         // EventStore size
  traceTtlMs: 15000,      // Expire hanging traces faster
  maxPayloadSize: 8192    // Smaller payload cap to save memory
}));
```

---

## Disabling in Production

If you want tracing only in development/staging, use environment variables:

```js
app.use(suriLens({
  disableDashboard: process.env.NODE_ENV === 'production',
  enableFileStore: process.env.NODE_ENV !== 'production'
}));
```

Or conditionally apply:

```js
if (process.env.NODE_ENV !== 'production') {
  app.use(suriLens({ dashboardPort: 4444 }));
}
```

---

## Distributed Services

When running multiple services, each gets its own SuriLens instance and dashboard port. To correlate traces across services:

1. Ensure all services run SuriLens (it automatically propagates `traceparent`)
2. Use unique ports per service: `dashboardPort: 4444`, `4445`, `4446`, etc.
3. Use `x-correlation-id` headers if you have a custom correlation system

---

## Session Persistence

Use Export/Import to preserve traces across server restarts:

```bash
# Export before restarting
curl http://localhost:4444/api/traces/export > session.json

# Start server, then import
curl -X POST http://localhost:4444/api/traces/import \
  -H "Content-Type: application/json" -d @session.json
```

This is especially useful during debugging sessions where you want to preserve evidence of a bug across multiple restart cycles.
