const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const { collector } = require('../core/collector');
const { eventStore } = require('../core/event-store');

class DashboardServer {
  constructor(options = {}) {
    this.port = options.dashboardPort || options.port || 4444;
    this.host = options.host || 'localhost';
    this.dashboardAuth = options.dashboardAuth || null; // { user, pass }
    this.publicDir = path.join(__dirname, '../../public');
    this.server = null;
    this.wss = null;
    this.isRunning = false;
  }

  /**
   * Validates HTTP Basic Authentication if configured.
   */
  checkAuth(req, res) {
    if (!this.dashboardAuth) return true;

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="SuriLens Dashboard"' });
      res.end('Authentication required');
      return false;
    }

    const auth = Buffer.from(authHeader.split(' ')[1] || '', 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === this.dashboardAuth.user && pass === this.dashboardAuth.pass) {
      return true;
    }

    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="SuriLens Dashboard"' });
    res.end('Invalid credentials');
    return false;
  }

  /**
   * Starts the Dashboard HTTP & WebSocket Server.
   */
  start() {
    if (this.isRunning) return;

    this.server = http.createServer((req, res) => {
      if (!this.checkAuth(req, res)) return;

      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      let pathname = parsedUrl.pathname;

      // Handle REST API Endpoints
      if (pathname.startsWith('/api/')) {
        return this.handleApiRequests(req, res, parsedUrl);
      }

      this.handleStaticFiles(req, res, pathname);
    });

    // Initialize WebSocket Server attached to the HTTP server
    this.wss = new WebSocketServer({ server: this.server });

    const safeStringify = (obj) => JSON.stringify(obj, (k, v) => (typeof v === 'bigint' ? v.toString() : v));

    this.wss.on('connection', (ws) => {
      const snapshot = collector.getSnapshot();
      ws.send(safeStringify({ type: 'snapshot', data: snapshot }));
    });

    this.setupCollectorListeners();

    this.server.listen(this.port, () => {
      this.isRunning = true;
      console.log(`\x1b[36m[SuriLens]\x1b[0m Live Dashboard running at \x1b[32mhttp://${this.host}:${this.port}\x1b[0m`);
    });

    this.server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`\x1b[33m[SuriLens]\x1b[0m Port ${this.port} in use. SuriLens dashboard disabled or port busy.`);
      } else {
        console.error('[SuriLens] Server error:', err);
      }
    });
  }

  /**
   * Listens to collector events and broadcasts to connected WS clients.
   */
  setupCollectorListeners() {
    const safeStringify = (obj) => JSON.stringify(obj, (k, v) => (typeof v === 'bigint' ? v.toString() : v));

    const broadcast = (type, payload) => {
      if (!this.wss) return;
      const message = safeStringify({ type, data: payload });
      for (const client of this.wss.clients) {
        if (client.readyState === 1 /* OPEN */) {
          client.send(message);
        }
      }
    };

    collector.on('trace_start', (trace) => {
      broadcast('trace_start', { trace, stats: collector.stats });
    });

    collector.on('node_active', (event) => {
      broadcast('node_active', { ...event, stats: collector.stats });
    });

    collector.on('node_remove', (event) => {
      broadcast('node_remove', { ...event, stats: collector.stats });
    });

    collector.on('trace_complete', (trace) => {
      broadcast('trace_complete', { trace, stats: collector.stats });
    });
  }

  /**
   * REST API Request Router for Advanced Search & Session Export/Import.
   */
  handleApiRequests(req, res, parsedUrl) {
    const routePath = parsedUrl.pathname.replace(/\/$/, '') || parsedUrl.pathname;
    res.setHeader('Content-Type', 'application/json');

    if (routePath === '/api/traces' && req.method === 'GET') {
      const searchParams = Object.fromEntries(parsedUrl.searchParams.entries());
      const results = eventStore.searchEvents(searchParams);
      res.writeHead(200);
      return res.end(JSON.stringify({ total: results.length, traces: results }));
    }

    if (routePath === '/api/traces/export' && req.method === 'GET') {
      const allEvents = eventStore.getAllEvents();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="surilens-session.json"');
      res.writeHead(200);
      return res.end(JSON.stringify({ exportedAt: new Date().toISOString(), traces: allEvents }, null, 2));
    }

    if (routePath === '/api/traces/import' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const traces = payload.traces || [];
          traces.forEach(t => eventStore.addEvent(t));
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, importedCount: traces.length }));
        } catch (err) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: 'Invalid JSON session bundle' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'API Endpoint Not Found' }));
  }

  /**
   * Static file server for dashboard assets.
   */
  handleStaticFiles(req, res, pathname) {
    let filePath = path.join(this.publicDir, pathname === '/' ? 'index.html' : pathname);

    if (!filePath.startsWith(this.publicDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          // ONLY fallback to index.html for HTML navigation routes without extensions
          if (extname === '') {
            fs.readFile(path.join(this.publicDir, 'index.html'), (err, indexContent) => {
              if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexContent, 'utf-8');
              }
            });
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end(`404 Not Found: ${pathname}`);
          }
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end(`Server Error: ${error.code}`);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
}

module.exports = DashboardServer;
