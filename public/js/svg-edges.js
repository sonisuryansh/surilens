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
      <!-- Arrowhead markers -->
      <marker id="arr-gray"  markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,1 L8,4 L0,7 Z" fill="rgba(100,116,139,0.5)"/>
      </marker>
      <marker id="arr-blue"  markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,1 L8,4 L0,7 Z" fill="#3b82f6"/>
      </marker>
      <marker id="arr-green" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,1 L8,4 L0,7 Z" fill="#10b981"/>
      </marker>
      <marker id="arr-red"   markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
        <path d="M0,1 L8,4 L0,7 Z" fill="#ef4444"/>
      </marker>

      <!-- Glow filters -->
      <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
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
        // Glowing blue with white flowing dashes
        mainPath.setAttribute('stroke',       'rgba(59,130,246,0.95)');
        mainPath.setAttribute('stroke-width', '2');
        mainPath.setAttribute('marker-end',   'url(#arr-blue)');
        glowPath.setAttribute('stroke',       'rgba(59,130,246,0.5)');
        glowPath.setAttribute('stroke-width', '8');
        glowPath.setAttribute('filter',       'url(#glow-blue)');
        flowPath.setAttribute('stroke',       'rgba(255,255,255,0.85)');
        flowPath.setAttribute('stroke-width', '1.5');
        flowPath.setAttribute('marker-end',   'none');
        // CSS @keyframes edgeFlow: from { stroke-dashoffset: 40 } to { stroke-dashoffset: 0 }
        flowPath.style.animation = 'edgeFlow 0.55s linear infinite';
        break;

      case 'completed':
        mainPath.setAttribute('stroke',       'rgba(16,185,129,0.65)');
        mainPath.setAttribute('stroke-width', '1.5');
        mainPath.setAttribute('marker-end',   'url(#arr-green)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;

      case 'return':
        // Green flowing in reverse (response packet return path)
        mainPath.setAttribute('stroke',       'rgba(16,185,129,0.9)');
        mainPath.setAttribute('stroke-width', '2');
        mainPath.setAttribute('marker-end',   'url(#arr-green)');
        glowPath.setAttribute('stroke',       'rgba(16,185,129,0.4)');
        glowPath.setAttribute('stroke-width', '8');
        glowPath.setAttribute('filter',       'url(#glow-green)');
        flowPath.setAttribute('stroke',       'rgba(255,255,255,0.75)');
        flowPath.setAttribute('stroke-width', '1.5');
        flowPath.style.animation = 'edgeFlow 0.55s linear infinite reverse';
        break;

      case 'error':
        mainPath.setAttribute('stroke',       'rgba(239,68,68,0.85)');
        mainPath.setAttribute('stroke-width', '2');
        mainPath.setAttribute('marker-end',   'url(#arr-red)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;

      default: // idle
        mainPath.setAttribute('stroke',       'rgba(100,116,139,0.22)');
        mainPath.setAttribute('stroke-width', '1.5');
        mainPath.setAttribute('marker-end',   'url(#arr-gray)');
        glowPath.setAttribute('stroke',       'transparent');
        flowPath.setAttribute('stroke',       'transparent');
        break;
    }
  }
}

window.SVGEdgeRenderer = SVGEdgeRenderer;
