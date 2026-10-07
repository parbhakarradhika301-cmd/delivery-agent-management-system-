/**
 * Cache indicator badge visualizing Redis caching hits vs misses.
 * Renders emerald pill for "Cache HIT" and amber pill for "Cache MISS".
 */

export default function CacheBadge({ status }) {
  if (!status) return null;

  const isHit = String(status).toUpperCase() === 'HIT';

  return (
    <span
      title={isHit ? 'Response served instantly from Redis cache' : 'Response freshly queried from PostgreSQL'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-all ${
        isHit
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : 'bg-amber-50 text-amber-800 border-amber-300'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isHit ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
        }`}
        aria-hidden="true"
      />
      <span>Cache {isHit ? 'HIT' : 'MISS'}</span>
    </span>
  );
}
