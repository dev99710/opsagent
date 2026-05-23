import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Package, ShoppingCart, Calendar, BarChart3, Terminal } from 'lucide-react';

import { useConnection } from './hooks/useConnection.js';
import { useLowStockAlerts } from './hooks/useLowStockAlerts.js';

import CommandBar from './components/layout/CommandBar.jsx';
import AgentTerminal from './components/layout/AgentTerminal.jsx';

import Dashboard from './pages/Dashboard.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import AppointmentsPage from './pages/AppointmentsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/inventory',    icon: Package,         label: 'Inventory' },
  { to: '/orders',       icon: ShoppingCart,    label: 'Orders' },
  { to: '/appointments', icon: Calendar,        label: 'Appointments' },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics' },
];

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

export default function App() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const conn = useConnection();
  const lowStockCount = useLowStockAlerts();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleDataChange = (collection) => {
    if (!collection) return;
    const routes = { inventory: '/inventory', orders: '/orders', appointments: '/appointments' };
    if (routes[collection]) navigate(routes[collection]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#FAF7F2] text-[#1C1917] overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #E5DDD0',
            color: '#1C1917',
            fontSize: 13,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />

      {/* ── Top command bar ── */}
      <CommandBar
        connStatus={conn}
        onReconnect={() => window.location.reload()}
      />

      {/* ── Tab nav ── */}
      <div className="shrink-0 border-b border-[#E5DDD0] bg-white px-4 sm:px-6 z-10">
        <nav className="flex items-center overflow-x-auto scrollbar-none -mb-px">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-[#78716C] hover:text-[#1C1917] hover:border-[#D6CEC3]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                  {label === 'Inventory' && lowStockCount > 0 && (
                    <span className="ml-0.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {lowStockCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Agent tab — right-aligned */}
          <button
            onClick={() => setTerminalOpen(v => !v)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              terminalOpen
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            <Terminal size={14} strokeWidth={terminalOpen ? 2.5 : 2} />
            <span>Agent</span>
          </button>
        </nav>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 overflow-hidden min-w-0">
          <Routes>
            <Route path="/"             element={<Dashboard />} />
            <Route path="/inventory"    element={<InventoryPage />} />
            <Route path="/orders"       element={<OrdersPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/analytics"    element={<AnalyticsPage />} />
          </Routes>
        </main>

        <AnimatePresence>
          {terminalOpen && !isMobile && (
            <motion.div
              key="terminal-desktop"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="shrink-0 overflow-hidden"
            >
              <AgentTerminal onDataChange={handleDataChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile terminal — full-screen slide-up */}
      <AnimatePresence>
        {terminalOpen && isMobile && (
          <motion.div
            key="terminal-mobile"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            <AgentTerminal onDataChange={handleDataChange} onClose={() => setTerminalOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
