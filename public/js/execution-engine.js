/**
 * SuriLens — ExecutionEngine
 *
 * The brain of the replay engine.
 *
 * LIVE MODE:
 *   Receives WebSocket events in real time as the backend processes each request:
 *     trace_start    → spawn request packet at Client, animate toward Express
 *     node_active    → advance packet to the next node with correct animation
 *     trace_complete → finalize session, spawn response return packet
 *
 * REPLAY MODE:
 *   Selects a completed TraceSession and plays back its recorded events
 *   at configurable speed (0.25x – 4x) with full play/pause/step controls.
 *
 * ONBOARDING DEMO MODE:
 *   Runs a isolated example trace when no real backend events have been received.
 *   Clears automatically the moment the first real backend event arrives.
 */

class TraceSession {
  constructor(data) {
    this.traceId  = data.traceId;
    this.isDemo   = Boolean(data.isDemo);
    this.method   = (data.method || 'GET').toUpperCase();
    this.route    = data.route  || data.url || '/';
    this.startTime = data.startTime || Date.now();

    this.clientIP = data.clientIP || '::1';
    this.headers  = data.headers  || {};
    this.body     = data.body     || null;
    this.query    = data.query    || {};
    this.params   = data.params   || {};

    this.events = [];
    this.steps = [];
    this.visitedNodes = ['Client', 'Express'];

    this.currentNode   = 'Express';
    this.status        = 'active';
    this.statusCode    = null;
    this.completedData = null;

    this.requestPacketId  = null;
    this.responsePacketId = null;
  }

  addStepEvent(data) {
    this.steps.push(data);
    this.events.push({ type: 'node_active', ...data, _time: Date.now() });

    const node = data.activeNode;
    if (node && !this.visitedNodes.includes(node)) {
      this.visitedNodes.push(node);
    }
    this.currentNode = node;
  }

  finalize(traceData) {
    this.status       = (traceData.status === 'failed' || traceData.statusCode >= 400) ? 'error' : 'complete';
    this.statusCode   = traceData.status || traceData.statusCode || 200;
    this.completedData = traceData;
    this.events.push({ type: 'trace_complete', ...traceData, _time: Date.now() });

    if (traceData.execution) {
      traceData.execution.forEach(n => {
        if (!this.visitedNodes.includes(n)) this.visitedNodes.push(n);
      });
    }
  }
}

class ExecutionEngine {
  constructor({ nodeManager, svgEdges, canvasRenderer, inspector, timeline, onLog }) {
    this.nodeManager    = nodeManager;
    this.svgEdges       = svgEdges;
    this.canvasRenderer = canvasRenderer;
    this.inspector      = inspector;
    this.timeline       = timeline;
    this.onLog          = onLog || (() => {});

    this.sessions = new Map();
    this.completedSessions = [];

    /* Interactive Demo Session (isolated from real data) */
    this.demoSession = null;
    this.hasReceivedRealEvent = false;

    /* Replay state */
    this.isLiveMode    = true;
    this.replaySession = null;
    this.replayIndex   = 0;
    this.replayPlaying = false;
    this.replaySpeed   = 1.0;
    this.replayTimer   = null;

    this._colors = {
      GET: '#d7c8ae', POST: '#556b5d', PUT: '#c89b5b',
      PATCH: '#a7744e', DELETE: '#b95c50',
    };

    this._defaultPipeline = [];
  }

  handleMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type !== 'snapshot' && !this.hasReceivedRealEvent) {
      this.clearDemoTrace();
      this.hasReceivedRealEvent = true;
    }

    switch (msg.type) {
      case 'snapshot':       this.handleSnapshot(msg.data);       break;
      case 'trace_start':    this.handleTraceStart(msg.data);     break;
      case 'node_active':    this.handleNodeActive(msg.data);     break;
      case 'node_remove':    this.handleNodeRemove(msg.data);     break;
      case 'trace_complete': this.handleTraceComplete(msg.data);  break;
    }
  }

  handleNodeRemove(data) {
    const nodeName = data.nodeName || data.node;
    if (!nodeName) return;
    this.svgEdges.removeAllEdgesForNode(nodeName);
    this.nodeManager.removeNode(nodeName);
    this.onLog('warn', `[✖] Dynamic Stage Node Removed: ${nodeName}`);
  }

  handleSnapshot(data) {
    if (!data) return;

    if (data.recentTraces?.length > 0) {
      this.clearDemoTrace();
      this.hasReceivedRealEvent = true;
      [...data.recentTraces].reverse().forEach(trace => {
        const session = new TraceSession({
          traceId: trace.id || trace.traceId,
          method:  trace.method,
          route:   trace.route,
          body:    trace.body,
          headers: trace.headers,
          clientIP: trace.clientIP,
        });
        session.visitedNodes = trace.execution || this._defaultPipeline.slice();
        session.finalize(trace);
        this.completedSessions.unshift(session);
      });
    }
  }

  handleTraceStart(data) {
    this.clearDemoTrace();
    this.hasReceivedRealEvent = true;

    const trace = data.trace || data;
    const traceId = trace.traceId;

    const session = new TraceSession(trace);
    this.sessions.set(traceId, session);

    const color  = this._colors[session.method] || '#3b82f6';
    const packet = this.canvasRenderer.createPacket({
      id:      `${traceId}_req`,
      traceId,
      type:    'request',
      method:  session.method,
      color,
      route:   session.route,
      payload: {
        headers: trace.headers || {},
        body:    trace.body    || null,
        query:   trace.query   || {},
        params:  trace.params  || {},
      },
    });
    session.requestPacketId = packet.id;

    this.svgEdges.ensureEdge('Client', 'Express', this.nodeManager);
    this.svgEdges.setEdgeActive('Client', 'Express');
    this.nodeManager.setNodeState('Client', 'processing');
    this.canvasRenderer.setPacketDestination(packet, 'Client', 'Express', 550);

    this.timeline.addMarker({ session, type: 'start' });
    this.onLog('info', `[▶] ${session.method} ${session.route} — trace ${traceId}`);
  }

  handleNodeActive(data) {
    if (!this.isLiveMode) return;

    const { traceId, activeNode, prevNode, step } = data;
    const session = this.sessions.get(traceId);
    if (!session) return;

    session.addStepEvent(data);
    this.nodeManager.ensureNode(activeNode);

    const from = prevNode || 'Client';
    this.svgEdges.ensureEdge(from, activeNode, this.nodeManager);
    this.svgEdges.setEdgeCompleted(from, null);
    this.svgEdges.setEdgeActive(from, activeNode);

    if (prevNode) {
      this.nodeManager.setNodeState(prevNode, 'success',
        step?.elapsedMs !== undefined ? step.elapsedMs : null
      );
    }
    this.nodeManager.setNodeState(activeNode, 'processing');

    const packet = this.canvasRenderer.getPacket(session.requestPacketId);
    if (packet) {
      const isBacklog = packet.queue.length >= 1;
      const dur = isBacklog ? 200 : 520;
      this.canvasRenderer.setPacketDestination(packet, from, activeNode, dur);
    }

    const majorNodes = ['Router', 'Middleware', 'Controller', 'Service', 'Database'];
    if (majorNodes.includes(activeNode)) {
      this.timeline.addMarker({ session, type: 'node_active', node: activeNode });
    }

    this.onLog('info',
      `  → [${activeNode}]${step?.elapsedMs !== undefined ? ` (${step.elapsedMs}ms elapsed)` : ''}${step?.metadata?.handler ? ` handler:${step.metadata.handler}` : ''}${step?.metadata?.query ? ` query:${step.metadata.query}` : ''}`
    );
  }

  handleTraceComplete(data) {
    const trace   = data.trace || data;
    const traceId = trace.id || trace.traceId;

    const session = this.sessions.get(traceId);
    if (!session) return;

    session.finalize(trace);

    const lastNode = session.visitedNodes.at(-1) || 'Response';
    this.nodeManager.ensureNode(lastNode);
    const finalState = session.status === 'error' ? 'error' : 'success';
    this.nodeManager.setNodeState(lastNode, finalState,
      trace.timing?.total || trace.responseTime || null
    );

    const prevLast = session.visitedNodes.at(-2);
    if (prevLast && lastNode) {
      this.svgEdges.setEdgeCompleted(prevLast, lastNode);
    }

    const reqPacket = this.canvasRenderer.getPacket(session.requestPacketId);
    if (reqPacket) {
      const prevNode = session.visitedNodes.at(-2) || 'Service';
      if (reqPacket.queue.length === 0 && !reqPacket.animating) {
        this.canvasRenderer.setPacketDestination(reqPacket, prevNode, lastNode, 300);
      }
    }

    setTimeout(() => {
      if (!session.visitedNodes.length) return;

      const returnColor  = session.status === 'error' ? '#ef4444' : '#10b981';
      const returnPacket = this.canvasRenderer.createPacket({
        id:      `${traceId}_res`,
        traceId,
        type:    'response',
        method:  session.method,
        color:   returnColor,
        route:   session.route,
        payload: {
          status:   session.statusCode,
          response: trace.response || trace.responseBody,
        },
      });
      session.responsePacketId = returnPacket.id;

      const returnPath = [...session.visitedNodes].reverse();
      this.canvasRenderer.setPacketSequencePath(returnPacket, returnPath, 420);

      for (let i = 0; i < returnPath.length - 1; i++) {
        const from = returnPath[i];
        const to   = returnPath[i + 1];
        this.svgEdges.ensureEdge(to, from, this.nodeManager);
      }
    }, 500);

    this.sessions.delete(traceId);
    this.completedSessions.unshift(session);
    if (this.completedSessions.length > 100) this.completedSessions.pop();

    this.timeline.addMarker({ session, type: 'trace_complete' });

    const code = session.statusCode;
    const total = trace.timing?.total || trace.responseTime || 0;
    this.onLog(
      session.status === 'error' ? 'error' : 'info',
      `[✔] ${session.method} ${session.route} → ${code} (${total}ms)`
    );
  }

  /* ══════════════════════════════════════════════════════
     ONBOARDING DEMO TRACE (Example Visualization)
  ══════════════════════════════════════════════════════ */
  startInteractiveDemoTrace() {
    if (this.hasReceivedRealEvent || this.demoSession) return;

    this.demoSession = new TraceSession({
      traceId: 'demo_example_trace',
      isDemo: true,
      method: 'GET',
      route: '/api/v1/demo-orders',
      clientIP: '127.0.0.1',
      headers: { 'user-agent': 'SuriLensOnboarding/1.0', authorization: 'Bearer demo-token' },
      body: { demo: true, item: 'Laptop', qty: 1 }
    });

    this.demoSession.visitedNodes = ['Client', 'Express', 'Router', 'Middleware', 'Controller', 'Service', 'Database', 'Response'];
    this.demoSession.finalize({
      status: 'completed',
      statusCode: 200,
      responseTime: 42,
      timing: { total: 42, router: 2, middleware: 5, controller: 10, service: 15, database: 10 },
      responseBody: { status: 'success', message: 'Demo order processed', orderId: 'ord_999' }
    });

    this.onLog('info', '[⚡] Rendering Interactive Example Trace (Demo Mode)');
  }

  clearDemoTrace() {
    if (this.demoSession) {
      this.demoSession = null;
      this.nodeManager.resetAllNodes();
      this.canvasRenderer.clearAllPackets();
      this.svgEdges.resetAllEdges();
      this.onLog('info', '[⚡] Real backend event received — demo cleared.');
    }
  }

  /* ══════════════════════════════════════════════════════
     REPLAY MODE
  ══════════════════════════════════════════════════════ */
  enterReplayMode(session) {
    if (!session) return;
    this.isLiveMode    = false;
    this.replaySession = session;
    this.replayIndex   = session.events?.length || 0;
    this.replayPlaying = false;
    this._stopReplayTimer();

    this.nodeManager.resetAllNodes();
    this.canvasRenderer.clearAllPackets();
    this.svgEdges.resetAllEdges();

    const pipeline = session.visitedNodes || [];
    const isError = session.status === 'error' || session.statusCode >= 400;

    for (let i = 0; i < pipeline.length; i++) {
      const nodeName = pipeline[i];
      this.nodeManager.ensureNode(nodeName);

      const state = (isError && i === pipeline.length - 2) ? 'error' : 'success';
      this.nodeManager.setNodeState(nodeName, state);

      if (i < pipeline.length - 1) {
        const nextNode = pipeline[i + 1];
        this.nodeManager.ensureNode(nextNode);
        this.svgEdges.ensureEdge(nodeName, nextNode, this.nodeManager);
        this.svgEdges.setEdgeCompleted(nodeName, nextNode);
      }
    }

    const replayCtrl = document.getElementById('replay-controls');
    const liveBtn    = document.getElementById('btn-live');
    if (replayCtrl) replayCtrl.style.display = 'flex';
    if (liveBtn)    liveBtn.dataset.active = 'false';

    this.timeline.setReplaySession(session);
  }

  enterLiveMode() {
    this.isLiveMode    = true;
    this.replaySession = null;
    this._stopReplayTimer();
    this.replayPlaying = false;

    this.nodeManager.resetAllNodes();
    this.canvasRenderer.clearAllPackets();
    this.svgEdges.resetAllEdges();

    const defaultPipeline = this._defaultPipeline;
    for (let i = 0; i < defaultPipeline.length - 1; i++) {
      this.svgEdges.ensureEdge(defaultPipeline[i], defaultPipeline[i + 1], this.nodeManager);
    }

    const replayCtrl = document.getElementById('replay-controls');
    const liveBtn    = document.getElementById('btn-live');
    if (replayCtrl) replayCtrl.style.display = 'none';
    if (liveBtn)    liveBtn.dataset.active = 'true';

    this.timeline.setLiveMode();
  }

  replayPlay() {
    if (!this.replaySession || this.replayPlaying) return;
    this.replayPlaying = true;
    this._scheduleNextStep();
  }

  replayPause() {
    this.replayPlaying = false;
    this._stopReplayTimer();
  }

  replayStepForward() {
    if (!this.replaySession) return;
    this._applyStep(this.replayIndex, false);
    this.replayIndex++;
    this.timeline.setReplayPosition(this.replayIndex);
  }

  replayStepBackward() {
    if (!this.replaySession || this.replayIndex <= 0) return;
    const target = this.replayIndex - 1;
    this._replayFromScratch(target);
  }

  replayReset() {
    if (!this.replaySession) return;
    this._stopReplayTimer();
    this.replayPlaying = false;
    this.replayIndex   = 0;
    this.nodeManager.resetAllNodes();
    this.canvasRenderer.clearAllPackets();
    this.svgEdges.resetAllEdges();

    const pipeline = this.replaySession.visitedNodes;
    for (let i = 0; i < pipeline.length - 1; i++) {
      this.svgEdges.ensureEdge(pipeline[i], pipeline[i + 1], this.nodeManager);
    }
    this.timeline.setReplayPosition(0);
  }

  replayJumpToEnd() {
    if (!this.replaySession) return;
    const events = this.replaySession.events;
    this.replayReset();
    for (let i = 0; i < events.length; i++) {
      this._applyStep(i, true);
    }
    this.replayIndex = events.length;
    this.timeline.setReplayPosition(this.replayIndex);
  }

  setReplaySpeed(speed) {
    this.replaySpeed = parseFloat(speed) || 1.0;
  }

  _applyStep(idx, instant = false) {
    if (!this.replaySession) return;
    const events = this.replaySession.events;
    if (idx >= events.length) return;

    const ev  = events[idx];
    const dur = instant ? 0 : Math.max(200, Math.min(900, 500 / this.replaySpeed));

    if (ev.type === 'node_active') {
      const from = ev.prevNode || 'Client';
      this.nodeManager.ensureNode(ev.activeNode);
      this.svgEdges.ensureEdge(from, ev.activeNode, this.nodeManager);
      this.svgEdges.setEdgeActive(from, ev.activeNode);
      if (ev.prevNode) this.nodeManager.setNodeState(ev.prevNode, 'success');
      this.nodeManager.setNodeState(ev.activeNode, 'processing');

    } else if (ev.type === 'trace_complete') {
      const lastNode = this.replaySession.visitedNodes.at(-1);
      if (lastNode) {
        this.nodeManager.setNodeState(
          lastNode,
          this.replaySession.status === 'error' ? 'error' : 'success'
        );
      }
    }
  }

  _replayFromScratch(targetIdx) {
    this.nodeManager.resetAllNodes();
    this.canvasRenderer.clearAllPackets();
    this.svgEdges.resetAllEdges();

    const pipeline = this.replaySession?.visitedNodes || [];
    for (let i = 0; i < pipeline.length - 1; i++) {
      this.svgEdges.ensureEdge(pipeline[i], pipeline[i + 1], this.nodeManager);
    }

    for (let i = 0; i < targetIdx; i++) {
      this._applyStep(i, true);
    }
    this.replayIndex = targetIdx;
    this.timeline.setReplayPosition(this.replayIndex);
  }

  _scheduleNextStep() {
    if (!this.replayPlaying || !this.replaySession) return;
    const events = this.replaySession.events;
    if (this.replayIndex >= events.length) {
      this.replayPlaying = false;
      return;
    }

    this._applyStep(this.replayIndex, false);
    this.replayIndex++;
    this.timeline.setReplayPosition(this.replayIndex);

    const delay = Math.max(80, 620 / this.replaySpeed);
    this.replayTimer = setTimeout(() => this._scheduleNextStep(), delay);
  }

  _stopReplayTimer() {
    if (this.replayTimer) {
      clearTimeout(this.replayTimer);
      this.replayTimer = null;
    }
  }
}

window.TraceSession    = TraceSession;
window.ExecutionEngine = ExecutionEngine;
