'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCcw } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat';
import { useAuthStore } from '@/lib/stores/auth';
import { useApplication } from '@/lib/hooks/useApplication';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickActions } from '@/components/chat/QuickActions';
import { Button } from '@/components/ui/Button';
import ErrorBanner from '@/components/ErrorBanner';

export default function ChatPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuthStore();
  const applicationId = searchParams.get('applicationId') || undefined;
  
  // Use useChatStore for both sending and displaying messages
  const { 
    messages, 
    isLoading, 
    error: chatError, 
    sendMessage, 
    loadChatHistory,
    setCurrentApplication 
  } = useChatStore();

  // Fetch application context if applicationId is present
  const { application } = useApplication(applicationId, {
    autoFetch: !!applicationId && isSignedIn,
  });

  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');

  // Load chat history when component mounts or applicationId changes (last 100 messages)
  useEffect(() => {
    if (isSignedIn) {
      setCurrentApplication(applicationId || null);
      loadChatHistory(applicationId, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, applicationId]); // loadChatHistory and setCurrentApplication are stable Zustand functions

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

  // Prepare application context for header
  const applicationContext = application
    ? {
        country: application.country,
        visaType: application.visaType,
        status: application.status,
      }
    : undefined;

  return (
    <div className="fixed inset-0 top-16 sm:top-20 flex flex-col overflow-hidden bg-background">
      {/* Header Section - Fixed at top */}
      <div className="shrink-0 border-b border-white/10 bg-background/90 backdrop-blur-sm px-3 pt-4 text-white sm:px-4 sm:pt-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ChatHeader applicationContext={applicationContext} />
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-8">
        <div className="mx-auto max-w-5xl py-4">
          {isLoading && messages.length === 0 ? (
            <div className="space-y-4">
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center sm:min-h-[400px]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20 sm:mb-6 sm:h-20 sm:w-20">
                <Sparkles size={24} className="text-primary sm:size-8" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-white sm:text-xl">
                {t('chat.emptyStateTitle', 'Start a conversation')}
              </h3>
              <p className="mb-6 max-w-md text-xs text-white/60 sm:mb-8 sm:text-sm">
                {t(
                  'chat.emptyStateSubtitle',
                  'Ask me anything about visa requirements, document checklists, or application processes.'
                )}
              </p>

              {/* Quick Actions */}
              <QuickActions onSelect={handleQuickAction} applicationContext={applicationContext} />
            </div>
          ) : (
            <ChatMessageList messages={messages} isLoading={false} isSending={isLoading} />
          )}
        </div>
      </div>

      {/* Error Banner - Above input */}
      {chatError && (
        <div className="shrink-0 border-t border-white/10 bg-rose-500/10 px-3 py-3 sm:px-4 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-rose-100">{chatError}</p>
              {lastFailedMessage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  className="ml-4 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                >
                  <RefreshCcw size={14} />
                  <span className="ml-2">{t('errors.tryAgain', 'Try Again')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom */}
      <div className="shrink-0 border-t border-white/5 bg-background/90 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
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
  );
}
