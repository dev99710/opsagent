import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { connectDB, getDB } from './db/client.js';
import agentRoutes from './routes/agent.js';
import { parseSearchQuery } from './agent/gemini.js';
import inventoryRoutes from './routes/inventory.js';
import ordersRoutes from './routes/orders.js';
import appointmentsRoutes from './routes/appointments.js';
import { checkDailyLimit } from './middleware/usageLimit.js';

const agentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
  statusCode: 429,
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://opsagent-lac.vercel.app',
  ],
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (_req, res) => {
  try {
    await getDB().command({ ping: 1 });
    res.json({ status: 'ok', mongo: true });
  } catch {
    res.json({ status: 'degraded', mongo: false });
  }
});

app.get('/api/dashboard', async (_req, res, next) => {
  try {
    const db = getDB();
    const [inventory, orders, appointments] = await Promise.all([
      db.collection('inventory').find({}).toArray(),
      db.collection('orders').find({}).toArray(),
      db.collection('appointments').find({}).toArray(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const totalInventoryValue = inventory.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const lowStockItems = inventory.filter(i => Number(i.quantity) < 10);
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const todayAppts = appointments.filter(a => (a.date || '').startsWith(today));
    const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    res.json({
      kpis: {
        totalInventoryValue,
        pendingOrders: pendingOrders.length,
        todayAppointments: todayAppts.length,
        lowStockCount: lowStockItems.length,
      },
      recentOrders,
      lowStockAlerts: lowStockItems.sort((a, b) => Number(a.quantity) - Number(b.quantity)).slice(0, 8),
    });
  } catch (err) { next(err); }
});

app.post('/api/search', async (req, res, next) => {
  try {
    const { query, collection = 'inventory' } = req.body;
    if (!query?.trim()) return res.json({ results: [], filter: {} });

    const rawFilter = await parseSearchQuery(query.trim());

    // Strip dangerous operators before hitting MongoDB
    const BLOCKED = new Set(['$where', '$function', '$accumulator', '$expr', '$jsonSchema']);
    function sanitize(obj, depth = 0) {
      if (depth > 6 || typeof obj !== 'object' || obj === null) return obj;
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (BLOCKED.has(k)) continue;
        out[k] = typeof v === 'object' ? sanitize(v, depth + 1) : v;
      }
      return out;
    }
    const filter = sanitize(rawFilter);

    const results = await getDB().collection(collection).find(filter).toArray();
    res.json({ results, filter });
  } catch (err) { next(err); }
});

app.get('/api/analytics', async (_req, res, next) => {
  try {
    const db = getDB();
    const [inventory, orders] = await Promise.all([
      db.collection('inventory').find({}).toArray(),
      db.collection('orders').find({}).toArray(),
    ]);

    // Revenue by day — last 30 days, sorted chronologically
    const revMap = {};
    orders.forEach(o => {
      const raw = o.date || o.createdAt;
      if (!raw) return;
      const day = new Date(raw).toISOString().split('T')[0];
      revMap[day] = (revMap[day] || 0) + (Number(o.total) || 0);
    });
    const revenueByDay = Object.entries(revMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        revenue: Math.round(revenue),
      }));

    // Orders by status
    const statusMap = {};
    orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
    const ordersByStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Top 5 inventory categories by total value
    const catMap = {};
    inventory.forEach(i => {
      const cat = i.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + (Number(i.price) || 0) * (Number(i.quantity) || 0);
    });
    const inventoryByCategory = Object.entries(catMap)
      .map(([category, value]) => ({ category, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Top 10 items by stock quantity
    const stockLevels = [...inventory]
      .sort((a, b) => Number(b.quantity) - Number(a.quantity))
      .slice(0, 10)
      .map(i => ({
        name: (i.name || 'Unknown').split(' ').slice(0, 3).join(' '),
        quantity: Number(i.quantity) || 0,
      }));

    res.json({ revenueByDay, ordersByStatus, inventoryByCategory, stockLevels });
  } catch (err) { next(err); }
});

app.use('/api/agent', agentLimiter, checkDailyLimit, agentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/appointments', appointmentsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`OpsAgent server running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
