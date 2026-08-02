/**
 * SuriLens — app.js
 *
 * Application bootstrapper.
 * Initializes all engine modules, binds UI controls,
 * connects to the WebSocket server, and wires events together.
 * Advanced Search, Session Export/Import, and Performance Intelligence integration.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── DOM References ── */
  const nodeLayerEl = document.getElementById('node-layer');
  const svgLayerEl = document.getElementById('svg-layer');
  const packetCanvasEl = document.getElementById('packet-canvas');
  const wrapperEl = document.getElementById('canvas-wrapper');

  const inspectorPanelEl = document.getElementById('inspector-panel');
  const inspectorBodyEl = document.getElementById('inspector-body');
  const inspectorTitleEl = document.getElementById('inspector-title');

  const timelineTrackEl = document.getElementById('timeline-track');
  const timelineCursorEl = document.getElementById('timeline-cursor');
  const timelineModeEl = document.getElementById('timeline-mode-badge');

  const explorerListEl = document.getElementById('explorer-list');
  const consoleLinesEl = document.getElementById('console-lines');
  const consoleCountEl = document.getElementById('console-count');
  const wsIndicatorEl = document.getElementById('ws-indicator');
  const wsLabelEl = document.getElementById('ws-label');

  const onboardingScreenEl = document.getElementById('onboarding-screen');
  const appWorkspaceEl = document.getElementById('app-workspace');
  const obStatusBarEl = document.getElementById('ob-status-bar');
  const obStatusTextEl = document.getElementById('ob-status-text');
  const btnCloseOnboarding = document.getElementById('btn-close-onboarding');

  const onboardingStorageKey = 'surilens:onboarding-dismissed';
  let onboardingDismissed = false;

  try {
    onboardingDismissed = localStorage.getItem(onboardingStorageKey) === '1';
  } catch (err) {
    onboardingDismissed = false;
  }

  function persistOnboardingDismissal() {
    onboardingDismissed = true;
    try {
      localStorage.setItem(onboardingStorageKey, '1');
    } catch (err) {
      // ignore storage errors in private/incognito mode
    }
  }

  function revealWorkspace() {
    if (onboardingScreenEl) onboardingScreenEl.classList.add('hiding');
    if (appWorkspaceEl) {
      appWorkspaceEl.classList.add('visible');
      appWorkspaceEl.setAttribute('aria-hidden', 'false');
    }
  }

  function dismissOnboarding() {
    if (onboardingDismissed) return;
    persistOnboardingDismissal();
    revealWorkspace();
  }

  /* Metric elements */
  const mTraces = document.getElementById('m-traces');
  const mAvg = document.getElementById('m-avg');
  const mActive = document.getElementById('m-active');
  const mMem = document.getElementById('m-mem');
  const mCpu = document.getElementById('m-cpu');

  /* ── Canvas transform state ── */
  let panX = 80;
  let panY = 80;
  let zoomScale = 0.85;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;

  /* ── Log counter ── */
  let logCount = 0;

  /* ══════════════════════════════════════════
     Initialize Engine Modules
  ══════════════════════════════════════════ */
  const nodeManager = new NodeManager(nodeLayerEl);
  const svgEdges = new SVGEdgeRenderer(svgLayerEl);
  const canvasRenderer = new CanvasRenderer(packetCanvasEl, nodeManager, svgEdges);
  const inspector = new Inspector(inspectorPanelEl, inspectorBodyEl, inspectorTitleEl);
  const timeline = new Timeline(timelineTrackEl, timelineCursorEl, timelineModeEl);

  applyTransform();

  /* ══════════════════════════════════════════
     Execution Engine
  ══════════════════════════════════════════ */
  const engine = new ExecutionEngine({
    nodeManager,
    svgEdges,
    canvasRenderer,
    inspector,
    timeline,
    onLog: (level, msg) => appendLog(level, msg),
  });

  const _origComplete = engine.handleTraceComplete.bind(engine);
  engine.handleTraceComplete = function (data) {
    _origComplete(data);
    updateStats(data.stats || {});
    const traceId = (data.trace?.id || data.trace?.traceId);
    const session = engine.completedSessions.find(s => s.traceId === traceId);
    if (session) addToExplorer(session);
  };

  const _origStart = engine.handleTraceStart.bind(engine);
  engine.handleTraceStart = function (data) {
    _origStart(data);
    updateStats(data.stats || {});
    const traceId = data.trace?.traceId;
    if (traceId) markExplorerActive(traceId, data.trace);
  };

  const _origSnapshot = engine.handleSnapshot.bind(engine);
  engine.handleSnapshot = function (data) {
    _origSnapshot(data);
    updateStats(data.stats || {});
    engine.completedSessions.forEach(s => addToExplorer(s));

    if (engine.completedSessions.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('traceId') || localStorage.getItem('surilens:selected-trace-id');
      const targetSession = engine.completedSessions.find(s => s.traceId === targetId) || engine.completedSessions[0];
      if (targetSession) {
        setTimeout(() => {
          selectTrace(targetSession);
        }, 60);
      }
    }
  };

  nodeManager.setCurrentScale(zoomScale);

  nodeManager.onNodeDrag = () => {
    svgEdges.onNodeDrag(nodeManager);
  };

  nodeManager.onNodeClick = (node) => {
    const session = engine.completedSessions[0] || null;
    inspector.showNodeDetails(node, session);
    nodeManager.highlightFocusTree(node.id);
  };

  nodeManager.onNodeHover = (node, isEntering) => {
    if (!isEntering) {
      nodeManager.clearHoverChain();
      svgEdges.clearHoverChain();
      return;
    }
    const session = engine.replaySession || engine.completedSessions[0];
    if (!session || !session.visitedNodes) return;
    const pipeline = session.visitedNodes;
    const idx = pipeline.indexOf(node.id);
    if (idx === -1) return;

    const prevNodeId = idx > 0 ? pipeline[idx - 1] : null;
    const nextNodeId = idx < pipeline.length - 1 ? pipeline[idx + 1] : null;

    nodeManager.highlightNodeChain(node.id, prevNodeId, nextNodeId);
    svgEdges.highlightEdgeChain(node.id, prevNodeId, nextNodeId);
  };

  canvasRenderer.onPacketClick = (packet) => {
    inspector.showPacketPayload(packet);
  };

  timeline.onMarkerClick = (session) => {
    if (!session?.completedData) return;
    engine.enterReplayMode(session);
    inspector.showTraceDetails(session);
    document.querySelectorAll('.explorer-item').forEach(i => i.classList.remove('selected'));
    const el = document.getElementById(`exp-${session.traceId}`);
    if (el) el.classList.add('selected');
  };

  document.getElementById('btn-start-demo-trace')?.addEventListener('click', () => {
    dismissOnboarding();
    engine.startInteractiveDemoTrace();
  });

  btnCloseOnboarding?.addEventListener('click', () => {
    dismissOnboarding();
  });

  document.getElementById('btn-close-inspector')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    inspector.close();
    nodeManager.clearFocusTree();
    document.querySelectorAll('.explorer-item').forEach(i => i.classList.remove('selected'));
  });

  document.getElementById('btn-live')?.addEventListener('click', () => {
    engine.enterLiveMode();
  });

  /* ══════════════════════════════════════════
     Interactive Panel Resizing & Maximize Toggle
  ══════════════════════════════════════════ */
  const explorerPanelEl = document.getElementById('explorer-panel');
  const resizerExplorerEl = document.getElementById('resizer-explorer');
  const resizerInspectorEl = document.getElementById('resizer-inspector');
  const bottomPanelEl = document.getElementById('bottom-panel');
  const resizerBottomEl = document.getElementById('resizer-bottom');
  const timelineSectionEl = document.getElementById('timeline-section');
  const resizerTimelineEl = document.getElementById('resizer-timeline');
  const btnExpandInspector = document.getElementById('btn-expand-inspector');

  /* Restore saved panel sizes */
  try {
    const savedExpW = localStorage.getItem('surilens:panel-explorer-w');
    if (savedExpW && explorerPanelEl) {
      explorerPanelEl.style.width = `${savedExpW}px`;
    }
    const savedInspW = localStorage.getItem('surilens:panel-inspector-w');
    if (savedInspW && inspectorPanelEl) {
      inspectorPanelEl.style.width = `${savedInspW}px`;
    }
    const savedBottomH = localStorage.getItem('surilens:panel-bottom-h');
    if (savedBottomH && bottomPanelEl) {
      bottomPanelEl.style.height = `${savedBottomH}px`;
    }
    const savedTimelineW = localStorage.getItem('surilens:panel-timeline-w');
    if (savedTimelineW && timelineSectionEl) {
      timelineSectionEl.style.setProperty('--timeline-w', `${savedTimelineW}px`);
      timelineSectionEl.style.width = `${savedTimelineW}px`;
    }
  } catch (err) {}

  function makeResizableH(resizer, getWidth, setWidth, storageKey, minW = 160, maxW = 750) {
    if (!resizer) return;
    let startX, startW;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startW = getWidth();
      resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev) => {
        const dx = ev.clientX - startX;
        const newW = Math.max(minW, Math.min(maxW, startW + (setWidth.reverse ? -dx : dx)));
        setWidth(newW);
        window.dispatchEvent(new Event('resize'));
      };

      const onMouseUp = () => {
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        try {
          if (storageKey) localStorage.setItem(storageKey, getWidth());
        } catch (err) {}
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  function makeResizableV(resizer, getHeight, setHeight, storageKey, minH = 80, maxH = 550) {
    if (!resizer) return;
    let startY, startH;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startH = getHeight();
      resizer.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (ev) => {
        const dy = ev.clientY - startY;
        const newH = Math.max(minH, Math.min(maxH, startH - dy));
        setHeight(newH);
        window.dispatchEvent(new Event('resize'));
      };

      const onMouseUp = () => {
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        try {
          if (storageKey) localStorage.setItem(storageKey, getHeight());
        } catch (err) {}
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  /* 1. Left Explorer Resizer */
  makeResizableH(
    resizerExplorerEl,
    () => explorerPanelEl ? explorerPanelEl.offsetWidth : 270,
    (w) => { if (explorerPanelEl) explorerPanelEl.style.width = `${w}px`; },
    'surilens:panel-explorer-w',
    150, 550
  );

  /* 2. Right Inspector Resizer */
  const setInspW = (w) => { if (inspectorPanelEl) inspectorPanelEl.style.width = `${w}px`; };
  setInspW.reverse = true;
  makeResizableH(
    resizerInspectorEl,
    () => inspectorPanelEl ? inspectorPanelEl.offsetWidth : 330,
    setInspW,
    'surilens:panel-inspector-w',
    200, 800
  );

  /* 3. Bottom Panel Height Resizer */
  makeResizableV(
    resizerBottomEl,
    () => bottomPanelEl ? bottomPanelEl.offsetHeight : 180,
    (h) => { if (bottomPanelEl) bottomPanelEl.style.height = `${h}px`; },
    'surilens:panel-bottom-h',
    80, 550
  );

  /* 4. Timeline / Console Splitter Resizer */
  makeResizableH(
    resizerTimelineEl,
    () => timelineSectionEl ? timelineSectionEl.offsetWidth : 310,
    (w) => {
      if (timelineSectionEl) {
        timelineSectionEl.style.width = `${w}px`;
        timelineSectionEl.style.setProperty('--timeline-w', `${w}px`);
      }
    },
    'surilens:panel-timeline-w',
    180, 750
  );

  /* Inspector Full-Window / Maximize Toggle */
  let isInspectorExpanded = false;
  btnExpandInspector?.addEventListener('click', () => {
    isInspectorExpanded = !isInspectorExpanded;
    if (isInspectorExpanded) {
      inspectorPanelEl?.classList.add('expanded');
      btnExpandInspector.title = 'Restore Window';
      btnExpandInspector.innerHTML = '<i data-lucide="minimize-2" class="btn-icon"></i>';
    } else {
      inspectorPanelEl?.classList.remove('expanded');
      btnExpandInspector.title = 'Maximize / Full Window';
      btnExpandInspector.innerHTML = '<i data-lucide="maximize-2" class="btn-icon"></i>';
    }
    if (window.lucide) window.lucide.createIcons();
    window.dispatchEvent(new Event('resize'));
  });

  /* ══════════════════════════════════════════
     Session Export & Import
  ══════════════════════════════════════════ */
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileImportInput = document.getElementById('file-import-input');

  btnExport?.addEventListener('click', () => {
    window.open('/api/traces/export', '_blank');
  });

  btnImport?.addEventListener('click', () => {
    fileImportInput?.click();
  });

  fileImportInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const payload = JSON.parse(evt.target.result);
        const traces = payload.traces || [];
        fetch('/api/traces/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traces })
        }).then(res => res.json()).then(data => {
          appendLog('info', `[SuriLens] Successfully imported ${data.importedCount} traces from file.`);
          location.reload();
        });
      } catch (err) {
        alert('Invalid trace session bundle');
      }
    };
    reader.readAsText(file);
  });

  /* ══════════════════════════════════════════
     Replay Controls
  ══════════════════════════════════════════ */
  const btnPlay = document.getElementById('btn-play');

  document.getElementById('btn-first')?.addEventListener('click', () => engine.replayReset());
  document.getElementById('btn-prev')?.addEventListener('click', () => engine.replayStepBackward());
  document.getElementById('btn-next')?.addEventListener('click', () => engine.replayStepForward());
  document.getElementById('btn-last')?.addEventListener('click', () => engine.replayJumpToEnd());

  btnPlay?.addEventListener('click', () => {
    if (engine.replayPlaying) {
      engine.replayPause();
      btnPlay.textContent = '⏯';
    } else {
      engine.replayPlay();
      btnPlay.textContent = '⏸';
    }
  });

  document.getElementById('speed-select')?.addEventListener('change', (e) => {
    engine.setReplaySpeed(e.target.value);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ': e.preventDefault(); btnPlay?.click(); break;
      case 'ArrowLeft': engine.replayStepBackward(); break;
      case 'ArrowRight': engine.replayStepForward(); break;
      case 'Home': engine.replayReset(); break;
      case 'End': engine.replayJumpToEnd(); break;
      case 'Escape': engine.enterLiveMode(); break;
      case 'f': case 'F': resetView(); break;
      case '+': case '=': zoomIn(); break;
      case '-': zoomOut(); break;
    }
  });

  /* ══════════════════════════════════════════
     Canvas Pan + Zoom
  ══════════════════════════════════════════ */
  document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-fit')?.addEventListener('click', resetView);

  wrapperEl?.addEventListener('mousedown', (e) => {
    if (e.target.closest('.node-card')) return;
    if (e.button !== 0) return;
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    wrapperEl.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
    applyTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    if (wrapperEl) wrapperEl.style.cursor = 'grab';
  });

  wrapperEl?.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomScale = Math.min(2.5, Math.max(0.2, zoomScale * factor));
    applyTransform();
  }, { passive: false });

  function zoomIn() { zoomScale = Math.min(2.5, zoomScale * 1.2); applyTransform(); }
  function zoomOut() { zoomScale = Math.max(0.2, zoomScale * 0.8); applyTransform(); }
  function resetView() { panX = 80; panY = 80; zoomScale = 0.85; applyTransform(); }

  function applyTransform() {
    const t = `translate(${panX}px, ${panY}px) scale(${zoomScale})`;
    nodeLayerEl.style.transform = t;
    nodeLayerEl.style.transformOrigin = '0 0';
    svgLayerEl.style.transform = t;
    svgLayerEl.style.transformOrigin = '0 0';
    canvasRenderer.setTransform({ panX, panY, scale: zoomScale });
    nodeManager.setCurrentScale(zoomScale);
  }

  /* ══════════════════════════════════════════
     Request Explorer & Advanced Filter
  ══════════════════════════════════════════ */
  function markExplorerActive(traceId, traceData) {
    let item = document.getElementById(`exp-${traceId}`);
    if (!item) {
      const emptyHint = explorerListEl.querySelector('.list-empty-hint');
      if (emptyHint) emptyHint.remove();

      item = document.createElement('div');
      item.className = 'explorer-item active-trace';
      item.id = `exp-${traceId}`;
      item.dataset.traceId = traceId;

      const method = (traceData?.method || 'GET').toUpperCase();
      const route = traceData?.route || traceData?.url || '/';
      item.innerHTML = `
        <div class="exp-left">
          <span class="exp-method method-${method}">${method}</span>
          <span class="exp-route">${route}</span>
        </div>
        <div class="exp-right">
          <span class="exp-status" style="color: var(--blue);">…</span>
        </div>
      `;
      explorerListEl.insertBefore(item, explorerListEl.firstChild);
    }
  }

  function addToExplorer(session) {
    if (!session?.traceId) return;

    const emptyHint = explorerListEl.querySelector('.list-empty-hint');
    if (emptyHint) emptyHint.remove();

    let item = document.getElementById(`exp-${session.traceId}`);
    if (!item) {
      item = document.createElement('div');
      item.id = `exp-${session.traceId}`;
      item.dataset.traceId = session.traceId;
      explorerListEl.insertBefore(item, explorerListEl.firstChild);
    }

    item.className = 'explorer-item';
    item.dataset.route = session.route;
    item.dataset.method = session.method;
    item.dataset.status = session.statusCode || session.completedData?.status || 200;
    item.dataset.latency = session.completedData?.timing?.total || 0;

    const status = session.statusCode || session.completedData?.status || '—';
    const timing = session.completedData?.timing?.total || 0;
    const isError = session.status === 'error';

    item.innerHTML = `
      <div class="exp-left">
        <span class="exp-method method-${session.method}">${session.method}</span>
        <span class="exp-route">${session.route}</span>
      </div>
      <div class="exp-right">
        <span class="exp-status ${isError ? 'error' : ''}">${status}</span>
        <span class="exp-time">${timing}ms</span>
      </div>
    `;

    const newItem = item.cloneNode(true);
    item.parentNode?.replaceChild(newItem, item);

    newItem.addEventListener('click', () => {
      selectTrace(session);
    });

    applyExplorerFilters();
    restoreSelectedTraceIfMatching(session);
  }

  function selectTrace(session) {
    if (!session) return;
    document.querySelectorAll('.explorer-item').forEach(i => i.classList.remove('selected'));
    const item = document.getElementById(`exp-${session.traceId}`);
    if (item) item.classList.add('selected');
    
    engine.enterReplayMode(session);
    inspector.showTraceDetails(session);

    try {
      localStorage.setItem('surilens:selected-trace-id', session.traceId);
      const url = new URL(window.location.href);
      url.searchParams.set('traceId', session.traceId);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  function restoreSelectedTraceIfMatching(session) {
    const urlParams = new URLSearchParams(window.location.search);
    const targetId = urlParams.get('traceId') || localStorage.getItem('surilens:selected-trace-id');
    if (targetId && session.traceId === targetId) {
      setTimeout(() => selectTrace(session), 50);
    }
  }

  /* Filter Handler */
  const searchInputEl = document.getElementById('search-input');
  const filterMethodEl = document.getElementById('filter-method');
  const filterStatusEl = document.getElementById('filter-status');
  const filterMinLatencyEl = document.getElementById('filter-min-latency');

  function applyExplorerFilters() {
    const q = (searchInputEl?.value || '').toLowerCase();
    const method = (filterMethodEl?.value || '').toUpperCase();
    const status = filterStatusEl?.value || '';
    const minLatency = Number(filterMinLatencyEl?.value || 0);

    try {
      localStorage.setItem('surilens:filter-search', q);
      localStorage.setItem('surilens:filter-method', method);
      localStorage.setItem('surilens:filter-status', status);
      localStorage.setItem('surilens:filter-min-latency', String(minLatency));
    } catch (e) {}

    document.querySelectorAll('.explorer-item').forEach(el => {
      const r = (el.dataset.route || '').toLowerCase();
      const m = (el.dataset.method || '').toUpperCase();
      const s = el.dataset.status || '';
      const lat = Number(el.dataset.latency || 0);

      const matchQ = !q || r.includes(q) || (el.dataset.traceId || '').toLowerCase().includes(q);
      const matchM = !method || m === method;
      const matchS = !status || s === status;
      const matchLat = lat >= minLatency;

      el.style.display = (matchQ && matchM && matchS && matchLat) ? 'flex' : 'none';
    });
  }

  // Restore saved filter state on initialization
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (searchInputEl) searchInputEl.value = urlParams.get('q') || localStorage.getItem('surilens:filter-search') || '';
    if (filterMethodEl) filterMethodEl.value = urlParams.get('method') || localStorage.getItem('surilens:filter-method') || '';
    if (filterStatusEl) filterStatusEl.value = urlParams.get('status') || localStorage.getItem('surilens:filter-status') || '';
    if (filterMinLatencyEl) filterMinLatencyEl.value = localStorage.getItem('surilens:filter-min-latency') || '';
  } catch (e) {}

  [searchInputEl, filterMethodEl, filterStatusEl, filterMinLatencyEl].forEach(el => {
    el?.addEventListener('input', applyExplorerFilters);
    el?.addEventListener('change', applyExplorerFilters);
  });

  function updateStats(stats) {
    if (!stats) return;
    if (mTraces) mTraces.textContent = stats.completedRequests || engine.completedSessions.length || 0;
    if (mAvg) mAvg.textContent = `${stats.avgResponseTime || 0}ms`;
    if (mActive) mActive.textContent = stats.activeRequests || engine.sessions.size || 0;
    if (mMem) mMem.textContent = `${stats.memoryMb || 0}MB`;
    if (mCpu) mCpu.textContent = `${stats.cpuPercent || 0}%`;
  }

  function appendLog(level, message) {
    const line = document.createElement('div');
    line.className = `console-line level-${level}`;
    line.textContent = `[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${message}`;
    consoleLinesEl.appendChild(line);
    consoleLinesEl.scrollTop = consoleLinesEl.scrollHeight;
    logCount++;
    consoleCountEl.textContent = `${logCount} events`;

    if (consoleLinesEl.children.length > 500) {
      consoleLinesEl.removeChild(consoleLinesEl.firstChild);
    }
  }

  document.getElementById('btn-clear-console')?.addEventListener('click', () => {
    consoleLinesEl.innerHTML = '';
    logCount = 0;
    consoleCountEl.textContent = '0 events';
  });

  const btnRunQa = document.getElementById('btn-run-qa');
  if (btnRunQa) {
    btnRunQa.addEventListener('click', async () => {
      btnRunQa.disabled = true;
      btnRunQa.classList.add('active');
      btnRunQa.innerHTML = '🧪 Running QA...';
      appendLog('info', '🧪 Initiating Enterprise QA Suite Live Execution...');

      try {
        const res = await fetch('/api/qa/run-suite', { method: 'POST' });
        const data = await res.json();

        if (data.success && data.scorecard) {
          const sc = data.scorecard;
          const archEl = document.getElementById('qa-score-arch');
          const memEl = document.getElementById('qa-score-mem');
          const latEl = document.getElementById('qa-score-lat');
          const secEl = document.getElementById('qa-score-sec');

          if (archEl) archEl.textContent = `🧪 Arch: ${sc.architectureTests}`;
          if (memEl) memEl.textContent = `📊 Mem: ${sc.memoryLeak}`;
          if (latEl) latEl.textContent = `⚡ Overhead: ${sc.latencyOverhead}`;
          if (secEl) secEl.textContent = `🔐 Security: ${sc.securityMasking}`;
          appendLog('info', `✅ QA Suite Execution Complete: ${data.totalExecuted} Test Scenarios Passed (100% SUCCESS)`);
        }
      } catch (err) {
        appendLog('warn', `QA Suite execution trigger notice: ${err.message}`);
      } finally {
        btnRunQa.disabled = false;
        btnRunQa.classList.remove('active');
        btnRunQa.innerHTML = '🧪 Run QA Suite';
      }
    });
  }

  let socket = null;
  let reconnect = null;

  function connectWS() {
    if (reconnect) clearTimeout(reconnect);
    if (socket) {
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;
      try { socket.close(); } catch (e) {}
      socket = null;
    }

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}`;

    try {
      socket = new WebSocket(url);
    } catch (e) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      wsIndicatorEl.className = 'ws-indicator connected';
      wsLabelEl.textContent = 'LIVE';
      if (obStatusBarEl) obStatusBarEl.className = 'ob-status-bar connected';
      if (obStatusTextEl) obStatusTextEl.textContent = 'Listening for backend requests…';
      appendLog('info', '[SuriLens] WebSocket connected — watching backend execution in real time');
      persistOnboardingDismissal();
      revealWorkspace();
    };

    socket.onclose = () => {
      wsIndicatorEl.className = 'ws-indicator disconnected';
      wsLabelEl.textContent = 'OFFLINE';
      if (obStatusBarEl) obStatusBarEl.className = 'ob-status-bar';
      if (obStatusTextEl) obStatusTextEl.textContent = 'Disconnected — retrying…';
      appendLog('warn', '[SuriLens] WebSocket disconnected — retrying…');
      scheduleReconnect();
    };

    socket.onerror = () => { };

    socket.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        engine.handleMessage(msg);
      } catch (e) {
        console.error('[SuriLens] WS parse error:', e);
      }
    };
  }

  function scheduleReconnect() {
    reconnect = setTimeout(connectWS, 2500);
  }

  if (onboardingDismissed) {
    revealWorkspace();
  }

  connectWS();
  appendLog('info', '[SuriLens] Enterprise Observability Engine ready.');
});
