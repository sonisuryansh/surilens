# Runtime & Auto-Instrumentation

SuriLens can automatically trace many common libraries without any changes to your code.

---

## How Auto-Instrumentation Works

When the SuriLens middleware first loads, it calls `autoInstrument()` which:

1. **Patches `http.request` and `https.request`** — All outbound HTTP calls are intercepted
2. **Patches native `fetch`** — Node 18+ global `fetch` is intercepted
3. **Patches the Node.js module loader** — When specific packages are `require()`d for the first time, their core methods are wrapped

No restart is required. Everything is patched at load time.

---

## Auto-Instrumented Libraries

### HTTP & HTTPS (always active)

Any call to `http.request()`, `https.request()`, or `fetch()` creates a node in the execution graph:

- **Localhost calls** → Categorized as `Database`
- **External calls** → Categorized as `External API (hostname)` (e.g., `External API (api.stripe.com)`)

W3C `traceparent` and `x-correlation-id` headers are automatically injected into all outbound calls.

### Database Drivers

| Package | Auto-detected as |
|---------|-----------------|
| `mongoose` | `MongoDB (method)` |
| `pg` | `PostgreSQL` |
| `mysql2` | `MySQL` |

### ORMs

| Package | Auto-detected as |
|---------|-----------------|
| `@prisma/client` | `Prisma (model.method)` |
| `sequelize` | `Sequelize (Model.method)` |

### Cache

| Package | Auto-detected as |
|---------|-----------------|
| `ioredis` | `Redis (command)` |
| `redis` | `Redis (command)` |

### Message Queues

| Package | Auto-detected as |
|---------|-----------------|
| `kafkajs` | `Kafka (produce/consume)` |

### Cloud Services

| Package | Auto-detected as |
|---------|-----------------|
| `@aws-sdk/client-s3` | `S3 (operation)` |

---

## Triggering Manually

`autoInstrument()` is called automatically when you use any of the framework adapters. If you are building a custom integration, call it explicitly:

```js
const suriLens = require('surilens');
suriLens.autoInstrument();
```

It is safe to call multiple times — a guard prevents double-patching.

---

## Manual Step Tracing

For code not covered by auto-instrumentation, use `suriLens.step()`:

```js
// Custom payment gateway
suriLens.step('BrainTreeGateway', { action: 'charge', amount: 5000 });
const result = await braintree.transaction.sale({ amount: '50.00' });

// Custom in-memory cache
suriLens.step('MemoryCache', { operation: 'GET', key: `user:${id}` });
const cached = inMemoryCache.get(`user:${id}`);
```

---

## Node Category Detection

When `transitionNode()` is called (by `suriLens.step()` or auto-instrumentation), the node name is scanned for category keywords:

| Keyword in node name | Category assigned |
|---------------------|------------------|
| `express` | `express` |
| `router` | `router` |
| `middleware` | `middleware` |
| `mongo`, `prisma`, `sequelize`, `postgres`, `mysql`, `database` | `database` |
| `redis`, `cache` | `redis` |
| `jwt`, `bcrypt`, `auth` | `jwt` |
| `external`, `axios`, `fetch` | `external_http` |
| `client` | `client` |
| `response` | `response` |
| _(anything else)_ | `function` |

The category determines the node's color and icon in the dashboard graph.

---

## Architecture-Independent Tracing

SuriLens works regardless of how your project is organized:

- No folders at all (single-file app)
- Controllers in `controllers/`
- Services in `services/`
- Repositories in `repositories/`
- Utilities in `utils/` or `helpers/`
- Database queries in `database/` or inline
- Prisma, Sequelize, or raw SQL

The execution graph is built from the actual runtime call stack, not from file system conventions.
