const { AsyncLocalStorage } = require('node:async_hooks');
const path = require('node:path');
const crypto = require('node:crypto');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Generates a random 8-character span ID (OpenTelemetry style).
 */
function generateSpanId() {
  return 'sp_' + crypto.randomBytes(4).toString('hex');
}

/**
 * Creates and initializes a trace store for an incoming request.
 */
function createTraceContext(traceData) {
  const rootSpanId = generateSpanId();
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
    activeNode: 'Express',
    activeSpanId: rootSpanId,
    rootSpanId,
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

/**
 * Secondary Fallback: Extracts stack trace metadata (caller file, function name)
 * strictly when explicit runtime label metadata is unavailable.
 */
function getCallerInfo() {
  const orig = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const err = new Error();
  Error.captureStackTrace(err, getCallerInfo);
  const stack = err.stack;
  Error.prepareStackTrace = orig;

  if (Array.isArray(stack)) {
    for (let i = 1; i < stack.length; i++) {
      const fileName = stack[i].getFileName();
      if (!fileName) continue;

      const normalized = fileName.replace(/\\/g, '/');
      if (normalized.includes('node_modules') || normalized.includes('lib/core') || normalized.includes('node:')) {
        continue;
      }

      const funcName = stack[i].getFunctionName() || stack[i].getMethodName() || 'anonymous';
      const baseName = path.basename(fileName);
      const parts = normalized.split('/');
      const folderName = parts.length > 1 ? parts[parts.length - 2] : '';

      return {
        fileName,
        baseName,
        folderName,
        funcName,
        line: stack[i].getLineNumber()
      };
    }
  }
  return null;
}

module.exports = {
  asyncLocalStorage,
  generateSpanId,
  createTraceContext,
  runWithContext,
  getContext,
  getCallerInfo
};
