import { useState, useEffect } from 'react';
import { fetchAnalytics } from '../api.js';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    fontSize: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  labelStyle: { color: '#374151', fontWeight: 600 },
  itemStyle: { color: '#111827' },
};

const STATUS_COLORS = {
  pending:    '#F59E0B',
  processing: '#8B5CF6',
  fulfilled:  '#10B981',
  completed:  '#10B981',
  cancelled:  '#9CA3AF',
  scheduled:  '#3B82F6',
};

const CAT_COLORS = ['#6366f1', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-[#F3F4F6]">
        <h3 className="text-xs sm:text-sm font-semibold text-[#111827]">{title}</h3>
        {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-red-500">
        Failed to load analytics: {error}
      </div>
    );
  }

  const { revenueByDay = [], ordersByStatus = [], inventoryByCategory = [], stockLevels = [] } = data ?? {};

  const totalRevenue   = revenueByDay.reduce((s, d) => s + (d.revenue ?? 0), 0);
  const totalOrders    = ordersByStatus.reduce((s, d) => s + (d.value ?? 0), 0);
  const completedOrders = ordersByStatus
    .filter(d => d.name === 'completed' || d.name === 'fulfilled')
    .reduce((s, d) => s + (d.value ?? 0), 0);
  const avgOrderValue    = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completionRate   = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  const axisStyle = { fill: '#9CA3AF', fontSize: 11 };

  const PILLS = [
    { label: 'Total Revenue',    value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { label: 'Avg Order Value',  value: `$${avgOrderValue.toFixed(2)}` },
    { label: 'Completion Rate',  value: `${completionRate}%` },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4 sm:py-6 bg-[#F8F9FA]">
      <div className="max-w-5xl">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-[#111827]">Analytics</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Business performance overview</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {PILLS.map(p => (
              <span key={p.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E5E7EB] text-xs text-[#6B7280] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <span className="text-[#9CA3AF]">{p.label}:</span>
                <span className="font-semibold text-[#111827]">{p.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Revenue by day */}
          <ChartCard title="Revenue by Day" subtitle="Last 30 days">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueByDay}>
                <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={52} tickFormatter={v => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`$${v}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Orders by status */}
          <ChartCard title="Orders by Status" subtitle="Current distribution">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {ordersByStatus.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={value => <span style={{ color: '#6B7280' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top 5 products by category */}
          <ChartCard title="Top 5 Categories by Value" subtitle="Total inventory value ($)">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventoryByCategory}>
                <XAxis dataKey="category" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} height={60} interval={0} textAnchor="end" />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={56} tickFormatter={v => `$${v}`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => [`$${v}`, 'Value']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                  {inventoryByCategory.map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Stock levels — top 10 by quantity */}
          <ChartCard title="Stock Levels" subtitle="Top 10 items by quantity">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockLevels} layout="vertical">
                <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="quantity" name="Quantity" radius={[0, 4, 4, 0]} fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </div>
    </div>
  );
}
