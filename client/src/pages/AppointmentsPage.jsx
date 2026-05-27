import { useState, useEffect } from 'react';
import { Download, RefreshCcw, List, LayoutGrid, ChevronLeft, ChevronRight, Calendar, CheckCircle } from 'lucide-react';
import { fetchCollection } from '../api.js';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import Drawer from '../components/shared/Drawer.jsx';

function exportCSV(data) {
  if (!data.length) return;
  const keys = ['customer', 'purpose', 'date', 'time', 'status'];
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'appointments-export.csv';
  a.click();
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt;
  });
}

const STATUS_STYLE = {
  scheduled: 'bg-blue-50 border-blue-200 text-blue-700',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  cancelled: 'bg-gray-100 border-gray-200 text-gray-500',
};
const STATUS_DOT = {
  scheduled: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-gray-400',
};

export default function AppointmentsPage() {
  useEffect(() => { document.title = 'Appointments — OpsAgent'; }, []);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640 ? 'list' : 'week');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    fetchCollection('appointments').then(setAppointments).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const weekDates = getWeekDates(weekAnchor);
  const aptsForDate = (date) => {
    const iso = date.toISOString().split('T')[0];
    return appointments.filter(a => (a.date || '').startsWith(iso));
  };

  const prevWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() - 7); setWeekAnchor(d); };
  const nextWeek = () => { const d = new Date(weekAnchor); d.setDate(d.getDate() + 7); setWeekAnchor(d); };
  const goToday  = () => setWeekAnchor(new Date());

  const today = new Date().toISOString().split('T')[0];

  const weekLabel = `${weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#E5E7EB] bg-white flex-wrap">
        <div>
          <h1 className="text-base font-bold text-[#111827]">Appointments</h1>
          <p className="text-xs text-[#9CA3AF]">{appointments.length} total</p>
        </div>

        {view === 'week' && (
          <div className="flex items-center gap-1.5 ml-5">
            <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
              <ChevronLeft size={14} />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] transition-all">Today</button>
            <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151] transition-all">
              <ChevronRight size={14} />
            </button>
            <span className="text-[10px] sm:text-xs text-[#6B7280] font-medium ml-1">{weekLabel}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => exportCSV(appointments)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] text-xs font-medium transition-all"
          >
            <Download size={12} />
            Export
          </button>
          <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6] transition-all">
            <RefreshCcw size={12} />
          </button>
          <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden bg-white">
            {[['week', LayoutGrid], ['list', List]].map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                  view === v ? 'bg-indigo-600 text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#374151]'
                }`}
              >
                <Icon size={12} />
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#9CA3AF] text-sm">Loading appointments…</div>
      ) : view === 'week' ? (
        <div className="flex-1 overflow-auto scrollbar-thin p-6 bg-[#F8F9FA]">
          <div className="hidden sm:grid grid-cols-7 gap-3 min-w-[700px]">
            {weekDates.map((date, i) => {
              const iso = date.toISOString().split('T')[0];
              const isToday = iso === today;
              const apts = aptsForDate(date);
              return (
                <div
                  key={i}
                  className={`rounded-xl border overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
                    isToday ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-[#E5E7EB]'
                  } bg-white`}
                >
                  <div className={`px-3 py-2.5 border-b ${isToday ? 'border-indigo-100 bg-indigo-50' : 'border-[#F3F4F6] bg-[#F8F9FA]'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-[#9CA3AF]'}`}>
                      {DAYS[i]}
                    </p>
                    <p className={`text-xl font-bold leading-none mt-0.5 ${isToday ? 'text-indigo-600' : 'text-[#374151]'}`}>
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="p-2 flex flex-col gap-1.5 min-h-[90px]">
                    {apts.map((a, j) => (
                      <button
                        key={j}
                        onClick={() => setSelected(a)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-[10px] transition-all hover:shadow-sm ${STATUS_STYLE[a.status] ?? STATUS_STYLE.scheduled}`}
                      >
                        <p className="font-semibold truncate">{a.customer}</p>
                        <p className="opacity-75 truncate">{a.purpose}</p>
                        {a.time && <p className="opacity-60 font-medium">{a.time}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upcoming this week */}
          {(() => {
            const weekApts = weekDates
              .flatMap(date => aptsForDate(date).map(a => ({ ...a, _isoDate: date.toISOString().split('T')[0] })))
              .sort((a, b) => {
                const da = `${a._isoDate}${a.time ?? ''}`;
                const db = `${b._isoDate}${b.time ?? ''}`;
                return da > db ? 1 : -1;
              });
            return (
              <div className="mt-5 sm:min-w-[700px]">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Upcoming this week</p>
                {weekApts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 bg-white border border-[#E5E7EB] rounded-xl">
                    <Calendar size={28} className="text-[#D1D5DB]" />
                    <p className="text-sm text-[#9CA3AF]">No appointments this week</p>
                  </div>
                ) : (
                  <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
                    {weekApts.map((a, i) => (
                      <button
                        key={a._id ?? i}
                        onClick={() => setSelected(a)}
                        className="w-full flex items-center gap-4 px-5 py-3 border-b border-[#F3F4F6] last:border-0 hover:bg-[#F8F9FA] transition-colors text-left"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? STATUS_DOT.scheduled}`} />
                        <span className="text-sm font-semibold text-[#111827] flex-1 truncate">{a.customer}</span>
                        <span className="text-xs text-[#6B7280] truncate">{a.purpose}</span>
                        <span className="text-xs text-[#9CA3AF] shrink-0 ml-auto pl-4">
                          {new Date(a._isoDate).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {a.time ? ` · ${a.time}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex-1 overflow-auto scrollbar-thin">
          {appointments.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[#9CA3AF] text-sm">No appointments found</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
                  {['Customer', 'Purpose', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...appointments]
                  .sort((a, b) => (a.date > b.date ? 1 : -1))
                  .map((apt, i) => (
                    <tr
                      key={apt._id ?? i}
                      onClick={() => setSelected(apt)}
                      className="border-b border-[#F3F4F6] bg-white hover:bg-[#F8F9FA] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 text-[#111827] font-semibold">{apt.customer}</td>
                      <td className="px-5 py-3.5 text-[#374151]">{apt.purpose}</td>
                      <td className="px-5 py-3.5 text-[#6B7280]">{apt.date}</td>
                      <td className="px-5 py-3.5 text-[#6B7280]">{apt.time ?? '—'}</td>
                      <td className="px-5 py-3.5"><StatusBadge value={apt.status} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Appointment Details">
        {selected && (
          <div className="p-6 flex flex-col gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${STATUS_STYLE[selected.status] ?? STATUS_STYLE.scheduled}`}>
              <span className={`w-3 h-3 rounded-full ${STATUS_DOT[selected.status] ?? STATUS_DOT.scheduled}`} />
            </div>
            <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-3">
              {[
                ['Customer', selected.customer],
                ['Purpose', selected.purpose],
                ['Date', selected.date],
                ['Time', selected.time ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-[#6B7280] font-medium">{k}</span>
                  <span className="text-[#111827] font-semibold">{v}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280] font-medium">Status</span>
                <StatusBadge value={selected.status} />
              </div>
            </div>
            {selected.notes && (
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-[#374151] bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg px-4 py-3">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
