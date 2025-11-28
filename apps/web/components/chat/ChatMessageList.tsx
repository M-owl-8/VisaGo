'use client';

import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessageBubble';
import { SkeletonList } from '@/components/ui/Skeleton';
import type { ChatMessage } from '@/lib/hooks/useChatSession';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
}

export function ChatMessageList({ messages, isLoading, isSending }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonList count={3} itemClassName="h-20" />
      </div>
    );
  }

  if (messages.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="space-y-6">
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isSending && (
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Bot size={16} className="text-white" />
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
              <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

