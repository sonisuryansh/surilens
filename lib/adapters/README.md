# Framework Adapters (`lib/adapters/`)

The `lib/adapters/` directory contains framework-specific wrappers that adapt SuriLens telemetry collection to major Node.js Web frameworks.

## 📁 Files & Framework Support

### `express.js`
- **Framework**: Express.js (v4+)
- **Usage**: `app.use(suriLens())` or `app.use(suriLens.adapters.express())`
- **Description**: Standard Express middleware `(req, res, next)`.

### `fastify.js`
- **Framework**: Fastify (v4+)
- **Usage**: `fastify.register(suriLens.adapters.fastify)`
- **Description**: Fastify plugin hook utilizing `onRequest` and `onResponse` lifecycle hooks.

### `koa.js`
- **Framework**: Koa (v2+)
- **Usage**: `app.use(suriLens.adapters.koa())`
- **Description**: Koa async middleware wrapper `(ctx, next)`.

### `nest.js`
- **Framework**: NestJS (v9+)
- **Usage**: `@UseInterceptors(new suriLens.adapters.nest())` or `app.useGlobalInterceptors(new suriLens.adapters.nest())`
- **Description**: NestJS execution interceptor capturing Nest controllers and route handlers.

### `hono.js`
- **Framework**: Hono (Node.js runtime)
- **Usage**: `app.use('*', suriLens.adapters.hono())`
- **Description**: Fetch API `(c, next)` context wrapper for Hono applications.
