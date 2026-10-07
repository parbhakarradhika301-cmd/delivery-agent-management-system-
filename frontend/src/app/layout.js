/**
 * Root layout component.
 * Configures typography via next/font, SEO metadata with title templates,
 * top navigation header, and Sonner toast notifications.
 */

import './globals.css';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import { Suspense } from 'react';
import { Geist } from 'next/font/google';

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

export const metadata = {
  title: {
    default: 'Delivery Agent Manager',
    template: '%s | Delivery Agent Manager',
  },
  description:
    'Manage logistics fleet agents, service zones, and real-time operational availability with low-latency Redis caching.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full bg-zinc-50 antialiased`}>
      <body className="min-h-full flex flex-col font-sans text-zinc-900">
        <Toaster position="top-right" richColors closeButton />
        <Suspense fallback={<div className="h-16 bg-white border-b border-zinc-200" />}>
          <Header />
        </Suspense>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
