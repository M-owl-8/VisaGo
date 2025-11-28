'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/lib/stores/chat';
import { useAuthStore } from '@/lib/stores/auth';

export default function ChatPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuthStore();
  const { messages, isLoading, error, sendMessage, loadChatHistory, setCurrentApplication } =
    useChatStore();
  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const applicationId = searchParams.get('applicationId');

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    
    // Only load history ONCE when component mounts or applicationId changes
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (applicationId) {
        setCurrentApplication(applicationId);
      } else {
        loadChatHistory();
      }
    }
    // Only re-run if applicationId actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]); // Minimal deps - only applicationId changes should trigger reload

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    setLastFailedMessage(''); // Clear last failed message on new send
    try {
      await sendMessage(message, applicationId || undefined);
    } catch (err: any) {
      // Only store for retry if it's not a rate limit error
      if (err?.message && !err.message.includes('too quickly') && !err.message.includes('rate limit')) {
        setLastFailedMessage(message);
      }
    }
  };

  const handleRetry = async () => {
    if (!lastFailedMessage.trim() || isLoading) return;
    setLastFailedMessage(''); // Clear on retry
    try {
      await sendMessage(lastFailedMessage, applicationId || undefined);
    } catch (err) {
      setLastFailedMessage(lastFailedMessage); // Keep for another retry
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8 text-white sm:px-6 lg:px-8">
      <h1 className="mb-4 text-2xl font-bold">{t('chat.aiAssistant')}</h1>

      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_25px_55px_rgba(1,7,17,0.65)]">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-white/50">
              {t('chat.noMessages')}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-[0_10px_25px_rgba(62,166,255,0.35)]'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white/10 px-4 py-2 text-white/70">
                    <p>{t('chat.sending')}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-white/10 bg-rose-500/10 p-4 text-rose-100">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              {lastFailedMessage && (
                <button
                  onClick={handleRetry}
                  className="ml-4 rounded-md bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-600"
                >
                  {t('errors.tryAgain')}
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.messagePlaceholder')}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-6 py-2 text-white shadow-[0_10px_25px_rgba(62,166,255,0.35)] disabled:opacity-50"
            >
              {t('chat.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
