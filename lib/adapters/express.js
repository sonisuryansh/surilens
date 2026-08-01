const { createMiddleware } = require('../core/instrumentor');

/**
 * SuriLens Express Adapter
 */
module.exports = function suriLensExpressAdapter(options = {}) {
  return createMiddleware(options);
};
