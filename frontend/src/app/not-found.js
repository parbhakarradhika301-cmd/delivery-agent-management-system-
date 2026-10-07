import Link from 'next/link';

/**
 * Global 404 Not Found page for unhandled frontend routes.
 */
export default function NotFound() {
  return (
    <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-zinc-200 text-center shadow-xs space-y-4">
      <div className="w-14 h-14 rounded-full bg-zinc-100 text-zinc-600 mx-auto flex items-center justify-center">
        <svg
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">404 - Page Not Found</h1>
        <p className="mt-1.5 text-sm text-zinc-600">
          The requested page does not exist or has been moved.
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/agents"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Return to Agents Dashboard
        </Link>
      </div>
    </div>
  );
}
