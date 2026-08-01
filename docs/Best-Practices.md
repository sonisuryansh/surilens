# 🌟 Enterprise Best Practices

Follow these guidelines for optimal performance, security, and developer experience.

---

## 1. Security
- **Always Enable Authentication**: Set `dashboardAuth` credentials when deploying to shared staging or production environments.
- **Do Not Disable Masking**: Keep default masking enabled to ensure PII, JWT tokens, and API credentials are never logged in cleartext.

## 2. Performance
- **Use Async SDK Helpers**: Wrap expensive database and third-party service calls with `suriLens.traceAsync()`.
- **Set Appropriate TTLs**: Maintain default 60-second Trace TTL to ensure hanging requests are garbage collected.

## 3. Architecture
- **Use Distributed Tracing**: Propagate `traceparent` headers across microservice HTTP calls to maintain end-to-end correlation IDs.
