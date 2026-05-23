import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchDashboard, sendCommand } from '../api.js';
import StatusBadge from '../components/shared/StatusBadge.jsx';

const CARD_ACCENT = {
  indigo:  'border-l-indigo-500',
  amber:   'border-l-amber-500',
  emerald: 'border-l-emerald-500',
  red:     'border-l-red-500',
};
const ICON_BG = {
  indigo:  'bg-indigo-50 text-indigo-600',
  amber:   'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red:     'bg-red-50 text-red-600',
};
const VAL_COLOR = {
  indigo:  'text-indigo-600',
  amber:   'text-amber-600',
  emerald: 'text-emerald-600',
  red:     'text-red-600',
};

function KPICard({ label, value, icon: Icon, color, sub, trend }) {
  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] border-l-4 ${CARD_ACCENT[color]} p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${VAL_COLOR[color]}`}>{value}</p>
          {sub && <p className="text-[11px] text-[#9CA3AF] mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ICON_BG[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-[11px] font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span>{Math.abs(trend)}% from last week</span>
        </div>
      )}
    </div>
  );
}

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${
      type === 'error'
        ? 'bg-red-50 border-red-200 text-red-800'
        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
    }`}>
      {type === 'error'
        ? <AlertTriangle size={15} className="shrink-0" />
        : <CheckCircle size={15} className="shrink-0" />}
      {message}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [reordering, setReordering] = useState(new Set());
  const [reorderingAll, setReorderingAll] = useState(false);

  // Safe to destructure before data loads — all default to empty
  const kpis = data?.kpis ?? {};
  const recentOrders = data?.recentOrders ?? [];
  const lowStock = data?.lowStockAlerts ?? [];

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const reorderItem = async (item) => {
    const id = item._id;
    setReordering(prev => new Set([...prev, id]));
    try {
      const qty = item.reorderQuantity || item.reorderLevel || 50;
      const supplier = item.supplier || 'supplier';
      await sendCommand(
        `Create a reorder order for ${item.name} quantity ${qty} from supplier ${supplier}`
      );
      showToast(`Reorder created for ${item.name}`);
    } catch {
      showToast(`Failed to reorder ${item.name}`, 'error');
    } finally {
      setReordering(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const reorderAll = async () => {
    if (!lowStock.length) return;
    setReorderingAll(true);
    try {
      await Promise.all(
        lowStock.map(item => {
          const qty = item.reorderQuantity || item.reorderLevel || 50;
          const supplier = item.supplier || 'supplier';
          return sendCommand(
            `Create a reorder order for ${item.name} quantity ${qty} from supplier ${supplier}`
          );
        })
      );
      showToast(`${lowStock.length} reorder${lowStock.length > 1 ? 's' : ''} created`);
    } catch {
      showToast('Some reorders failed', 'error');
    } finally {
      setReorderingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-5xl">
          <div className="mb-7">
            <h1 className="text-xl font-bold text-[#111827]">Dashboard</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Overview of your business operations</p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
            <KPICard
              label="Inventory Value"
              value={`$${Number(kpis.totalInventoryValue ?? 0).toLocaleString('en', { maximumFractionDigits: 0 })}`}
              icon={DollarSign}
              color="indigo"
              sub="Total stock value"
              trend={4.2}
            />
            <KPICard
              label="Pending Orders"
              value={kpis.pendingOrders ?? 0}
              icon={ShoppingCart}
              color="amber"
              sub="Awaiting fulfillment"
              trend={-2.1}
            />
            <KPICard
              label="Today's Appointments"
              value={kpis.todayAppointments ?? 0}
              icon={Calendar}
              color="emerald"
              sub="Scheduled for today"
            />
            <KPICard
              label="Low Stock Items"
              value={kpis.lowStockCount ?? 0}
              icon={AlertTriangle}
              color="red"
              sub="Below 10 units"
            />
          </div>

          {/* Two-column bottom */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Orders */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#111827]">Recent Orders</h2>
                <span className="text-[11px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{recentOrders.length} records</span>
              </div>
              {recentOrders.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[#9CA3AF]">No orders yet</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA]">
                      {['Customer', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o, i) => (
                      <tr key={o._id ?? i} className="border-t border-[#F3F4F6] hover:bg-[#F8F9FA] transition-colors">
                        <td className="px-5 py-3 text-[#111827] font-medium">{o.customer}</td>
                        <td className="px-5 py-3 text-[#374151] font-semibold">${Number(o.total || 0).toFixed(2)}</td>
                        <td className="px-5 py-3"><StatusBadge value={o.status} /></td>
                        <td className="px-5 py-3 text-[#9CA3AF]">
                          {(o.date || o.createdAt)
                            ? new Date(o.date || o.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="px-5 py-3.5 border-b border-[#F3F4F6] flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <h2 className="text-sm font-semibold text-[#111827]">Low Stock Alerts</h2>
                {lowStock.length > 0 && (
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
              {lowStock.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[#9CA3AF]">All items well stocked</p>
              ) : (
                <div className="divide-y divide-[#F3F4F6]">
                  {lowStock.map((item, i) => {
                    const pct = Math.min(100, Math.round((Number(item.quantity) / 10) * 100));
                    return (
                      <div key={item._id ?? i} className="flex items-center gap-3 px-5 py-3 hover:bg-[#F8F9FA] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#111827] truncate">{item.name}</p>
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{item.category}</p>
                          <div className="mt-1.5 h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-bold text-red-600">{item.quantity}</span>
                          <span className="text-[10px] text-[#9CA3AF] ml-1">{item.unit}</span>
                        </div>
                        <button
                          onClick={() => reorderItem(item)}
                          disabled={reordering.has(item._id) || reorderingAll}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-medium transition-all disabled:opacity-50"
                        >
                          {reordering.has(item._id)
                            ? <div className="w-3 h-3 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                            : <ShoppingCart size={11} />}
                          Reorder
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
