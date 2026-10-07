/**
 * Cache indicator badge visualizing Redis caching hits vs misses.
 * Only rendered when NEXT_PUBLIC_SHOW_CACHE_STATUS is set to "true".
 * Features aria-live="polite" for screen reader announcements,
 * reserved dimensions to prevent layout shifts, and WCAG AA high-contrast styling.
 */

export default function CacheBadge({ status }) {
  if (process.env.NEXT_PUBLIC_SHOW_CACHE_STATUS !== 'true') {
    return null;
  }

  if (!status) {
    // Reserve space to prevent layout shifts when cache status loads
    return <span className="inline-block h-6 w-24" aria-hidden="true" />;
  }

  const isHit = String(status).toUpperCase() === 'HIT';

  return (
    <span
      role="status"
      aria-live="polite"
      title={
        isHit
          ? 'Response served instantly from Redis cache'
          : 'Response freshly queried from PostgreSQL'
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs transition-all h-6 ${
        isHit
          ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
          : 'bg-amber-50 text-amber-950 border-amber-300'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isHit ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
        }`}
        aria-hidden="true"
      />
      <span>Cache {isHit ? 'HIT' : 'MISS'}</span>
    </span>
  );
}
