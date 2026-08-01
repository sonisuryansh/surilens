const crypto = require('node:crypto');
const { createTraceContext, runWithContext, getContext } = require('./async-context');
const { collector } = require('./collector');
const { autoInstrument } = require('./auto-instrument');

/**
 * Generates a concise trace ID.
 */
function generateTraceId() {
  return 'tr_' + crypto.randomBytes(4).toString('hex');
}

/**
 * Main SuriLens Middleware Creator (Express Engine)
 */
function createMiddleware(options = {}) {
  // Trigger zero-dependency auto-instrumentation for outbound requests
  autoInstrument();

  return function suriLensMiddleware(req, res, next) {
    // Distributed tracing header extraction
    const incomingTraceparent = req.headers['traceparent'];
    let traceId = generateTraceId();
    let parentTraceId = null;

    if (incomingTraceparent && typeof incomingTraceparent === 'string') {
      const parts = incomingTraceparent.split('-');
      if (parts.length >= 2 && parts[1]) {
        parentTraceId = parts[1];
      }
    }

    const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || traceId;
    const url = req.originalUrl || req.url || '/';
    const method = req.method;

    // Capture client IP context
    const clientIP =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      '::1';

    // Sanitize sensitive headers for display
    const rawHeaders = { ...req.headers };
    if (rawHeaders.authorization) {
      const parts = rawHeaders.authorization.split(' ');
      rawHeaders.authorization = parts.length > 1
        ? `${parts[0]} ****${parts[1].slice(-4)}`
        : '****';
    }
    if (rawHeaders.cookie) rawHeaders.cookie = '****';

    const traceContext = createTraceContext({
      traceId,
      parentTraceId,
      correlationId,
      method,
      url,
      route: url,
      clientIP,
      headers: rawHeaders,
      body: req.body || null,
      query: req.query || {},
      params: {}
    });

    // Start trace in collector
    collector.startTrace(traceContext);

    // Intercept res.end to complete trace
    const originalEnd = res.end;
    let isCompleted = false;
    let responseBody = null;

    // Intercept res.json to capture response payload
    if (typeof res.json === 'function') {
      const originalJson = res.json.bind(res);
      res.json = function (data) {
        responseBody = data;
        traceContext.responseBody = data;
        return originalJson(data);
      };
    }

    res.end = function (...args) {
      if (!isCompleted) {
        isCompleted = true;
        if (req.route && req.route.path) {
          const basePath = req.baseUrl || '';
          traceContext.route = `${basePath}${req.route.path}`;
        }
        if (req.params) traceContext.params = req.params;
        collector.completeTrace(traceId, res.statusCode, null, responseBody);
      }
      return originalEnd.apply(this, args);
    };

    // Track layer progression deterministically without setInterval polling
    runWithContext(traceContext, () => {
      collector.transitionNode(traceId, 'Router');

      // Hook Express route execution dynamically
      const handleRouteTransition = () => {
        if (!isCompleted && getContext()?.traceId === traceId) {
          if (req.route) {
            collector.transitionNode(traceId, 'Controller', { path: req.route.path });
          } else {
            collector.transitionNode(traceId, 'Middleware');
          }
        }
      };

      // Defer route/controller resolution to next microtask tick once router matches
      process.nextTick(handleRouteTransition);

      next();
    });
  };
}

/**
 * Manual Step Helper for custom demarcation
 */
function recordStep(nodeName, metadata = {}) {
  const context = getContext();
  if (context) {
    collector.transitionNode(context.traceId, nodeName, metadata);
  }
}

/**
 * Manual Helper to remove a temporary stage node from the graph
 */
function removeStep(nodeName, metadata = {}) {
  const context = getContext();
  if (context) {
    collector.removeNodeStage(context.traceId, nodeName, metadata);
  }
}

module.exports = {
  createMiddleware,
  recordStep,
  removeStep
};
