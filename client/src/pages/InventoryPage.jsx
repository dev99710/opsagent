import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Download, RefreshCcw,
  ChevronUp, ChevronDown, Sparkles,
  LayoutGrid, List, AlertTriangle,
} from 'lucide-react';
import { fetchCollection, searchInventory } from '../api.js';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import Drawer from '../components/shared/Drawer.jsx';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

/* ── CSV export ─────────────────────────────────────────── */
function exportCSV(data) {
  if (!data.length) return;
  const keys = ['name', 'quantity', 'unit', 'price', 'category', 'supplier', 'status'];
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventory-export.csv';
  a.click();
}

/* ── Donut chart (SVG, animates from 0) ─────────────────── */
function DonutChart({ pct }) {
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const id = setTimeout(() => setOffset(circ * (1 - pct / 100)), 150);
    return () => clearTimeout(id);
  }, [pct, circ]);

  const color = pct < 30 ? '#EF4444' : pct < 60 ? '#F59E0B' : '#10B981';

  return (
    <div className="relative w-[52px] h-[52px] shrink-0">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#F2EDE4" strokeWidth="5" />
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ color, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="border-b border-[#F2EDE4]">
      <td className="px-5 py-3.5"><div className="skeleton h-3.5 w-32" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-5 w-18 rounded-full" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-3.5 w-10" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-3.5 w-8" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-3.5 w-12" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-3.5 w-20" /></td>
      <td className="px-5 py-3.5"><div className="skeleton h-5 w-16 rounded-full" /></td>
      <td className="px-5 py-3.5" />
    </tr>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5DDD0] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="skeleton w-[52px] h-[52px] rounded-full" />
        <div className="skeleton h-5 w-20 rounded-full" />
      </div>
      <div className="skeleton h-4 w-3/4 mt-1" />
      <div className="skeleton h-3 w-1/2" />
      <div className="flex items-center justify-between mt-1">
        <div className="skeleton h-3.5 w-12" />
        <div className="skeleton h-3.5 w-10" />
      </div>
    </div>
  );
}

/* ── Category pill colors ────────────────────────────────── */
const CAT_PILL = {
  'dairy':               'bg-blue-50 text-blue-700 border-blue-200',
  'beverages':           'bg-purple-50 text-purple-700 border-purple-200',
  'grains':              'bg-yellow-50 text-yellow-700 border-yellow-200',
  'fruits & vegetables': 'bg-green-50 text-green-700 border-green-200',
  'oils':                'bg-orange-50 text-orange-700 border-orange-200',
};
const catPill = (cat) => CAT_PILL[(cat ?? '').toLowerCase()] ?? 'bg-gray-100 text-gray-600 border-gray-200';

