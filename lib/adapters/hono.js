const { createTraceContext, runWithContext } = require('../core/async-context');
const { collector } = require('../core/collector');
const crypto = require('node:crypto');

/**
 * SuriLens Hono Middleware Adapter (Fetch API Standard)
 */
module.exports = function suriLensHonoMiddleware(options = {}) {
  return async function (c, next) {
    const traceId = 'tr_' + crypto.randomBytes(4).toString('hex');
    const url = c.req.url || '/';
    const method = c.req.method || 'GET';

    const traceContext = createTraceContext({
      traceId,
      method,
      url,
      route: url,
      clientIP: c.req.header('x-forwarded-for') || '::1',
      headers: Object.fromEntries(c.req.raw.headers.entries()),
      query: c.req.query()
    });

    collector.startTrace(traceContext);

    await runWithContext(traceContext, async () => {
      collector.transitionNode(traceId, 'HonoRouter');
      try {
        await next();
        collector.completeTrace(traceId, c.res ? c.res.status : 200);
      } catch (err) {
        collector.completeTrace(traceId, 500, err);
        throw err;
      }
    });
  };
};
