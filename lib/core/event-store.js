const fs = require('node:fs');
const path = require('node:path');

class EventStore {
  constructor(options = {}) {
    this.events = new Map();
    this.maxEvents = options.maxEvents || 100;
    this.enableFileStore = options.enableFileStore !== false;
    this.eventsDir = options.eventsDir || path.join(process.cwd(), 'events');

    if (this.enableFileStore) {
      this.ensureEventsDir();
    }
  }

  ensureEventsDir() {
    try {
      if (!fs.existsSync(this.eventsDir)) {
        fs.mkdirSync(this.eventsDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[SuriLens] Warning: Could not create events directory:', err.message);
    }
  }

  /**
   * Recursively masks sensitive fields (passwords, secrets, tokens, API keys).
   */
  maskSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    const sensitiveKeys = [
      'password', 'pass', 'secret', 'token', 'authorization',
      'auth', 'apikey', 'privatekey', 'cookie', 'bearer',
      'access_token', 'id_token', 'ssn', 'card'
    ];
    const sanitized = {};

    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(k => lowerKey.includes(k));

      if (isSensitive) {
        sanitized[key] = '********';
      } else if (val && typeof val === 'object') {
        sanitized[key] = this.maskSensitiveData(val);
      } else {
        sanitized[key] = val;
      }
    }

    return sanitized;
  }

  /**
   * Computes Git-style JSON differences between two stage payloads.
   */
  computePayloadDiff(beforeObj = {}, afterObj = {}) {
    const diff = { added: {}, modified: {}, removed: {} };
    if (typeof beforeObj !== 'object' || beforeObj === null) beforeObj = { _val: beforeObj };
    if (typeof afterObj !== 'object' || afterObj === null) afterObj = { _val: afterObj };

    const beforeKeys = Object.keys(beforeObj);
    const afterKeys = Object.keys(afterObj);

    // Added & Modified fields
    afterKeys.forEach(k => {
      if (!(k in beforeObj)) {
        diff.added[k] = afterObj[k];
      } else if (JSON.stringify(beforeObj[k]) !== JSON.stringify(afterObj[k])) {
        diff.modified[k] = { from: beforeObj[k], to: afterObj[k] };
      }
    });

    // Removed fields
    beforeKeys.forEach(k => {
      if (!(k in afterObj)) {
        diff.removed[k] = beforeObj[k];
      }
    });

    return diff;
  }

  addEvent(eventData) {
    const formattedEvent = this.formatExecutionEvent(eventData);
    this.events.set(formattedEvent.id, formattedEvent);

    if (this.events.size > this.maxEvents) {
      const firstKey = this.events.keys().next().value;
      this.events.delete(firstKey);
    }

    if (this.enableFileStore) {
      this.persistEventFilesAsync(formattedEvent);
    }

    return formattedEvent;
  }

  formatExecutionEvent(data) {
    const id = data.traceId || data.id || `req_${Date.now()}`;
    const timestamp = data.timestamp || new Date().toISOString();
    const method = (data.method || 'GET').toUpperCase();
    const route = data.route || data.url || '/';
    const status = data.statusCode || data.status || 200;
    const execution = data.execution || (data.steps ? data.steps.map(s => s.node) : ['Express', 'Response']);
    const timing = data.timing || this.computeTimingFromSteps(data.steps, data.responseTime);
    const logs = data.logs || [];
    const memory = data.memory || 0;
    const cpu = data.cpu || 0;

    // Mask sensitive payloads
    const sanitizedHeaders = this.maskSensitiveData(data.headers || {});
    const sanitizedBody = this.maskSensitiveData(data.body || null);
    const sanitizedResponse = this.maskSensitiveData(data.response || null);
    const stagePayloads = this.maskSensitiveData(data.stagePayloads || { Client: sanitizedBody });

    // Compute stage-by-stage payload diffs
    const stageDiffs = [];
    const stages = Object.keys(stagePayloads);
    for (let i = 0; i < stages.length - 1; i++) {
      const s1 = stages[i];
      const s2 = stages[i + 1];
      const diff = this.computePayloadDiff(stagePayloads[s1], stagePayloads[s2]);
      stageDiffs.push({ fromStage: s1, toStage: s2, diff });
    }

    const eventObj = {
      id,
      parentTraceId: data.parentTraceId || null,
      correlationId: data.correlationId || id,
      method,
      route,
      status,
      timestamp,
      clientIP: data.clientIP || '::1',
      headers: sanitizedHeaders,
      body: sanitizedBody,
      response: sanitizedResponse,
      execution,
      steps: data.steps || [],
      stagePayloads,
      stageDiffs,
      logs,
      timing,
      memory,
      cpu,
      performanceFlags: data.performanceFlags || [],
      error: data.error || null
    };

    eventObj.markdown = this.generateMarkdownReport(eventObj);
    return eventObj;
  }

