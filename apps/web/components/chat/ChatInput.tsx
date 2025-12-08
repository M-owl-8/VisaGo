'use client';

import { useRef, KeyboardEvent, FormEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends message, Shift+Enter adds new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Auto-resize textarea
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex gap-2 sm:gap-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            t('chat.messagePlaceholder', 'Ask anything about your visa process…')
          }
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed sm:px-4 sm:py-3"
          style={{
            minHeight: '44px',
            maxHeight: '120px',
          }}
        />
        <Button
          type="submit"
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 shadow-[0_10px_25px_rgba(62,166,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed sm:px-6 sm:py-3"
        >
          <Send size={16} className="sm:size-5" />
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-white/40 sm:mt-2 sm:text-xs">
        {t('chat.inputHint', 'Press Enter to send, Shift+Enter for new line')}
      </p>
    </form>
  );
}

