# Quick Start

Get SuriLens running in under 5 minutes.

---

## 1. Install

```bash
npm install surilens
```

## 2. Add to Your App

```js
const express = require('express');
const suriLens = require('surilens');

const app = express();
app.use(express.json());

// One line — dashboard starts automatically
app.use(suriLens({ dashboardPort: 4444 }));

// Add steps anywhere in your handlers
app.get('/api/users/:id', async (req, res) => {
  suriLens.step('Controller');
  suriLens.step('Database', { query: 'SELECT * FROM users' });
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000);
```

## 3. Open Dashboard

Visit: **http://localhost:4444**

## 4. Make Requests

```bash
curl http://localhost:3000/api/users/1
```

Watch the execution graph animate in real-time.

---

## Framework Adapters

```js
// Fastify
const { adapters } = require('surilens');
fastify.register(adapters.fastify, { dashboardPort: 4444 });

// Koa
app.use(adapters.koa({ dashboardPort: 4444 }));

// NestJS
app.use(adapters.nest({ dashboardPort: 4444 }));

// Hono
app.use('*', adapters.hono({ dashboardPort: 4444 }));
```

---

## Run the Built-In Demo

```bash
cd example
npm install
node server.js

# App:       http://localhost:3000
# Dashboard: http://localhost:4444
```

---

## Next Steps

- [Getting Started](Getting-Started.md) — Detailed setup guide
- [Configuration](Configuration.md) — All available options
- [API Reference](API-Reference.md) — Complete API documentation
