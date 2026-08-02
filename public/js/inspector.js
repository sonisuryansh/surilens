/**
 * SuriLens — Inspector
 *
 * Slide-in inspector panel that shows:
 *   • Packet payload (headers, body, query, response)
 *   • Node telemetry (state, duration, handler, DB query)
 *   • Full trace details (pipeline path, timing bars, payload diff)
 *   • Performance Intelligence warnings & flags
 *   • Distributed tracing correlation metadata
 */

class Inspector {
  constructor(panelEl, bodyEl, titleEl) {
    this.panel = panelEl;
    this.body  = bodyEl;
    this.title = titleEl;
    this.isOpen = false;
  }

  open() {
    this.panel.classList.add('open');
    this.panel.classList.remove('closed');
    const resizer = document.getElementById('resizer-inspector');
    if (resizer) resizer.classList.remove('hidden');
    this.isOpen = true;
  }

  close() {
    this.panel.classList.remove('open');
    this.panel.classList.add('closed');
    const resizer = document.getElementById('resizer-inspector');
    if (resizer) resizer.classList.add('hidden');
    this.isOpen = false;
  }

  showPacketPayload(packet) {
    this._setTitle(`📦 ${packet.method} ${this._short(packet.route, 20)}`);

    const { type, color, payload = {} } = packet;
    const isRequest  = type === 'request';
    const typeLabel  = isRequest ? '🔵 REQUEST PACKET' : '🟢 RESPONSE PACKET';

    let html = `
      <div class="insp-packet-header" style="border-color: ${color}">
        <span class="insp-packet-type">${typeLabel}</span>
        <span class="badge-method method-${packet.method}">${packet.method}</span>
        <span class="insp-route">${packet.route}</span>
      </div>
    `;

    if (payload.headers && Object.keys(payload.headers).length > 0) {
      html += this._section('📋 Request Headers', payload.headers);
    }
    if (payload.body !== null && payload.body !== undefined) {
      html += this._section('📤 Request Body', payload.body);
    }
    if (payload.query && Object.keys(payload.query).length > 0) {
      html += this._section('🔍 Query Params', payload.query);
    }
    if (payload.params && Object.keys(payload.params).length > 0) {
      html += this._section('📎 Route Params', payload.params);
    }
    if (payload.status !== undefined) {
      html += this._section('📥 Response', {
        'Status Code': payload.status,
        'Body':        payload.response || '—',
      });
    }
    if (!html.includes('insp-section')) {
      html += `<div class="insp-empty">No payload data captured for this packet</div>`;
    }

    this._setBody(html);
    this.open();
  }

  showNodeDetails(node, session) {
    this._setTitle(`${node.icon} ${node.label}`);

    let html = `
      <div class="insp-node-header">
        <span class="insp-node-icon">${node.icon}</span>
        <div>
          <div class="insp-node-name">${node.label}</div>
          <div class="insp-node-state state-${node.state}">${(node.state || 'idle').toUpperCase()}</div>
        </div>
      </div>
    `;

    if (session && session.steps) {
      const stepEvent = session.steps.find(s => s.activeNode === node.id);
      if (stepEvent) {
        const meta = stepEvent.step?.metadata || {};

        html += `
          <div class="insp-section">
            <div class="insp-section-title">⏱ Execution</div>
            ${this._kv('Stage', node.label)}
            ${this._kv('Elapsed at Entry', `${stepEvent.step?.elapsedMs ?? 0}ms`)}
          </div>
        `;

        if (meta.handler) {
          html += `
            <div class="insp-section">
              <div class="insp-section-title">🎯 Controller Handler</div>
              ${this._kv('Function', meta.handler)}
              ${meta.path ? this._kv('Route Path', meta.path) : ''}
            </div>
          `;
        }

        if (meta.query) {
          html += `
            <div class="insp-section">
              <div class="insp-section-title">🗄️ Database Query</div>
              <pre class="insp-code">${this._esc(meta.query)}</pre>
              ${meta.id ? this._kv('Query Param', meta.id) : ''}
            </div>
          `;
        }

        if (meta.hostname) {
          html += `
            <div class="insp-section">
              <div class="insp-section-title">🌐 External Host Target</div>
              ${this._kv('Host', meta.hostname)}
            </div>
          `;
        }
      }
    }

    if (session?.completedData?.timing) {
      const timing   = session.completedData.timing;
      const nodeKey  = node.id.toLowerCase();
      const duration = timing[nodeKey];
      if (duration !== undefined) {
        const total = timing.total || 1;
        const pct   = Math.round((duration / total) * 100);
        html += `
          <div class="insp-section">
            <div class="insp-section-title">📊 Stage Performance</div>
            <div class="timing-row">
              <span class="timing-stage">${node.label}</span>
              <div class="timing-bar-wrap">
                <div class="timing-bar" style="width:${pct}%; background: ${node.state === 'error' ? 'linear-gradient(90deg, #b95c50, #c87a70)' : 'linear-gradient(90deg, #d7c8ae, #556b5d)'}"></div>
              </div>
              <span class="timing-val">${duration}ms</span>
            </div>
            ${this._kv('Share of Total', `${pct}% of ${total}ms`)}
          </div>
        `;
      }
    }

    this._setBody(html);
    this.open();
  }

