import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, X } from 'lucide-react';
import { sendCommand } from '../../api.js';

const CHIPS = [
  { label: 'Low stock items',      cmd: 'Show low stock items' },
  { label: 'Pending orders',       cmd: 'Show pending orders' },
  { label: "Today's appointments", cmd: "Show today's appointments" },
  { label: 'Business summary',     cmd: 'Give me a business summary' },
  { label: 'Top selling items',    cmd: 'Show top selling items' },
];

function ChatBubble({ entry }) {
  if (entry.type === 'command') {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] bg-indigo-600 text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm">
          {entry.text}
        </div>
      </div>
    );
  }

  if (entry.type === 'error') {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm">
          {entry.text}
        </div>
      </div>
    );
  }

  const { summary, result, plan } = entry;
  const docs = result?.docs ?? [];
  const hasTable = docs.length > 0 && plan?.collection;

  const TABLE_COLS = {
    inventory:    ['name', 'quantity', 'unit', 'price'],
    orders:       ['customer', 'total', 'status', 'date'],
    appointments: ['customer', 'purpose', 'date', 'status'],
  };
  const cols = hasTable ? (TABLE_COLS[plan.collection] ?? []) : [];

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[92%] flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold text-[#6B7280]">OpsAgent</span>
        </div>

        <div className="bg-white border border-[#E5E7EB] text-[#374151] text-sm px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
          {summary}
        </div>

        {hasTable && docs.length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                    {cols.map(c => (
                      <th key={c} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t border-[#F3F4F6] hover:bg-[#F9FAFB]">
                      {cols.map(c => (
                        <td key={c} className="px-3 py-2 text-[#374151] truncate max-w-[120px]">
                          {c === 'status'
                            ? <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">{row[c]}</span>
                            : (c === 'price' || c === 'total')
                              ? `$${Number(row[c] || 0).toFixed(2)}`
                              : c === 'items' && Array.isArray(row[c])
                                ? row[c].map(i => i.name).join(', ')
                                : String(row[c] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {docs.length > 8 && (
                <p className="px-3 py-2 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6]">
                  +{docs.length - 8} more rows
                </p>
              )}
            </div>
          </div>
        )}

        {result && !hasTable && typeof result === 'object' && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 flex flex-wrap gap-4 shadow-sm">
            {Object.entries(result)
              .filter(([, v]) => typeof v !== 'object')
              .map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">{k}</p>
                  <p className="text-sm font-semibold text-[#111827]">{String(v)}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentTerminal({ onDataChange, onClose }) {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const run = async (cmd) => {
    const command = cmd || input.trim();
    if (!command) return;
    setInput('');
    setHistory(h => [...h, { type: 'command', text: command, id: Date.now() }]);
    setLoading(true);
    try {
      const res = await sendCommand(command);
      setHistory(h => [...h, { type: 'response', ...res, id: Date.now() }]);
      if (onDataChange) onDataChange(res.plan?.collection);
    } catch (err) {
      setHistory(h => [...h, { type: 'error', text: err.message, id: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); }
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2.5 px-4 h-14 border-b border-[#E5E7EB] bg-white">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827] leading-none">AI Agent</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Powered by Gemini + MongoDB MCP</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#6B7280] transition-all"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Sparkles size={22} className="text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-[#374151]">How can I help you?</p>
            <p className="text-xs text-[#9CA3AF] text-center max-w-[200px]">
              Ask about inventory, orders, or appointments in plain English.
            </p>
          </div>
        )}
        {history.map(entry => (
          <ChatBubble key={entry.id} entry={entry} />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="shrink-0 px-4 py-2 flex gap-1.5 flex-wrap border-t border-[#E5E7EB] bg-white">
        {CHIPS.map(c => (
          <button
            key={c.label}
            onClick={() => run(c.cmd)}
            disabled={loading}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all disabled:opacity-40"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-3 border-t border-[#E5E7EB] bg-white">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={loading}
          placeholder="Try: show low stock items, summarize today, pending orders…"
          className="flex-1 bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-4 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-indigo-300 focus:bg-white transition-all disabled:opacity-40"
        />
        <button
          onClick={() => run()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
