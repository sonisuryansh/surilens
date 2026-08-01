# ⚡ SuriLens

> **Universal Real-Time Backend Observability & Visual Execution Replay Platform for Node.js**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![Universal Adapters](https://img.shields.io/badge/adapters-Express%20%7C%20Fastify%20%7C%20Koa%20%7C%20NestJS%20%7C%20Hono-6366f1.svg)](#framework-adapters)
[![W3C Trace Context](https://img.shields.io/badge/W3C-Trace_Context-10b981?logo=w3c&logoColor=white)](https://www.w3.org/TR/trace-context/)

**SuriLens** is an enterprise-grade backend visualization and APM observability toolkit for Node.js applications. It intercepts incoming HTTP requests and visualizes their execution flow in real time across framework routers, middleware chains, business controllers, services, database queries, and outbound third-party APIs using a live 60fps interactive execution graph.

---

## 🌟 Key Features

* 🚀 **Universal Framework Support**: Native adapters for **Express**, **Fastify**, **Koa**, **NestJS**, and **Hono**.
* ⚡ **Event-Driven Execution Tracing**: Microtask-based layer detection with zero timer polling overhead.
* 🌐 **Outbound Auto-Instrumentation**: Automatically instruments outbound `http`, `https`, and `fetch` calls with target hostname node resolution (`External API: api.stripe.com`).
* 🔗 **Distributed Tracing**: Full support for W3C `traceparent` headers and `x-correlation-id` propagation across microservices.
* ⚠️ **Performance Intelligence**: Automated detection of slow routes (>500ms), high memory (>300MB), high CPU (>80%), slow database queries, and heavy payloads.
* 🔐 **Enterprise Data Masking**: Recursive masking for sensitive keys (`password`, `token`, `authorization`, `cookie`, `apikey`, `secret`) before disk logging or WebSocket streaming.
* ⏱️ **Visual Replay Engine**: Frame-by-frame execution replay at configurable speeds (0.25x – 4x) with step-forward, step-backward, and scrubable timelines.
* 📥 **Session Export & Advanced Search**: Filter trace history by route, method, status code, and latency; export/import trace session bundles as JSON.
* 🛡️ **Non-Blocking Storage**: Asynchronous file writes (`fs.promises.writeFile`) with a 60-second Trace TTL garbage collector to prevent memory leaks.

---

## 📦 Installation

```bash
npm install surilens
```

*(Zero heavy mandatory dependencies; optional driver and framework detection).*

---

## 🚀 Quick Start

### Express.js

```javascript
const express = require('express');
const suriLens = require('surilens');

const app = express();

// Mount SuriLens middleware
app.use(suriLens({ dashboardPort: 4444 }));

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000, () => {
  console.log('App running at http://localhost:3000');
  console.log('SuriLens Dashboard running at http://localhost:4444');
});
```

Now send requests to `http://localhost:3000/api/users/1` and open `http://localhost:4444` to watch the execution graph in real time!

---

## 🔌 Framework Adapters

### Fastify

```javascript
const Fastify = require('fastify');
const suriLens = require('surilens');

const fastify = Fastify();
fastify.register(suriLens.adapters.fastify);

fastify.get('/api/orders', async (request, reply) => {
  return { status: 'success', orders: [] };
});

fastify.listen({ port: 3000 });
```

### NestJS

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as suriLens from 'surilens';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Mount HTTP middleware
  app.use(suriLens({ dashboardPort: 4444 }));
  
  // Register NestJS Interceptor
  app.useGlobalInterceptors(new suriLens.adapters.nest());
  
  await app.listen(3000);
}
bootstrap();
```

### Koa

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

### Hono

```javascript
const { Hono } = require('hono');
const suriLens = require('surilens');

const app = new Hono();
app.use('*', suriLens.adapters.hono({ dashboardPort: 4444 }));

app.get('/', (c) => c.json({ message: 'Hello Hono' }));

module.exports = app;
```

---

## 🛠️ Plugin SDK & Custom Tracing

Instrument custom functions, database calls, cache operations, or background queue jobs with SDK helpers:

```javascript
const suriLens = require('surilens');

// Instrument async service calls
async function fetchUser(userId) {
  return await suriLens.traceAsync('Service: UserService', async () => {
    // Custom logic here
    return { id: userId };
  });
}

// Instrument Cache Operations (Redis/Memory)
async function getCachedProfile(key) {
  return await suriLens.traceCacheOperation('Redis', 'GET', key, async () => {
    return await redisClient.get(key);
  });
}

// Instrument Background Queue Jobs (BullMQ/Kafka/RabbitMQ)
async function processOrderJob(job) {
  return await suriLens.traceQueueJob('OrdersQueue', job.name, async () => {
    // Job consumer logic
  });
}
```

---

## 📖 Documentation Directory

Explore the complete enterprise documentation system in [`docs/`](./docs/README.md):

| Guide | Description |
| :--- | :--- |
| 📘 [**Getting Started**](./docs/Getting-Started.md) | High-level introduction and setup walk-through |
| 📦 [**Installation**](./docs/Installation.md) | Package installation and environment requirements |
| 🚀 [**Quick Start Guide**](./docs/Quick-Start.md) | Getting up and running in under 2 minutes |
| 🏗️ [**Architecture Overview**](./docs/Architecture.md) | Core system design, event flows, and telemetry pipeline |
| 📂 [**Folder Structure**](./docs/Folder-Structure.md) | Comprehensive walkthrough of all codebase directories |
| ⏱️ [**Runtime Lifecycle**](./docs/Runtime.md) | How SuriLens instruments requests at runtime |
| 🔄 [**Request Lifecycle**](./docs/Request-Lifecycle.md) | Step-by-step trace movement from client to response |
| 📡 [**Event System**](./docs/Event-System.md) | Collector event emissions and WebSocket streaming |
| 🔒 [**Payload & Privacy**](./docs/Payload-Tracking.md) | Payload snapshots, diffing, and sensitive data masking |
| 🎬 [**Replay Engine**](./docs/Replay-System.md) | Visual replay controls, playback speeds, and timeline scrubbing |
| 🖥️ [**Dashboard UI**](./docs/Dashboard.md) | Graph canvas, request explorer, search toolbar, inspector |
| 🔌 [**Plugin System**](./docs/Plugin-System.md) | Custom plugins and SDK helper functions |
| 📑 [**API Reference**](./docs/API-Reference.md) | Exhaustive API signatures and parameters |
| ⚙️ [**Configuration Options**](./docs/Configuration.md) | Every initialization flag and default value |
| 💻 [**Development Guide**](./docs/Development.md) | Contributor setup and local development workflow |
| 🏭 [**Production & Deployment**](./docs/Production.md) | Production setup, memory considerations, and security |
| ❓ [**Troubleshooting & FAQ**](./docs/Troubleshooting.md) | Resolving common issues and misconfigurations |
| 🌟 [**Best Practices**](./docs/Best-Practices.md) | Performance, security, and enterprise guidelines |
| 🤝 [**Contributing Guide**](./docs/Contributing.md) | Open source contribution guidelines |
| 📜 [**Changelog**](./docs/Changelog.md) | Release history and updates |

---

## 📄 License

[MIT License](./LICENSE) © SuriLens Maintainers.
