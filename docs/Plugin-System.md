# Plugin System

SuriLens provides a plugin SDK for building custom integrations with third-party libraries, queue systems, or cloud services.

---

## Overview

A SuriLens plugin is a factory object with a `name` and an `init()` method. The `init()` function receives access to the core engine internals: `collector`, `getContext`, `traceAsync`, and `wrapFunction`.

---

## Creating a Plugin

```js
const suriLens = require('surilens');

const myPlugin = suriLens.createPlugin('MyService', ({ collector, getContext, traceAsync, wrapFunction }) => {
  // Your integration logic here
  // Wrap functions, listen to events, etc.
  console.log('[MyService] Plugin initialized');
});

// Initialize the plugin
myPlugin.init({ apiKey: process.env.MY_API_KEY });
```

---

## Plugin Init Parameters

The `initFn` receives the following helpers:

| Parameter | Description |
|-----------|-------------|
| `collector` | The singleton `SuriCollector` instance (EventEmitter) |
| `getContext()` | Returns the current `AsyncLocalStorage` trace context, or `null` |
| `traceAsync(name, fn, metadata?)` | Traces an async function |
| `wrapFunction(name, fn)` | Wraps a sync/async function for auto-tracing |

---

## Examples

### Wrapping a Third-Party Client

```js
const myServicePlugin = suriLens.createPlugin('Stripe', ({ wrapFunction }) => {
  const stripe = require('stripe')(process.env.STRIPE_KEY);

  // Wrap Stripe methods for automatic tracing
  stripe.charges.create = wrapFunction('Stripe (charges.create)', stripe.charges.create.bind(stripe.charges));
  stripe.customers.create = wrapFunction('Stripe (customers.create)', stripe.customers.create.bind(stripe.customers));

  return stripe;
});

const stripe = myServicePlugin.init();
```

### Listening to Trace Events

```js
const alertPlugin = suriLens.createPlugin('SlowRouteAlert', ({ collector }) => {
  collector.on('trace_complete', (trace) => {
    if (trace.responseTime > 1000) {
      console.warn(`[ALERT] Slow route detected: ${trace.route} took ${trace.responseTime}ms`);
      // Send to Slack, PagerDuty, etc.
    }
  });
});

alertPlugin.init();
```

### Custom Queue Integration

```js
const bullPlugin = suriLens.createPlugin('BullMQ', ({ traceAsync, getContext }) => {
  // Wrap BullMQ worker processor
  return {
    wrapProcessor: (queueName, processorFn) => async (job) => {
      return await traceAsync(`Queue (${queueName})`, () => processorFn(job), {
        jobId: job.id,
        jobName: job.name
      });
    }
  };
});

const bull = bullPlugin.init();

// Usage in your app
const worker = new Worker('email-queue', bull.wrapProcessor('email-queue', async (job) => {
  await sendEmail(job.data);
}));
```

---

## SDK Helpers (Standalone)

You can also use these helpers directly without creating a full plugin:

### `suriLens.traceAsync(name, fn, metadata?)`

```js
const result = await suriLens.traceAsync('ExternalPayment', async () => {
  return await paymentGateway.charge({ amount: 5000 });
}, { gateway: 'braintree' });
```

### `suriLens.wrapFunction(name, fn)`

```js
const tracedSendEmail = suriLens.wrapFunction('Mailer', sendEmail);
await tracedSendEmail({ to: 'user@example.com', subject: 'Welcome' });
```

### `suriLens.traceQueueJob(queue, job, fn, metadata?)`

```js
await suriLens.traceQueueJob('notifications', 'sendPushNotification', async () => {
  await fcm.send({ token: deviceToken, body: 'Hello!' });
}, { priority: 'high' });
```

### `suriLens.traceCacheOperation(type, op, key, fn)`

```js
const user = await suriLens.traceCacheOperation('Redis', 'GET', `user:${id}`, async () => {
  return await redis.get(`user:${id}`);
});
```

---

## Plugin Object Shape

```js
{
  name: 'MyPluginName',    // string — display name
  init: (options = {}) => initFn({ collector, getContext, traceAsync, wrapFunction, ...options })
}
```

The `initFn` return value is passed through as the return value of `init()`, allowing plugins to expose wrapped clients or utilities.