  showTraceDetails(session) {
    const method    = session.method || 'GET';
    const route     = session.route  || '/';
    const completed = session.completedData || {};
    const timing    = completed.timing || {};
    const isError   = session.status === 'error';
    const statusCode = completed.status || completed.statusCode || '—';

    this._setTitle(`${method} ${this._short(route, 22)}`);

    let html = `
      <div class="insp-trace-header ${isError ? 'error' : ''}">
        <span class="badge-method method-${method}">${method}</span>
        <span class="insp-route">${route}</span>
        <span class="insp-status ${isError ? 'error' : ''}">${statusCode}</span>
      </div>
    `;

    // ── Distributed Tracing Metadata ──
    html += `
      <div class="insp-section">
        <div class="insp-section-title">🔗 Distributed Trace Context</div>
        ${this._kv('Trace ID', session.id)}
        ${this._kv('Correlation ID', completed.correlationId || session.id)}
        ${completed.parentTraceId ? this._kv('Parent Trace ID', completed.parentTraceId) : ''}
      </div>
    `;

    // ── Performance Intelligence Warnings ──
    const flags = completed.performanceFlags || [];
    if (flags.length > 0) {
      const flagRows = flags.map(f => `<div style="color: #f59e0b; font-size: 11px; margin-top: 4px;">⚠️ [${f.type}] ${this._esc(f.message)}</div>`).join('');
      html += `
        <div class="insp-section" style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.08);">
          <div class="insp-section-title" style="color: #f59e0b;">⚡ Performance Intelligence</div>
          ${flagRows}
        </div>
      `;
    }

    // ── Pipeline Path ──
    const pipeline = session.visitedNodes || completed.execution || [];
    if (pipeline.length > 0) {
      const pipeHtml = pipeline.map((n, i) =>
        `<span class="pipe-node">${n}</span>${i < pipeline.length - 1 ? '<span class="pipe-arrow">→</span>' : ''}`
      ).join('');
      html += `
        <div class="insp-section">
          <div class="insp-section-title">📍 Execution Path (${pipeline.length} stages)</div>
          <div class="insp-pipeline">${pipeHtml}</div>
        </div>
      `;
    }

    // ── Stage Timing Bars ──
    if (timing.total) {
      const total    = timing.total || 1;
      const stages   = Object.entries(timing).filter(([k]) => k !== 'total');
      const barsHtml = stages.map(([k, v]) => {
        const pct = Math.min(100, Math.round((v / total) * 100));
        return `
          <div class="timing-row">
            <span class="timing-stage">${k}</span>
            <div class="timing-bar-wrap">
              <div class="timing-bar" style="width:${Math.max(2, pct)}%; background: ${isError ? 'linear-gradient(90deg, #b95c50, #c87a70)' : 'linear-gradient(90deg, #d7c8ae, #556b5d)'}"></div>
            </div>
            <span class="timing-val">${v}ms</span>
          </div>
        `;
      }).join('');

      html += `
        <div class="insp-section">
          <div class="insp-section-title">⏱ Stage Timing</div>
          ${barsHtml}
          <div class="timing-total">Total: ${total}ms</div>
        </div>
      `;
    }

    // ── Request Payload ──
    if (session.body || completed.body) {
      const body = session.body || completed.body;
      html += this._section('📤 Request Body', body);
    }

    // ── Response Payload ──
    if (completed.response || completed.responseBody) {
      html += this._section('📥 Response', completed.response || completed.responseBody);
    }

    // ── System Metrics ──
    if (completed.memory !== undefined) {
      html += `
        <div class="insp-section">
          <div class="insp-section-title">🖥 System Metrics</div>
          ${this._kv('Memory', `${completed.memory} MB`)}
          ${this._kv('CPU', `${completed.cpu || 0}%`)}
          ${this._kv('Client IP', completed.clientIP || session.clientIP || '::1')}
        </div>
      `;
    }

    // ── Stage Payload Diffs ──
    if (completed.stageDiffs && completed.stageDiffs.length > 0) {
      const diffsHtml = completed.stageDiffs
        .map(d => this._renderDiff(d))
        .filter(Boolean)
        .join('');

      if (diffsHtml) {
        html += `
          <div class="insp-section">
            <div class="insp-section-title">📊 Payload Transformations</div>
            ${diffsHtml}
          </div>
        `;
      }
    }

    // ── Error ──
    if (completed.error) {
      html += `
        <div class="insp-section error-section">
          <div class="insp-section-title">❌ Error</div>
          <pre class="insp-code error-code">${this._esc(completed.error.message || 'Unknown error')}</pre>
          ${completed.error.stack ? `<pre class="insp-code" style="margin-top:0.3rem;font-size:0.62rem;opacity:0.7">${this._esc(completed.error.stack)}</pre>` : ''}
        </div>
      `;
    }

    this._setBody(html);
    this.open();
  }