  computeTimingFromSteps(steps = [], totalLatency = 0) {
    const timingObj = {};
    if (!steps || steps.length === 0) {
      timingObj.total = totalLatency || 0;
      return timingObj;
    }

    steps.forEach((s) => {
      const key = (s.node || 'stage').toLowerCase();
      timingObj[key] = s.elapsedMs || 0;
    });

    timingObj.total = totalLatency || (steps[steps.length - 1] ? steps[steps.length - 1].elapsedMs : 0);
    return timingObj;
  }

  generateMarkdownReport(event) {
    const statusText = event.status >= 400 ? `${event.status} Error` : `${event.status} OK`;

    const treeLines = event.execution.map((node) => {
      const isErr = event.error && node === event.execution[event.execution.length - 1];
      const icon = isErr ? '✖' : '✔';
      return `${icon} ${node}`;
    }).join('\n');

    let timingLines = '';
    if (event.timing) {
      timingLines = Object.entries(event.timing)
        .map(([k, v]) => `- **${k}**: ${v} ms`)
        .join('\n');
    }

    const logsText = (event.logs && event.logs.length > 0)
      ? event.logs.map(l => `- ${l}`).join('\n')
      : 'None';

    const errorText = event.error ? `\`\`\`\n${event.error.message || 'Error'}\n${event.error.stack || ''}\n\`\`\`` : 'None';

    return `# Request #${event.id}

**Method**: ${event.method}  
**Route**: ${event.route}  
**Status**: ${statusText}  
**Timestamp**: ${event.timestamp}  
**Client IP**: ${event.clientIP}  

## Execution Tree
\`\`\`text
${treeLines}
\`\`\`

## Data Payload Snapshot
\`\`\`json
${JSON.stringify(event.body || {}, null, 2)}
\`\`\`

## Response Payload Snapshot
\`\`\`json
${JSON.stringify(event.response || {}, null, 2)}
\`\`\`

## Performance Telemetry
- **Total Latency**: ${event.timing.total || 0} ms  
- **Memory**: ${event.memory} MB  
- **CPU**: ${event.cpu}%  

### Stage Breakdown
${timingLines}

## Backend Logs
${logsText}

## Errors
${errorText}
`;
  }

  /**
   * Asynchronous, non-blocking disk persistence.
   */
  async persistEventFilesAsync(event) {
    try {
      const jsonPath = path.join(this.eventsDir, `request-${event.id}.json`);
      const mdPath = path.join(this.eventsDir, `request-${event.id}.md`);

      await Promise.all([
        fs.promises.writeFile(jsonPath, JSON.stringify(event, null, 2), 'utf8'),
        fs.promises.writeFile(mdPath, event.markdown, 'utf8')
      ]);
    } catch (_) {
      // Non-blocking file write error handling
    }
  }

  /**
   * Advanced search and filtering engine.
   */
  searchEvents(filters = {}) {
    const all = this.getAllEvents();
    return all.filter((ev) => {
      if (filters.traceId && !ev.id.toLowerCase().includes(filters.traceId.toLowerCase())) return false;
      if (filters.method && ev.method.toUpperCase() !== filters.method.toUpperCase()) return false;
      if (filters.route && !ev.route.toLowerCase().includes(filters.route.toLowerCase())) return false;
      if (filters.status && Number(ev.status) !== Number(filters.status)) return false;
      if (filters.minLatency && (ev.timing.total || 0) < Number(filters.minLatency)) return false;
      if (filters.hasError !== undefined && Boolean(filters.hasError) !== Boolean(ev.error)) return false;
      if (filters.node && !ev.execution.some(n => n.toLowerCase().includes(filters.node.toLowerCase()))) return false;
      return true;
    });
  }

  getEvent(id) {
    return this.events.get(id) || null;
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }
}

const eventStore = new EventStore();

module.exports = {
  eventStore,
  EventStore
};
