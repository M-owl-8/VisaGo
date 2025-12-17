'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCcw, ArrowDown } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat';
import { useAuthStore } from '@/lib/stores/auth';
import { useApplication } from '@/lib/hooks/useApplication';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickActions } from '@/components/chat/QuickActions';
import { Button } from '@/components/ui/Button';
import ErrorBanner from '@/components/ErrorBanner';

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

  // Get flag emoji for country
  const getFlagEmoji = (countryCode?: string): string => {
    if (!countryCode) return '🌍';
    const flagMap: Record<string, string> = {
      us: '🇺🇸', ca: '🇨🇦', gb: '🇬🇧', au: '🇦🇺', de: '🇩🇪',
      fr: '🇫🇷', es: '🇪🇸', it: '🇮🇹', jp: '🇯🇵', ae: '🇦🇪', uz: '🇺🇿',
    };
    return flagMap[countryCode.toLowerCase()] || '🌍';
  };

  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history when component mounts or applicationId changes (last 100 messages)
  useEffect(() => {
    if (isSignedIn) {
      setCurrentApplication(applicationId || null);
      loadChatHistory(applicationId, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, applicationId]); // loadChatHistory and setCurrentApplication are stable Zustand functions

  // Handle scroll to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      setShowScrollButton(!isNearBottom && messages.length > 3);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  // Prepare application context for QuickActions
  const applicationContext = application
    ? {
        country: application.country,
        visaType: application.visaType,
        status: application.status,
      }
    : undefined;

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
    <div className="flex min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] flex-col bg-gradient-to-b from-background via-background to-midnight">
      {/* AI Context Chip - Shows what application AI is helping with */}
      {application && (
        <div className="border-b border-white/10 bg-white/[0.02] px-3 py-2 sm:px-4 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles size={14} className="text-primary" />
              <span className="text-white/70">{t('chat.aiHelpingWith', 'AI is helping with')}:</span>
              <span className="font-medium text-white">
                {getFlagEmoji(application.country?.code)} {application.country?.name} – {application.visaType?.name}
              </span>
              <button
                onClick={() => router.push(`/applications/${application.id}`)}
                className="ml-auto text-xs text-primary hover:text-primary/80 transition"
              >
                {t('chat.viewApplication', 'View Application')} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area - Scrollable via body */}
      <div ref={messagesContainerRef} className="flex-1 px-3 sm:px-4 lg:px-8" id="chat-messages">
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
                {t('chat.emptyStateTitle', 'Your AI visa assistant is ready')}
              </h3>
              <p className="mb-2 max-w-md text-xs text-white/70 sm:text-sm">
                {t(
                  'chat.emptyStateSubtitle',
                  'Ask me anything about visa requirements, document checklists, or application processes. I'm trained on official embassy requirements from dozens of countries.'
                )}
              </p>
              <p className="mb-6 text-xs text-white/40 sm:mb-8">
                {t('chat.confidence', 'Responses are based on official sources. For legal advice, consult an attorney.')}
              </p>

              {/* Quick Actions */}
              <QuickActions onSelect={handleQuickAction} applicationContext={applicationContext} />
            </div>
          ) : (
            <ChatMessageList messages={messages} isLoading={false} isSending={isLoading} />
          )}
        </div>
      </div>

      {/* Error Banner */}
      {chatError && (
        <div className="mb-4 border border-rose-500/20 bg-rose-500/10 px-3 py-3 sm:px-4 lg:px-8 rounded-lg">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-100">{t('chat.errorTitle', 'Message not sent')}</p>
                <p className="text-xs text-rose-200/80">{chatError || t('chat.errorDefault', 'Something went wrong. Your conversation is saved — try sending again.')}</p>
              </div>
              {lastFailedMessage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRetry}
                  className="bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 shrink-0"
                >
                  <RefreshCcw size={14} />
                  <span className="ml-2">{t('errors.tryAgain', 'Retry')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-32 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-midnight/90 text-white shadow-lg backdrop-blur-sm transition hover:bg-midnight hover:scale-110 active:scale-95 sm:bottom-36 sm:right-8"
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} />
        </button>
      )}

      {/* Input Area - Sticky at bottom */}
      <div className="sticky bottom-0 shrink-0 border-t border-white/10 bg-gradient-to-t from-midnight/95 to-background/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pb-[env(safe-area-inset-bottom)] mt-4">
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

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-4rem)] sm:min-h-[calc(100vh-5rem)] items-center justify-center bg-gradient-to-b from-background via-background to-midnight">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
