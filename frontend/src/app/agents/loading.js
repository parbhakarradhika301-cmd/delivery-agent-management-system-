/**
 * Route-level loading state skeleton for /agents.
 * Prevents layout shift during initial streaming and navigation.
 */
export default function AgentsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading agents dashboard">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 bg-zinc-200 rounded-md w-48 animate-pulse" />
          <div className="h-4 bg-zinc-100 rounded-md w-72 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-zinc-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs space-y-3"
          >
            <div className="h-4 bg-zinc-100 rounded-sm w-24 animate-pulse" />
            <div className="h-7 bg-zinc-200 rounded-md w-16 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="h-14 bg-white rounded-xl border border-zinc-200 shadow-xs animate-pulse" />

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-4">
        <div className="h-6 bg-zinc-200 rounded-md w-1/4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-zinc-100 rounded-lg w-full animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
