'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { RefreshCcw, ArrowDown, Menu, X, Sparkles } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat';
import { useAuthStore } from '@/lib/stores/auth';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickActions } from '@/components/chat/QuickActions';
import { Button } from '@/components/ui/Button';
import ErrorBanner from '@/components/ErrorBanner';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

function ChatPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuthStore();
  const applicationId = searchParams.get('applicationId') || undefined;
  
  // Use useChatStore for both sending and displaying messages
  const {
    messages,
    sessions,
    selectedSessionId,
    isLoading,
    isLoadingSessions,
    error: chatError,
    sendMessage,
    loadChatHistory,
    loadSessions,
    selectSession,
    createNewSession,
    deleteSession,
    renameSession,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSessionResolving, setIsSessionResolving] = useState(false);
  const hasAttemptedSessionRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset session creation attempts when applicationId changes
  useEffect(() => {
    hasAttemptedSessionRef.current = false;
  }, [applicationId]);

  // Load sessions on mount
  useEffect(() => {
    if (isSignedIn) {
      loadSessions();
    }
  }, [isSignedIn, loadSessions]);

  // Load chat history when selected session changes
  useEffect(() => {
    if (isSignedIn && selectedSessionId) {
      loadChatHistory(selectedSessionId, 100);
    }
  }, [isSignedIn, selectedSessionId, loadChatHistory]);

  // If applicationId is provided, auto-select or create session (idempotent)
  useEffect(() => {
    if (!isSignedIn || !applicationId) return;
    if (isSessionResolving) return;
    if (isLoadingSessions) return;

    let cancelled = false;
    const findOrCreateSession = async () => {
      try {
        setIsSessionResolving(true);
        const matching = sessions.find((s) => s.applicationId === applicationId);
        if (matching) {
          if (matching.id !== selectedSessionId) {
            await selectSession(matching.id);
          }
          return;
        }

        if (hasAttemptedSessionRef.current) {
          return;
        }
        hasAttemptedSessionRef.current = true;

        // Create session if not found
        const newSessionId = await createNewSession(applicationId);
        if (!cancelled && newSessionId) {
          await selectSession(newSessionId);
        } else if (!newSessionId) {
          // allow retry on failure
          hasAttemptedSessionRef.current = false;
        }
      } finally {
        if (!cancelled) {
          setIsSessionResolving(false);
        }
      }
    };

    findOrCreateSession();

    return () => {
      cancelled = true;
    };
  }, [
    isSignedIn,
    applicationId,
    sessions,
    selectedSessionId,
    selectSession,
    createNewSession,
    isSessionResolving,
    isLoadingSessions,
  ]);

  // Handle scroll to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
      setIsNearBottom(nearBottom);
      setShowScrollButton(!nearBottom && messages.length > 3);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive (only if user is near bottom)
  useEffect(() => {
    if (isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isNearBottom]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      setIsNearBottom(true);
    }
  };

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setLastFailedMessage('');

    try {
      await sendMessage(message, applicationId);
    } catch (err: any) {
      if (err?.message && !err.message.includes('too quickly') && !err.message.includes('rate limit')) {
        setLastFailedMessage(message);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    if (isLoading) return;
    setLastFailedMessage('');
    setInput(''); // Clear input when using quick action
    try {
      await sendMessage(action, applicationId);
    } catch (err: any) {
      if (err?.message && !err.message.includes('too quickly') && !err.message.includes('rate limit')) {
        setLastFailedMessage(action);
      }
    }
  };

  const handleRetry = async () => {
    if (!lastFailedMessage.trim() || isLoading) return;
    setLastFailedMessage('');
    try {
      await sendMessage(lastFailedMessage, applicationId);
    } catch (err) {
      setLastFailedMessage(lastFailedMessage);
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-gradient-to-b from-background via-background to-midnight text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <ChatSidebar
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          isLoading={isLoadingSessions}
          onSelectSession={(id) => selectSession(id)}
          onCreateNew={() => createNewSession(applicationId)}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsSidebarOpen(false)} />
          <div className="relative z-10 h-full w-56">
            <ChatSidebar
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              isLoading={isLoadingSessions}
              onSelectSession={(id) => {
                selectSession(id);
                setIsSidebarOpen(false);
              }}
              onCreateNew={() => {
                createNewSession(applicationId);
                setIsSidebarOpen(false);
              }}
              onDeleteSession={deleteSession}
              onRenameSession={renameSession}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 sm:px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white"
              aria-label="Open chat list"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-semibold">{t('chat.aiAssistant', 'AI Assistant')}</span>
          </div>
          {isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 p-2"
              aria-label="Close chat list"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {chatError && (
          <div className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-3 py-2 sm:px-4 lg:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-100">{t('chat.errorTitle', 'Message not sent')}</p>
                <p className="text-xs text-rose-200/80">
                  {chatError ||
                    t(
                      'chat.errorDefault',
                      'Something went wrong. Your conversation is saved — try sending again.'
                    )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {lastFailedMessage && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRetry}
                    className="bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                  >
                    <RefreshCcw size={14} />
                    <span className="ml-2">{t('errors.tryAgain', 'Retry')}</span>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    useChatStore.setState({ error: null });
                    if (selectedSessionId) {
                      loadChatHistory(selectedSessionId, 100);
                    }
                  }}
                  className="bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                >
                  <RefreshCcw size={14} />
                  <span className="ml-2">{t('chat.reload', 'Reload')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 lg:px-8"
          id="chat-messages"
        >
          <div className="mx-auto max-w-5xl py-4">
            {isLoading && messages.length === 0 ? (
              <div className="space-y-4">
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
                <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center animate-in fade-in duration-500">
                {/* Animated icon */}
                <div className="mb-6 relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-pulse" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 border border-primary/30 sm:h-24 sm:w-24">
                    <Sparkles size={32} className="text-primary animate-pulse sm:size-10" />
                  </div>
                </div>
                
                {/* Welcome message */}
                <h3 className="mb-2 font-display text-xl font-semibold text-white sm:text-2xl">
                  Salom! I&apos;m your AI visa assistant 👋
                </h3>
                <p className="mb-2 max-w-md text-sm text-white/70 sm:text-base">
                  I can help you with visa requirements, document checklists, and application processes for all countries worldwide.
                </p>
                <p className="mb-8 text-xs text-white/40">
                  {t(
                    'chat.confidence',
                    'Responses are based on official sources. For legal advice, consult an attorney.'
                  )}
                </p>
                
                <QuickActions onSelect={handleQuickAction} applicationContext={undefined} />
              </div>
            ) : (
              <ChatMessageList messages={messages} isLoading={false} isSending={isLoading} />
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-32 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-midnight/90 text-white shadow-lg backdrop-blur-sm transition hover:bg-midnight hover:scale-110 active:scale-95 sm:bottom-36 sm:right-8"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={20} />
          </button>
        )}

        <div
          className="relative z-40 shrink-0 border-t border-white/10 bg-midnight/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto max-w-5xl px-3 py-3 sm:px-4 sm:py-4 lg:px-8">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 min-h-0 items-center justify-center bg-gradient-to-b from-background via-background to-midnight">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
