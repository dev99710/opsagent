import { useState, useEffect } from 'react';
import { Search, Zap, RefreshCcw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import CommandPalette from '../shared/CommandPalette.jsx';

const DOT = {
  connected:    'bg-emerald-500',
  degraded:     'bg-amber-500',
  disconnected: 'bg-red-500',
  connecting:   'bg-gray-400 animate-pulse',
};
const LABEL = {
  connected:    'Live',
  degraded:     'Degraded',
  disconnected: 'Offline',
  connecting:   'Connecting…',
};

export default function CommandBar({ connStatus, onReconnect }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="shrink-0 h-14 flex items-center gap-3 px-4 sm:px-6 border-b border-[#E5DDD0] bg-white z-20">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <Zap size={14} className="text-white" />
          </div>
          <span className="hidden sm:block text-sm font-bold text-[#1C1917] tracking-tight">OpsAgent</span>
        </div>

        {/* Centre search trigger — hidden on mobile */}
        <button
          onClick={() => setOpen(true)}
          className="hidden sm:flex flex-1 max-w-md mx-auto items-center gap-2.5 h-9 px-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-[#A8927D] hover:border-[#C4B5A0] hover:bg-[#F5F0E8] transition-all"
        >
          <Search size={13} className="shrink-0" />
          <span className="text-xs flex-1 text-left truncate">Search or ask anything…</span>
          <kbd className="hidden sm:inline text-[10px] border border-[#E5DDD0] rounded px-1.5 py-0.5 bg-white font-sans text-[#A8927D] shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* Right: status + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          {connStatus === 'disconnected' || connStatus === 'degraded' ? (
            <button
              onClick={onReconnect}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all"
            >
              <RefreshCcw size={11} />
              <span className="hidden sm:inline">Retry</span>
            </button>
          ) : connStatus === 'connecting' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E5DDD0] bg-[#FAF7F2]">
              <RefreshCcw size={11} className="text-[#A8927D] animate-spin" />
              <span className="hidden sm:inline text-[11px] text-[#78716C]">Checking…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E5DDD0] bg-[#FAF7F2]">
              <span className={`w-1.5 h-1.5 rounded-full ${DOT[connStatus] ?? DOT.connecting}`} />
              <span className="hidden sm:inline text-[11px] text-[#78716C]">{LABEL[connStatus] ?? 'Connecting…'}</span>
            </div>
          )}

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm select-none">
            D
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && <CommandPalette onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
