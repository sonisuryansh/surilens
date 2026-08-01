const { createTraceContext, runWithContext } = require('../core/async-context');
const { collector } = require('../core/collector');
const crypto = require('node:crypto');

/**
 * SuriLens Koa Middleware Adapter
 */
module.exports = function suriLensKoaMiddleware(options = {}) {
  return async function (ctx, next) {
    const traceId = 'tr_' + crypto.randomBytes(4).toString('hex');
    const url = ctx.url || '/';
    const method = ctx.method || 'GET';

    const traceContext = createTraceContext({
      traceId,
      method,
      url,
      route: url,
      clientIP: ctx.ip || '::1',
      headers: ctx.headers || {},
      body: ctx.request.body || null,
      query: ctx.query || {}
    });

    collector.startTrace(traceContext);

    await runWithContext(traceContext, async () => {
      collector.transitionNode(traceId, 'KoaRouter');
      try {
        await next();
        collector.completeTrace(traceId, ctx.status || 200, null, ctx.body);
      } catch (err) {
        collector.completeTrace(traceId, err.status || 500, err, ctx.body);
        throw err;
      }
    });
  };
};
