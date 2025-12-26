'use client';

import { Sparkles } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { ChatMessage } from '@/lib/stores/chat';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
}

export function ChatMessageList({ messages, isLoading, isSending }: ChatMessageListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonList items={3} />
      </div>
    );
  }

  if (messages.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="space-y-0">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isSending && (
        <div className="flex gap-3 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10">
            <Sparkles size={18} className="text-primary animate-pulse" />
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
              <span className="ml-2 text-xs text-white/60 font-medium">Ketdik is thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

