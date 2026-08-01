# 🚀 Quick Start Guide

Setting up SuriLens takes less than 2 minutes.

---

## 1. Express.js Application

```javascript
const express = require('express');
const suriLens = require('surilens');

const app = express();
app.use(express.json());

// Initialize SuriLens Middleware
app.use(suriLens({ dashboardPort: 4444 }));

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000, () => {
  console.log('App running on http://localhost:3000');
  console.log('Dashboard running on http://localhost:4444');
});
```

---

## 2. Fastify Application

```javascript
const Fastify = require('fastify');
const suriLens = require('surilens');

const fastify = Fastify();
fastify.register(suriLens.adapters.fastify, { dashboardPort: 4444 });

fastify.get('/api/orders', async (request, reply) => {
  return { status: 'success', orders: [] };
});

fastify.listen({ port: 3000 });
```

---

## 3. NestJS Application

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as suriLens from 'surilens';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(suriLens({ dashboardPort: 4444 }));
  app.useGlobalInterceptors(new suriLens.adapters.nest());
  
  await app.listen(3000);
}
bootstrap();
```

---

## 4. Koa Application

```javascript
const Koa = require('koa');
const suriLens = require('surilens');

const app = new Koa();
app.use(suriLens.adapters.koa({ dashboardPort: 4444 }));

app.use(async (ctx) => {
  ctx.body = { message: 'Hello Koa' };
});

app.listen(3000);
```

---

## 5. Hono Application (Node.js)

```javascript
const { Hono } = require('hono');
const suriLens = require('surilens');

const app = new Hono();
app.use('*', suriLens.adapters.hono({ dashboardPort: 4444 }));

app.get('/', (c) => c.json({ message: 'Hello Hono' }));

module.exports = app;
```
