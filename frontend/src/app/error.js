'use client';

/**
 * Route-level error boundary component.
 * Catches unhandled client exceptions and offers a recovery retry trigger.
 */
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Optionally log error details to an external monitoring service
  }, [error]);

  return (
    <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-red-200 text-center shadow-xs space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-zinc-600">
          An unexpected client application error occurred while rendering this page.
        </p>
      </div>
      <div className="pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
