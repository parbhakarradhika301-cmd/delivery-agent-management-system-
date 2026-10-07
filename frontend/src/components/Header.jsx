'use client';

/**
 * Top navigation header component.
 * Displays application branding, navigation links, and primary "Add agent" action.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isNewPage = pathname === '/agents/new';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link
              href="/agents"
              className="flex items-center gap-2.5 text-zinc-900 hover:text-indigo-600 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25V3.75a1.125 1.125 0 00-1.125-1.125h-7.5A1.125 1.125 0 004.5 3.75v10.5"
                  />
                </svg>
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-tight block">
                  Delivery Agent Manager
                </span>
                <span className="hidden sm:block text-[11px] text-zinc-600 -mt-0.5">
                  Real-time logistics & agent monitoring
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/agents"
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                pathname === '/agents'
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              Agents
            </Link>

            {!isNewPage && (
              <Link
                href="/agents/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span>Add Agent</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
