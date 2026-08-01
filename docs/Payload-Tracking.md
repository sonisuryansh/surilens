# 🔒 Payload Tracking & Sensitive Data Masking

SuriLens captures payload snapshots at each stage of request execution while enforcing strict enterprise data masking and memory bounds.

---

## Sensitive Data Masking (`event-store.js`)

`maskSensitiveData(data)` recursively inspects objects and array fields. Any key containing substring matches for sensitive fields is automatically masked with `'********'`.

### Masked Field Key Rules
- `password`, `pass`
- `secret`
- `token`, `bearer`, `access_token`, `id_token`
- `authorization`, `auth`
- `apikey`, `privatekey`, `key`
- `cookie`
- `ssn`, `card`

### Header Sanitization Example
```javascript
// Raw Header:
{ "authorization": "Bearer eyJhbGciOiJKV1QiLC...", "cookie": "session=xyz123" }

// Sanitized Header:
{ "authorization": "Bearer ****W1QiLC...", "cookie": "********" }
```

---

## Payload Diff Engine (`computePayloadDiff`)

SuriLens compares JSON payload snapshots between consecutive pipeline stages (`Stage N` vs `Stage N+1`) to highlight modifications made by middleware or controllers:

```json
{
  "added": { "userId": 101 },
  "modified": { "status": { "from": "pending", "to": "active" } },
  "removed": { "tempToken": "xyz" }
}
```

---

## Payload Memory Safety

To prevent V8 heap exhaustion on large file uploads or batch JSON imports:
- Payloads exceeding **32KB** (`maxPayloadSize`) are automatically truncated in memory with a `_truncated: true` indicator.
