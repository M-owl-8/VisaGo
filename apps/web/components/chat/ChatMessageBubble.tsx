'use client';

import { useState } from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelativeTime } from '@/lib/utils/time';
import { MarkdownMessage } from './MarkdownMessage';
import type { ChatMessage } from '@/lib/stores/chat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type);
    // TODO: Send feedback to backend
  };

  return (
    <div
      className={cn(
        'group flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110',
          isUser
            ? 'bg-gradient-to-br from-primary via-primary to-primary-dark shadow-lg shadow-primary/30'
            : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/20'
        )}
      >
        {isUser ? (
          <User size={18} className="text-white" />
        ) : (
          <Sparkles size={18} className="text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex flex-col gap-2 min-w-0',
          isUser ? 'items-end' : 'items-start',
          'max-w-[85%] sm:max-w-[75%] md:max-w-[80%]'
        )}
      >
        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 shadow-md transition-all',
            isUser
              ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-primary/20'
              : 'bg-white/5 border border-white/10 text-white backdrop-blur-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="text-sm leading-relaxed">
              <MarkdownMessage content={message.content} />
            </div>
          )}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2">
            {message.sources.slice(0, 3).map((source: any, idx: number) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white/80 transition cursor-pointer"
              >
                <span className="h-1 w-1 rounded-full bg-primary"></span>
                {typeof source === 'string' ? source : source.title || source.url || 'Source'}
              </span>
            ))}
          </div>
        )}

        {/* Metadata row */}
        <div className={cn(
          "flex items-center gap-2 px-2",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[11px] text-white/40">
            {formatRelativeTime(message.timestamp)}
          </span>
          
          {message.tokens_used && (
            <span className="text-[11px] text-white/30">
              • {message.tokens_used} tokens
            </span>
          )}

          {/* Action buttons (only for AI messages) */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="rounded-md p-1.5 text-white/40 hover:bg-white/10 hover:text-white/80 transition"
                aria-label="Copy message"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              
              <button
                onClick={() => handleFeedback('up')}
                className={cn(
                  "rounded-md p-1.5 transition",
                  feedback === 'up'
                    ? "bg-primary/20 text-primary"
                    : "text-white/40 hover:bg-white/10 hover:text-white/80"
                )}
                aria-label="Good response"
              >
                <ThumbsUp size={14} />
              </button>
              
              <button
                onClick={() => handleFeedback('down')}
                className={cn(
                  "rounded-md p-1.5 transition",
                  feedback === 'down'
                    ? "bg-rose-500/20 text-rose-400"
                    : "text-white/40 hover:bg-white/10 hover:text-white/80"
                )}
                aria-label="Bad response"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

