/**
 * SuriLens — Timeline
 *
 * Horizontal timeline bar that shows execution event markers.
 *
 * LIVE mode:
 *   - New markers append on the right as events arrive
 *   - Cursor stays at the right edge (latest event)
 *   - Clicking a trace_start/trace_complete marker enters Replay for that session
 *
 * REPLAY mode:
 *   - Shows all events of the selected session as markers
 *   - Replay position cursor moves as events replay
 *   - Markers turn dim when passed, highlight as current
 */

class Timeline {
  /**
   * @param {HTMLElement} trackEl   #timeline-track
   * @param {HTMLElement} cursorEl  #timeline-cursor
   * @param {HTMLElement} modeEl    #timeline-mode-badge
   */
  constructor(trackEl, cursorEl, modeEl) {
    this.track  = trackEl;
    this.cursor = cursorEl;
    this.modeEl = modeEl;

    this.isLiveMode      = true;
    this.replaySession   = null;
    this.replayPosition  = 0;
    this.liveMarkers     = []; // { session, type, el }
    this.maxLiveMarkers  = 300;

    /** Callback: (session) → void — fired when user clicks a marker to replay */
    this.onMarkerClick = null;
  }

  /* ────────────────────────────────────────────────────────
     LIVE Mode: Add a marker dot
  ──────────────────────────────────────────────────────── */
  /**
   * @param {{ session: TraceSession, type: string, node?: string }} opts
   */
  addMarker({ session, type, node }) {
    if (!this.isLiveMode) return; // in replay mode, don't add live markers

    // Trim oldest markers if over limit
    if (this.liveMarkers.length >= this.maxLiveMarkers) {
      const oldest = this.liveMarkers.shift();
      if (oldest.el && oldest.el.parentNode) oldest.el.remove();
    }

    const el = document.createElement('div');
    el.className = `timeline-marker type-${type}`;

    // Tooltip
    const method = session?.method || '';
    const route  = session?.route  || '';
    if (type === 'start') {
      el.title = `▶ START: ${method} ${route}`;
    } else if (type === 'trace_complete') {
      el.title = `✔ DONE: ${method} ${route}`;
      if (session?.status === 'error') {
        el.classList.add('error-trace');
      }
    } else {
      el.title = `→ ${node || type}`;
    }

    // Only start/complete markers are clickable for replay
    if (type === 'start' || type === 'trace_complete') {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        if (this.onMarkerClick && session) {
          this.onMarkerClick(session);
        }
      });
    }

    this.track.appendChild(el);
    this.liveMarkers.push({ session, type, node, el });

    // Scroll cursor to end in live mode
    this._scrollToEnd();
  }

  /* ────────────────────────────────────────────────────────
     REPLAY Mode
  ──────────────────────────────────────────────────────── */
  /** Enter replay mode for a specific session */
  setReplaySession(session) {
    this.isLiveMode    = false;
    this.replaySession = session;
    this.replayPosition = 0;

    if (this.modeEl) {
      this.modeEl.textContent = 'REPLAY';
      this.modeEl.classList.add('replay');
    }

    this._renderReplayMarkers(session);
  }

  /** Back to live mode */
  setLiveMode() {
    this.isLiveMode    = true;
    this.replaySession = null;

    if (this.modeEl) {
      this.modeEl.textContent = 'LIVE';
      this.modeEl.classList.remove('replay');
    }

    // Restore live markers
    this._renderLiveMarkers();
    this._scrollToEnd();
  }

  /** Move the replay cursor to a specific event index */
  setReplayPosition(idx) {
    this.replayPosition = idx;

    const markers = this.track.querySelectorAll('.timeline-marker');
    markers.forEach((m, i) => {
      m.classList.remove('passed', 'current');
      if (i < idx)     m.classList.add('passed');
      if (i === idx - 1) m.classList.add('current');
    });

    // Move cursor line to current marker
    if (markers.length > 0) {
      const ci = Math.min(Math.max(0, idx - 1), markers.length - 1);
      const target = markers[ci];
      if (target) {
        const trackRect  = this.track.getBoundingClientRect();
        const markerRect = target.getBoundingClientRect();
        const left = markerRect.left - trackRect.left + markerRect.width / 2;
        this.cursor.style.left = `${Math.max(0, left)}px`;
      }
    }
  }

  /* ────────────────────────────────────────────────────────
     Private
  ──────────────────────────────────────────────────────── */
  _renderReplayMarkers(session) {
    // Clear track, keep cursor
    this.track.innerHTML = '';
    this.cursor = document.createElement('div');
    this.cursor.className = 'timeline-cursor';
    this.track.appendChild(this.cursor);

    if (!session?.events?.length) return;

    session.events.forEach((ev, idx) => {
      const el = document.createElement('div');
      el.className = `timeline-marker type-${ev.type}`;
      el.title     = ev.activeNode || ev.type || `Step ${idx}`;
      el.dataset.idx = idx;

      el.addEventListener('click', () => {
        // Clicking a marker during replay scrubs to that position
        this.setReplayPosition(idx);
        // The execution engine will handle applying the state
        if (this._onReplayScrub) this._onReplayScrub(idx);
      });

      this.track.appendChild(el);
    });
  }

  _renderLiveMarkers() {
    this.track.innerHTML = '';
    this.cursor = document.createElement('div');
    this.cursor.className = 'timeline-cursor';
    this.track.appendChild(this.cursor);

    this.liveMarkers.forEach(({ session, type, node, el: oldEl }) => {
      // Re-create DOM element (old one was removed)
      const el = document.createElement('div');
      el.className = `timeline-marker type-${type}`;
      if (session?.status === 'error' && type === 'trace_complete') {
        el.classList.add('error-trace');
      }
      if (type === 'start' || type === 'trace_complete') {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          if (this.onMarkerClick && session) this.onMarkerClick(session);
        });
      }
      this.track.appendChild(el);
    });
  }

  _scrollToEnd() {
    requestAnimationFrame(() => {
      this.track.scrollLeft = this.track.scrollWidth;
      const right = this.track.scrollWidth;
      this.cursor.style.left = `${right - 4}px`;
    });
  }
}

window.Timeline = Timeline;
