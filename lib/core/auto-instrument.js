const http = require('node:http');
const https = require('node:https');
const { getContext } = require('./async-context');
const { collector } = require('./collector');

let isInstrumented = false;

/**
 * Auto-instrument common protocols and packages loaded in the process.
 */
function autoInstrument() {
  if (isInstrumented) return;
  isInstrumented = true;

  instrumentHttpAndHttps();
  instrumentFetchIfAvailable();
}

/**
 * Instruments outbound HTTP and HTTPS requests.
 * Extracts target hostname for external API nodes & propagates W3C traceparent headers.
 */
function instrumentHttpAndHttps() {
  [http, https].forEach((mod) => {
    if (!mod || mod.__suriLensInstrumented) return;
    mod.__suriLensInstrumented = true;

    const originalRequest = mod.request;
    mod.request = function (...args) {
      const context = getContext();
      let hostname = 'External API';

      try {
        if (typeof args[0] === 'string') {
          const parsed = new URL(args[0]);
          hostname = parsed.hostname;
        } else if (args[0] && typeof args[0] === 'object') {
          hostname = args[0].hostname || args[0].host || 'External API';
        }
      } catch (_) {
        // Fallback hostname
      }

      const nodeName = hostname.includes('localhost') || hostname.includes('127.0.0.1')
        ? 'Database'
        : `External API (${hostname})`;

      if (context) {
        // Inject W3C Trace Context headers for distributed tracing
        const headers = (typeof args[0] === 'object' && args[0].headers) ? args[0].headers : {};
        if (headers) {
          headers['traceparent'] = `00-${context.traceId}-0000000000000001-01`;
          headers['x-correlation-id'] = context.correlationId || context.traceId;
        }

        collector.transitionNode(context.traceId, nodeName, {
          type: 'http_outbound',
          hostname
        });
      }

      const req = originalRequest.apply(this, args);
      req.on('response', (res) => {
        if (context && context.activeNode === nodeName) {
          collector.transitionNode(context.traceId, 'Service', {
            statusCode: res.statusCode
          });
        }
      });

      return req;
    };
  });
}

/**
 * Instruments native global fetch if available (Node 18+).
 */
function instrumentFetchIfAvailable() {
  if (typeof globalThis.fetch === 'function' && !globalThis.fetch.__suriLensInstrumented) {
    const originalFetch = globalThis.fetch;
    const instrumentedFetch = async function (input, init = {}) {
      const context = getContext();
      let hostname = 'External API';

      try {
        const urlStr = typeof input === 'string' ? input : (input.url || String(input));
        const parsed = new URL(urlStr);
        hostname = parsed.hostname;
      } catch (_) {}

      const nodeName = `External API (${hostname})`;

      if (context) {
        init.headers = init.headers || {};
        if (init.headers instanceof Headers) {
          init.headers.set('traceparent', `00-${context.traceId}-0000000000000001-01`);
          init.headers.set('x-correlation-id', context.correlationId || context.traceId);
        } else if (typeof init.headers === 'object') {
          init.headers['traceparent'] = `00-${context.traceId}-0000000000000001-01`;
          init.headers['x-correlation-id'] = context.correlationId || context.traceId;
        }
        collector.transitionNode(context.traceId, nodeName, { hostname });
      }

      try {
        const res = await originalFetch(input, init);
        if (context && context.activeNode === nodeName) {
          collector.transitionNode(context.traceId, 'Service', { statusCode: res.status });
        }
        return res;
      } catch (err) {
        if (context) {
          collector.logMessage(context.traceId, `[Fetch Error @ ${hostname}] ${err.message}`);
        }
        throw err;
      }
    };

    instrumentedFetch.__suriLensInstrumented = true;
    globalThis.fetch = instrumentedFetch;
  }
}

module.exports = {
  autoInstrument
};
