'use client';

import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearDelay?: number;
}

export function LiveRegion({ message, politeness = 'polite', clearDelay = 3000 }: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);

    if (clearDelay > 0 && message) {
      const timer = setTimeout(() => {
        setAnnouncement('');
      }, clearDelay);

      return () => clearTimeout(timer);
    }
  }, [message, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Hook for managing live region announcements
export function useAnnounce() {
  const [message, setMessage] = useState('');

  const announce = (text: string, urgency: 'polite' | 'assertive' = 'polite') => {
    setMessage(text);
    
    // Clear after delay
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  return { message, announce };
}

