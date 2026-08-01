const { createTraceContext, runWithContext } = require('../core/async-context');
const { collector } = require('../core/collector');
const crypto = require('node:crypto');

/**
 * SuriLens Fastify Plugin Adapter
 */
module.exports = function suriLensFastifyPlugin(fastify, options, done) {
  fastify.addHook('onRequest', (request, reply, next) => {
    const traceId = 'tr_' + crypto.randomBytes(4).toString('hex');
    const url = request.raw.url || '/';
    const method = request.raw.method || 'GET';

    const traceContext = createTraceContext({
      traceId,
      method,
      url,
      route: url,
      clientIP: request.ip || '::1',
      headers: request.headers || {},
      body: request.body || null,
      query: request.query || {}
    });

    collector.startTrace(traceContext);
    request.raw.__suriTraceId = traceId;

    runWithContext(traceContext, () => {
      collector.transitionNode(traceId, 'FastifyRouter');
      next();
    });
  });

  fastify.addHook('onResponse', (request, reply, next) => {
    const traceId = request.raw.__suriTraceId;
    if (traceId) {
      collector.completeTrace(traceId, reply.statusCode);
    }
    next();
  });

  done();
};
