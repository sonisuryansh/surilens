# Payload Tracking

SuriLens captures request and response payloads at each stage of the execution pipeline and displays them in the Inspector panel with security masking and diff analysis.

---

## What Gets Captured

For each HTTP request, SuriLens captures:

| Stage | Data Captured |
|-------|--------------|
| Client (request entry) | Request body, query params, URL params |
| Each `suriLens.step()` call | Metadata passed as the second argument |
| Response | Response body (via `res.json()` interception) |

---

## Stage Payloads

Payloads are stored per-stage in `trace.stagePayloads`:

```js
{
  "Client": { "item": "keyboard", "qty": 2 },
  "Controller": { "item": "keyboard", "qty": 2 },
  "Service": { "item": "keyboard", "qty": 2, "validated": true }
}
```

---

## Payload Size Limit

Payloads larger than `maxPayloadSize` (default 32KB) are automatically truncated:

```js
{
  "_truncated": true,
  "_originalSize": 98304,
  "summary": "{ \"items\": [ ... (first 512 chars) ..."
}
```

Adjust the limit with the `maxPayloadSize` option:

```js
app.use(suriLens({ maxPayloadSize: 65536 })); // 64KB
```

---

## Security Masking

The following field names are automatically masked with `"********"` wherever they appear in any payload:

- `password`, `pass`
- `secret`
- `token`, `access_token`, `id_token`
- `authorization`, `auth`, `bearer`
- `apikey`, `privatekey`
- `cookie`
- `ssn`, `card`

Masking is recursive — nested objects are scanned at all depths.

**Example — Before Display:**
```json
{
  "username": "alice",
  "password": "hunter2",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**After Masking:**
```json
{
  "username": "alice",
  "password": "********",
  "token": "********"
}
```

---

## Payload Diff (Inspector Panel)

The Inspector panel shows a Git-style diff between consecutive stage payloads:

```
+ added:    { "orderId": "ord_12345" }
~ modified: { "status": { "from": "pending", "to": "confirmed" } }
- removed:  { "tempToken": "..." }
```

This makes it easy to see exactly how your data transforms as it flows through the pipeline.

---

## Headers

Request headers are captured and displayed with masking applied:

- `Authorization` header: Only the last 4 characters of the token are shown
  - Example: `Bearer ****abcd`
- `Cookie` header: Replaced entirely with `****`

---

## Response Capture

SuriLens intercepts `res.json()` to capture response payloads automatically:

```js
res.json({ success: true, data: user }); // Captured automatically
```

For non-JSON responses (raw `res.end()`, streams, etc.), the response body may be `null` in the Inspector.
