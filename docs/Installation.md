# 📦 Installation Guide

## Requirements

- **Node.js**: Version `>=18.0.0` (requires native `AsyncLocalStorage` and `fetch` support).
- **Operating Systems**: macOS, Linux, Windows.

---

## Installing via NPM

```bash
npm install surilens
```

## Installing via Yarn

```bash
yarn add surilens
```

## Installing via PNPM

```bash
pnpm add surilens
```

---

## Dependencies Overview

SuriLens is engineered with **zero heavy mandatory dependencies**:
- `express`: Supported framework target.
- `ws`: Lightweight, fast WebSocket server for live telemetry streaming.

All framework adapters (Fastify, Koa, NestJS, Hono) use optional dynamic detection and do not pollute your production `package.json`.
