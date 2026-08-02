<div align="center">

<img src="https://raw.githubusercontent.com/sonisuryansh/surilens/main/docs/assets/logo.png" alt="SuriLens Logo" width="75" />

# ⚡ SuriLens

**Enterprise-grade Real-Time Backend Observability Platform for Node.js**

<p>
  <a href="https://www.npmjs.com/package/surilens"><img alt="npm version" src="https://img.shields.io/npm/v/surilens.svg?style=flat-square&color=blue" /></a>
  <a href="https://nodejs.org"><img alt="node version" src="https://img.shields.io/node/v/surilens.svg?style=flat-square&color=green" /></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/npm/l/surilens.svg?style=flat-square&color=orange" /></a>
  <a href="https://www.npmjs.com/package/surilens"><img alt="weekly downloads" src="https://img.shields.io/npm/dw/surilens.svg?style=flat-square&color=purple" /></a>
  <img alt="frameworks" src="https://img.shields.io/badge/frameworks-Express%20%7C%20Fastify%20%7C%20NestJS%20%7C%20Koa%20%7C%20Hono-6366f1?style=flat-square" />
</p>

```bash
npm i surilens
```

<br/>

<img src="https://raw.githubusercontent.com/sonisuryansh/surilens/main/docs/assets/dashboard.png" alt="SuriLens Hero Dashboard" width="600" style="border-radius: 8px;" />

<p><sub><em>Live execution graph showing complete request lifecycle through middleware, controllers, services, and databases.</em></sub></p>

</div>

---

## 🔭 What is SuriLens?

**SuriLens** is a zero-dependency, drop-in observability middleware for Node.js backends. It automatically captures every HTTP request, traces execution through your application layers (**Router → Middleware → Controller → Service → Database → Response**), and streams the data live to a real-time dark-mode dashboard — all in a single `npm install`.

---

## 💡 Why SuriLens?

| Problem | SuriLens Solution |
|---------|------------------|
| "I don't know what happens inside my Express app" | Live execution graph shows every layer as it executes in real-time |
| "I can't reproduce what happened on that failing request" | Visual Replay Engine — step through any captured request step-by-step |
| "My DB queries are slow but I don't know which ones" | Per-stage timing waterfall in the Timeline panel |
| "I can't debug distributed microservice calls" | W3C Trace Context propagation with `traceparent` headers |
| "Sensitive data leaks into logs" | Automatic security masking of passwords, tokens, cookies |
| "My observability tool costs $$$ or needs cloud agents" | SuriLens is 100% open source, lightweight, and runs locally |

---

## ✨ Key Features

- **🔴 Real-Time Execution Graph**: Animated flow graph with 15 category colors, state pulses, and SVG directional arrows.
- **▶ Visual Replay Engine**: Step-by-step re-execution of any captured request with speed control.
- **🧪 Inspector & Payload Diff**: Inspect headers, payloads, and git-style stage diffs with automatic security masking.
- **⚡ Zero-Config Auto-Instrumentation**: Auto-detects `http/fetch`, Mongoose, Redis, Postgres, MySQL, Prisma, Sequelize, Kafka, and S3.
- **🌐 Distributed Tracing**: W3C `traceparent` and correlation header propagation across microservices.
- **🔒 Automatic Privacy & Masking**: Masks sensitive parameters (passwords, tokens, cookies) recursively.
- **📊 Live Performance Metrics**: Real-time RPS, CPU%, Memory MB, Error Rate%, and Avg Latency monitoring.

---

## 📦 Installation

```bash
npm install surilens
```

**Requirements:** Node.js >= 18.0.0

---

## 🚀 Quick Start (Express)

```js
const express = require('express');
const suriLens = require('surilens');

const app = express();
app.use(express.json());

// Register SuriLens middleware — dashboard launches automatically at http://localhost:4444
app.use(suriLens({ dashboardPort: 4444 }));

app.get('/users/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'getUser' });
  suriLens.step('Service', { action: 'fetchUser' });
  suriLens.step('Database', { query: 'SELECT * FROM users WHERE id = ?' });
  res.json({ id: req.params.id, name: 'Alice' });
});

app.listen(3000, () => console.log('App running on http://localhost:3000'));
```

Open **http://localhost:4444** in your browser to view the live execution dashboard.

---

## 🛠 Supported Frameworks

| Framework | Adapter | Min Version | Documentation |
|-----------|---------|-------------|---------------|
| Express | `require('surilens')` | 4.x, 5.x | [Express Guide](docs/Getting-Started.md#express) |
| Fastify | `suriLens.adapters.fastify` | 4.x, 5.x | [Fastify Guide](docs/Getting-Started.md#fastify) |
| Koa | `suriLens.adapters.koa` | 2.x | [Koa Guide](docs/Getting-Started.md#koa) |
| NestJS | `suriLens.adapters.nest` | 9.x, 10.x | [NestJS Guide](docs/Getting-Started.md#nestjs) |
| Hono | `suriLens.adapters.hono` | 3.x, 4.x | [Hono Guide](docs/Getting-Started.md#hono) |

---

## 📖 Documentation

Comprehensive guides and API reference are available in the [`docs/`](docs/) directory:

- 🚀 **[Getting Started](docs/Getting-Started.md)** — Installation, framework setup, and basic usage.
- 📘 **[API Reference](docs/API-Reference.md)** — Complete options, SDK functions, manual steps, REST endpoints & WebSocket events.
- 🏗 **[Architecture](docs/Architecture.md)** — Engine design, `AsyncLocalStorage` context propagation, and collector mechanics.
- ⚙️ **[Configuration](docs/Configuration.md)** — Storage limits, TTL sweeps, auth, and dashboard settings.
- ▶️ **[Visual Replay Engine](docs/Replay-System.md)** — Step-by-step playback, session export & import.
- 🖥 **[Dashboard Guide](docs/Dashboard.md)** — UI layout, node colors, Inspector panel, and timeline waterfall.
- 🛰 **[Event System](docs/Event-System.md)** — WebSocket protocols and server-side EventEmitter events.
- 🔐 **[Production & Best Practices](docs/Production.md)** — Security, memory tuning, and production recommendations.
- ❓ **[FAQ & Troubleshooting](docs/FAQ.md)** — Common questions and solutions.

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

---

## 📄 License

MIT © [Suryansh Soni](https://github.com/sonisuryansh)

---

<div align="center">
  <sub>Built for Node.js developers who deserve better observability.</sub>
</div>
