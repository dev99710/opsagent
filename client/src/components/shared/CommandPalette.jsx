import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Package, ShoppingCart, Calendar,
  LayoutDashboard, BarChart3, ArrowRight, Zap,
} from 'lucide-react';
import { fetchCollection } from '../../api.js';
import { useNavigate } from 'react-router-dom';

const QUICK = [
  { label: 'Dashboard',    icon: LayoutDashboard, to: '/',             hint: 'D' },
  { label: 'Inventory',    icon: Package,         to: '/inventory',    hint: 'I' },
  { label: 'Orders',       icon: ShoppingCart,    to: '/orders',       hint: 'O' },
  { label: 'Appointments', icon: Calendar,        to: '/appointments', hint: 'A' },
  { label: 'Analytics',    icon: BarChart3,       to: '/analytics',    hint: 'N' },
];

const ICONS  = { inventory: Package, orders: ShoppingCart, appointments: Calendar };
const ROUTES = { inventory: '/inventory', orders: '/orders', appointments: '/appointments' };

export default function CommandPalette({ onClose }) {
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading,   setLoading]   = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setActiveIdx(0); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [inv, ord, apt] = await Promise.all([
          fetchCollection('inventory'),
          fetchCollection('orders'),
          fetchCollection('appointments'),
        ]);
        const q = query.toLowerCase();
        const match = (obj) => Object.values(obj).some(v => String(v).toLowerCase().includes(q));
        const hits = [
          ...inv.filter(match).slice(0, 3).map(r => ({ collection: 'inventory',    label: r.name,     sub: r.category })),
          ...ord.filter(match).slice(0, 3).map(r => ({ collection: 'orders',       label: r.customer, sub: `$${Number(r.total || 0).toFixed(2)}` })),
          ...apt.filter(match).slice(0, 3).map(r => ({ collection: 'appointments', label: r.customer, sub: r.purpose })),
        ];
        setResults(hits);
        setActiveIdx(0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const items = query ? results : QUICK.map(q => ({ ...q, isNav: true }));

  const go = (item) => {
    navigate(item.isNav ? item.to : ROUTES[item.collection]);
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && items[activeIdx]) go(items[activeIdx]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.96, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: -10 }}
        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[540px] bg-white border border-[#E5DDD0] rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.3)' }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#F2EDE4]">
          <Search size={16} className="text-[#A8927D] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search or ask anything…"
            className="flex-1 bg-transparent text-[15px] text-[#1C1917] placeholder-[#A8927D] outline-none"
          />
          {loading ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#E5DDD0] border-t-indigo-500 animate-spin shrink-0" />
          ) : (
            <kbd className="text-[10px] border border-[#E5DDD0] rounded-md px-1.5 py-0.5 text-[#A8927D] bg-[#FAF7F2] font-sans shrink-0">
              esc
            </kbd>
          )}
        </div>

        {/* List */}
        {items.length > 0 ? (
          <ul className="py-2 max-h-[360px] overflow-y-auto scrollbar-thin">
            {!query && (
              <p className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#A8927D]">
                Quick Navigation
              </p>
            )}
            {items.map((item, i) => {
              const Icon = item.isNav ? item.icon : (ICONS[item.collection] ?? Zap);
              const active = i === activeIdx;
              return (
                <li key={i}>
                  <button
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => go(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active ? 'bg-[#F5F0E8]' : 'hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-[#F2EDE4] text-[#78716C]'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1C1917] truncate">{item.label}</p>
                      {!item.isNav && item.sub && (
                        <p className="text-[11px] text-[#A8927D] capitalize truncate">
                          {item.collection} · {item.sub}
                        </p>
                      )}
                    </div>
                    {item.hint ? (
                      <kbd className="text-[10px] border border-[#E5DDD0] rounded px-1.5 py-0.5 text-[#A8927D] bg-[#FAF7F2]">
                        {item.hint}
                      </kbd>
                    ) : (
                      <ArrowRight size={13} className={active ? 'text-indigo-500' : 'text-[#D6CEC3]'} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query && !loading ? (
          <div className="px-4 py-12 text-center">
            <Zap size={22} className="text-[#D6CEC3] mx-auto mb-3" />
            <p className="text-sm text-[#78716C]">
              No results for <span className="font-medium text-[#1C1917]">"{query}"</span>
            </p>
          </div>
        ) : null}

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-[#F2EDE4] flex items-center gap-4 text-[10px] text-[#A8927D]">
          {[['↵', 'select'], ['↑↓', 'navigate'], ['esc', 'close']].map(([k, l]) => (
            <span key={k} className="flex items-center gap-1">
              <kbd className="border border-[#E5DDD0] rounded px-1 bg-[#FAF7F2]">{k}</kbd>
              {l}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
