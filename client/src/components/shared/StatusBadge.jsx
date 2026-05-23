const STYLE = {
  completed:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:     'bg-amber-50   text-amber-700   border-amber-200',
  cancelled:   'bg-gray-100   text-gray-500    border-gray-200',
  scheduled:   'bg-blue-50    text-blue-700    border-blue-200',
  processing:  'bg-purple-50  text-purple-700  border-purple-200',
  fulfilled:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  backordered: 'bg-orange-50  text-orange-700  border-orange-200',
  discontinued:'bg-gray-100   text-gray-500    border-gray-200',
};

export default function StatusBadge({ value }) {
  const key = value?.toLowerCase().replace(/\s+/g, '');
  const style = STYLE[key] ?? STYLE.cancelled;
  const isPending = key === 'pending';

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${style} ${isPending ? 'pending-pulse' : ''}`}>
      {isPending && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
      )}
      {value}
    </span>
  );
}
