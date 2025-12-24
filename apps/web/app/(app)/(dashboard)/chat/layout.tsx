'use client';

import { useEffect } from 'react';

/**
 * Chat-specific layout that ensures the chat page takes full viewport height
 * and prevents body scrolling. This creates a ChatGPT-like experience where
 * only the message list scrolls.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // Lock body and html scroll when on chat page
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100dvh';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {children}
    </div>
  );
}

