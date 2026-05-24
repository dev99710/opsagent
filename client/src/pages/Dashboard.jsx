import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Calendar, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { fetchDashboard, sendCommand } from '../api.js';
import StatusBadge from '../components/shared/StatusBadge.jsx';

/* ── Count-up animation ─────────────────────────────────── */
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(eased * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return val;
}

/* ── Progress bar that animates from 0 on mount ─────────── */
function AnimBar({ pct }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setW(pct), 120);
    return () => clearTimeout(id);
  }, [pct]);
  const color = pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="mt-1.5 h-1.5 bg-[#F2EDE4] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */
function SkeletonKPI() {
  return (
    <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2 flex-1">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-7 w-16 mt-1" />
          <div className="skeleton h-2.5 w-24" />
        </div>
        <div className="skeleton w-9 h-9 rounded-lg" />
      </div>
    </div>
  );
}

/* ── KPI card ────────────────────────────────────────────── */
const ACCENT = { indigo: 'border-l-indigo-500', amber: 'border-l-amber-500', emerald: 'border-l-emerald-500', red: 'border-l-red-500' };
const ICONBG  = { indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' };
const VALCOL  = { indigo: 'text-indigo-600', amber: 'text-amber-600', emerald: 'text-emerald-600', red: 'text-red-600' };

function KPICard({ label, raw, fmt, icon: Icon, color, sub, trend, delay = 0 }) {
  const counted = useCountUp(raw);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-white rounded-xl border border-[#E5DDD0] border-l-4 ${ACCENT[color]} p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">{label}</p>
          <p className={`text-4xl font-bold mt-1.5 tabular-nums ${VALCOL[color]}`}>{fmt(counted)}</p>
          {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ICONBG[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-[11px] font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span>{Math.abs(trend)}% from last week</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function Dashboard() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [toast,         setToast]         = useState(null);
  const [reordering,    setReordering]    = useState(new Set());
  const [reorderingAll, setReorderingAll] = useState(false);

  const kpis        = data?.kpis         ?? {};
  const recentOrders = data?.recentOrders ?? [];
  const lowStock    = data?.lowStockAlerts ?? [];

  useEffect(() => {
    fetchDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const reorderItem = async (item) => {
    setReordering(p => new Set([...p, item._id]));
    try {
      await sendCommand(`Create a reorder order for ${item.name} quantity ${item.reorderQuantity || item.reorderLevel || 50} from supplier ${item.supplier || 'supplier'}`);
      showToast(`Reorder created for ${item.name}`);
    } catch {
      showToast(`Failed to reorder ${item.name}`, 'error');
    } finally {
      setReordering(p => { const s = new Set(p); s.delete(item._id); return s; });
    }
  };

  const reorderAll = async () => {
    if (!lowStock.length) return;
    setReorderingAll(true);
    try {
      await Promise.all(lowStock.map(item =>
        sendCommand(`Create a reorder order for ${item.name} quantity ${item.reorderQuantity || item.reorderLevel || 50} from supplier ${item.supplier || 'supplier'}`)
      ));
      showToast(`${lowStock.length} reorder${lowStock.length > 1 ? 's' : ''} created`);
    } catch {
      showToast('Some reorders failed', 'error');
    } finally {
      setReorderingAll(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-5xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-[#1C1917]">Dashboard</h1>
            <p className="text-sm text-[#78716C] mt-0.5">Overview of your business operations</p>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)
            ) : (
              <>
                <KPICard label="Inventory Value"     raw={Math.round(kpis.totalInventoryValue ?? 0)} fmt={v => `$${v.toLocaleString()}`} icon={DollarSign}    color="indigo"  sub="Total stock value"     trend={4.2}  delay={0} />
                <KPICard label="Pending Orders"      raw={kpis.pendingOrders ?? 0}                   fmt={v => v}                        icon={ShoppingCart}  color="amber"   sub="Awaiting fulfillment"  trend={-2.1} delay={0.06} />
                <KPICard label="Today's Appointments" raw={kpis.todayAppointments ?? 0}              fmt={v => v}                        icon={Calendar}      color="emerald" sub="Scheduled for today"               delay={0.12} />
                <KPICard label="Low Stock Items"     raw={kpis.lowStockCount ?? 0}                   fmt={v => v}                        icon={(kpis.lowStockCount ?? 0) === 0 ? CheckCircle : AlertTriangle} color={(kpis.lowStockCount ?? 0) === 0 ? 'emerald' : 'red'} sub={(kpis.lowStockCount ?? 0) === 0 ? 'All stocked' : 'Below 10 units'} delay={0.18} />
              </>
            )}
          </div>

          {/* Bottom two-col */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Recent Orders */}
            <div className="bg-white border border-[#E5DDD0] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="px-5 py-3.5 border-b border-[#F2EDE4] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1C1917]">Recent Orders</h2>
                <span className="text-[11px] text-[#A8927D] bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#E5DDD0]">
                  {recentOrders.length} records
                </span>
              </div>
              {loading ? (
                <div className="p-4 flex flex-col gap-3.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="skeleton h-3.5 flex-[2]" />
                      <div className="skeleton h-3.5 flex-1" />
                      <div className="skeleton h-5 w-14 rounded-full" />
                      <div className="skeleton h-3.5 w-12" />
                    </div>
                  ))}
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[#A8927D]">No orders yet</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#FAF7F2]">
                      {['Customer', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A8927D]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o, i) => (
                      <motion.tr
                        key={o._id ?? i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-t border-[#F2EDE4] hover:bg-[#FAF7F2] transition-colors"
                      >
                        <td className="px-5 py-3 text-[#1C1917] font-medium">{o.customer}</td>
                        <td className="px-5 py-3 text-[#374151] font-semibold">${Number(o.total || 0).toFixed(2)}</td>
                        <td className="px-5 py-3"><StatusBadge value={o.status} /></td>
                        <td className="px-5 py-3 text-[#A8927D]">
                          {(o.date || o.createdAt)
                            ? new Date(o.date || o.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white border border-[#E5DDD0] rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="px-5 py-3.5 border-b border-[#F2EDE4] flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <h2 className="text-sm font-semibold text-[#1C1917]">Low Stock Alerts</h2>
                {!loading && lowStock.length > 0 && (
                  <button
                    onClick={reorderAll}
                    disabled={reorderingAll}
                    className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[11px] font-semibold transition-all disabled:opacity-50"
                  >
                    {reorderingAll
                      ? <div className="w-3 h-3 rounded-full border-2 border-red-200 border-t-red-600 animate-spin" />
                      : <ShoppingCart size={11} />}
                    Reorder All
                  </button>
                )}
              </div>
              {loading ? (
                <div className="p-4 flex flex-col gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="skeleton h-3.5 w-32" />
                        <div className="skeleton h-2.5 w-20" />
                        <div className="skeleton h-1.5 w-full rounded-full" />
                      </div>
                      <div className="skeleton h-6 w-12 rounded" />
                      <div className="skeleton h-7 w-16 rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-emerald-500" />
                  </div>
                  <p className="text-sm font-semibold text-[#1C1917]">All items well stocked</p>
                  <p className="text-xs text-[#A8927D]">No items below threshold</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F2EDE4]">
                  {lowStock.map((item, i) => {
                    const pct = Math.min(100, Math.round((Number(item.quantity) / 10) * 100));
                    return (
                      <motion.div
                        key={item._id ?? i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAF7F2] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#1C1917] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#A8927D] mt-0.5">{item.category}</p>
                          <AnimBar pct={pct} />
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-bold text-red-600">{item.quantity}</span>
                          <span className="text-[10px] text-[#A8927D] ml-1">{item.unit}</span>
                        </div>
                        <button
                          onClick={() => reorderItem(item)}
                          disabled={reordering.has(item._id) || reorderingAll}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] text-[#78716C] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-medium transition-all disabled:opacity-50"
                        >
                          {reordering.has(item._id)
                            ? <div className="w-3 h-3 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                            : <ShoppingCart size={11} />}
                          Reorder
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error'
            ? <AlertTriangle size={15} className="shrink-0" />
            : <CheckCircle size={15} className="shrink-0" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}
    </>
  );
}
