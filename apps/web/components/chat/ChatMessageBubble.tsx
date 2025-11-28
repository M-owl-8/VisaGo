'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { ChatMessage } from '@/lib/stores/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-gradient-to-br from-primary to-primary-dark'
            : 'bg-white/10'
        )}
      >
        {isUser ? (
          <User size={16} className="text-white" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-1',
          isUser ? 'items-end' : 'items-start',
          'max-w-[75%] sm:max-w-[80%]'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-lg',
            isUser
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-[0_10px_25px_rgba(62,166,255,0.35)]'
              : 'bg-white/10 text-white border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.sources.slice(0, 3).map((source: any, idx: number) => (
              <span
                key={idx}
                className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60"
              >
                {typeof source === 'string' ? source : source.title || source.url || 'Source'}
              </span>
            ))}
          </div>
        )}
        {message.tokens_used && (
          <span className="text-xs text-white/40">
            {message.tokens_used} tokens • {message.model || 'AI'}
          </span>
        )}
      </div>
    </div>
  );
}

