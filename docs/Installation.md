# Installation

Full installation guide for SuriLens.

---

## Requirements

- **Node.js** >= 18.0.0
- One of: Express, Fastify, Koa, NestJS, or Hono
- npm, yarn, or pnpm

---

## Install via npm

```bash
npm install surilens
```

## Install via yarn

```bash
yarn add surilens
```

## Install via pnpm

```bash
pnpm add surilens
```

---

## Peer Dependencies

SuriLens has **zero required peer dependencies**. All framework dependencies are optional:

| Package | Version |
|---------|---------|
| `express` | ^4.x or ^5.x |
| `fastify` | ^4.x or ^5.x |
| `koa` | ^2.x |
| `@nestjs/common` | ^9.x or ^10.x |
| `hono` | ^3.x or ^4.x |

Install only what you need for your framework.

---

## Verify Installation

```bash
node -e "const s = require('surilens'); console.log('SuriLens loaded:', typeof s)"
# SuriLens loaded: function
```

---

## First Run

See [Quick Start](Quick-Start.md) to get the dashboard running in under 5 minutes.
