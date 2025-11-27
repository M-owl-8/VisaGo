'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/lib/stores/chat';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function FloatingAssistant() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const { messages, isLoading, error, sendMessage, loadChatHistory } = useChatStore();

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory().catch(() => undefined);
    }
  }, [isOpen, messages.length, loadChatHistory]);

  const lastMessages = useMemo(() => messages.slice(-4), [messages]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    const content = draft.trim();
    setDraft('');
    await sendMessage(content);
  };

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 sm:bottom-12 sm:right-12">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto w-[320px] rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_45px_75px_rgba(15,23,42,0.25)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-neutral-400">
                  {t('chat.aiAssistant')}
                </p>
                <p className="text-base font-semibold text-primary-900">
                  {t('chat.inlineTitle', 'Need help?')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-neutral-200/80 p-1 text-neutral-500 transition hover:text-primary-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {lastMessages.length === 0 && !isLoading && (
                <div className="rounded-2xl border border-dashed border-neutral-200/80 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  {t('chat.inlineEmpty', 'Ask anything about your visa journey.')}
                </div>
              )}
              {lastMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-2xl px-4 py-2 text-sm ${msg.role === 'assistant' ? 'bg-primary-900 text-white' : 'bg-neutral-100 text-primary-900'}`}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="animate-pulse rounded-2xl bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
                  {t('chat.typing', 'AI is preparing a response...')}
                </div>
              )}
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>

            <div className="mt-4 space-y-2">
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('chat.messagePlaceholder')}
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/chat';
                  }}
                >
                  {t('chat.openFull', 'Open full chat')}
                </Button>
                <Button onClick={handleSend} disabled={!draft.trim() || isLoading}>
                  {t('chat.send')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="pointer-events-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-900 text-white shadow-[0_25px_45px_rgba(15,23,42,0.35)] transition hover:scale-105"
        initial={false}
        animate={{ scale: isOpen ? 0.98 : 1 }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={26} />}
        {!isOpen && (
          <span className="sr-only">
            {t('chat.aiAssistant')}
          </span>
        )}
      </motion.button>

      {!isOpen && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-primary-900 shadow-card-soft">
          <Sparkles size={14} className="text-accent-500" />
          {t('chat.inlinePrompt', 'Need bespoke guidance?')}
        </div>
      )}
    </div>
  );
}

