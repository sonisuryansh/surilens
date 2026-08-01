# 🔌 Plugin System & SDK Helpers

SuriLens provides high-level SDK helpers for instrumenting custom application layers, database operations, cache calls, background queue jobs, and third-party plugins.

---

## SDK Helper Methods

### 1. `suriLens.traceAsync(nodeName, fn, metadata)`
Instruments custom asynchronous functions:
```javascript
const user = await suriLens.traceAsync('Service: UserService', async () => {
  return await userService.findById(id);
}, { userId: id });
```

### 2. `suriLens.wrapFunction(nodeName, targetFn)`
Wraps a synchronous or asynchronous function:
```javascript
const processPayment = suriLens.wrapFunction('Stripe Payment', async (amount) => {
  return await stripe.charges.create({ amount });
});
```

### 3. `suriLens.traceCacheOperation(cacheType, operation, key, cacheFn)`
Instruments cache operations with HIT/MISS tracking:
```javascript
const data = await suriLens.traceCacheOperation('Redis', 'GET', 'user_101', async () => {
  return await redis.get('user_101');
});
```

### 4. `suriLens.traceQueueJob(queueName, jobName, jobFn)`
Instruments background queue job processing:
```javascript
await suriLens.traceQueueJob('EmailQueue', 'SendWelcomeEmail', async () => {
  await mailer.send(...);
});
```

### 5. `suriLens.createPlugin(name, initFn)`
Build custom SuriLens plugins:
```javascript
const myPlugin = suriLens.createPlugin('MyCustomPlugin', ({ collector, getContext }) => {
  collector.on('trace_start', (trace) => {
    console.log('Plugin notified of trace start:', trace.traceId);
  });
});
```
