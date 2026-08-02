/**
 * SuriLens — CanvasRenderer
 *
 * 60fps Canvas 2D renderer for moving packet objects.
 *
 * Each HTTP request spawns a "request packet" (method-colored orb) that
 * physically travels along the SVG Bezier edges from node to node.
 * When the response returns, a green "response packet" travels the path
 * in reverse.
 *
 * Design:
 *   - Outer radial glow (large, semi-transparent)
 *   - Core orb (small bright center)
 *   - Trailing motion blur (shrinking dots behind the packet)
 *   - Pulsing ring (while the packet is actively moving)
 *   - Floating payload badge label (METHOD /route)
 *   - 📦 carrier icon above the badge
 */

/* Polyfill for ctx.roundRect in older browsers */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

class CanvasRenderer {
  constructor(canvasEl, nodeManager, svgEdges) {
    this.canvas      = canvasEl;
    this.ctx         = canvasEl.getContext('2d');
    this.nodeManager = nodeManager;
    this.svgEdges    = svgEdges;

    /** @type {Map<string, PacketObject>} */
    this.packets = new Map();

    /** Canvas pan/zoom (kept in sync by app.js) */
    this.transform = { panX: 80, panY: 80, scale: 0.85 };

    /** Callback: (packet) => void — fired when user clicks a packet */
    this.onPacketClick = null;

    this._initCanvas();
    this._bindEvents();
    this._startRenderLoop();
  }

