# ❓ Troubleshooting Guide

## Common Issues & Diagnoses

### 1. Dashboard Port `4444` in Use (`EADDRINUSE`)
- **Symptom**: `Port 4444 in use. SuriLens dashboard disabled.`
- **Solution**: Pass a custom port in options:
  ```javascript
  app.use(suriLens({ dashboardPort: 5555 }));
  ```

### 2. Missing Traces for Native TCP Database Queries
- **Symptom**: Outbound PostgreSQL/MongoDB/Redis queries don't show up automatically.
- **Root Cause**: Native TCP drivers operate over raw sockets rather than HTTP.
- **Solution**: Wrap database calls with `suriLens.traceAsync('Database: Postgres', fn)` or `suriLens.traceCacheOperation('Redis', op, key, fn)`.

### 3. CSS/JS Assets Unstyled in Dashboard
- **Symptom**: Dashboard renders in plain text without dark mode styles.
- **Root Cause**: Opening nested API endpoints instead of root URL `/`.
- **Solution**: Access the dashboard at `http://localhost:4444` (or `http://localhost:4444/`).
