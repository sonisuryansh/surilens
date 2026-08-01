const { getContext } = require('../core/async-context');
const { collector } = require('../core/collector');

/**
 * SuriLens NestJS Interceptor Adapter
 * Can be used as `@UseInterceptors(SuriLensNestInterceptor)` or globally in NestJS apps.
 */
class SuriLensNestInterceptor {
  intercept(context, next) {
    const traceCtx = getContext();
    const handlerName = context.getHandler() ? context.getHandler().name : 'NestHandler';
    const controllerName = context.getClass() ? context.getClass().name : 'NestController';

    if (traceCtx) {
      collector.transitionNode(traceCtx.traceId, `Nest: ${controllerName}#${handlerName}`);
    }

    return next.handle();
  }
}

module.exports = SuriLensNestInterceptor;
