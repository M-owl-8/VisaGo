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
import { Card } from '@/components/ui/Card';
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
    <div className="mx-auto flex max-w-5xl flex-col px-3 py-4 text-white sm:px-4 sm:py-6 lg:px-8">
      <ChatHeader applicationContext={applicationContext} />

      {/* Chat Container */}
      <Card className="glass-panel flex flex-1 flex-col overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_25px_55px_rgba(1,7,17,0.65)]" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {isLoading && messages.length === 0 ? (
            <div className="space-y-4">
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-4 text-center sm:min-h-[400px]">
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

        {/* Error Banner */}
        {chatError && (
          <div className="border-t border-white/10 bg-rose-500/10 p-4">
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
        )}

        {/* Input Area */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </Card>
    </div>
  );
}
