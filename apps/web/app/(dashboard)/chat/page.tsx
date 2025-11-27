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
  const { messages, isLoading, error, sendMessage, loadChatHistory, setCurrentApplication } = useChatStore();
  const [input, setInput] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const applicationId = searchParams.get('applicationId');

  useEffect(() => {
    if (!isSignedIn) {
      router.push('/login');
      return;
    }
    if (applicationId) {
      setCurrentApplication(applicationId);
    } else {
      loadChatHistory();
    }
  }, [isSignedIn, applicationId, setCurrentApplication, loadChatHistory, router]);

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
    } catch (err) {
      setLastFailedMessage(message); // Store failed message for retry
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
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('chat.aiAssistant')}</h1>

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-500">
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
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-gray-100 px-4 py-2">
                    <p className="text-gray-600">{t('chat.sending')}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-gray-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">{error}</p>
              {lastFailedMessage && (
                <button
                  onClick={handleRetry}
                  className="ml-4 rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  {t('errors.tryAgain')}
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('chat.messagePlaceholder')}
              className="flex-1 rounded-md border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-md bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {t('chat.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


