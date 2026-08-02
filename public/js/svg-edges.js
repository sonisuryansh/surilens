/**
 * SuriLens — SVGEdgeRenderer
 *
 * Renders animated SVG edges between pipeline nodes.
 *
 * Each edge has three SVG <path> layers:
 *   1. glowPath  — wide blurred path for the outer glow effect
 *   2. mainPath  — the visible styled edge line with arrowhead
 *   3. flowPath  — dashed overlay that animates (stroke-dashoffset)
 *                  to simulate a moving stream of particles
 *
 * States:
 *   idle      → dim gray, no animation
 *   active    → blue glow + flowing white dashes in direction of travel
 *   completed → green, no animation
 *   return    → green flowing in reverse direction (response packet)
 */

class SVGEdgeRenderer {
  constructor(svgEl) {
    this.svg = svgEl;
    /** @type {Map<string, EdgeDef>} */
    this.edges = new Map(); // key: "from->to"

    this._initDefs();
  }

  /* ────────────────────────────────────────────────────────
     SVG <defs>: arrowhead markers + glow filters
  ──────────────────────────────────────────────────────── */
  _initDefs() {
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <!-- Directional Arrowhead Markers -->
      <marker id="arr-gray" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L7,3.5 L0,7 Z" fill="rgba(255, 255, 255, 0.25)"/>
      </marker>
      <marker id="arr-amber" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 Z" fill="#F59E0B"/>
      </marker>
      <marker id="arr-completed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 Z" fill="#D7C8AE"/>
      </marker>
      <marker id="arr-cyan" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 Z" fill="#06B6D4"/>
      </marker>
      <marker id="arr-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 Z" fill="#22C55E"/>
      </marker>
      <marker id="arr-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L8,4 L0,8 Z" fill="#EF4444"/>
      </marker>

      <!-- Soft Ambient Glow filters -->
      <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
    this.svg.appendChild(defs);
  }

  /* ────────────────────────────────────────────────────────
     Build edges for a pipeline sequence
  ──────────────────────────────────────────────────────── */
  buildEdgesForSequence(sequence, nodeManager) {
    // Clear all but <defs>
    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) this.svg.appendChild(defs);
    this.edges.clear();

