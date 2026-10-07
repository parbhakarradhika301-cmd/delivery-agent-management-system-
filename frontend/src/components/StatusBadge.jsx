/**
 * Status badge component to display agent operational status.
 * Renders a green pill for Active and a neutral grey pill for Inactive.
 */

export default function StatusBadge({ status }) {
  const isActive = status?.toLowerCase() === 'active';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
        isActive
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-emerald-500' : 'bg-zinc-400'
        }`}
        aria-hidden="true"
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
