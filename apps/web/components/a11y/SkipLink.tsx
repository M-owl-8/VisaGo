'use client';

import Link from 'next/link';

export function SkipLink() {
  return (
    <Link
      href="#main-content"
      className="fixed left-4 top-4 z-[9999] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
    >
      Skip to main content
    </Link>
  );
}










