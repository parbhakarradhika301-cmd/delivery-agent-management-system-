/**
 * Status badge component to display agent operational status.
 * Renders high-contrast pills meeting WCAG AA requirements.
 */

export default function StatusBadge({ status }) {
  const isActive = status?.toLowerCase() === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
          : 'bg-zinc-100 text-zinc-800 border-zinc-300'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-emerald-600' : 'bg-zinc-500'
        }`}
        aria-hidden="true"
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
