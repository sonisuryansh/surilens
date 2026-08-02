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

    this._bindDragEvents();
  }

  /* ────────────────────────────────────────────────────────
     Public: Add a node (returns existing if already present)
  ──────────────────────────────────────────────────────── */
  addNode({ id, label, icon, x, y }) {
    if (this.nodes.has(id)) return this.nodes.get(id);
    return this._createNode({ id, label, icon, x, y });
  }

  /**
   * Ensures a node with the given ID exists, creating it 100% on-demand from runtime events.
   * Dynamically calculates canvas position along the runtime execution chain.
   */
  ensureNode(id) {
    if (this.nodes.has(id)) return this.nodes.get(id);

    const lower = id.toLowerCase();
    let icon = '⚙️';
    if (lower.includes('mongo')) icon = '🍃';
    else if (lower.includes('prisma')) icon = '💎';
    else if (lower.includes('sequelize') || lower.includes('postgres') || lower.includes('mysql') || lower.includes('db') || lower.includes('database')) icon = '🗄️';
    else if (lower.includes('redis') || lower.includes('cache')) icon = '🔴';
    else if (lower.includes('jwt') || lower.includes('auth') || lower.includes('bcrypt') || lower.includes('crypto')) icon = '🔐';
    else if (lower.includes('external') || lower.includes('axios') || lower.includes('fetch') || lower.includes('api')) icon = '🌐';
    else if (lower.includes('queue') || lower.includes('kafka')) icon = '📋';
    else if (lower.includes('express')) icon = '⚡';
    else if (lower.includes('router')) icon = '🔀';
    else if (lower.includes('middleware')) icon = '🛡️';
    else if (lower === 'client') icon = '💻';
    else if (lower === 'response') icon = '🚀';

    // Position dynamically based on current node count
    const nodeCount = this.nodes.size;
    const x = 60 + (nodeCount * 190);
    const y = 165;

    return this._createNode({ id, label: id, icon, x, y });
  }

  getCategoryClass(id) {
    const lower = (id || '').toLowerCase();
    if (lower === 'client') return 'node-cat-client';
    if (lower.includes('express')) return 'node-cat-express';
    if (lower.includes('router')) return 'node-cat-router';
    if (lower.includes('middleware')) return 'node-cat-middleware';
    if (lower.includes('controller')) return 'node-cat-controller';
    if (lower.includes('service')) return 'node-cat-service';
    if (lower.includes('repository')) return 'node-cat-repository';
    if (lower.includes('mongo') || lower.includes('prisma') || lower.includes('sequelize') || lower.includes('postgres') || lower.includes('mysql') || lower.includes('db') || lower.includes('database')) return 'node-cat-database';
    if (lower.includes('redis') || lower.includes('cache')) return 'node-cat-redis';
    if (lower.includes('jwt')) return 'node-cat-jwt';
    if (lower.includes('bcrypt') || lower.includes('crypto')) return 'node-cat-bcrypt';
    if (lower.includes('external') || lower.includes('axios') || lower.includes('fetch') || lower.includes('api')) return 'node-cat-external';
    if (lower.includes('worker') || lower.includes('queue') || lower.includes('kafka')) return 'node-cat-worker';
    if (lower.includes('fs') || lower.includes('stream') || lower.includes('file')) return 'node-cat-filesystem';
    if (lower === 'response') return 'node-cat-response';
    return 'node-cat-function';
  }

  highlightFocusTree(activeId, connectedIds = []) {
    const focusSet = new Set([activeId, ...connectedIds]);
    this.nodes.forEach((n, id) => {
      if (!n.el) return;
      if (focusSet.has(id)) {
        n.el.classList.add('in-focus-tree');
        n.el.classList.remove('dimmed-by-focus');
      } else {
        n.el.classList.remove('in-focus-tree');
        n.el.classList.add('dimmed-by-focus');
      }
    });
  }

  clearFocusTree() {
    this.nodes.forEach(n => {
      if (n.el) {
        n.el.classList.remove('in-focus-tree', 'dimmed-by-focus');
      }
    });
  }

  highlightNodeChain(currentNodeId, prevNodeId, nextNodeId) {
    const chainSet = new Set([currentNodeId, prevNodeId, nextNodeId].filter(Boolean));
    this.nodes.forEach((n, id) => {
      if (!n.el) return;
      if (chainSet.has(id)) {
        n.el.classList.add('in-hover-chain');
        n.el.classList.remove('dimmed-by-hover');
      } else {
        n.el.classList.remove('in-hover-chain');
        n.el.classList.add('dimmed-by-hover');
      }
    });
  }

  clearHoverChain() {
    this.nodes.forEach((n) => {
      if (n.el) {
        n.el.classList.remove('in-hover-chain', 'dimmed-by-hover');
      }
    });
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

    // CSS class drives the visual transition and vibrant state glow
    const catClass = this.getCategoryClass(id);
    node.el.className = `node-card state-${state} ${catClass}`;

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
      width: 144,
      height: 74,
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
    const catClass = this.getCategoryClass(node.id);
    el.className = `node-card state-idle ${catClass}`;
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

    el.addEventListener('mouseenter', () => {
      if (this.onNodeHover) this.onNodeHover(node, true);
    });

    el.addEventListener('mouseleave', () => {
      if (this.onNodeHover) this.onNodeHover(node, false);
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
