# 💬 Frequently Asked Questions (FAQ)

### Q: Does SuriLens add latency to my HTTP requests?
**A**: SuriLens uses asynchronous microtask hooks and native `AsyncLocalStorage`. It does not perform synchronous disk writes or network requests during request handling, adding less than 1ms latency per request.

### Q: Are sensitive headers and passwords leaked to the dashboard?
**A**: No. SuriLens automatically applies recursive sensitive key masking to headers, body parameters, cookies, and query strings prior to file logging or WebSocket broadcasting.

### Q: Can I use SuriLens in production?
**A**: Yes. Ensure dashboard authentication (`dashboardAuth`) is configured to restrict access to port `4444`.

### Q: Does SuriLens work with TypeScript?
**A**: Yes. SuriLens exports standard CommonJS modules compatible with TypeScript `import * as suriLens from 'surilens'` syntax.
