const { createMiddleware, recordStep, removeStep } = require('./lib/core/instrumentor');
const { collector } = require('./lib/core/collector');
const { getContext } = require('./lib/core/async-context');
const { autoInstrument } = require('./lib/core/auto-instrument');
const { traceAsync, wrapFunction, traceQueueJob, traceCacheOperation, createPlugin } = require('./lib/core/plugin-sdk');
const DashboardServer = require('./lib/server/dashboard-server');

let globalDashboardServer = null;

/**
 * Main SuriLens Express Middleware Factory
 * Usage:
 *   const suriLens = require('surilens');
 *   app.use(suriLens({ dashboardPort: 4444 }));
 */
function suriLens(options = {}) {
  const dashboardPort = options.dashboardPort || options.port || 4444;

  // Auto-launch local Dashboard server if not already running
  if (!globalDashboardServer) {
    globalDashboardServer = new DashboardServer({ dashboardPort, ...options });
    globalDashboardServer.start();
  }

  return createMiddleware(options);
}

/**
 * Helper to record step transitions explicitly in custom code
 * e.g., suriLens.step('Service') or suriLens.step('Database')
 */
suriLens.step = function (nodeName, metadata = {}) {
  recordStep(nodeName, metadata);
};

suriLens.removeStep = function (nodeName, metadata = {}) {
  removeStep(nodeName, metadata);
};

/**
 * High-level SDK Helpers & Plugin Integrations
 */
suriLens.traceAsync = traceAsync;
suriLens.wrapFunction = wrapFunction;
suriLens.traceQueueJob = traceQueueJob;
suriLens.traceCacheOperation = traceCacheOperation;
suriLens.createPlugin = createPlugin;
suriLens.autoInstrument = autoInstrument;

/**
 * Expose Framework Adapters
 */
suriLens.adapters = {
  express: require('./lib/adapters/express'),
  fastify: require('./lib/adapters/fastify'),
  koa: require('./lib/adapters/koa'),
  nest: require('./lib/adapters/nest'),
  hono: require('./lib/adapters/hono')
};

/**
 * Expose Collector and Async Context for custom integrations
 */
suriLens.collector = collector;
suriLens.getContext = getContext;

module.exports = suriLens;