  /* ────────────────────────────────────────────────────────
     Canvas sizing
  ──────────────────────────────────────────────────────── */
  _initCanvas() {
    const resize = () => {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = parent.clientWidth;
      const h   = parent.clientHeight;
      this.canvas.width  = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width  = `${w}px`;
      this.canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener('resize', resize);
  }

  /* ────────────────────────────────────────────────────────
     Public: Create a new packet object
  ──────────────────────────────────────────────────────── */
  /**
   * @param {{ id, traceId, type, method, color, route, payload }} opts
   * @returns {PacketObject}
   */
  createPacket(opts) {
    const packet = {
      id:      opts.id,
      traceId: opts.traceId,
      type:    opts.type || 'request',
      method:  (opts.method || 'GET').toUpperCase(),
      color:   opts.color || '#3b82f6',
      route:   opts.route || '/',
      payload: opts.payload || {},

      // Position state
      x: null,
      y: null,
      fromNode: null,
      toNode:   null,

      // Animation state
      progress:    0,
      animStart:   0,
      animDuration: 600,
      animating:   false,

      // Queue of pending { fromNode, toNode, duration }
      queue: [],

      trail:  [],
      alpha:  1.0,
      done:   false,
      fadeOut: false,
    };

    this.packets.set(packet.id, packet);
    return packet;
  }

  getPacket(id) {
    return this.packets.get(id) || null;
  }

  /* ────────────────────────────────────────────────────────
     Public: Animate packet from one node to another
  ──────────────────────────────────────────────────────── */
  /**
   * Queues a segment animation from fromNode → toNode.
   * If the queue grows (backend is fast), segments play faster to catch up.
   */
  setPacketDestination(packet, fromNode, toNode, durationMs = 600) {
    if (!packet) return;
    packet.queue.push({ fromNode, toNode, duration: durationMs });
    if (!packet.animating) {
      this._advanceQueue(packet);
    }
  }

  /**
   * Queues an entire sequence of nodes (used for response return path).
   * After the last segment, the packet fades out.
   */
  setPacketSequencePath(packet, sequence, durationMs = 450) {
    if (!packet || sequence.length < 2) return;
    for (let i = 0; i < sequence.length - 1; i++) {
      packet.queue.push({ fromNode: sequence[i], toNode: sequence[i + 1], duration: durationMs });
    }
    packet.queue.push({ fadeOut: true });
    if (!packet.animating) {
      this._advanceQueue(packet);
    }
  }

  clearAllPackets() {
    this.packets.clear();
  }

  setTransform(t) {
    this.transform = { ...this.transform, ...t };
  }

  /* ────────────────────────────────────────────────────────
     Private: Animation queue management
  ──────────────────────────────────────────────────────── */
  _advanceQueue(packet) {
    if (packet.queue.length === 0) {
      packet.animating = false;
      return;
    }

    const next = packet.queue.shift();

    if (next.fadeOut) {
      packet.animating = false;
      packet.fadeOut   = true;
      return;
    }

    // Catch-up: if more segments are pending, use faster animation
    const catchUp = packet.queue.length >= 2;
    const dur = catchUp
      ? Math.min(next.duration, 200)
      : next.duration;

    packet.fromNode   = next.fromNode;
    packet.toNode     = next.toNode;
    packet.progress   = 0;
    packet.animStart  = performance.now();
    packet.animDuration = dur;
    packet.animating  = true;
  }

  /* ────────────────────────────────────────────────────────
     Private: Per-frame update
  ──────────────────────────────────────────────────────── */
  _updatePacket(packet, now) {
    if (packet.done) return;

    // Fade-out phase
    if (packet.fadeOut) {
      packet.alpha = Math.max(0, packet.alpha - 0.04);
      if (packet.alpha <= 0) packet.done = true;
      return;
    }

    if (!packet.animating) return;

    const elapsed  = now - packet.animStart;
    const rawT     = Math.min(1, elapsed / packet.animDuration);

    // Ease in-out cubic
    const t = rawT < 0.5
      ? 4 * rawT * rawT * rawT
      : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

    // Sample position along the Bezier path stored in SVG
    const pt = this.svgEdges.getBezierPoint(packet.fromNode, packet.toNode, t);
    if (pt) {
      packet.trail.unshift({ x: pt.x, y: pt.y });
      if (packet.trail.length > 14) packet.trail.pop();
      packet.x = pt.x;
      packet.y = pt.y;
    }

    if (rawT >= 1) {
      packet.animating = false;
      // Kick off next segment on the next animation frame
      setTimeout(() => this._advanceQueue(packet), 0);
    }
  }

  /* ────────────────────────────────────────────────────────
     Private: Draw one packet
  ──────────────────────────────────────────────────────── */
  _drawPacket(packet, now) {
    if (!packet.x || !packet.y || packet.alpha <= 0) return;

    const { ctx } = this;
    const { x, y, color, alpha, method, route, trail, animating } = packet;

    ctx.save();
    ctx.globalAlpha = alpha;

    // ── Trail (motion blur dots behind the packet) ──
    for (let i = trail.length - 1; i >= 1; i--) {
      const pt = trail[i];
      const a  = (1 - i / trail.length) * 0.45;
      const r  = Math.max(2, 10 - i * 0.7);
      ctx.globalAlpha = a * alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // ── Outer Glow ──
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 22);
    glow.addColorStop(0,    color + 'bb');
    glow.addColorStop(0.5,  color + '55');
    glow.addColorStop(1,    'transparent');
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // ── Core Orb ──
    const core = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.35, color);
    core.addColorStop(1,    color + 'bb');
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    // ── Pulsing Ring (while moving) ──
    if (animating) {
      const pulse = 0.25 + 0.25 * Math.sin(now / 160);
      ctx.globalAlpha = pulse * alpha;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    ctx.globalAlpha = alpha;

    // ── Payload Badge ──
    const label   = `${method} ${route.length > 16 ? route.slice(0, 14) + '…' : route}`;
    const badgeY  = y - 30;
    const padding = 6;

    ctx.font = `bold 8.5px 'JetBrains Mono', monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(label).width;
    const bw = tw + padding * 2;
    const bh = 14;

    // Badge background
    const bx = x - bw / 2;
    const by = badgeY - bh / 2;
    ctx.fillStyle = 'rgba(26, 26, 24, 0.9)';
    ctx.roundRect(bx, by, bw, bh, 3);
    ctx.fill();
    ctx.strokeStyle = color + 'aa';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#e8e4dd';
    ctx.fillText(label, x, badgeY);

    // 📦 Carrier Icon
    ctx.font = '10px sans-serif';
    ctx.fillText('📦', x, badgeY - 14);

    ctx.restore();
  }

  /* ────────────────────────────────────────────────────────
     Private: Main render loop
  ──────────────────────────────────────────────────────── */
  _startRenderLoop() {
    const loop = (now) => {
      const dpr    = window.devicePixelRatio || 1;
      const { panX, panY, scale } = this.transform;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.save();
      this.ctx.scale(dpr, dpr);
      this.ctx.translate(panX, panY);
      this.ctx.scale(scale, scale);

      for (const [id, packet] of this.packets) {
        if (packet.done) { this.packets.delete(id); continue; }
        this._updatePacket(packet, now);
        this._drawPacket(packet, now);
      }

      this.ctx.restore();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ────────────────────────────────────────────────────────
     Private: Click → packet selection
  ──────────────────────────────────────────────────────── */
  _bindEvents() {
    this.canvas.addEventListener('click', (e) => {
      if (!this.onPacketClick) return;
      const rect  = this.canvas.getBoundingClientRect();
      const { panX, panY, scale } = this.transform;
      const mx = (e.clientX - rect.left  - panX) / scale;
      const my = (e.clientY - rect.top   - panY) / scale;

      for (const packet of this.packets.values()) {
        if (!packet.x || !packet.y) continue;
        const dist = Math.hypot(packet.x - mx, packet.y - my);
        if (dist < 22) {
          this.onPacketClick(packet);
          return;
        }
      }
    });
  }
}

window.CanvasRenderer = CanvasRenderer;
