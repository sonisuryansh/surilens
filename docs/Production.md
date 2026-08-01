# 🏭 Production Deployment Guide

Best practices for running SuriLens in enterprise production environments.

---

## Production Recommendations

1. **Enable Dashboard Authentication**:
   Always configure `dashboardAuth` to prevent unauthorized network access to live telemetry:
   ```javascript
   app.use(suriLens({
     dashboardAuth: {
       user: process.env.SURILENS_USER,
       pass: process.env.SURILENS_PASS
     }
   }));
   ```

2. **File System Configuration**:
   In read-only containerized or serverless environments (AWS Lambda, Google Cloud Run), set `enableFileStore: false` or direct `eventsDir` to `/tmp`.

3. **Memory Tuning**:
   SuriLens caps active payload snapshots at 32KB and automatically garbage collects hanging traces after 60 seconds. Set `maxHistory: 50` in memory-constrained containers.

4. **Distributed Tracing**:
   SuriLens auto-injects W3C `traceparent` headers into outbound HTTP calls, allowing downstream microservices to correlate traces automatically.
