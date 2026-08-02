const http = require('node:http');
const https = require('node:https');
const Module = require('node:module');
const { getContext } = require('./async-context');
const { collector } = require('./collector');

let isInstrumented = false;

/**
 * Auto-instrument common protocols, database drivers, ORMs, and packages.
 * Traces actual runtime execution rather than relying on folder structure assumptions.
 */
function autoInstrument() {
  if (isInstrumented) return;
  isInstrumented = true;

  instrumentHttpAndHttps();
  instrumentFetchIfAvailable();
  instrumentModuleLoader();
  checkAlreadyLoadedModules();
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
        // Fallback
      }

      const isLocal = hostname.includes('localhost') || hostname.includes('127.0.0.1');
      const nodeName = isLocal ? 'Database' : `External API (${hostname})`;

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
        return await originalFetch(input, init);
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

/**
 * Module Loader Interceptor to patch ORMs, DB Drivers, Auth, and Caches when required.
 */
function instrumentModuleLoader() {
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function (id) {
    const exports = originalRequire.apply(this, arguments);
    return patchModuleIfTarget(id, exports);
  };
}

/**
 * Scans require.cache to patch modules loaded before SuriLens initialization.
 */
function checkAlreadyLoadedModules() {
  try {
    for (const id in require.cache) {
      if (require.cache[id] && require.cache[id].exports) {
        const modName = id.split(/node_modules[\/\\]/).pop();
        if (modName) patchModuleIfTarget(modName, require.cache[id].exports);
      }
    }
  } catch (_) {}
}

function patchModuleIfTarget(id, exports) {
  if (!exports || typeof exports !== 'object' && typeof exports !== 'function') return exports;
  const name = String(id).toLowerCase();

  if (name === 'mongoose' || name.endsWith('/mongoose')) patchMongoose(exports);
  else if (name === 'mongodb' || name.endsWith('/mongodb')) patchMongoDB(exports);
  else if (name.includes('@prisma/client') || name.includes('prisma')) patchPrisma(exports);
  else if (name === 'sequelize' || name.endsWith('/sequelize')) patchSequelize(exports);
  else if (name === 'mysql2' || name === 'mysql') patchMySQL(exports);
  else if (name === 'pg' || name.endsWith('/pg')) patchPostgres(exports);
  else if (name === 'redis' || name === 'ioredis') patchRedis(exports);
  else if (name === 'jsonwebtoken' || name.endsWith('/jsonwebtoken')) patchJWT(exports);
  else if (name === 'bcrypt' || name === 'bcryptjs') patchBcrypt(exports);

  return exports;
}

/* ── Instrumentation Wrappers ── */

function recordRuntimeCall(nodeName, metadata = {}) {
  const context = getContext();
  if (context) {
    collector.transitionNode(context.traceId, nodeName, metadata);
  }
}

function patchMongoose(mongoose) {
  if (!mongoose || mongoose.__suriLensPatched) return;
  mongoose.__suriLensPatched = true;

  if (mongoose.Query && mongoose.Query.prototype && typeof mongoose.Query.prototype.exec === 'function') {
    const origExec = mongoose.Query.prototype.exec;
    mongoose.Query.prototype.exec = function (...args) {
      const model = this.model?.modelName || this.constructor?.modelName || 'Model';
      const op = this.op || 'query';
      recordRuntimeCall(`MongoDB (${model}.${op})`, { model, op, type: 'mongoose' });
      return origExec.apply(this, args);
    };
  }
}

function patchMongoDB(mongodb) {
  if (!mongodb || mongodb.__suriLensPatched) return;
  mongodb.__suriLensPatched = true;

  if (mongodb.Collection && mongodb.Collection.prototype) {
    const proto = mongodb.Collection.prototype;
    ['findOne', 'find', 'insertOne', 'updateOne', 'deleteOne', 'aggregate'].forEach(op => {
      if (typeof proto[op] === 'function') {
        const orig = proto[op];
        proto[op] = function (...args) {
          const col = this.collectionName || 'Collection';
          recordRuntimeCall(`MongoDB (${col}.${op})`, { collection: col, op, type: 'mongodb_native' });
          return orig.apply(this, args);
        };
      }
    });
  }
}

