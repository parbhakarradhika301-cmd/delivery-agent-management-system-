/**
 * Root index route.
 * Automatically redirects visitors to the primary /agents dashboard.
 */

import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/agents');
}