    for (let i = 0; i < sequence.length - 1; i++) {
      this._addEdge(sequence[i], sequence[i + 1], nodeManager);
    }
  }

  /**
   * Ensures an edge exists between fromId and toId.
   * Called lazily when a new node appears in the pipeline.
   */
  ensureEdge(fromId, toId, nodeManager) {
    const key = `${fromId}->${toId}`;
    if (!this.edges.has(key)) {
      this._addEdge(fromId, toId, nodeManager);
    }
    return this.edges.get(key);
  }

  /* ────────────────────────────────────────────────────────
     Edge State Controls
  ──────────────────────────────────────────────────────── */
  setEdgeActive(fromId, toId) {
    const key = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge) return;
    edge.state = 'active';
    this._applyState(edge);
  }

  setEdgeCompleted(fromId, toId) {
    if (!fromId || !toId) return;
    const key = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge) return;
    edge.state = 'completed';
    this._applyState(edge);
  }

  setEdgeReturn(fromId, toId) {
    // For response packets traveling the reverse path: green flowing in reverse
    const key = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge) return;
    edge.state = 'return';
    this._applyState(edge);
  }

  setEdgeError(fromId, toId) {
    const key = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge) return;
    edge.state = 'error';
    this._applyState(edge);
  }

  resetAllEdges() {
    this.edges.forEach(edge => {
      edge.state = 'idle';
      this._applyState(edge);
    });
  }

  highlightEdgeChain(currentNodeId, prevNodeId, nextNodeId) {
    this.edges.forEach((edge) => {
      const isPrevEdge = prevNodeId && edge.fromId === prevNodeId && edge.toId === currentNodeId;
      const isNextEdge = nextNodeId && edge.fromId === currentNodeId && edge.toId === nextNodeId;

      if (isPrevEdge || isNextEdge) {
        edge.g.style.opacity = '1';
        edge.g.style.filter = 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.9))';
      } else {
        edge.g.style.opacity = '0.12';
        edge.g.style.filter = 'none';
      }
    });
  }

  clearHoverChain() {
    this.edges.forEach((edge) => {
      edge.g.style.opacity = '1';
      edge.g.style.filter = 'none';
    });
  }

  removeEdge(fromId, toId) {
    const key = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge) return;
    if (edge.g && edge.g.parentNode) edge.g.remove();
    this.edges.delete(key);
  }

  removeAllEdgesForNode(nodeId) {
    this.edges.forEach((edge, key) => {
      if (edge.fromId === nodeId || edge.toId === nodeId) {
        if (edge.g && edge.g.parentNode) edge.g.remove();
        this.edges.delete(key);
      }
    });
  }

  /* ────────────────────────────────────────────────────────
     Get Bezier point at t ∈ [0,1] for packet positioning
  ──────────────────────────────────────────────────────── */
  getBezierPoint(fromId, toId, t) {
    const key  = `${fromId}->${toId}`;
    const edge = this.edges.get(key);
    if (!edge || !edge.mainPath) return null;
    try {
      const len = edge.mainPath.getTotalLength();
      return edge.mainPath.getPointAtLength(t * len);
    } catch (e) { return null; }
  }

  /* ────────────────────────────────────────────────────────
     Redraw all edge paths (called when a node is dragged)
  ──────────────────────────────────────────────────────── */
  onNodeDrag(nodeManager) {
    this.edges.forEach(edge => this._updatePath(edge, nodeManager));
  }

  /* ────────────────────────────────────────────────────────
     Private
  ──────────────────────────────────────────────────────── */
  _addEdge(fromId, toId, nodeManager) {
    const key = `${fromId}->${toId}`;
    if (this.edges.has(key)) return this.edges.get(key);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const flowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    glowPath.setAttribute('fill', 'none');
    mainPath.setAttribute('fill', 'none');
    flowPath.setAttribute('fill', 'none');

    g.appendChild(glowPath);
    g.appendChild(mainPath);
    g.appendChild(flowPath);
    this.svg.appendChild(g);

    const edge = { fromId, toId, key, g, glowPath, mainPath, flowPath, state: 'idle' };
    this.edges.set(key, edge);

    this._updatePath(edge, nodeManager);
    this._applyState(edge);
    return edge;
  }

  _updatePath(edge, nodeManager) {
    if (!nodeManager) return;
    const n1 = nodeManager.nodes.get(edge.fromId);
    const n2 = nodeManager.nodes.get(edge.toId);
    if (!n1 || !n2) return;

    // Port connection points
    const p1x = n1.x + n1.width;
    const p1y = n1.y + n1.height / 2;
    const p2x = n2.x;
    const p2y = n2.y + n2.height / 2;

    // Bezier control offset
    const dx = Math.max(30, (p2x - p1x) * 0.45);
    const d  = `M${p1x},${p1y} C${p1x + dx},${p1y} ${p2x - dx},${p2y} ${p2x},${p2y}`;

    edge.glowPath.setAttribute('d', d);
    edge.mainPath.setAttribute('d', d);
    edge.flowPath.setAttribute('d', d);

    // Pre-compute stroke-dasharray based on path length for flowing animation
    try {
      const len = edge.mainPath.getTotalLength();
      // Short dashes that flow forward
      edge.flowPath.style.strokeDasharray  = '10 24';
      edge.flowPath.style.strokeDashoffset = '0';
    } catch (e) {}
  }

  _applyState(edge) {
    const { glowPath, mainPath, flowPath } = edge;

    // Reset
    glowPath.removeAttribute('filter');
    flowPath.style.animation = 'none';

    switch (edge.state) {

      case 'active':
        // Warm Beige active path with white/beige flowing dashes
        mainPath.setAttribute('stroke',       'rgba(215,200,174,0.95)');
        mainPath.setAttribute('stroke-width', '1.8');
        mainPath.setAttribute('marker-end',   'url(#arr-cyan)');
        glowPath.setAttribute('stroke',       'rgba(215,200,174,0.3)');
        glowPath.setAttribute('stroke-width', '6');
        glowPath.setAttribute('filter',       'url(#glow-cyan)');
        flowPath.setAttribute('stroke',       'rgba(255,255,255,0.8)');
        flowPath.setAttribute('stroke-width', '1.2');
        flowPath.setAttribute('marker-end',   'none');
        flowPath.style.animation = 'edgeFlow 0.65s linear infinite';
        break;

      case 'completed':
        mainPath.setAttribute('stroke',       'rgba(85,107,93,0.65)');
        mainPath.setAttribute('stroke-width', '1.2');
        mainPath.setAttribute('marker-end',   'url(#arr-green)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;

      case 'return':
        // Warm Beige flowing in reverse (response packet return path)
        mainPath.setAttribute('stroke',       'rgba(215,200,174,0.85)');
        mainPath.setAttribute('stroke-width', '1.8');
        mainPath.setAttribute('marker-end',   'url(#arr-cyan)');
        glowPath.setAttribute('stroke',       'rgba(215,200,174,0.25)');
        glowPath.setAttribute('stroke-width', '6');
        glowPath.setAttribute('filter',       'url(#glow-cyan)');
        flowPath.setAttribute('stroke',       'rgba(255,255,255,0.7)');
        flowPath.setAttribute('stroke-width', '1.2');
        flowPath.style.animation = 'edgeFlow 0.65s linear infinite reverse';
        break;

      case 'error':
        mainPath.setAttribute('stroke',       'rgba(185,92,80,0.85)');
        mainPath.setAttribute('stroke-width', '1.8');
        mainPath.setAttribute('marker-end',   'url(#arr-red)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;

      default: // idle
        mainPath.setAttribute('stroke',       'rgba(107,104,96,0.2)');
        mainPath.setAttribute('stroke-width', '1.2');
        mainPath.setAttribute('marker-end',   'url(#arr-gray)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;
    }
  }
}

window.SVGEdgeRenderer = SVGEdgeRenderer;
