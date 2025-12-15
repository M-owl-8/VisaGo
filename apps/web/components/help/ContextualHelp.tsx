'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ContextualHelpProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function ContextualHelp({
  title,
  content,
  position = 'top',
  className,
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className={`relative inline-block ${className || ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex items-center justify-center rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
        aria-label="Help"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-64 rounded-lg border border-white/20 bg-midnight/95 p-4 shadow-xl backdrop-blur-sm ${positionClasses[position]}`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="mb-2 flex items-start justify-between">
            <h4 className="text-sm font-semibold text-white">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-white/70">{content}</p>
        </div>
      )}
    </div>
  );
}

