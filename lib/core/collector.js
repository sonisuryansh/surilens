const EventEmitter = require('node:events');
const { eventStore } = require('./event-store');

class SuriCollector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxHistory = options.maxHistory || 100;
    this.traceTtlMs = options.traceTtlMs || 60000; // 60s Trace TTL
    this.maxPayloadSize = options.maxPayloadSize || 32768; // 32KB payload size cap
    this.activeTraces = new Map();
    this.completedTraces = [];
    this.eventStore = eventStore;

    this.stats = {
      totalRequests: 0,
      activeRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      errorRatePercent: 0,
      rps: 0,
      memoryMb: 0,
      cpuPercent: 0
    };

    this.requestTimesInWindow = [];
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();
    this.startMetricsTimer();
    this.startTraceTtlTimer();
  }

  startMetricsTimer() {
    const timer = setInterval(() => {
      const now = Date.now();

      this.requestTimesInWindow = this.requestTimesInWindow.filter(t => now - t <= 1000);
      this.stats.rps = this.requestTimesInWindow.length;

      const mem = process.memoryUsage();
      this.stats.memoryMb = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;

      const elapsedMs = now - this.lastCpuTime;
      if (elapsedMs > 0) {
        const cpuDiff = process.cpuUsage(this.lastCpuUsage);
        const totalCpuMs = (cpuDiff.user + cpuDiff.system) / 1000;
        this.stats.cpuPercent = Math.min(100, Math.round((totalCpuMs / elapsedMs) * 100));
      }
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = now;

      if (this.stats.totalRequests > 0) {
        this.stats.errorRatePercent = Math.round((this.stats.failedRequests / this.stats.totalRequests) * 1000) / 10;
      } else {
        this.stats.errorRatePercent = 0;
      }
    }, 1000);

    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  /**
   * Periodic sweep timer to clean up hanging active traces (prevents memory leaks).
   */
  startTraceTtlTimer() {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [traceId, trace] of this.activeTraces.entries()) {
        if (now - trace.startTime > this.traceTtlMs) {
          this.completeTrace(traceId, 504, new Error('Gateway Timeout / Trace TTL Expired'));
        }
      }
    }, 30000);

    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }

  /**
   * Truncates oversized payloads to prevent RAM exhaustion.
   */
  truncatePayload(data) {
    if (!data) return data;
    try {
      const str = JSON.stringify(data);
      if (str.length > this.maxPayloadSize) {
        return { _truncated: true, _originalSize: str.length, summary: str.substring(0, 512) + '...' };
      }
    } catch (_) {}
    return data;
  }

  /**
   * Evaluates performance flags (Slow route, high memory, high CPU, heavy payload).
   */
  detectBottlenecks(trace) {
    const flags = [];
    if (trace.responseTime > 500) flags.push({ type: 'SLOW_ROUTE', message: `Route response time ${trace.responseTime}ms exceeds 500ms threshold` });
    if (this.stats.memoryMb > 300) flags.push({ type: 'HIGH_MEMORY', message: `System heap usage is high: ${this.stats.memoryMb}MB` });
    if (this.stats.cpuPercent > 80) flags.push({ type: 'HIGH_CPU', message: `System CPU load is high: ${this.stats.cpuPercent}%` });

    if (trace.steps) {
      const slowStep = trace.steps.find(s => s.elapsedMs > 200);
      if (slowStep) {
        flags.push({ type: 'SLOW_STEP', message: `Step '${slowStep.node}' took ${slowStep.elapsedMs}ms` });
      }
    }

    return flags;
  }

  startTrace(traceContext) {
    const now = Date.now();
    this.requestTimesInWindow.push(now);

    const sanitizedBody = this.truncatePayload(traceContext.body);

    const trace = {
      ...traceContext,
      activeNode: 'Express',
      execution: ['Express'],
      steps: [
        { node: 'Express', timestamp: now, elapsedMs: 0 }
      ],
      logs: [],
      stagePayloads: {
        Client: sanitizedBody || null
      },
      performanceFlags: []
    };

    this.activeTraces.set(trace.traceId, trace);
    this.stats.totalRequests++;
    this.stats.activeRequests = this.activeTraces.size;

    // Broadcast trace_start with sanitized request context
    this.emit('trace_start', {
      traceId: trace.traceId,
      parentTraceId: trace.parentTraceId,
      correlationId: trace.correlationId,
      method: trace.method,
      url: trace.url,
      route: trace.route,
      startTime: trace.startTime,
      clientIP: trace.clientIP,
      headers: this.eventStore.maskSensitiveData(trace.headers || {}),
      body: sanitizedBody,
      query: trace.query || {},
      params: trace.params || {},
      activeNode: 'Express'
    });

    return trace;
  }

  transitionNode(traceId, targetNode, metadata = {}) {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    const now = Date.now();
    const prevNode = trace.activeNode;
    trace.activeNode = targetNode;

    if (!trace.execution.includes(targetNode)) {
      trace.execution.push(targetNode);
    }

    const elapsedMs = Math.max(0, now - trace.startTime);

    const stepInfo = {
      node: targetNode,
      fromNode: prevNode,
      timestamp: now,
      elapsedMs,
      metadata
    };

    trace.steps.push(stepInfo);

    if (!trace.stagePayloads[targetNode]) {
      trace.stagePayloads[targetNode] = this.truncatePayload(trace.body || null);
    }

    this.emit('node_active', {
      traceId,
      activeNode: targetNode,
      prevNode,
      step: stepInfo,
      requestContext: {
        method: trace.method,
        route: trace.route,
        clientIP: trace.clientIP,
        headers: this.eventStore.maskSensitiveData(trace.headers),
        body: this.truncatePayload(trace.body),
        query: trace.query,
        params: trace.params
      },
      stats: { ...this.stats }
    });
  }

  removeNodeStage(traceId, nodeName, metadata = {}) {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.execution = trace.execution.filter(n => n !== nodeName);
      if (trace.activeNode === nodeName) {
        trace.activeNode = trace.execution.at(-1) || 'Express';
      }
    }
    this.emit('node_remove', {
      traceId,
      nodeName,
      timestamp: Date.now(),
      metadata,
      stats: { ...this.stats }
    });
  }

  logMessage(traceId, message) {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.logs.push(message);
    }
  }

  completeTrace(traceId, statusCode = 200, error = null, responseBody = null) {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    const now = Date.now();
    const duration = now - trace.startTime;

    trace.status = (error || statusCode >= 400) ? 'failed' : 'completed';
    trace.statusCode = statusCode;
    trace.responseTime = duration;
    trace.endTime = now;
    trace.error = error ? { message: error.message, stack: error.stack } : null;
    trace.responseBody = this.truncatePayload(responseBody);

    if (!trace.execution.includes('Response')) {
      trace.execution.push('Response');
    }

    trace.performanceFlags = this.detectBottlenecks(trace);

    this.activeTraces.delete(traceId);
    this.stats.activeRequests = this.activeTraces.size;
    this.stats.completedRequests++;
    if (error || statusCode >= 400) {
      this.stats.failedRequests++;
    }

    const n = this.stats.completedRequests;
    this.stats.avgResponseTime = Math.round(
      ((this.stats.avgResponseTime * (n - 1)) + duration) / n
    );

    const formattedEvent = this.eventStore.addEvent({
      ...trace,
      response: trace.responseBody,
      memory: this.stats.memoryMb,
      cpu: this.stats.cpuPercent
    });

    this.completedTraces.unshift(formattedEvent);
    if (this.completedTraces.length > this.maxHistory) {
      this.completedTraces.pop();
    }

    this.emit('trace_complete', formattedEvent);
  }

  getSnapshot() {
    return {
      stats: { ...this.stats },
      activeTraces: Array.from(this.activeTraces.values()),
      recentTraces: this.completedTraces.slice(0, 50)
    };
  }
}

const collector = new SuriCollector();

module.exports = {
  collector,
  SuriCollector
};
