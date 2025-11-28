'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCcw } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat';
import { useAuthStore } from '@/lib/stores/auth';
import { useChatSession } from '@/lib/hooks/useChatSession';
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
  const { sendMessage, isLoading: isSending } = useChatStore();
  const applicationId = searchParams.get('applicationId') || undefined;
  const { messages, isLoading, error, loadHistory, clearError } = useChatSession(applicationId, {
    autoFetch: isSignedIn,
  });

  // Fetch application context if applicationId is present
  const { application } = useApplication(applicationId, {
    autoFetch: !!applicationId && isSignedIn,
  });

  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');

  // Redirect if not signed in
  if (!isSignedIn) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

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
    if (isSending) return;
    setLastFailedMessage('');
    try {
      await sendMessage(action, applicationId);
    } catch (err: any) {
      if (err?.message && !err.message.includes('too quickly') && !err.message.includes('rate limit')) {
        setLastFailedMessage(action);
      }
    }
  };

  const handleRetry = async () => {
    if (!lastFailedMessage.trim() || isSending) return;
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
    <div className="mx-auto flex max-w-5xl flex-col px-4 py-8 text-white sm:px-6 lg:px-8">
      <ChatHeader applicationContext={applicationContext} />

      {/* Chat Container */}
      <Card className="glass-panel flex flex-1 flex-col overflow-hidden border border-white/10 bg-white/[0.03] shadow-[0_25px_55px_rgba(1,7,17,0.65)]">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary-dark/20">
                <Sparkles size={32} className="text-primary" />
              </div>
              <h3 className="mb-2 font-display text-xl font-semibold text-white">
                {t('chat.emptyStateTitle', 'Start a conversation')}
              </h3>
              <p className="mb-8 max-w-md text-sm text-white/60">
                {t(
                  'chat.emptyStateSubtitle',
                  'Ask me anything about visa requirements, document checklists, or application processes.'
                )}
              </p>

              {/* Quick Actions */}
              <QuickActions onSelect={handleQuickAction} applicationContext={applicationContext} />
            </div>
          ) : (
            <ChatMessageList messages={messages} isLoading={false} isSending={isSending} />
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="border-t border-white/10 bg-rose-500/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-rose-100">{error}</p>
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
          disabled={isSending}
        />
      </Card>
    </div>
  );
}