/* ── Inventory card ─────────────────────────────────────── */
function InventoryCard({ item, onClick, index }) {
  const pct    = Math.min(100, Math.round((Number(item.quantity) / (item.reorderLevel || 50)) * 100));
  const qty    = Number(item.quantity);
  const lowWarn = qty < 20;  // red top border
  const lowBadge = qty < 10; // "Low stock" text

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      onClick={onClick}
      className={`bg-white rounded-xl border cursor-pointer transition-shadow hover:shadow-md ${
        lowWarn
          ? 'border-t-2 border-t-red-400 border-x-[#E5DDD0] border-b-[#E5DDD0]'
          : 'border-[#E5DDD0]'
      }`}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Top: donut + category pill */}
        <div className="flex items-start justify-between">
          <DonutChart pct={pct} />
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ml-2 leading-5 ${catPill(item.category)}`}>
            {item.category || 'Other'}
          </span>
        </div>

        {/* Name + supplier */}
        <div>
          <p className="text-base font-bold text-[#1C1917] truncate">{item.name}</p>
          {item.supplier && (
            <p className="text-[11px] text-[#A8927D] mt-0.5 truncate">{item.supplier}</p>
          )}
        </div>

        {/* Stock row */}
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold tabular-nums ${lowBadge ? 'text-red-600' : 'text-[#1C1917]'}`}>
            {item.quantity}
          </span>
          <span className="text-[11px] text-[#A8927D]">{item.unit}</span>
          {lowBadge && (
            <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5">
              <AlertTriangle size={8} />LOW
            </span>
          )}
        </div>

        {/* Bottom: price + status */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#F2EDE4]">
          <span className="text-sm font-bold text-[#1C1917]">
            ${Number(item.price || 0).toFixed(2)}
          </span>
          {item.status && <StatusBadge value={item.status} />}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Item form ───────────────────────────────────────────── */
const INPUT_CLS = 'w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg px-3 py-2 text-sm text-[#1C1917] placeholder-[#A8927D] outline-none focus:border-indigo-400 focus:bg-white transition-all';

function ItemForm({ initial = {}, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', price: '', category: '', supplier: '', ...initial });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 flex flex-col gap-4">
      {[
        { key: 'name',     label: 'Item Name',  type: 'text' },
        { key: 'quantity', label: 'Quantity',   type: 'number' },
        { key: 'unit',     label: 'Unit',       type: 'text', placeholder: 'kg, units, liters…' },
        { key: 'price',    label: 'Price ($)',  type: 'number', step: '0.01' },
        { key: 'category', label: 'Category',   type: 'text' },
        { key: 'supplier', label: 'Supplier',   type: 'text' },
      ].map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-[#374151] mb-1.5">{f.label}</label>
          <input
            type={f.type} step={f.step}
            placeholder={f.placeholder ?? f.label}
            value={form[f.key]} onChange={set(f.key)}
            required={f.key === 'name'}
            className={INPUT_CLS}
          />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all disabled:opacity-50 shadow-sm">
          {loading ? 'Saving…' : 'Save Item'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-[#E5DDD0] text-[#78716C] hover:text-[#1C1917] hover:bg-[#F2EDE4] text-sm transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ── Sort icon ───────────────────────────────────────────── */
const COLS = [
  { key: 'name',     label: 'Item Name' },
  { key: 'category', label: 'Category' },
  { key: 'quantity', label: 'Stock' },
  { key: 'unit',     label: 'Unit' },
  { key: 'price',    label: 'Price' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'status',   label: 'Status' },
];

/* ── Page ────────────────────────────────────────────────── */
export default function InventoryPage() {
  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('All');
  const [sortKey,   setSortKey]   = useState('name');
  const [sortAsc,   setSortAsc]   = useState(true);
  const [view,      setView]      = useState('table'); // 'table' | 'cards'
  const [addOpen,   setAddOpen]   = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchCollection('inventory').then(setItems).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  /* AI search debounce */
  useEffect(() => {
    if (!search.trim()) { setAiResults(null); setAiLoading(false); return; }
    setAiLoading(true);
    const t = setTimeout(async () => {
      try {
        const d = await searchInventory(search.trim());
        setAiResults(d.results ?? []);
      } catch {
        setAiResults(null);
      } finally {
        setAiLoading(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const categories = useMemo(() =>
    ['All', ...Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort()],
    [items]
  );

  const filtered = useMemo(() => {
    let list = aiResults !== null
      ? aiResults
      : (search ? items.filter(i => JSON.stringify(i).toLowerCase().includes(search.toLowerCase())) : items);
    if (category !== 'All') list = list.filter(i => i.category === category);
    return [...list].sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  }, [aiResults, items, search, category, sortKey, sortAsc]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/inventory`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price) }),
      });
      setAddOpen(false); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    if (!editItem?._id) return;
    setSaving(true);
    try {
      await fetch(`${API_BASE}/inventory/${editItem._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price) }),
      });
      setEditItem(null); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const lowCount = filtered.filter(r => Number(r.quantity) < 10).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 border-b border-[#E5DDD0] bg-white flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#1C1917]">Inventory</h1>
          <p className="text-xs text-[#A8927D]">
            {filtered.length} items{lowCount > 0 ? ` · ${lowCount} low stock` : ''}
            {aiResults !== null && <span className="ml-1.5 text-indigo-500 font-medium">· AI search</span>}
          </p>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 flex-1 min-w-[140px] max-w-xs px-3 py-2 rounded-lg border sm:ml-4 transition-all ${
          search ? 'bg-white border-indigo-300 ring-1 ring-indigo-100' : 'bg-[#FAF7F2] border-[#E5DDD0]'
        }`}>
          <Search size={13} className="text-[#A8927D] shrink-0" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…"
            className="flex-1 bg-transparent text-sm text-[#1C1917] placeholder-[#A8927D] outline-none min-w-0"
          />
          {aiLoading
            ? <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin shrink-0" />
            : <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-500 border border-indigo-100 shrink-0">
                <Sparkles size={8} />AI
              </span>
          }
        </div>

        {/* Category filter */}
        <select
          value={category} onChange={e => setCategory(e.target.value)}
          className="bg-white border border-[#E5DDD0] rounded-lg px-3 py-2 text-sm text-[#374151] outline-none cursor-pointer hover:border-[#C4B5A0] transition-all"
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg border border-[#E5DDD0] overflow-hidden">
          {[['table', List], ['cards', LayoutGrid]].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={v.charAt(0).toUpperCase() + v.slice(1)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                view === v
                  ? 'bg-indigo-600 text-white'
                  : 'text-[#78716C] hover:bg-[#FAF7F2] hover:text-[#1C1917] bg-white'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline capitalize">{v}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered)}
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
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Plus size={13} /><span className="hidden sm:inline">Add Item</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {view === 'table' ? (
          /* ── Table view ── */
          loading ? (
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E5DDD0]">
                  {COLS.map(c => (
                    <th key={c.key} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A8927D]">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>{Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#A8927D] text-sm">No items found</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E5DDD0]">
                  {COLS.map(({ key, label }) => (
                    <th
                      key={key}
                      onClick={() => key !== 'status' && toggleSort(key)}
                      className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#A8927D] select-none whitespace-nowrap ${key !== 'status' ? 'cursor-pointer hover:text-[#78716C]' : ''}`}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {key !== 'status' && (
                          sortKey === key
                            ? (sortAsc ? <ChevronUp size={11} className="text-indigo-500" /> : <ChevronDown size={11} className="text-indigo-500" />)
                            : <ChevronUp size={11} className="text-[#D6CEC3]" />
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="px-5 py-3 bg-[#FAF7F2]" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const low = Number(item.quantity) < 10;
                  const pct = Math.min(100, Math.round((Number(item.quantity) / (item.reorderLevel || 50)) * 100));
                  return (
                    <motion.tr
                      key={item._id ?? i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      onClick={() => setEditItem(item)}
                      className={`border-b border-[#F2EDE4] cursor-pointer transition-colors group ${
                        low ? 'bg-red-50/40 hover:bg-red-50' : 'bg-white hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <td className="px-5 py-3.5 text-[#1C1917] font-semibold">{item.name}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F2EDE4] text-[#78716C] border border-[#E5DDD0]">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${low ? 'text-red-600' : 'text-[#1C1917]'}`}>{item.quantity}</span>
                            {low && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase">low</span>}
                          </div>
                          <div className="w-16 h-1 bg-[#E5DDD0] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct < 30 ? 'bg-red-500' : pct < 60 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#78716C]">{item.unit}</td>
                      <td className="px-5 py-3.5 text-[#374151] font-semibold">${Number(item.price || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-[#78716C]">{item.supplier || '—'}</td>
                      <td className="px-5 py-3.5">{item.status && <StatusBadge value={item.status} />}</td>
                      <td className="px-5 py-3.5 text-[#A8927D] text-xs text-right opacity-0 group-hover:opacity-100 transition-opacity">Edit →</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )
        ) : (
          /* ── Card grid view ── */
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-[#A8927D] text-sm">No items found</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((item, i) => (
                  <InventoryCard
                    key={item._id ?? i}
                    item={item}
                    index={i}
                    onClick={() => setEditItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Drawer open={addOpen} onClose={() => setAddOpen(false)} title="Add Inventory Item">
        <ItemForm onSave={handleAdd} onCancel={() => setAddOpen(false)} loading={saving} />
      </Drawer>

      <Drawer open={!!editItem} onClose={() => setEditItem(null)} title={`Edit: ${editItem?.name ?? ''}`}>
        {editItem && (
          <ItemForm
            initial={editItem}
            onSave={handleEdit}
            onCancel={() => setEditItem(null)}
            loading={saving}
          />
        )}
      </Drawer>
    </div>
  );
}
