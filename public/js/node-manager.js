/**
 * SuriLens — NodeManager
 *
 * Manages DOM node cards on the canvas. Each card represents a
 * backend pipeline stage (Express, Router, Middleware, Controller…).
 *
 * Responsibilities:
 *   - Create / update node card DOM elements
 *   - Manage 5 visual states: idle | processing | success | warning | error
 *   - Live timer counter on the currently active node
 *   - Drag-to-reposition (signals svgEdges to redraw)
 *   - Click to open inspector
 */

class NodeManager {
  constructor(layerEl) {
    this.layer = layerEl;
    /** @type {Map<string, NodeDef>} */
    this.nodes = new Map();

    this.dragState = null;
    /** @type {function(NodeDef): void} */
    this.onNodeClick = null;
    /** @type {function(NodeDef): void} */
    this.onNodeDrag = null;

    this._initDefaultNodes();
    this._bindDragEvents();
  }

  /* ────────────────────────────────────────────────────────
     Default pipeline nodes — always present on the canvas
  ──────────────────────────────────────────────────────── */
  _initDefaultNodes() {
    const pipeline = [
      { id: 'Client',     label: 'Client',      icon: '💻', x: 60,   y: 165 },
      { id: 'Express',    label: 'Express',      icon: '⚡', x: 250,  y: 165 },
      { id: 'Router',     label: 'Router',       icon: '🔀', x: 440,  y: 165 },
      { id: 'Middleware', label: 'Middleware',   icon: '🛡️', x: 630,  y: 165 },
      { id: 'Controller', label: 'Controller',   icon: '🎯', x: 820,  y: 165 },
      { id: 'Service',    label: 'Service',      icon: '⚙️', x: 1010, y: 165 },
      { id: 'Database',   label: 'Database',     icon: '🗄️', x: 1200, y: 165 },
      { id: 'Response',   label: 'Response',     icon: '🚀', x: 1390, y: 165 },
    ];
    pipeline.forEach(n => this._createNode(n));
  }

  /* ────────────────────────────────────────────────────────
     Public: Add a node (returns existing if already present)
  ──────────────────────────────────────────────────────── */
  addNode({ id, label, icon, x, y }) {
    if (this.nodes.has(id)) return this.nodes.get(id);
    return this._createNode({ id, label, icon, x, y });
  }

  /**
   * Ensures a node with the given ID exists, creating it if necessary.
   * Used when backend emits a stage name we haven't seen before.
   */
  ensureNode(id) {
    if (this.nodes.has(id)) return this.nodes.get(id);

    const iconMap = {
      jwt: '🔐', auth: '🔐', authentication: '🔐',
      cache: '⚡', redis: '🔴', memcache: '⚡',
      mongo: '🍃', mongodb: '🍃', postgres: '🐘', mysql: '🐬',
      email: '📧', smtp: '📧', queue: '📋', kafka: '📋',
      logger: '📝', errormiddleware: '⚠️', error: '❌',
      validator: '✅', validation: '✅',
    };
    const icon = iconMap[id.toLowerCase()] || '⚙️';

    // Position to the right of the last known node
    const lastNode = [...this.nodes.values()].at(-1);
    const x = lastNode ? lastNode.x + 190 : 60;
    const y = 165;

    return this._createNode({ id, label: id, icon, x, y });
  }

  /* ────────────────────────────────────────────────────────
     Node State Management
  ──────────────────────────────────────────────────────── */
  /**
   * @param {string} id
   * @param {'idle'|'processing'|'success'|'warning'|'error'} state
   * @param {number|null} durationMs  — displayed in timer badge when state is done
   */
  setNodeState(id, state, durationMs = null) {
    const node = this.nodes.get(id);
    if (!node || !node.el) return;

    node.state = state;

    // CSS class drives the visual transition
    node.el.className = `node-card state-${state}`;

    const statusEl = node.el.querySelector('.node-status');
    const timerEl  = node.el.querySelector('.node-timer');

    const statusLabels = {
      idle: 'Idle',
      processing: 'Processing…',
      success: '✔ Complete',
      warning: '⚠ Warning',
      error: '✖ Error',
    };
    if (statusEl) statusEl.textContent = statusLabels[state] || state;

    if (state === 'processing') {
      this._startTimer(node, timerEl);
    } else {
      this._stopTimer(node);
      if (timerEl) {
        if (durationMs !== null) {
          timerEl.textContent = `${durationMs}ms`;
        } else if (node.timerStart) {
          timerEl.textContent = `${Date.now() - node.timerStart}ms`;
          node.timerStart = null;
        }
      }
    }
  }