  _section(title, data) {
    if (data === null || data === undefined) return '';

    let content = '';
    if (typeof data === 'object' && !Array.isArray(data)) {
      content = Object.entries(data)
        .map(([k, v]) => this._kv(k, typeof v === 'object' ? JSON.stringify(v, null, 2) : v))
        .join('');
    } else {
      const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      content = `<pre class="insp-code">${this._esc(str)}</pre>`;
    }

    return `
      <div class="insp-section">
        <div class="insp-section-title">${title}</div>
        ${content}
      </div>
    `;
  }

  _kv(key, value) {
    const v = (value === null || value === undefined) ? '—' : String(value);
    return `
      <div class="insp-kv">
        <span class="insp-key">${this._esc(key)}</span>
        <span class="insp-val">${this._esc(v.length > 60 ? v.slice(0, 58) + '…' : v)}</span>
      </div>
    `;
  }

  _renderDiff(stageDiff) {
    const { fromStage, toStage, diff } = stageDiff;
    const added    = Object.entries(diff.added    || {});
    const modified = Object.entries(diff.modified || {});
    const removed  = Object.entries(diff.removed  || {});

    if (!added.length && !modified.length && !removed.length) return '';

    const rows = [
      ...added.map(([k, v])    => `<div class="diff-row added">+ ${k}: ${JSON.stringify(v)}</div>`),
      ...modified.map(([k, v]) => `<div class="diff-row modified">~ ${k}: ${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}</div>`),
      ...removed.map(([k, v])  => `<div class="diff-row removed">- ${k}: ${JSON.stringify(v)}</div>`),
    ].join('');

    return `
      <div class="diff-block">
        <div class="diff-title">${fromStage} → ${toStage}</div>
        ${rows}
      </div>
    `;
  }

  _setTitle(text) {
    if (this.title) this.title.textContent = text;
  }

  _setBody(html) {
    if (this.body) this.body.innerHTML = html;
  }

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _short(str, maxLen) {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
  }
}

window.Inspector = Inspector;