function patchPrisma(prismaModule) {
  if (!prismaModule || prismaModule.__suriLensPatched) return;
  prismaModule.__suriLensPatched = true;

  const PrismaClient = prismaModule.PrismaClient;
  if (PrismaClient && PrismaClient.prototype) {
    const origRequest = PrismaClient.prototype._request;
    if (typeof origRequest === 'function') {
      PrismaClient.prototype._request = function (params) {
        const model = params?.model || 'Prisma';
        const action = params?.action || 'query';
        recordRuntimeCall(`Prisma (${model}.${action})`, { model, action, type: 'prisma' });
        return origRequest.apply(this, arguments);
      };
    }
  }
}

function patchSequelize(sequelizeModule) {
  if (!sequelizeModule || sequelizeModule.__suriLensPatched) return;
  sequelizeModule.__suriLensPatched = true;

  const Sequelize = sequelizeModule.Sequelize || sequelizeModule;
  if (Sequelize && Sequelize.prototype && typeof Sequelize.prototype.query === 'function') {
    const origQuery = Sequelize.prototype.query;
    Sequelize.prototype.query = function (sql, options) {
      const model = options?.model?.name || 'Query';
      recordRuntimeCall(`Sequelize (${model})`, { model, type: 'sequelize' });
      return origQuery.apply(this, arguments);
    };
  }
}

function patchMySQL(mysqlModule) {
  if (!mysqlModule || mysqlModule.__suriLensPatched) return;
  mysqlModule.__suriLensPatched = true;

  const connProto = (mysqlModule.Connection && mysqlModule.Connection.prototype) || mysqlModule.prototype;
  if (connProto && typeof connProto.query === 'function') {
    const origQuery = connProto.query;
    connProto.query = function (...args) {
      recordRuntimeCall('MySQL Query', { type: 'mysql' });
      return origQuery.apply(this, args);
    };
  }
}

function patchPostgres(pgModule) {
  if (!pgModule || pgModule.__suriLensPatched) return;
  pgModule.__suriLensPatched = true;

  const Client = pgModule.Client;
  if (Client && Client.prototype && typeof Client.prototype.query === 'function') {
    const origQuery = Client.prototype.query;
    Client.prototype.query = function (...args) {
      recordRuntimeCall('PostgreSQL Query', { type: 'pg' });
      return origQuery.apply(this, args);
    };
  }
}

function patchRedis(redisModule) {
  if (!redisModule || redisModule.__suriLensPatched) return;
  redisModule.__suriLensPatched = true;

  const proto = redisModule.RedisClient?.prototype || redisModule.prototype;
  if (proto && typeof proto.sendCommand === 'function') {
    const origSend = proto.sendCommand;
    proto.sendCommand = function (command, ...args) {
      const cmdName = (typeof command === 'string' ? command : command?.name || 'cmd').toUpperCase();
      recordRuntimeCall(`Redis (${cmdName})`, { command: cmdName, type: 'redis' });
      return origSend.apply(this, arguments);
    };
  }
}

function patchJWT(jwt) {
  if (!jwt || jwt.__suriLensPatched) return;
  jwt.__suriLensPatched = true;

  ['sign', 'verify'].forEach(op => {
    if (typeof jwt[op] === 'function') {
      const orig = jwt[op];
      jwt[op] = function (...args) {
        recordRuntimeCall(`JWT (${op})`, { op, type: 'jwt' });
        return orig.apply(this, args);
      };
    }
  });
}

function patchBcrypt(bcrypt) {
  if (!bcrypt || bcrypt.__suriLensPatched) return;
  bcrypt.__suriLensPatched = true;

  ['compare', 'hash', 'compareSync', 'hashSync'].forEach(op => {
    if (typeof bcrypt[op] === 'function') {
      const orig = bcrypt[op];
      bcrypt[op] = function (...args) {
        recordRuntimeCall(`Bcrypt (${op})`, { op, type: 'bcrypt' });
        return orig.apply(this, args);
      };
    }
  });
}

module.exports = {
  autoInstrument
};
