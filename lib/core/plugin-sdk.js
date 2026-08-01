const { getContext } = require('./async-context');
const { collector } = require('./collector');

/**
 * Executes an async function within the current trace context,
 * recording a node entry and exit automatically.
 */
async function traceAsync(nodeName, fn, metadata = {}) {
  const context = getContext();
  if (!context) {
    return await fn();
  }

  const traceId = context.traceId;
  collector.transitionNode(traceId, nodeName, metadata);

  try {
    const result = await fn();
    return result;
  } catch (err) {
    collector.logMessage(traceId, `[Error @ ${nodeName}] ${err.message}`);
    throw err;
  }
}

/**
 * Wraps a standard sync or async function to automatically instrument its execution step.
 */
function wrapFunction(nodeName, targetFn) {
  return function (...args) {
    const context = getContext();
    if (!context) {
      return targetFn.apply(this, args);
    }

    collector.transitionNode(context.traceId, nodeName);
    try {
      const res = targetFn.apply(this, args);
      if (res && typeof res.then === 'function') {
        return res.catch((err) => {
          collector.logMessage(context.traceId, `[Error @ ${nodeName}] ${err.message}`);
          throw err;
        });
      }
      return res;
    } catch (err) {
      collector.logMessage(context.traceId, `[Error @ ${nodeName}] ${err.message}`);
      throw err;
    }
  };
}

/**
 * Instruments queue producers and consumers (BullMQ, Kafka, RabbitMQ).
 */
async function traceQueueJob(queueName, jobName, jobFn, metadata = {}) {
  const nodeName = `Queue (${queueName})`;
  return await traceAsync(nodeName, jobFn, {
    jobName,
    queueName,
    type: 'queue_consumer',
    ...metadata
  });
}

/**
 * Instruments Cache Operations (Redis, Memory Cache, LRU).
 */
async function traceCacheOperation(cacheType, operation, key, cacheFn) {
  const context = getContext();
  const nodeName = `Cache (${cacheType})`;

  if (context) {
    collector.transitionNode(context.traceId, nodeName, {
      cacheType,
      operation,
      key
    });
  }

  try {
    const result = await cacheFn();
    const hit = result !== null && result !== undefined;
    if (context) {
      context.tags[`cache_${key}`] = hit ? 'HIT' : 'MISS';
    }
    return result;
  } catch (err) {
    if (context) {
      collector.logMessage(context.traceId, `[Cache Error @ ${key}] ${err.message}`);
    }
    throw err;
  }
}

/**
 * Creates a SuriLens Plugin object for third-party integrations.
 */
function createPlugin(name, initFn) {
  return {
    name,
    init: (options = {}) => initFn({ collector, getContext, traceAsync, wrapFunction, ...options })
  };
}

module.exports = {
  traceAsync,
  wrapFunction,
  traceQueueJob,
  traceCacheOperation,
  createPlugin
};
