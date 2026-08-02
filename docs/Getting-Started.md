# Getting Started

Everything you need to go from zero to a live SuriLens dashboard in under 5 minutes.

---

## Prerequisites

- Node.js >= 18.0.0
- An Express, Fastify, Koa, NestJS, or Hono application

---

## Step 1 — Install

```bash
npm install surilens
```

---

## Step 2 — Add Middleware

### Express

```js
const express = require('express');
const suriLens = require('surilens');

const app = express();
app.use(express.json());

// Register SuriLens before your routes
app.use(suriLens({ dashboardPort: 4444 }));

// Your routes go here
app.get('/users/:id', async (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000, () => {
  console.log('App running on http://localhost:3000');
  // Dashboard: http://localhost:4444
});
```

### Other Frameworks

See [API Reference](API-Reference.md) for Fastify, Koa, NestJS, and Hono adapters.

---

## Step 3 — Open the Dashboard

Visit **http://localhost:4444** in your browser.

---

## Step 4 — Send Requests

Make HTTP requests to your app and watch the execution graph animate in real-time:

```bash
curl http://localhost:3000/users/1
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d '{"item":"keyboard"}'
```

---

## Step 5 — Add Manual Steps (Optional)

Use `suriLens.step()` to mark transitions inside your route handlers:

```js
app.get('/users/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'getUser' });

  // Fetch from database
  suriLens.step('Database', { query: 'SELECT * FROM users WHERE id = ?' });
  const user = await db.users.findOne(req.params.id);

  res.json(user);
});
```

The dashboard graph will now show: `Client → Express → Router → Controller → Database → Response`

---

## Full Working Example

Run the included demo server:

```bash
cd example
npm install
node server.js
```

Then hit:

```bash
curl http://localhost:3000/api/users/1
curl -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{"item":"keyboard","qty":2}'
curl http://localhost:3000/api/error-test
curl http://localhost:3000/api/redis-demo
```

Watch the execution graph at **http://localhost:4444**.

---

## Next Steps

- [Configuration](Configuration.md) — All options and defaults
- [API Reference](API-Reference.md) — Complete API documentation
- [Architecture](Architecture.md) — How the engine works internally
- [Event System](Event-System.md) — WebSocket and EventEmitter events
- [Plugin System](Plugin-System.md) — Extend SuriLens with custom plugins
