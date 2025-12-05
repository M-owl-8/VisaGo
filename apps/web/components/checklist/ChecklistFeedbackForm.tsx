'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/lib/api/config';
import { MessageSquare, CheckCircle2 } from 'lucide-react';

interface ChecklistFeedbackFormProps {
  applicationId: string;
  onSuccess?: () => void;
}

export function ChecklistFeedbackForm({ applicationId, onSuccess }: ChecklistFeedbackFormProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'missing_docs' | 'unnecessary_docs' | 'other'>('missing_docs');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/applications/${applicationId}/checklist-feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedbackType,
          feedbackText: feedbackText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
        setFeedbackText('');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error('[ChecklistFeedback] Error submitting feedback:', err);
      alert(t('applications.feedbackError', 'Failed to submit feedback. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mt-4 text-sm text-white/60 hover:text-white transition-colors underline"
      >
        {t('applications.somethingWrongWithChecklist', 'Something wrong with this checklist?')}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsOpen(false);
            setFeedbackText('');
            setShowSuccess(false);
          }
        }}
        title={t('applications.giveFeedback', 'Give Feedback')}
        size="md"
      >
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 size={48} className="mb-4 text-emerald-400" />
            <p className="text-lg font-medium text-white">
              {t('applications.thankYouFeedback', 'Thank you, your feedback is saved.')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                {t('applications.feedbackType', 'Feedback Type')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="missing_docs"
                    checked={feedbackType === 'missing_docs'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-white/80">
                    {t('applications.missingDocuments', 'Missing documents')}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="unnecessary_docs"
                    checked={feedbackType === 'unnecessary_docs'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-white/80">
                    {t('applications.unnecessaryDocuments', 'Unnecessary documents')}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="feedbackType"
                    value="other"
                    checked={feedbackType === 'other'}
                    onChange={(e) => setFeedbackType(e.target.value as any)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-white/80">
                    {t('applications.other', 'Other')}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white">
                {t('applications.description', 'Description')}
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={t('applications.feedbackPlaceholder', 'Please describe the issue...')}
                rows={4}
                className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsOpen(false);
                  setFeedbackText('');
                }}
                disabled={isSubmitting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !feedbackText.trim()}>
                {isSubmitting
                  ? t('common.submitting', 'Submitting...')
                  : t('common.submit', 'Submit')}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

