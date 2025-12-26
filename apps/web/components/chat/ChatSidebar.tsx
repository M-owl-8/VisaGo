'use client';

import { useMemo } from 'react';
import { Plus, Trash2, Pencil, MessageSquare } from 'lucide-react';
import { ChatSession } from '@/lib/stores/chat';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';

interface ChatSidebarProps {
  sessions: ChatSession[];
  selectedSessionId: string | null;
  isLoading: boolean;
  onSelectSession: (sessionId: string) => void;
  onCreateNew: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
}

export function ChatSidebar({
  sessions,
  selectedSessionId,
  isLoading,
  onSelectSession,
  onCreateNew,
  onDeleteSession,
  onRenameSession,
}: ChatSidebarProps) {
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aDate = a.updatedAt || a.createdAt || '';
      const bDate = b.updatedAt || b.createdAt || '';
      return bDate.localeCompare(aDate);
    });
  }, [sessions]);

  const handleRename = (sessionId: string, currentTitle: string) => {
    const newTitle = prompt('Rename chat', currentTitle || 'New Chat');
    if (newTitle && newTitle.trim()) {
      onRenameSession(sessionId, newTitle.trim());
    }
  };

  const renderTimestamp = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/10 bg-midnight/90 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare size={16} />
          <span>Chats</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onCreateNew}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
        >
          <Plus size={14} />
          New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((key) => (
              <div
                key={key}
                className="h-14 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : sortedSessions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/60">
            No chats yet. Start a conversation.
          </div>
        ) : (
          <ul className="space-y-1">
            {sortedSessions.map((session) => {
              const isActive = session.id === selectedSessionId;
              return (
                <li key={session.id}>
                  <div
                    className={cn(
                      'group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 transition',
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
                      <MessageSquare size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {session.title || 'New Chat'}
                      </p>
                      <p className="line-clamp-2 text-xs text-white/60">
                        {session.lastMessage?.content || 'No messages yet'}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {renderTimestamp(session.lastMessage?.createdAt || session.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session.id, session.title || 'New Chat');
                        }}
                        className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Rename chat"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
                        aria-label="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

