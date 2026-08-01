const { AsyncLocalStorage } = require('node:async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Creates and initializes a trace store for an incoming request.
 */
function createTraceContext(traceData) {
  return {
    traceId: traceData.traceId,
    parentTraceId: traceData.parentTraceId || null,
    correlationId: traceData.correlationId || traceData.traceId,
    serviceName: traceData.serviceName || process.env.SERVICE_NAME || 'NodeService',
    method: traceData.method || 'GET',
    url: traceData.url || '/',
    route: traceData.route || traceData.url || '/',
    startTime: Date.now(),
    startHrTime: Number(process.hrtime.bigint()),
    activeNode: 'Client',
    status: 'in_flight',
    statusCode: null,
    responseTime: null,
    steps: [],
    tags: traceData.tags || {},
    performanceFlags: [],
    ...traceData
  };
}

/**
 * Runs a function within the AsyncLocalStorage context.
 */
function runWithContext(context, fn) {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Retrieves the current trace context if present.
 */
function getContext() {
  return asyncLocalStorage.getStore();
}

module.exports = {
  asyncLocalStorage,
  createTraceContext,
  runWithContext,
  getContext
};

