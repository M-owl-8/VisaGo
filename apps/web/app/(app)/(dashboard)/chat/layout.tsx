'use client';

import { useEffect } from 'react';

/**
 * Chat-specific layout that ensures the chat page takes full viewport height
 * and prevents body scrolling. This creates a ChatGPT-like experience where
 * only the message list scrolls.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // Lock body scroll when on chat page
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousHeight = document.body.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.height = previousHeight;
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {children}
    </div>
  );
}

