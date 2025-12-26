'use client';

import { useRef, KeyboardEvent, FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useTranslation } from 'react-i18next';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LENGTH = 2000;

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder,
}: ChatInputProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const isNearLimit = charCount > MAX_LENGTH * 0.8;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends message, Shift+Enter adds new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSubmit(e as any);
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= MAX_LENGTH) {
      onChange(newValue);
    }
    
    // Auto-resize textarea
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            t('chat.messagePlaceholder', 'Ask about visa requirements, documents, or processes...')
          }
          rows={1}
          disabled={disabled}
          className={cn(
            "w-full resize-none rounded-2xl border px-4 py-3 pr-14 text-sm text-white placeholder:text-white/40 transition-all shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
            "focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
            disabled 
              ? "border-white/10 bg-white/5" 
              : "border-white/10 bg-white/5 focus:bg-white/8 focus:border-primary/50 focus:ring-primary/20"
          )}
          style={{
            minHeight: '52px',
            maxHeight: '160px',
          }}
        />
        
        {/* Send button inside input */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-xl transition-all",
            value.trim() && !disabled
              ? "bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
              : "bg-white/5 cursor-not-allowed opacity-50"
          )}
        >
          {disabled ? (
            <Loader2 size={16} className="animate-spin text-white" />
          ) : (
            <Send size={16} className="text-white" />
          )}
        </button>
      </div>
      
      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-white/40">
          {t('chat.inputHint', 'Press Enter to send • Shift+Enter for new line')}
        </span>
        <span className={cn(
          "transition-colors",
          isNearLimit ? "text-rose-400 font-medium" : "text-white/30"
        )}>
          {charCount}/{MAX_LENGTH}
        </span>
      </div>
    </form>
  );
}