  /** Reset all nodes to idle (used when entering replay mode) */
  resetAllNodes() {
    this.nodes.forEach(node => {
      this._stopTimer(node);
      if (node.el) {
        node.el.className = 'node-card state-idle';
        const statusEl = node.el.querySelector('.node-status');
        const timerEl  = node.el.querySelector('.node-timer');
        if (statusEl) statusEl.textContent = 'Idle';
        if (timerEl)  timerEl.textContent  = '—';
        node.state = 'idle';
        node.timerStart = null;
      }
    });
  }

  /**
   * Animates and removes a node card from the canvas.
   */
  removeNode(id) {
    const node = this.nodes.get(id);
    if (!node) return;
    this._stopTimer(node);
    if (node.el) {
      node.el.classList.add('node-deleting');
      setTimeout(() => {
        if (node.el && node.el.parentNode) node.el.remove();
        this.nodes.delete(id);
      }, 420);
    } else {
      this.nodes.delete(id);
    }
  }

  /* ────────────────────────────────────────────────────────
     Port coordinates (used by SVGEdgeRenderer & CanvasRenderer)
  ──────────────────────────────────────────────────────── */
  getOutputPort(id) {
    const n = this.nodes.get(id);
    if (!n) return null;
    return { x: n.x + n.width, y: n.y + n.height / 2 };
  }

  getInputPort(id) {
    const n = this.nodes.get(id);
    if (!n) return null;
    return { x: n.x, y: n.y + n.height / 2 };
  }

  getCenter(id) {
    const n = this.nodes.get(id);
    if (!n) return null;
    return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
  }

  /* ────────────────────────────────────────────────────────
     Private Helpers
  ──────────────────────────────────────────────────────── */
  _createNode({ id, label, icon, x, y }) {
    const node = {
      id,
      label: label || id,
      icon:  icon  || '⚙️',
      x:     x !== undefined ? x : 60 + this.nodes.size * 190,
      y:     y !== undefined ? y : 165,
      width: 130,
      height: 70,
      state: 'idle',
      timerStart: null,
      timerInterval: null,
      el: null,
    };

    this.nodes.set(id, node);
    node.el = this._buildDOMElement(node);
    this.layer.appendChild(node.el);
    return node;
  }

  _buildDOMElement(node) {
    const el = document.createElement('div');
    el.className = 'node-card state-idle';
    el.id        = `node-${node.id}`;
    el.style.left = `${node.x}px`;
    el.style.top  = `${node.y}px`;

    el.innerHTML = `
      <div class="node-glow-ring"></div>
      <div class="node-inner">
        <div class="node-top">
          <span class="node-icon-badge">${node.icon}</span>
          <span class="node-timer">—</span>
        </div>
        <div class="node-label">${node.label}</div>
        <div class="node-status">Idle</div>
      </div>
      <div class="node-port-in"  title="Input port"></div>
      <div class="node-port-out" title="Output port"></div>
      <div class="node-drag-handle" data-nodeid="${node.id}" title="Drag to reposition">⠿</div>
    `;

    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('node-drag-handle')) return;
      if (this.onNodeClick) this.onNodeClick(node);
    });

    return el;
  }

  _startTimer(node, timerEl) {
    this._stopTimer(node);
    node.timerStart = Date.now();
    if (!timerEl) return;
    timerEl.textContent = '0ms';
    node.timerInterval = setInterval(() => {
      if (node.timerStart) {
        timerEl.textContent = `${Date.now() - node.timerStart}ms`;
      }
    }, 30);
  }

  _stopTimer(node) {
    if (node.timerInterval) {
      clearInterval(node.timerInterval);
      node.timerInterval = null;
    }
  }

  /* ────────────────────────────────────────────────────────
     Drag-to-reposition (mousedown on .node-drag-handle)
  ──────────────────────────────────────────────────────── */
  _bindDragEvents() {
    this.layer.addEventListener('mousedown', (e) => {
      const handle = e.target.closest('.node-drag-handle');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();

      const nodeId = handle.dataset.nodeid;
      const node   = this.nodes.get(nodeId);
      if (!node) return;

      this.dragState = {
        node,
        startX: e.clientX,
        startY: e.clientY,
        origX:  node.x,
        origY:  node.y,
      };
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.dragState) return;
      const { node, startX, startY, origX, origY } = this.dragState;

      // Account for canvas pan/zoom passed in from app.js
      const scale = this._currentScale || 1;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;

      node.x = Math.round(origX + dx);
      node.y = Math.round(origY + dy);

      if (node.el) {
        node.el.style.left = `${node.x}px`;
        node.el.style.top  = `${node.y}px`;
      }

      if (this.onNodeDrag) this.onNodeDrag(node);
    });

    document.addEventListener('mouseup', () => {
      this.dragState = null;
    });
  }

  /** Called by app.js whenever the canvas scale changes */
  setCurrentScale(scale) {
    this._currentScale = scale;
  }
}

window.NodeManager = NodeManager;
