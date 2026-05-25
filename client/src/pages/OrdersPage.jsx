import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCcw, Package, GripVertical } from 'lucide-react';
import { fetchCollection } from '../api.js';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import Drawer from '../components/shared/Drawer.jsx';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

/* ── Columns (3 only) ───────────────────────────────────── */
const COLUMNS = ['pending', 'completed', 'cancelled'];

const COL_STYLE = {
  pending:   {
    dot:   'bg-amber-500',
    head:  'text-amber-700',
    count: 'bg-amber-50 text-amber-700 border-amber-200',
    card:  'border-t-amber-400',
    drop:  'bg-amber-50/30 ring-amber-300',
  },
  completed: {
    dot:   'bg-emerald-500',
    head:  'text-emerald-700',
    count: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    card:  'border-t-emerald-400',
    drop:  'bg-emerald-50/30 ring-emerald-300',
  },
  cancelled: {
    dot:   'bg-gray-400',
    head:  'text-[#78716C]',
    count: 'bg-[#F2EDE4] text-[#78716C] border-[#E5DDD0]',
    card:  'border-t-gray-300',
    drop:  'bg-gray-50/50 ring-gray-300',
  },
};

function exportCSV(orders) {
  if (!orders.length) return;
  const keys = ['customer', 'total', 'status', 'date'];
  const rows = [keys.join(','), ...orders.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'orders-export.csv';
  a.click();
}

/* ── Skeleton card ───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#E5DDD0] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="skeleton h-3.5 w-28" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-40" />
      <div className="flex items-center justify-between pt-2 border-t border-[#F2EDE4]">
        <div className="skeleton h-4 w-14" />
        <div className="skeleton h-3 w-12" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  /* drag state */
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const load = () => {
    setLoading(true);
    fetchCollection('orders').then(setOrders).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  /* Map processing → pending for display purposes */
  const normalise = (status) => {
    if (status === 'processing') return 'pending';
    if (status === 'fulfilled')  return 'completed';
    return status;
  };

  const byStatus = (col) => orders.filter(o => normalise(o.status) === col);

  /* ── Status update ── */
  const changeStatus = async (order, newStatus) => {
    setUpdating(true);
    try {
      await fetch(`${API_BASE}/orders/${order._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      load();
      setSelected(null);
    } catch (e) { console.error(e); }
    finally { setUpdating(false); }
  };

  /* ── Drag handlers ── */
  const onDragStart = (order) => setDragging(order);
  const onDragEnd   = () => { setDragging(null); setDragOver(null); };

  const onDragOver = (e, col) => {
    e.preventDefault();
    if (normalise(dragging?.status) !== col) setDragOver(col);
  };

  const onDrop = async (col) => {
    if (!dragging || normalise(dragging.status) === col) { setDragging(null); setDragOver(null); return; }
    /* optimistic update */
    setOrders(prev => prev.map(o => o._id === dragging._id ? { ...o, status: col } : o));
    const id = dragging._id;
    setDragging(null);
    setDragOver(null);
    try {
      await fetch(`${API_BASE}/orders/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: col }),
      });
    } catch { load(); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-[#E5DDD0] bg-white flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#1C1917]">Orders</h1>
          <p className="text-xs text-[#A8927D]">{orders.length} total · drag cards to move</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => exportCSV(orders)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5DDD0] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] text-xs font-medium transition-all"
          >
            <Download size={12} />Export
          </button>
          <button
            onClick={load}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5DDD0] text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] transition-all"
          >
            <RefreshCcw size={12} />
          </button>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex-1 overflow-y-auto sm:overflow-x-auto scrollbar-thin p-5 bg-[#FAF7F2]">
          <div className="flex flex-col sm:flex-row gap-4 sm:h-full">
            {COLUMNS.map(col => {
              const s = COL_STYLE[col];
              return (
                <div key={col} className="flex flex-col w-full sm:w-72 sm:shrink-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${s.head}`}>{col}</span>
                    <div className="ml-auto skeleton h-5 w-8 rounded-full" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto sm:overflow-x-auto scrollbar-thin p-5 bg-[#FAF7F2]">
          <div className="flex flex-col sm:flex-row gap-4 sm:h-full">
            {COLUMNS.map(col => {
              const s = COL_STYLE[col];
              const colOrders = byStatus(col);
              const isOver = dragOver === col;

              return (
                <div
                  key={col}
                  className="flex flex-col w-full sm:w-72 sm:shrink-0"
                  onDragOver={e => onDragOver(e, col)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => onDrop(col)}
                >
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${s.head}`}>{col}</span>
                    <span className={`ml-auto text-[10px] font-semibold border rounded-full px-2 py-0.5 ${s.count}`}>
                      {colOrders.length}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <div className={`flex flex-col gap-2.5 flex-1 min-h-[80px] rounded-xl p-1 transition-all ${
                    isOver ? `ring-2 ${s.drop}` : ''
                  }`}>
                    {colOrders.map((order, i) => (
                      <motion.div
                        key={order._id ?? i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        draggable
                        onDragStart={() => onDragStart(order)}
                        onDragEnd={onDragEnd}
                        onClick={() => setSelected(order)}
                        className={`bg-white rounded-xl border border-[#E5DDD0] border-t-2 ${s.card} p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all shadow-[0_1px_3px_rgba(0,0,0,0.05)] select-none ${
                          dragging?._id === order._id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-sm font-semibold text-[#1C1917] flex-1 min-w-0 truncate pr-2">{order.customer}</p>
                          <GripVertical size={13} className="text-[#D6CEC3] shrink-0 mt-0.5" />
                        </div>
                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Package size={10} className="text-[#A8927D] shrink-0" />
                            <p className="text-[11px] text-[#78716C] truncate">
                              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                              {order.items[0]?.name ? ` · ${order.items[0].name}` : ''}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-[#F2EDE4]">
                          <span className="text-sm font-bold text-[#1C1917]">
                            ${Number(order.total || 0).toFixed(2)}
                          </span>
                          {(order.date || order.createdAt) && (
                            <span className="text-[10px] text-[#A8927D]">
                              {new Date(order.date || order.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {colOrders.length === 0 && (
                      <div className={`flex items-center justify-center border-2 border-dashed rounded-xl text-[11px] text-[#A8927D] min-h-[80px] transition-all ${
                        isOver ? 'border-indigo-300 text-indigo-400' : 'border-[#E5DDD0]'
                      }`}>
                        {isOver ? 'Drop here' : `No ${col} orders`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order detail drawer */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Order Details">
        {selected && (
          <div className="p-6 flex flex-col gap-5">
            <div className="bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-[#1C1917]">{selected.customer}</p>
                <StatusBadge value={selected.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#78716C]">Total</span>
                <span className="text-[#1C1917] font-bold text-base">${Number(selected.total || 0).toFixed(2)}</span>
              </div>
              {(selected.date || selected.createdAt) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#78716C]">Date</span>
                  <span className="text-[#374151]">
                    {new Date(selected.date || selected.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {Array.isArray(selected.items) && selected.items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-2">Items</p>
                <div className="flex flex-col gap-1.5">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-[#E5DDD0] rounded-lg px-4 py-2.5 text-sm">
                      <span className="text-[#374151] font-medium">{item.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#A8927D]">×{item.quantity ?? item.qty}</span>
                        {item.price && <span className="text-[#374151] font-semibold">${Number(item.price).toFixed(2)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-2">Move to</p>
              <div className="grid grid-cols-2 gap-2">
                {COLUMNS.filter(c => c !== normalise(selected.status)).map(s => (
                  <button
                    key={s}
                    disabled={updating}
                    onClick={() => changeStatus(selected, s)}
                    className="py-2.5 rounded-lg border border-[#E5DDD0] text-sm text-[#374151] hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 capitalize transition-all disabled:opacity-50 font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
