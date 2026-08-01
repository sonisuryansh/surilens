const express = require('express');
const suriLens = require('../index');

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Register SuriLens Middleware
app.use(suriLens({ dashboardPort: 4444 }));

// Custom Logging Middleware to demonstrate Middleware node
app.use((req, res, next) => {
  suriLens.step('Middleware', { name: 'requestLogger' });
  setTimeout(() => {
    next();
  }, 20);
});

// Demo Router
const apiRouter = express.Router();

async function fetchUserFromDatabase(id) {
  suriLens.step('Service', { action: 'getUserById', id });
  await new Promise(r => setTimeout(r, 40));

  suriLens.step('Database', { query: 'SELECT * FROM users WHERE id = ?', id });
  await new Promise(r => setTimeout(r, 60));

  return { id, name: 'Alice Smith', email: 'alice@example.com' };
}

// GET Endpoint (Blue particle)
apiRouter.get('/users/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'getUser' });
  const user = await fetchUserFromDatabase(req.params.id);
  res.json({ success: true, data: user });
});

// POST Endpoint (Green particle)
apiRouter.post('/orders', async (req, res) => {
  suriLens.step('Controller', { handler: 'createOrder' });
  suriLens.step('Service', { action: 'processPayment' });
  await new Promise(r => setTimeout(r, 50));
  suriLens.step('Database', { query: 'INSERT INTO orders ...' });
  await new Promise(r => setTimeout(r, 70));
  res.status(201).json({ success: true, orderId: 'ord_' + Date.now() });
});

// PUT Endpoint (Orange particle)
apiRouter.put('/products/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'updateProduct' });
  suriLens.step('Service', { action: 'updateInventory' });
  await new Promise(r => setTimeout(r, 40));
  suriLens.step('Database', { query: 'UPDATE products ...' });
  await new Promise(r => setTimeout(r, 50));
  res.json({ success: true, id: req.params.id });
});

// PATCH Endpoint (Purple particle)
apiRouter.patch('/users/:id/status', async (req, res) => {
  suriLens.step('Controller', { handler: 'patchStatus' });
  suriLens.step('Service', { action: 'changeStatus' });
  await new Promise(r => setTimeout(r, 30));
  suriLens.step('Database', { query: 'UPDATE users SET status = ...' });
  await new Promise(r => setTimeout(r, 40));
  res.json({ success: true, status: 'active' });
});

// DELETE Endpoint (Red particle)
apiRouter.delete('/items/:id', async (req, res) => {
  suriLens.step('Controller', { handler: 'deleteItem' });
  suriLens.step('Service', { action: 'deleteRecord' });
  await new Promise(r => setTimeout(r, 40));
  suriLens.step('Database', { query: 'DELETE FROM items WHERE id = ?' });
  await new Promise(r => setTimeout(r, 50));
  res.json({ success: true, deleted: true });
});

// Error Test Endpoint (Demonstrates failed execution tree in SuriLens)
apiRouter.get('/error-test', async (req, res, next) => {
  suriLens.step('Controller', { handler: 'errorTestHandler' });
  suriLens.step('Service', { action: 'failingOperation' });
  await new Promise(r => setTimeout(r, 30));
  res.status(500).json({ error: true, message: 'Database connection failed' });
});

// High Concurrency Stress Test Endpoint
apiRouter.get('/stress', async (req, res) => {
  suriLens.step('Controller', { handler: 'stressTest' });
  suriLens.step('Service', { action: 'spawningConcurrently' });
  await new Promise(r => setTimeout(r, 50));
  suriLens.step('Database', { query: 'BATCH QUERY 50 ROWS' });
  await new Promise(r => setTimeout(r, 100));
  res.json({ message: 'Stress test burst completed' });
});

// Dynamic Node Creation & Deletion Demo Endpoint
apiRouter.get('/dynamic-node', async (req, res) => {
  suriLens.step('Controller', { handler: 'dynamicNodeHandler' });

  // 1. Create a dynamic temporary stage node: TempWorker
  suriLens.step('TempWorker', { action: 'allocating_worker', status: 'created' });
  await new Promise(r => setTimeout(r, 700));

  // 2. Perform task on TempWorker stage node
  suriLens.step('TempWorker', { action: 'processing_temp_job', payloadBytes: 4096 });
  await new Promise(r => setTimeout(r, 800));

  // 3. Delete/remove the dynamic stage node live from graph
  suriLens.removeStep('TempWorker', { reason: 'job_completed_deallocating' });
  await new Promise(r => setTimeout(r, 500));

  // 4. Continue pipeline execution
  suriLens.step('Database', { query: 'INSERT INTO audit_logs VALUES (...)' });
  await new Promise(r => setTimeout(r, 300));

  res.json({
    success: true,
    message: 'TempWorker node was dynamically created, processed job, and deleted live on graph!'
  });
});

app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`\n🚀 SuriLens Demo Server listening on http://localhost:${PORT}`);
  console.log(`📊 SuriLens Dashboard running on http://localhost:4444\n`);
});
